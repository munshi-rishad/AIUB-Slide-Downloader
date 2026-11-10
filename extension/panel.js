(() => {
  const manual = !!window.__aiubManual; window.__aiubManual = false;
  const DASH = /portal\.aiub\.edu\/Student(\/Home(\/Index(\/\d+)?)?)?\/?(\?|#|$)/i;
  const onDash = DASH.test(location.href);
  if (!manual && (!onDash || window.__aiubRan)) return;   // auto mode: once per page load, only on the dashboard
  if (window.__aiubRunning) return;
  window.__aiubRan = true;
  if (window.__aiubPanel) window.__aiubPanel.remove();

  // ---------- Panel shell ----------
  const host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;top:12px;right:12px;z-index:2147483647';
  window.__aiubPanel = host;
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
<style>
*{box-sizing:border-box;margin:0;font-family:"Segoe UI",system-ui,Arial,sans-serif}
.p{--z:1;zoom:var(--z);width:min(264px,calc(100vw - 20px));max-height:calc((100vh - 20px)/var(--z));display:flex;flex-direction:column;background:#fff;border-radius:16px;overflow:hidden;color:#1c2a3a;
  box-shadow:0 10px 32px rgba(11,40,90,.28),0 0 0 1px rgba(11,58,126,.08);animation:in .28s cubic-bezier(.2,.8,.2,1);transition:opacity .25s,transform .25s}
.p.out{opacity:0;transform:translateY(-8px) scale(.98)}
@keyframes in{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
.h{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 11px;background:linear-gradient(120deg,#0a3374,#1767c7);color:#fff}
.lg{width:24px;height:24px;flex:none;border-radius:7px;background:#fff;color:#0a3374;font-weight:800;font-size:14px;display:grid;place-items:center}
.t{flex:1;min-width:0}
.t b{display:block;font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.t small{display:block;font-size:10.5px;opacity:.88;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.x{flex:none;background:rgba(255,255,255,.18);border:0;color:#fff;width:22px;height:22px;border-radius:7px;cursor:pointer;font-size:11px}
.x:hover{background:rgba(255,255,255,.3)}
.pg{height:3px;background:#d9e3f2}
.pg div{height:100%;width:0;background:linear-gradient(90deg,#1767c7,#27c27a);transition:width .3s}
.pg.ind div{width:35%;animation:ind 1s ease-in-out infinite alternate}
@keyframes ind{from{margin-left:0}to{margin-left:65%}}
.b{padding:7px 7px 8px;overflow:auto;background:#f4f7fc}
.c{background:#fff;border-radius:9px;padding:6px 9px;margin-bottom:4px;box-shadow:0 1px 2px rgba(11,40,90,.07)}
.r{display:flex;align-items:center;justify-content:space-between;gap:8px}
.nm{min-width:0;font-size:11.5px;font-weight:600;color:#0a3374;line-height:1.3}
.in{font-size:10px;color:#5b7189;margin-top:2px;line-height:1.3}
.bd{flex:none;font-size:10px;font-weight:600;padding:1px 8px;border-radius:20px;background:#e6edf8;color:#3a5675}
.bd.ok{background:#d8f4e3;color:#13703a}.bd.w{background:#fff0c9;color:#855900}.bd.b{background:#dbe8fb;color:#134a96}.bd.fl{background:#fde2e2;color:#a32121}
.bar{display:none;height:3px;margin-top:5px;background:#e3eaf5;border-radius:4px;overflow:hidden}
.bar div{height:100%;width:0;background:linear-gradient(90deg,#1767c7,#27c27a);transition:width .25s}
.er{display:none;margin-top:4px;font-size:10px;color:#a32121;line-height:1.3}
.ft{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;padding:3px 2px 0}
.bg{flex:none;display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;color:#3a5675;text-decoration:none;padding:2px 4px;border-radius:6px}.bg:hover{background:#e6edf8;color:#0a3374}.bg svg{width:13px;height:13px}
.m{flex:1;font-size:11px;font-weight:600;color:#0a3374;line-height:1.35}
.rt{display:none;flex:none;border:0;border-radius:7px;padding:4px 9px;background:#0a3374;color:#fff;font-size:11px;font-weight:600;cursor:pointer}
.u{display:none;background:#eaf2ff;border:1px solid #b8d0f5;border-radius:9px;padding:8px 9px;margin-bottom:6px;font-size:11px;line-height:1.45;color:#0a3374}
.u.ok{background:#e6f7ee;border-color:#a9dfc0;color:#13703a}
.u ul{margin:4px 0 0;padding-left:16px}.u li{margin:1px 0}
.u button{border:0;border-radius:7px;padding:5px 9px;font-size:11px;font-weight:600;cursor:pointer;margin:7px 6px 0 0}
.u .go{background:#0a3374;color:#fff}.u .no{background:#e6e9ef;color:#334}
.g{display:none;background:#fff8e1;border:1px solid #f1d98a;border-radius:9px;padding:8px 9px;margin-bottom:6px;font-size:11px;line-height:1.45;color:#5b4300}
.g button{border:0;border-radius:7px;padding:5px 9px;font-size:11px;font-weight:600;cursor:pointer;margin:7px 6px 0 0}
.g .go{background:#0a3374;color:#fff}.g .no{background:#e6e9ef;color:#334}
.g .ge{color:#c0392b;margin-top:6px;font-size:11.5px}
.ch{display:block;flex:none;border:0;border-radius:7px;padding:4px 9px;background:#e6edf8;color:#0a3374;font-size:11px;font-weight:600;cursor:pointer}
.ch:hover{background:#d5e2f6}
.bt{display:flex;gap:6px;flex:none}
.pk{display:none}
.pk .lb{display:block;font-size:10.5px;font-weight:600;color:#3a5675;margin:2px 2px 4px}
.pk select{width:100%;padding:5px 7px;border:1px solid #c3d2e8;border-radius:8px;font-size:12px;font-weight:600;color:#0a3374;background:#fff;cursor:pointer}
.pk select:disabled{opacity:.6;cursor:wait}
.cnt{font-size:11px;font-weight:600;color:#3a5675;margin:7px 2px 4px}
.it{display:flex;align-items:flex-start;gap:7px;background:#fff;border-radius:9px;padding:6px 9px;margin-bottom:4px;cursor:pointer;font-size:11.5px;font-weight:600;color:#0a3374;line-height:1.3;box-shadow:0 1px 2px rgba(11,40,90,.07);border:2px solid transparent}
.it input{flex:none;margin:1px 0 0;accent-color:#1767c7;cursor:pointer}
.it.sel{border-color:#1767c7;background:#eef4fd}
.pa{display:flex;gap:6px;padding-top:3px}
.pa button{flex:1;border:0;border-radius:8px;padding:6px 10px;font-size:11.5px;font-weight:600;cursor:pointer}
.pa .ok{background:#0a3374;color:#fff}.pa .ok:disabled{background:#b9c5d8;cursor:not-allowed}
.pa .cn{background:#e6e9ef;color:#334}
@media (max-height:820px),(max-width:1500px){.p{--z:.95}}
@media (max-height:680px),(max-width:1250px){.p{--z:.88}}
@media (max-height:560px){.p{--z:.8}}
@media (prefers-reduced-motion:reduce){.p,.pg div,.bar div{animation:none;transition:none}}
</style>
<div class="p" id="p">
  <div class="h"><div class="lg">A</div><div class="t"><b id="hi">Welcome</b><small id="sub">Starting…</small></div><button class="x" id="x" title="Close">✕</button></div>
  <div class="pg ind" id="pg"><div id="o"></div></div>
  <div class="b">
    <div class="u" id="u"></div>
    <div class="g" id="g"></div>
    <div class="pk" id="pk">
      <label class="lb" for="sem">Semester</label>
      <select id="sem"></select>
      <div class="cnt" id="cnt"></div>
      <div id="cl"></div>
      <div class="pa"><button class="ok" id="ok" disabled>OK</button><button class="cn" id="cn">Cancel</button></div>
    </div>
    <div id="cs"></div>
    <div class="ft"><a class="bg" id="bg" href="https://najiat-rishad.pages.dev/" target="_blank" rel="noopener noreferrer" title="Found a bug or an error? Open my website and contact me"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>Found a bug? Contact me</a><span class="m" id="m"></span><span class="bt"><button class="ch" id="fd" style="display:none" title="Save your files somewhere else (Desktop, D: drive …)">Change folder</button><button class="ch" id="ch">Old semesters</button><button class="rt" id="rt">Retry</button></span></div>
  </div>
</div>`;
  document.documentElement.appendChild(host);
  const $ = id => root.getElementById(id);
  let closeT = null;
  let semChanged = false, semOrig = -1, picked = null, pickList = [], lastCourses = null, lastSem = null;
  let hovered = false, closePending = false, justUpd = null;
  const closeNow = () => { clearTimeout(closeT); closePending = false; restoreSem(); $('p').classList.add('out'); setTimeout(() => host.remove(), 280); };
  const stopClose = () => { clearTimeout(closeT); closePending = false; };
  // auto-close after `ms`, but never while the cursor is on the panel; it re-arms when the cursor leaves
  const armClose = ms => {
    clearTimeout(closeT); closePending = true;
    closeT = setTimeout(() => { if (hovered || $('p').matches(':hover')) return; closeNow(); }, ms);
  };
  $('x').onclick = closeNow;
  $('p').addEventListener('mouseenter', () => { hovered = true; clearTimeout(closeT); });   // cursor on the panel: keep it open
  $('p').addEventListener('mouseleave', () => { hovered = false; if (closePending) armClose(1500); });   // cursor left: close shortly after
  const msg = (t, c) => { $('m').textContent = t; $('m').style.color = c || '#0a3374'; };
  const sub = t => { $('sub').textContent = t; };

  // ---------- Helpers ----------
  const S = { a: 0, f: 0, d: 0, k: 0, e: 0, n: 0 };   // courses, files found, saved, already had, failed, new to fetch
  const setProg = ind => { $('pg').className = 'pg' + (ind ? ' ind' : ''); if (!ind) $('o').style.width = (S.n ? Math.round(100 * (S.d + S.e) / S.n) : 100) + '%'; };
  const { sanitize, hasExt, limitName, strip, CFG } = AIUB;   // shared helpers: lib.js
  function limiter(n) { let a = 0; const q = []; const nx = () => { if (a < n && q.length) { a++; const { fn, res, rej } = q.shift(); fn().then(res, rej).finally(() => { a--; nx(); }); } }; return fn => new Promise((res, rej) => { q.push({ fn, res, rej }); nx(); }); }
  const scanL = limiter(8), dlL = limiter(CFG.DL_PARALLEL || 6);
  const SMALL = new Set(['and', 'with', 'of', 'in', 'to', 'for', 'the', 'a', 'an', 'on', 'at']);
  const pretty = t => t.replace(/^\d+\s*-\s*/, '').split(/(\s+)/).map((w, i) => {
    if (!w || /^\s+$/.test(w) || /^\[.*\]$/.test(w)) return w;
    if (/^\.net$/i.test(w)) return '.NET';
    if (/^[ivx]+$/i.test(w)) return w.toUpperCase();
    const l = w.toLowerCase();
    if (i > 0 && SMALL.has(l)) return l;
    return l.replace(/^([^a-z]*)([a-z])/, (m, p, c) => p + c.toUpperCase());
  }).join('');

  // "Welcome RISHAD, NAJIAT ISLAM" on the portal -> "Rishad"
  function firstName() {
    let best = '';
    try {
      document.querySelectorAll('a,span,div,li,p,label,b,strong,h1,h2,h3,h4,h5,small,td').forEach(el => {
        const tc = el.textContent || '';
        if (tc.length < 9 || tc.length > 90) return;
        const m = tc.match(/^\s*Welcome\s*[,:]?\s+(.+?)\s*$/i);
        if (m && (!best || tc.length < best.length)) best = m[1];
      });
    } catch (e) {}
    let w = best ? best.split(',')[0].trim().split(/\s+/)[0] : '';
    if (w) { w = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); try { localStorage.setItem('aiubName', w); } catch (e) {} return w; }
    try { return localStorage.getItem('aiubName') || ''; } catch (e) { return ''; }
  }

  // ---------- Portal scraping ----------
  function extractCourses(withDropped) {
    const out = [], seen = new Set();
    document.querySelectorAll('a').forEach(a => {
      if (!/^\s*Notes\s*$/i.test(a.textContent)) return;
      let box = a, text = '';
      for (let i = 0; i < 8 && box.parentElement; i++) {
        box = box.parentElement; text = box.innerText || '';
        if (/^\s*\d{3,6}\s*-/.test(text) && /Status/.test(text) && (text.match(/Notes/g) || []).length === 1) break;
      }
      if (!/^\s*\d{3,6}\s*-/.test(text)) return;
      const title = text.trim().split('\n')[0].trim();
      const parts = text.split(/Status\s*:/i);
      const tail = (parts[parts.length - 1] || '').split(/Result/i)[0];
      const w = (tail.match(/Dropped|Invalid|Valid/gi) || []).map(x => x.toLowerCase());
      const dropped = w.includes('dropped');
      const active = w.includes('valid') && !w.includes('invalid') && (withDropped || !dropped);
      if (!active) return;   // current semester: dropped courses ignored; old-semester picker: they are included
      const raw = a.getAttribute('href') || '';
      const href = raw && !/^(#|javascript)/i.test(raw) ? new URL(raw, location.href).href : '';
      if (!href || seen.has(title)) return; seen.add(title);
      out.push({ title, href, dropped });
    });
    return out;
  }
  const SIZE = /\d+(\.\d+)?\s*(bytes?|[KMG]b)\b/i;
  function findFiles(doc, base) {
    const files = [], used = new Map();
    doc.querySelectorAll('tr').forEach(tr => {
      const txt = [...tr.querySelectorAll('td,th')].map(x => x.textContent).join(' ') || tr.textContent;   // cells apart: "…16:24:35" + "0.378 Mb" must not read as "350.378 Mb"
      if (!SIZE.test(txt)) return;
      const a = tr.querySelector('a[href]');
      const h = a && a.getAttribute('href');
      if (!h || /^(#|javascript)/i.test(h)) return;
      let name = sanitize(a.textContent.trim()) || 'file';
      const key = name.toLowerCase();
      if (used.has(key)) {
        const n = used.get(key) + 1; used.set(key, n);
        name = hasExt(name) ? name.replace(/(\.[A-Za-z0-9]{1,6})$/, ` (${n})$1`) : `${name} (${n})`;
      } else used.set(key, 1);
      const url = new URL(h, base).href, psize = AIUB.parsePortalSize(txt);
      files.push({ name, url, ts: AIUB.parsePortalDate(txt), psize, src: 'portal', id: 'p:' + url, sig: psize ? 'p' + psize.v + psize.unit : '' });
    });
    return files;
  }
  function viaIframe(href) {   // slow path: let the real page render (notes may load on a tab click)
    return new Promise(res => {
      const fr = document.createElement('iframe');
      fr.style.cssText = 'position:fixed;left:-9999px;width:800px;height:600px;border:0';
      fr.src = href; document.body.appendChild(fr);
      let n = 0, loaded = -1, clicked = -1;
      const done = f => { clearInterval(t); fr.remove(); res(f); };
      const t = setInterval(() => {
        n++;
        try {
          const d = fr.contentDocument;
          if (d) {
            const f = findFiles(d, fr.contentWindow.location.href);
            if (f.length) return done(f);
            if (d.readyState === 'complete') {
              if (loaded < 0) loaded = n;
              if (clicked < 0 && n - loaded >= 4) {
                const tb = d.querySelector('a[href*="notesTab"]');
                if (!tb) return done([]);          // no notes tab and no files -> nothing to download
                tb.click(); clicked = n;
              }
              if (clicked >= 0 && n - clicked >= 10) return done([]);
            }
          }
        } catch (e) {}
        if (n > 100) done([]);
      }, 150);
    });
  }
  async function getFiles(c) {
    try {
      const r = await fetch(c.href, { credentials: 'include', signal: AbortSignal.timeout(30000) });
      if (r.redirected && !/^\/Student/i.test(new URL(r.url).pathname)) throw new Error('Session expired: sign in to the portal again');
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      const f = findFiles(doc, c.href); if (f.length) return f;
    } catch (e) {
      if (/Session expired/.test(e.message || '')) throw e;
      if (!navigator.onLine || e.name === 'TimeoutError' || /failed to fetch|network|load failed/i.test(e.message || '')) throw new Error('No internet');
    }
    return viaIframe(c.href);
  }

  // ---------- Messages to the background worker ----------
  let staleCtx = false;
  const send = async m => {
    try { return await chrome.runtime.sendMessage(m); }
    catch (e) {
      if (/context invalidated/i.test(e.message || '') && !staleCtx && DASH.test(location.href)) {   // the extension was updated: start fresh by itself
        staleCtx = true; sub('Extension updated'); msg('The extension was just updated. Refreshing this page…', '#855900'); setTimeout(() => location.reload(), 1500);
      }
      return { ok: false, err: e.message };
    }
  };
  // ---------- The AIUB folder on the computer (disk.js: Chrome's File System Access, no program to install) ----------
  // Like the old Windows helper: the extension sees which files are REALLY in the folder, saves, renames and moves them.
  function folderGate(st) {   // -> 'again' | 'skip'
    return new Promise(resolve => {
      const g = $('g'); g.style.display = 'block'; stopClose();
      const T = {
        none: ['One-time setup', '<b>Where should your course files be saved?</b><br>1. Press <b>Choose folder</b>.<br>2. Go to your <b>Desktop</b> (or the <b>D: drive</b>, …), click <b>New folder</b> and name it <b>AIUB</b>.<br>3. Select that <b>AIUB</b> folder, press <b>Select folder</b>, then <b>Edit files</b> / <b>Allow</b>.<br><small>Chrome does not allow the Desktop, Documents, Downloads or a whole drive itself (“contains system files”): always pick a folder inside them. You can change it later with <b>Change folder</b>.</small><br>'],
        prompt: ['Allow folder access', '<b>Allow access to your AIUB folder</b><br>Chrome asks again after it was restarted. Press <b>Allow</b>, then choose <b>Allow on every visit</b> so it is not asked again.<br>'],
        missing: ['AIUB folder not found', '<b>Your AIUB folder was not found</b><br>It was deleted, renamed or moved. Press <b>Choose folder</b> and select it again (or make a new <b>AIUB</b> folder inside your Desktop with <b>New folder</b>).<br>'],
      }[st] || ['One-time setup', ''];
      sub(T[0]); g.innerHTML = T[1];
      const btn = (label, cls, fn) => { const b = document.createElement('button'); b.className = cls; b.textContent = label; b.onclick = fn; g.appendChild(b); return b; };
      const err = document.createElement('div'); err.className = 'ge';
      const show = e => { if (e && e.name === 'AbortError') return; err.textContent = 'Not ready yet: ' + ((e && e.message) || e); g.appendChild(err); };
      const done = v => { g.style.display = 'none'; sub('Checking…'); resolve(v); };
      if (st === 'prompt') btn('Allow', 'go', async () => { try { if ((await Disk.allow()) === 'ready') done('again'); else show(new Error('access was not allowed')); } catch (e) { show(e); } });
      btn(st === 'prompt' ? 'Choose another folder' : 'Choose folder', st === 'prompt' ? 'no' : 'go', async () => { try { await Disk.choose(); done('again'); } catch (e) { show(e); } });
    });
  }
  async function getHave(folders) {   // -> { folder: [names] }
    for (let i = 0; ; i++) {
      const st = await Disk.state();
      if (st === 'ready') {
        try { return await Disk.listAll(folders); }
        catch (e) { if (i > 2) throw e; continue; }   // the folder vanished in between: state() says what to do
      }
      if (st === 'unsupported') throw new Error('this Chrome cannot save into a folder. Please update Google Chrome (version 122 or newer)');
      await folderGate(st);
    }
  }
  $('fd').onclick = async () => {   // choose another place for the AIUB folder, then check again (files already in the new place are not downloaded twice)
    if (window.__aiubRunning) return;
    try { await Disk.choose(); } catch (e) { if (e && e.name !== 'AbortError') msg('Not ready yet: ' + e.message, '#c0392b'); return; }
    $('rt').onclick();
  };
  // ---------- Teams (the background worker reads SharePoint with the person's own Chrome sign-in) ----------
  function ask(html, buttons) {   // yellow box with buttons -> resolves with the chosen value ('open' buttons keep it open)
    return new Promise(resolve => {
      const g = $('g'); g.style.display = 'block'; g.innerHTML = html;
      buttons.forEach(([label, val, cls]) => {
        const b = document.createElement('button'); b.className = cls || 'no'; b.textContent = label;
        b.onclick = () => { if (val === 'open') { window.open(CFG.TEAMS_URL, '_blank', 'noopener'); return; } g.style.display = 'none'; resolve(val); };
        g.appendChild(b);
      });
    });
  }
  async function resolveTeams(req, courses) {   // -> { byCourse: Map(courseTitle -> [{files, err}]), note }
    let r = await req;
    for (;;) {
      if (r && r.status === 'ok') {
        const byCourse = new Map();
        (r.results || []).forEach(x => { if (!byCourse.has(x.course)) byCourse.set(x.course, []); byCourse.get(x.course).push(x); });
        return { byCourse, note: '', unmatched: r.unmatched || [] };
      }
      if (r && r.status === 'noauth') {
        sub('Teams is not connected');
        const a = await ask('<b>Connect your Teams account</b><br>Your Teams files are not reachable yet. Sign in to Microsoft Teams in <b>this same Chrome profile</b> (the one you are using for the portal) with your AIUB account, then press “Check again”.<br>',
          [['Open Teams', 'open', 'go'], ['Check again', 'again', 'go'], ['Skip Teams', 'skip', 'no']]);
        if (a === 'skip') return { byCourse: new Map(), note: 'Teams skipped' };
        sub('Checking Teams…');
        r = await send({ cmd: 'teams', courses: courses.map(c => c.title), semTag: lastSem });
        continue;
      }
      return { byCourse: new Map(), note: 'Teams unavailable' + (r && r.err ? ' (' + r.err + ')' : ''), partial: true };
    }
  }

  // ---------- ZIP files: open them and treat every file inside as a normal file ----------
  const zipL = limiter(4);
  async function unpackZip(it) {   // -> list of files inside, or [it] itself when the zip cannot be opened
    try {
      const r = await send({ cmd: 'zipList', url: it.url });
      if (!r || !r.ok) return /unsupported|zip64|not a zip|too big|broken/i.test((r && r.err) || '') ? [it] : null;   // null = could not look now (network): nothing is changed this time
      if (!r.entries.length) return [it];
      const out = [], zdir = limitName(sanitize(it.name.replace(/\.zip$/i, '')) || 'ZIP', CFG.FOLDER_MAX);   // the folder is named like the zip file
      for (const e of r.entries) {
        if (e.usize > CFG.MAX_FILE_MB * 1048576) continue;
        out.push({ name: limitName(sanitize(e.base) || 'file', CFG.NAME_MAX), url: it.url, ts: it.ts, bytes: e.usize, dir: (it.dir ? it.dir + '/' : '') + zdir, src: it.src, zip: e, alts: (it.alts || []).map(a => ({ name: '', src: a.src })).filter(a => a.src),
          id: 'z:' + (it.id || it.url) + '#' + e.path, sig: 'u' + e.usize + 'c' + e.csize });
      }
      return out.length ? out : [it];
    } catch (e) { return null; }
  }

  // ---------- Course cards ----------
  function card(c) {
    const el = document.createElement('div'); el.className = 'c';
    el.innerHTML = '<div class="r"><span class="nm"></span><span class="bd"></span></div><div class="in"></div><div class="bar"><div></div></div><div class="er"></div>';
    const nm = el.querySelector('.nm'); nm.textContent = pretty(c.title) + (c.dropped ? ' (Dropped)' : ''); nm.title = c.title;
    c.bd = el.querySelector('.bd'); c.info = el.querySelector('.in'); c.bar = el.querySelector('.bar'); c.fill = el.querySelector('.bar div'); c.er = el.querySelector('.er');
    setBd(c, 'Waiting', '');
    $('cs').appendChild(el);
  }
  const setBd = (c, t, k) => { c.bd.textContent = t; c.bd.className = 'bd ' + (k || ''); };
  const prog = c => { const done = c.ok + c.bad; c.fill.style.width = Math.round(100 * done / c.todo.length) + '%'; setBd(c, `Downloading ${done}/${c.todo.length}`, 'b'); };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  // ---------- Semester picker (mirrors the portal's Registration dropdown) ----------
  const SEM_RX = /\d{4}\s*-\s*\d{4}\s*,\s*(Spring|Summer|Fall)/i;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const semTagNow = () => { const sel = findSemSelect(), o = sel && sel.options[sel.selectedIndex]; return o ? AIUB.semTagFromOption(o.textContent) : null; };
  const snap = () => [...document.querySelectorAll('a')].filter(a => /^\s*Notes\s*$/i.test(a.textContent)).map(a => a.getAttribute('href') || '').join('|');
  const fire = sel => { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); };
  function findSemSelect() {   // the <select> inside the "Registration" box
    const all = [...document.querySelectorAll('select')].filter(s => [...s.options].some(o => SEM_RX.test(o.textContent)));
    for (const s of all) {
      let a = s;
      for (let i = 0; i < 6 && a.parentElement; i++) { a = a.parentElement; if (/^\s*Registration\b/i.test(a.innerText || '')) return s; }
    }
    return all[0] || null;
  }
  async function waitSettled(prev) {   // wait until the portal has swapped in the new semester's cards
    const t0 = Date.now(); let last = snap(), lastT = t0, changed = false;
    while (Date.now() - t0 < 10000) {
      await sleep(150);
      const cur = snap();
      if (cur !== last) { last = cur; lastT = Date.now(); }
      if (cur !== prev) changed = true;
      const stable = Date.now() - lastT >= 600, el = Date.now() - t0;
      if (changed && stable && (cur || el > 4000)) break;   // an empty result waits a little longer
      if (!changed && stable && el > 5000) break;
    }
  }
  async function switchSem(idx) {
    const sel = findSemSelect(); if (!sel) return false;
    if (sel.selectedIndex === idx) return true;
    const prev = snap();
    sel.selectedIndex = idx; fire(sel); semChanged = true;
    await waitSettled(prev);
    return true;
  }
  function restoreSem() {   // put the portal back on the semester it was showing
    if (!semChanged) return; semChanged = false;
    const sel = findSemSelect();
    if (sel && semOrig >= 0 && sel.selectedIndex !== semOrig) { sel.selectedIndex = semOrig; fire(sel); }
  }
  function addItem(label, val) {
    const l = document.createElement('label'); l.className = 'it';
    const r = document.createElement('input'); r.type = 'radio'; r.name = 'course';
    const t = document.createElement('span'); t.textContent = label;
    l.append(r, t);
    r.onchange = () => { picked = val; $('ok').disabled = false; [...$('cl').children].forEach(x => x.classList.toggle('sel', x === l)); };
    $('cl').appendChild(l);
  }
  async function loadSem() {
    const idx = +$('sem').value;
    picked = null; pickList = []; $('ok').disabled = true; $('cl').innerHTML = ''; $('sem').disabled = true;
    $('cnt').textContent = 'Loading courses…'; setProg(true);
    let list = [];
    try { if (await switchSem(idx)) list = extractCourses(true); } catch (e) {}
    pickList = list; $('sem').disabled = false; setProg(false);
    if (!list.length) { $('cnt').textContent = 'No courses in this semester'; return; }
    $('cnt').textContent = `${plural(list.length, 'course')} in this semester`;
    list.forEach(c => addItem(pretty(c.title) + (c.dropped ? ' (Dropped)' : ''), c));
    if (list.length > 1) addItem('All courses', 'all');
  }
  async function openPicker() {
    stopClose();
    $('cs').style.display = 'none'; $('rt').style.display = 'none'; $('ch').style.display = 'none'; $('g').style.display = 'none'; msg('');
    $('pk').style.display = 'block'; sub('Pick a semester'); setProg(true);
    const sel = findSemSelect();
    if (!sel) { sub('Semester list not found'); setProg(false); $('pk').style.display = 'none'; msg('Could not find the Registration semester list on this page.', '#c0392b'); return; }
    if (semOrig < 0) semOrig = sel.selectedIndex;
    $('sem').innerHTML = '';
    const semIdx = [...sel.options].map((o, i) => SEM_RX.test(o.textContent) ? i : -1).filter(i => i >= 0);
    semIdx.pop();   // the newest semester is the current one: it is always downloaded automatically
    if (!semIdx.length) { sub('No old semesters'); setProg(false); $('pk').style.display = 'none'; msg('No old semesters found in the Registration list.', '#c0392b'); return; }
    semIdx.forEach(i => { const e = document.createElement('option'); e.value = i; e.textContent = sel.options[i].textContent.trim(); $('sem').appendChild(e); });
    $('sem').value = String(semIdx[semIdx.length - 1]);   // start on the most recent old semester
    await loadSem();
  }
  $('sem').onchange = () => loadSem();
  $('cn').onclick = closeNow;
  $('ch').onclick = () => { openPicker(); };
  $('ok').onclick = () => {
    if (!picked) return;
    const list = picked === 'all' ? pickList : [picked];
    $('pk').style.display = 'none'; $('cs').style.display = '';
    window.__aiubRunning = true;
    runCourses(list, semTagNow()).catch(fail).finally(() => { window.__aiubRunning = false; });
  };

  // ---------- Saved-file index (where each online file was saved; survives updates) ----------
  async function loadIndex() { try { return (await chrome.storage.local.get('fidx')).fidx || {}; } catch (e) { return {}; } }
  async function saveIndex(idx) {
    const old = Date.now() - 400 * 86400000;
    for (const k of Object.keys(idx)) if ((idx[k].t || 0) < old) delete idx[k];   // not seen online for over a year
    const keys = Object.keys(idx);
    if (keys.length > 20000) keys.sort((a, b) => (idx[a].t || 0) - (idx[b].t || 0)).slice(0, keys.length - 20000).forEach(k => delete idx[k]);   // size cap
    try { await chrome.storage.local.set({ fidx: idx }); } catch (e) {}
  }
  function remember(idx, ids, p, sig) {
    for (const id of ids) { const o = idx[id] || {}; idx[id] = { p, s: sig || o.s || '', k: CFG.FILE_SCHEME, t: Date.now() }; }
  }

  // ---------- After an update: what is new (the Chrome Web Store installs updates by itself) ----------
  function notesList(notes) {
    const ul = document.createElement('ul');
    (notes || []).forEach(n => (n.items || []).slice(0, 6).forEach(t => { const li = document.createElement('li'); li.textContent = String(t).slice(0, 200); ul.appendChild(li); }));
    return ul.children.length ? ul : null;
  }
  async function updateBox() {
    let u; try { u = await chrome.storage.local.get(['justUpdated']); } catch (e) { return; }
    if (!u.justUpdated || Date.now() - u.justUpdated.t >= 30 * 60000) return;
    justUpd = u.justUpdated;
    const box = $('u'); box.className = 'u ok'; box.style.display = 'block'; box.textContent = '';
    const b = document.createElement('b'); b.textContent = `Updated to v${justUpd.to} ✓`; box.appendChild(b);
    const l = notesList(justUpd.notes); if (l) box.appendChild(l);
    const d = document.createElement('div'); d.textContent = 'Your saved files are brought up to date with this version (names, folders and changed files).'; box.appendChild(d);
    try { chrome.storage.local.remove('justUpdated'); } catch (e) {}
  }

  // ---------- The portal page looks different: say so clearly and let the person report it ----------
  function pageInfo() {   // technical facts only (no names, no course titles, no personal data)
    const notes = [...document.querySelectorAll('a')].filter(a => /^\s*Notes\s*$/i.test(a.textContent)).length;
    return `version ${chrome.runtime.getManifest ? chrome.runtime.getManifest().version : '?'} | page ${location.pathname} | Notes links ${notes} | semester list ${findSemSelect() ? 'yes' : 'no'} | tables ${document.querySelectorAll('table').length}`;
  }
  function reportBox(what) {
    const g = $('g'); g.style.display = 'block';
    g.innerHTML = '<b>The AIUB portal page may have changed</b><br>' + what + '<br>Press <b>Report problem</b> so the extension can be fixed (only technical details are sent, no personal data).<br>';
    const b = document.createElement('button'); b.className = 'go'; b.textContent = 'Report problem';
    b.onclick = () => window.open(`https://github.com/${CFG.REPO}/issues/new?title=${encodeURIComponent('Portal page changed: ' + what.replace(/<[^>]+>/g, '').slice(0, 60))}&body=${encodeURIComponent('What happened: ' + what.replace(/<[^>]+>/g, '') + '\n\nDetails: ' + pageInfo())}`, '_blank', 'noopener');
    g.appendChild(b);
    stopClose();
  }

  // ---------- Main flow ----------
  async function start() {
    window.__aiubRunning = true;
    stopClose();
    $('cs').innerHTML = ''; $('rt').style.display = 'none'; $('ch').style.display = 'block'; $('g').style.display = 'none'; msg(''); setProg(true);
    const name = firstName();
    $('hi').textContent = name ? `Welcome, ${name}` : 'Welcome';
    await updateBox();
    if (!DASH.test(location.href)) {
      sub('Wrong page'); setProg(false); msg('Open your Dashboard (portal.aiub.edu/Student) and click the icon again.', '#c0392b'); return;
    }
    sub('Finding your courses…');
    let courses = extractCourses();
    for (let i = 0; i < 100 && !courses.length; i++) { await new Promise(r => setTimeout(r, 200)); courses = extractCourses(); }
    if (!courses.length) {
      sub('No courses found'); setProg(false); msg('No active courses found on this page.', '#c0392b'); $('ch').style.display = 'block';
      if (findSemSelect()) reportBox('The dashboard is open, but no course with a "Notes" link was found.');   // the page has a semester list, so it IS the dashboard
      else if (!manual) armClose(2500);
      return;
    }
    await runCourses(courses, semTagNow());
  }

  // download the given courses (shared by auto mode and the semester picker)
  function offline() {   // nothing was changed; the person just presses Retry when the internet is back
    sub('No internet'); setProg(false);
    msg('No internet connection. Nothing was changed. Connect and press Retry.', '#c0392b');
    $('rt').style.display = 'block'; $('ch').style.display = 'block';
  }
  const fpath = (c, dir) => dir ? `${c.folder}/${dir}` : c.folder;   // AIUB/<Course>[/<Teams sub-folder>]
  async function runCourses(courses, semTag) {   // one run at a time across all portal tabs
    lastCourses = courses; lastSem = semTag || null;
    const lk = await send({ cmd: 'lock' });
    if (lk && lk.busy) {
      $('cs').innerHTML = ''; setProg(false); sub('Already running'); $('g').style.display = 'none';
      msg('Another portal tab is already downloading. Wait for it to finish, then press Retry.', '#c0392b');
      $('rt').style.display = 'block'; $('ch').style.display = 'block'; return;
    }
    try { await runCoursesInner(courses, semTag); } finally { send({ cmd: 'unlock' }); }
  }
  async function runCoursesInner(courses, semTag) {
    lastCourses = courses; lastSem = semTag || null;
    stopClose();
    Object.assign(S, { a: 0, f: 0, d: 0, k: 0, e: 0, n: 0, r: 0, t: 0, dup: 0, x: 0, old: 0 });
    $('cs').innerHTML = ''; $('rt').style.display = 'none'; $('ch').style.display = 'block'; $('g').style.display = 'none'; msg(''); setProg(true);
    S.a = courses.length;
    courses.forEach(card);
    if (!navigator.onLine) { offline(); return; }
    sub(`${plural(courses.length, 'active course')} · checking files…`);
    courses.forEach(c => { c.folder = limitName(sanitize(c.title.replace(/^\d+\s*-\s*/, '')), CFG.FOLDER_MAX) + (c.dropped ? ' (Dropped)' : ''); });

    // portal scan, Teams lookup and AIUB-folder listing all run at the same time
    const scanP = Promise.all(courses.map(c => scanL(async () => {
      setBd(c, 'Checking…', 'w'); c.scanErr = '';
      try { c.portal = (await getFiles(c)).map(f => ({ ...f, name: limitName(f.name, CFG.NAME_MAX), dir: '' })); }
      catch (e) { c.portal = []; c.scanErr = e.message || 'error'; setBd(c, c.scanErr === 'No internet' ? 'Offline' : 'Error', 'fl'); }
    })));
    const teamsReq = send({ cmd: 'teams', courses: courses.map(c => c.title), semTag: lastSem });
    const haveMap = await getHave(courses.map(c => c.folder));
    await scanP;
    const helper = true;   // files always go into the chosen AIUB folder
    $('fd').style.display = 'block'; $('fd').title = 'Now: ' + Disk.label() + ' (press to save somewhere else)';
    if (courses.every(c => c.scanErr === 'No internet')) { offline(); return; }
    sub('Checking Teams…');
    const teams = await resolveTeams(teamsReq, courses);

    // one list per course: portal files first, then Teams files; look-alikes are merged into one
    const dirs = new Set();
    await Promise.all(courses.map(async c => {
      const tItems = []; let big = 0;
      const sites = teams.byCourse.get(c.title) || [];
      sites.forEach(st => st.files.forEach(f => { if (f.bytes > CFG.MAX_FILE_MB * 1048576) { big++; return; } tItems.push({ name: limitName(sanitize(f.name) || 'file', CFG.NAME_MAX), url: f.url, ts: f.ts, bytes: f.bytes, dir: AIUB.teamsDir(f.rel), src: 'teams', id: f.uid ? 't:' + f.uid : 'tu:' + f.url, sig: 'b' + f.bytes }); }));
      const merged = AIUB.mergeSources([...c.portal, ...tItems]);
      let list = merged.items, dups = merged.dups, unz = 0, zfail = 0;
      if (helper && CFG.UNZIP) {   // zip files are opened: their contents become normal files (numbered, tagged "(Teams ZIP)" / "(Portal ZIP)")
        let parts = await Promise.all(list.map(it => /\.zip$/i.test(it.name) ? zipL(() => unpackZip(it)) : [it]));
        const lost = parts.filter(x => x === null).length; parts = parts.map(x => x || []);
        list = parts.flat(); if (lost) c.zipLost = true;
        c.superseded = merged.items.filter((it, i) => parts[i].length && (parts[i].length !== 1 || parts[i][0] !== it)).map(it => ({ folder: fpath(c, it.dir), base: it.name, ids: AIUB.idsOf(it) }));
        unz = parts.filter((x, i) => x.length !== 1 || x[0] !== merged.items[i]).length; zfail = parts.reduce((n, x, i) => n + (/\.zip$/i.test(merged.items[i].name) && x.length === 1 && x[0] === merged.items[i] ? 1 : 0), 0);
        if (unz) { const m2 = AIUB.mergeSources(list); list = m2.items; dups += m2.dups; }
      }
      c.items = list; S.dup += dups;
      const terr = sites.map(x => x.err).filter(Boolean)[0];
      c.info.textContent = `Portal ${c.portal.length}` + (teams.note ? '' : ` · Teams ${tItems.length}`) + (unz ? ` · ${plural(unz, 'zip')} unpacked` : '') + (zfail ? ` · ${plural(zfail, 'zip')} kept as .zip` : '') + (dups ? ` · ${dups} duplicate${dups === 1 ? '' : 's'} merged` : '') + (big ? ` · ${big} large file${big === 1 ? '' : 's'} skipped (over ${CFG.MAX_FILE_MB} MB)` : '') + (terr ? ` · Teams error: ${terr}` : '') + (!sites.length && !teams.note ? ' · no Teams class matched' : '');
      if (teams.unmatched && teams.unmatched.length) c.info.title = 'Teams classes that matched no course: ' + teams.unmatched.join('; ');
      c.partial = !!teams.partial || !!terr || !!c.zipLost;   // incomplete data: do not renumber anything this time
      c.groups = new Map();
      c.items.forEach(it => { if (!c.groups.has(it.dir)) c.groups.set(it.dir, []); c.groups.get(it.dir).push(it); });
      c.groups.forEach((_, dir) => { if (dir) dirs.add(fpath(c, dir)); });
    }));
    if (helper && dirs.size) Object.assign(haveMap, await Disk.listAll([...dirs]));

    // where were these files saved before? (an older version may have used other names or folders)
    const idx = helper ? await loadIndex() : {}, stamp = new Date().toISOString().slice(0, 10);
    if (helper) {
      const extra = new Set();
      const look = ids => ids.forEach(id => { const r = idx[id]; if (r && r.p) { const d = AIUB.splitP(r.p)[0]; if (d && !(d in haveMap)) extra.add(d); } });
      courses.forEach(c => { (c.items || []).forEach(f => look(AIUB.idsOf(f))); (c.superseded || []).forEach(z => look(z.ids)); });
      if (extra.size) Object.assign(haveMap, await Disk.listX([...extra]));
    }

    await Promise.all(courses.map(async c => {
      c.todo = []; c.ok = 0; c.bad = 0;
      if (c.scanErr) { S.x++; c.info.textContent = 'Could not check: ' + c.scanErr; setBd(c, 'Not checked', 'fl'); return; }
      const groups = [];
      for (const [dir, items] of c.groups) {
        const folder = fpath(c, dir);
        AIUB.prepareGroup(items, CFG.NUMBERING); groups.push({ folder, items });   // 01 - , 02 - ... in content order
      }
      if (helper) {
        // every file: already there (maybe under an old name / in an old folder) -> renamed or moved; edited online -> fetched again; missing -> downloaded
        const plan = AIUB.reconcile(groups, haveMap, idx, { partial: c.partial, stamp, superseded: c.superseded || [] });
        plan.kept.forEach(k => remember(idx, k.ids, k.p, k.sig));
        S.k += plan.kept.length + plan.moves.filter(m => !m.archive).length;
        const blocked = new Set();
        if (plan.moves.length) {
          let r; try { r = await Disk.moveAll(plan.moves.map(m => ({ f: m.f, t: m.t }))); } catch (e) { r = { ok: false, done: [] }; }
          const done = new Set((r && r.ok && r.done) || []);
          plan.moves.forEach((m, i) => {
            if (m.archive) { if (done.has(i)) S.old++; else blocked.add(m.f.toLowerCase()); return; }   // could not set the old copy aside: do not overwrite it now
            if (done.has(i)) { S.r++; remember(idx, m.ids, m.t, m.sig); }
            else remember(idx, m.ids, m.f, m.sig);   // open in another program: it stays where it is, the next run tries again
          });
        }
        for (const t of plan.todo) if (!blocked.has(AIUB.joinP(t.folder, t.item.name).toLowerCase())) c.todo.push({ ...t.item, folder: t.folder });
      }
      S.f += c.items.length; S.n += c.todo.length;
      if (!c.items.length) setBd(c, 'No files yet', '');
      else if (!c.todo.length) setBd(c, 'Up to date ✓', 'ok');
      else setBd(c, plural(c.todo.length, 'new file'), 'w');
    }));
    if (helper) await saveIndex(idx);
    const checked = courses.filter(c => !c.scanErr);
    const hadPortal = c => Object.keys(idx).some(k => k.startsWith('p:') && (idx[k].p || '').toLowerCase().startsWith(c.folder.toLowerCase() + '/'));
    if (checked.length && checked.every(c => !c.portal.length) && checked.some(hadPortal)) {   // a new semester (no files yet) never triggers this
      reportBox('No course showed any portal file, although files were found there before.');
    }

    // download: all courses at once, CFG.DL_PARALLEL files at a time
    setProg(false);
    if (S.n) sub(`Downloading ${plural(S.n, 'new file')}…`);
    const fetchOne = f => Disk.save({ url: f.url, folder: f.folder, name: f.name, zip: f.zip });
    let sinceSave = 0;   // the index is saved now and then, so a closed page loses nothing
    const remembered = (f, r) => { remember(idx, AIUB.idsOf(f), AIUB.joinP(f.folder, (r && r.name) || f.name), f.sig); if (++sinceSave >= 10) { sinceSave = 0; saveIndex(idx); } };
    await Promise.all(courses.map(async c => {
      if (!c.todo.length) return;
      c.bar.style.display = 'block'; prog(c);
      await Promise.all(c.todo.map(f => dlL(async () => {
        const r = await Promise.race([fetchOne(f), sleep(20 * 60000).then(() => ({ status: 'fail', err: 'no answer from the extension (press Retry)' }))]);
        if (r && (r.status === 'done' || r.status === 'skip')) { c.ok++; S.d++; if (f.src === 'teams') S.t++; if (helper) remembered(f, r); }
        else { c.bad++; S.e++; c.lastErr = (r && r.err) || 'failed'; (c.failedList = c.failedList || []).push(f); }
        prog(c); setProg(false);
        sub(`Downloading… ${S.d + S.e} of ${S.n}`);
      })));
      // automatic second chance: failed files are tried again, two at a time, before the person sees any error
      const again = c.failedList || [];
      c.failedList = [];
      if (again.length) {
        const retryL = limiter(2);
        await Promise.all(again.map(f => retryL(async () => {
          await sleep(1500);
          const r = await fetchOne(f);
          if (r && (r.status === 'done' || r.status === 'skip')) { c.bad--; c.ok++; S.e--; S.d++; if (f.src === 'teams') S.t++; if (helper) remembered(f, r); prog(c); }
        })));
      }
      if (c.bad) { setBd(c, `${c.bad} failed`, 'fl'); c.er.textContent = c.lastErr; c.er.style.display = 'block'; }
      else setBd(c, 'Done ✓', 'ok');
    }));

    // finish
    setProg(false);
    if (helper) await saveIndex(idx);
    const moved = (S.r ? ` · ${plural(S.r, 'file')} renamed/moved` : '') + (S.old ? ` · ${S.old} old ${S.old === 1 ? 'copy' : 'copies'} moved to "${CFG.OLD_DIR}"` : '');
    const note = (teams.note ? ` · ${teams.note}` : '') + (justUpd ? ` · your files now follow v${justUpd.to}` : '') + moved;
    if (S.e || S.x) {
      sub(S.e ? 'Some files failed' : 'Some courses were not checked');
      msg(`${S.d} saved${S.e ? `, ${S.e} failed` : ''}${S.x ? `, ${plural(S.x, 'course')} not checked` : ''}. Check your internet, then press Retry.${note}`, '#c0392b'); $('rt').style.display = 'block'; $('ch').style.display = 'block';
    } else {
      sub(`Saved in ${Disk.label()}`);
      const fromTeams = S.t ? ` (${S.t} from Teams)` : '';
      msg((S.d ? `All done! ${plural(S.d, 'new file')} saved${fromTeams} ✓` : 'All files are up to date ✓') + note, '#13703a');
      $('ch').style.display = 'block';
      armClose(note ? 6000 : 2000);   // closes by itself after finishing (a bit later if there is a note to read)
    }
  }
  $('rt').onclick = () => { window.__aiubRunning = true; (lastCourses ? runCourses(lastCourses, lastSem) : start()).catch(fail).finally(() => { window.__aiubRunning = false; }); };
  const fail = e => { sub('Something went wrong'); setProg(false); msg('Error: ' + e.message, '#c0392b'); $('rt').style.display = 'block'; $('ch').style.display = 'block'; };
  start().catch(fail).finally(() => { window.__aiubRunning = false; });
})();
