importScripts('lib.js', 'teams.js', 'zip.js');   // shared helpers (AIUB) + SharePoint/Teams client (Teams) + zip reader (Zip)

/* ==========================================================================
   Background service worker.
   - fetches every file (portal, Teams, one file inside a zip) and streams its bytes to the panel, which writes it
     into the AIUB folder the person chose (disk.js)
   - reads Teams (teams.js) and zip files (zip.js)
   - the extension is updated by the Chrome Web Store only; this file never downloads or runs code from anywhere
   ========================================================================== */

const clean = s => s.replace(/[<>:"\/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
const hasExt = n => /\.[A-Za-z0-9]{1,6}$/.test(n);
const store = chrome.storage.local;

const TYPES = { 'application/pdf': '.pdf', 'application/zip': '.zip', 'application/x-zip-compressed': '.zip', 'application/msword': '.doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx', 'application/vnd.ms-powerpoint': '.ppt', 'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx', 'application/vnd.ms-excel': '.xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx', 'text/plain': '.txt' };
const DASH_URL = /portal\.aiub\.edu\/Student(\/Home(\/Index(\/\d+)?)?)?\/?(\?|#|$)/i;

/* ======================================================================
   Install / update (the Chrome Web Store installs updates by itself)
   ====================================================================== */
async function localNotes(v) {   // "what's new" of the version that has just been installed (changes.json is part of the extension)
  try {
    const all = await (await fetch(chrome.runtime.getURL('changes.json'))).json();
    const items = all[v];
    return items ? [{ v, items: (Array.isArray(items) ? items : [items]).map(x => String(x).slice(0, 200)).slice(0, 8) }] : [];
  } catch (e) { return []; }
}
chrome.runtime.onInstalled.addListener(async d => {
  try {
    const now = chrome.runtime.getManifest().version;
    if (d.reason === 'update' && d.previousVersion && d.previousVersion !== now) {
      await store.set({ justUpdated: { from: d.previousVersion, to: now, notes: await localNotes(now), t: Date.now() } });
    }
  } catch (e) {}
  // pages that were already open do not have the extension yet: refresh the dashboard so the panel starts by itself
  try { for (const t of await chrome.tabs.query({ url: 'https://portal.aiub.edu/*' })) if (DASH_URL.test(t.url || '')) chrome.tabs.reload(t.id); } catch (e) {}
});

async function openDashboard() {   // the course list (and the panel) lives on the portal dashboard
  try {
    const dash = (await chrome.tabs.query({ url: 'https://portal.aiub.edu/*' })).find(t => DASH_URL.test(t.url || ''));
    if (dash) { await chrome.tabs.update(dash.id, { active: true }); await chrome.windows.update(dash.windowId, { focused: true }); await chrome.tabs.reload(dash.id); }
    else await chrome.tabs.create({ url: 'https://portal.aiub.edu/Student' });
  } catch (e) {}
}
// Icon click -> manual re-check in the current tab (auto mode is the content script from manifest.json)
chrome.action.onClicked.addListener(async tab => {
  if (!/^https:\/\/portal\.aiub\.edu\//i.test(tab.url || '')) { await openDashboard(); return; }   // e.g. clicked on Teams
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { window.__aiubManual = true; } });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['lib.js', 'disk.js', 'panel.js'] });
  } catch (e) {
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#d33' });
    setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: '' }), 3000);
  }
});

/* ======================================================================
   Mode A (main): stream one file to the panel, which writes it into the chosen AIUB folder (disk.js).
   Port "aiub-dl":  panel -> { op:'get', url, zip, name }   here -> { op:'head', ext }   panel -> { op:'go' }
                    here -> { op:'data', b64 } ...   panel -> { op:'ack' } for each piece   here -> { op:'end' } | { op:'err', err }
   ====================================================================== */
const CHUNK = 1024 * 1024, WINDOW = 4;   // 1 MB pieces, at most 4 not yet written
let active = 0, keepT = null;
function keepAlive() {   // a long download keeps the service worker awake
  if (keepT) return;
  keepT = setInterval(() => { if (!active) { clearInterval(keepT); keepT = null; return; } try { chrome.storage.local.get('ka'); } catch (e) {} }, 20000);
}
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function nameFromHeaders(h) {
  const cd = h.get('content-disposition') || '';
  let m = cd.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/i);
  if (m) { try { return decodeURIComponent(m[1].trim().replace(/^"|"$/g, '')); } catch (e) {} }
  m = cd.match(/filename\s*=\s*"?([^";]+)"?/i);
  return m ? m[1].trim() : '';
}

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'aiub-dl') return;
  let closed = false, acked = 0, sent = 0, wake = null, go = null, ac = new AbortController(), stall;
  const waitAck = () => new Promise(r => { wake = r; });
  port.onDisconnect.addListener(() => { closed = true; ac.abort(); if (wake) wake(); if (go) go(); });
  port.onMessage.addListener(async m => {
    if (m.op === 'ack') { acked++; if (wake) { const w = wake; wake = null; w(); } return; }
    if (m.op === 'go') { if (go) { const g = go; go = null; g(); } return; }
    if (m.op !== 'get') return;
    active++; keepAlive(); touchLock();
    const watch = () => { clearTimeout(stall); stall = setTimeout(() => ac.abort(), 60000); };   // the NETWORK sent nothing for 60 s = stuck connection
    try {
      let reader, ext = '';
      watch();
      if (m.zip) reader = await Zip.open(m.url, m.zip);   // one file taken out of a zip (only its own bytes are downloaded)
      else {
        const r = await fetch(m.url, { credentials: 'include', signal: ac.signal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const ct = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!hasExt(m.name || '')) {
          const hn = clean(nameFromHeaders(r.headers));
          ext = (hn.match(/\.[A-Za-z0-9]{1,6}$/) || [''])[0] || TYPES[ct] || '';
          if (AIUB.CFG.UPPERCASE) ext = ext.toUpperCase();
        }
        if (ct === 'text/html' && !/\.html?$/i.test((m.name || '') + ext)) throw new Error('got a web page, not a file (please log in again)');
        reader = r.body.getReader();
      }
      clearTimeout(stall);
      const ready = new Promise(r => { go = r; });
      port.postMessage({ op: 'head', ext });
      await ready; if (closed) return;
      // gather the network's small pieces into 1 MB pieces
      let buf = [], bl = 0;
      const send = async () => {
        const take = Math.min(bl, CHUNK), out = new Uint8Array(take); let o = 0;
        while (o < take) { const a = buf[0], need = take - o; if (a.length <= need) { out.set(a, o); o += a.length; buf.shift(); } else { out.set(a.subarray(0, need), o); buf[0] = a.subarray(need); o += need; } }
        bl -= take;
        while (!closed && sent - acked >= WINDOW) await waitAck();   // the panel writes more slowly than the network: wait
        if (closed) throw new Error('closed');
        port.postMessage({ op: 'data', b64: b64(out) }); sent++; touchLock();
      };
      for (;;) {
        watch();
        const { done, value } = await reader.read();
        clearTimeout(stall);
        if (done) break;
        buf.push(value); bl += value.length;
        while (bl >= CHUNK) await send();
      }
      while (bl > 0) await send();
      if (!closed) port.postMessage({ op: 'end' });
    } catch (e) {
      if (!closed) { try { port.postMessage({ op: 'err', err: /abort/i.test(e.name + e.message) ? 'timeout: no data for 60 seconds' : (e.message || String(e)) }); } catch (_) {} }
    } finally { clearTimeout(stall); active--; }
  });
});

// one run at a time: two portal tabs writing the same file would corrupt it
let runLock = null;   // { tab, t }
const touchLock = () => { if (runLock) runLock.t = Date.now(); };
chrome.tabs.onRemoved.addListener(id => { if (runLock && runLock.tab === id) runLock = null; });

/* ====================================================================== */
chrome.runtime.onMessage.addListener((m, s, reply) => {
  if (!m) return false;
  const answer = p => p.then(reply, e => reply({ ok: false, status: 'fail', err: String((e && e.message) || e) }));   // never leave the panel waiting
  if (m.cmd === 'lock') {
    const tab = s.tab && s.tab.id;
    if (!runLock || runLock.tab === tab || Date.now() - runLock.t > 15 * 60000) { runLock = { tab, t: Date.now() }; reply({ ok: true }); }
    else reply({ ok: false, busy: true });
    return false;
  }
  if (m.cmd === 'unlock') { if (runLock && runLock.tab === (s.tab && s.tab.id)) { runLock = null; Zip.clearCache(); } return false; }
  if (m.cmd === 'zipList') { answer(Zip.list(m.url).then(entries => ({ ok: true, entries }))); return true; }
  if (m.cmd === 'teams') { answer(Teams.fetchForCourses(m)); return true; }
  if (m.cmd === 'learnSite') { Teams.learnSite(m.url); return false; }
  return false;
});
