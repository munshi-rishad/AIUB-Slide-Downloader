// Real-browser test: loads extension/ into Google Chrome, serves a FAKE AIUB portal and a FAKE Teams (SharePoint),
// and checks what really ends up in the AIUB folder after every run.
// Needs Google Chrome + the "playwright" package:   node tests/e2e.chrome.js
// (The AIUB folder is Chrome's private test folder here: the same File System Access API as a folder on the Desktop.)
'use strict';
const assert = require('assert'), path = require('path'), os = require('os'), fs = require('fs');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT || 'playwright')); } catch (e) { console.log('skipped (playwright is not installed)'); process.exit(0); }
const CHROME = process.env.CHROME || ['/usr/bin/google-chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find(p => fs.existsSync(p));
if (!CHROME) { console.log('skipped (Google Chrome not found)'); process.exit(0); }
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';   // lets the test answer the service worker's requests (Teams, files)
const { makeZip } = require('../scripts/pack');
const EXT = process.env.EXT_DIR || path.resolve(__dirname, '..', 'extension');
let n = 0;
const t = async (name, fn) => { await fn(); n++; console.log('ok  ' + name); };

/* ---------------- the fake web ---------------- */
const body = (label, size) => { const b = Buffer.alloc(size, 32); Buffer.from('%PDF-1.4 ' + label).copy(b); return b; };
const mb = b => (b.length / 1048576).toFixed(3) + ' Mb';
const W = { portal: {}, teams: {}, blobs: {}, hits: [] };
function portalFile(course, name, size, date, id) { const url = `/files/${course}/${id}`; W.blobs[url] = body(course + name + id, size); W.portal[course].push({ name, url, date }); }
function setWeb() {
  W.portal = { dm: [], rm: [] }; W.blobs = {};
  portalFile('dm', 'Course Outline.pdf', 6000, '01-Oct-26 09:00:00', 'o');
  portalFile('dm', 'Lecture 1.pdf', 12000, '02-Oct-26 09:00:00', 'l1');
  portalFile('dm', 'Lecture 2.pdf', 10000, '05-Oct-26 09:00:00', 'l2');
  portalFile('dm', 'Lecture 4.pdf', 14000, '12-Oct-26 09:00:00', 'l4');
  portalFile('rm', 'RM Topic 1.pdf', 8000, '03-Oct-26 10:00:00', 't1');
  portalFile('rm', 'APA Referencing Style.pdf', 7000, '04-Oct-26 10:00:00', 'apa');
  const z = makeZip([{ name: 'Week 1.pdf', data: body('zw1', 5000) }, { name: 'Week 2.pdf', data: body('zw2', 5100) }]);
  W.blobs['/files/rm/zip'] = z; W.portal.rm.push({ name: 'Readings.zip', url: '/files/rm/zip', date: '06-Oct-26 10:00:00' });
  // Teams: the same Lecture 2 (same size: merged), a Lab folder with one file
  W.teams = {
    '/sites/msteams_dm/Shared Documents': { files: [{ name: 'Lecture 2.pdf', uid: 'u-l2', blob: W.blobs['/files/dm/l2'], t: '2026-10-05T03:00:00Z' }], folders: ['Lab'] },
    '/sites/msteams_dm/Shared Documents/Lab': { files: [{ name: 'Lab 1.pdf', uid: 'u-lab1', blob: body('lab1', 9000), t: '2026-10-07T03:00:00Z' }], folders: [] },
  };
}
const dash = () => `<!doctype html><html><body><div>Welcome RISHAD, NAJIAT ISLAM</div>
<div class="reg"><b>Registration</b><select><option>2025 - 2026, Summer</option><option selected>2026 - 2027, Fall</option></select></div>
<div class="c"><div>2104 - DATA MINING [B]</div><div>Status : Valid</div><a href="/Student/Course/Notes?id=dm">Notes</a></div>
<div class="c"><div>9876 - RESEARCH METHODOLOGY [P]</div><div>Status : Valid</div><a href="/Student/Course/Notes?id=rm">Notes</a></div>
</body></html>`;
const notes = c => `<!doctype html><html><body><table>${W.portal[c].map(f => `<tr><td><a href="${f.url}">${f.name}</a></td><td>${f.date}</td><td>${mb(W.blobs[f.url])}</td></tr>`).join('')}</table></body></html>`;
const SP = 'https://aiubedu60714.sharepoint.com';
async function route(ctx) {
  await ctx.route('https://portal.aiub.edu/**', r => {
    const u = new URL(r.request().url()); W.hits.push(u.pathname + u.search);
    if (u.pathname === '/Student' || u.pathname === '/Student/') return r.fulfill({ body: dash(), contentType: 'text/html' });
    if (u.pathname === '/Student/Course/Notes') return r.fulfill({ body: notes(u.searchParams.get('id')), contentType: 'text/html' });
    const b = W.blobs[u.pathname]; if (b) return r.fulfill({ body: b, contentType: u.pathname.endsWith('zip') ? 'application/zip' : 'application/pdf' });
    return r.fulfill({ status: 404, body: 'no' });
  });
  await ctx.route(SP + '/**', r => {
    const u = r.request().url(), json = o => r.fulfill({ body: JSON.stringify(o), contentType: 'application/json' });
    if (/\/_api\/search\/query/.test(u)) return json({ PrimaryQueryResult: { RelevantResults: { Table: { Rows: [{ Cells: [{ Key: 'Title', Value: '01461 DATA MINING [B][FALL 26-27]' }, { Key: 'Path', Value: SP + '/sites/msteams_dm' }] }] } } } });
    if (/\/_api\/web\?\$select=Title/.test(u)) return json({ Title: 'x' });
    if (/DefaultDocumentLibrary\/RootFolder/.test(u)) return json({ ServerRelativeUrl: '/sites/msteams_dm/Shared Documents' });
    if (/\/_api\/web\/lists/.test(u)) return json({ value: [] });
    let m = u.match(/decodedurl='([^']*)'/);
    if (m) { const p = decodeURIComponent(m[1]), d = W.teams[p]; if (!d) return r.fulfill({ status: 404, body: '{}' });
      return json({ Files: d.files.map(f => ({ Name: f.name, UniqueId: f.uid, Length: String(f.blob.length), TimeCreated: f.t, TimeLastModified: f.t, ServerRelativeUrl: p + '/' + f.name })), Folders: d.folders.map(x => ({ Name: x, ServerRelativeUrl: p + '/' + x })) }); }
    m = u.match(/GetFileById\('([^']*)'\)/);
    if (m) { const f = Object.values(W.teams).flatMap(d => d.files).find(x => x.uid === m[1]); if (f) return r.fulfill({ body: f.blob, contentType: 'application/pdf' }); }
    return r.fulfill({ status: 404, body: '{}' });
  });
}

/* ---------------- the AIUB folder (read / change it like the person would) ---------------- */
const tree = pg => pg.evaluate(async () => {
  const out = {};
  async function walk(d, p) { for await (const [k, h] of d.entries()) { if (h.kind === 'file') out[p + k] = (await h.getFile()).size; else await walk(h, p + k + '/'); } }
  const r = await navigator.storage.getDirectory(); try { await walk(await r.getDirectoryHandle('AIUB'), ''); } catch (e) { return null; }
  return out;
});
const rm = (pg, p) => pg.evaluate(async p => {   // delete a file or a folder, like the person does in the file manager
  let d = await (await navigator.storage.getDirectory()).getDirectoryHandle('AIUB'); const s = p.split('/'), last = s.pop();
  for (const x of s) d = await d.getDirectoryHandle(x);
  await d.removeEntry(last, { recursive: true });
}, p);
const rmRoot = pg => pg.evaluate(async () => (await navigator.storage.getDirectory()).removeEntry('AIUB', { recursive: true }));
const addOwn = (pg, p) => pg.evaluate(async p => { let d = await (await navigator.storage.getDirectory()).getDirectoryHandle('AIUB'); const s = p.split('/'), last = s.pop(); for (const x of s) d = await d.getDirectoryHandle(x); const w = await (await d.getFileHandle(last, { create: true })).createWritable(); await w.write('my notes'); await w.close(); }, p);
// "the person chose the AIUB folder": the folder record the extension keeps (parent + AIUB) is written into the portal's IndexedDB
const chooseFolder = pg => pg.evaluate(async () => {
  const parent = await navigator.storage.getDirectory(), root = await parent.getDirectoryHandle('AIUB', { create: true });
  const db = await new Promise((res, rej) => { const q = indexedDB.open('aiub-slide-downloader', 1); q.onupgradeneeded = () => q.result.createObjectStore('folder'); q.onsuccess = () => res(q.result); q.onerror = rej; });
  await new Promise(res => { const tx = db.transaction('folder', 'readwrite'); tx.objectStore('folder').put({ root, parent }, 'rec'); tx.oncomplete = res; }); db.close();
});

/* ---------------- one run of the panel ---------------- */
async function run(pg) {
  await pg.goto('https://portal.aiub.edu/Student');
  let last = { sub: '', m: '', gate: '' };
  for (let i = 0; i < 300; i++) {
    let s; try { s = await pg.evaluate(() => {
      const h = [...document.documentElement.children].find(e => e.shadowRoot && e.shadowRoot.getElementById('p'));
      if (!h) return null; const $ = id => h.shadowRoot.getElementById(id);
      return { sub: $('sub').textContent, m: $('m').textContent, gate: $('g').style.display === 'block' ? $('g').textContent : '', fd: $('fd').style.display, cards: [...h.shadowRoot.querySelectorAll('.c')].map(c => c.textContent) };
    }); } catch (e) { s = undefined; await pg.waitForTimeout(300); continue; }   // the page was refreshed (e.g. right after the extension was installed)
    if (s) last = s;
    if (s && (s.gate || /All done|up to date|failed|not checked|Error/i.test(s.m))) return s;
    if (!s && i > 10) return last;   // panel closed by itself after finishing
    await pg.waitForTimeout(200);
  }
  throw new Error('the panel did not finish: ' + JSON.stringify(last));
}
const names = tr => Object.keys(tr).sort();
const fetched = () => W.hits.filter(h => h.startsWith('/files/') && h !== '/files/rm/zip');   // files downloaded (the zip's list of contents is read every run, like before)
const noJunk = tr => { for (const [k, v] of Object.entries(tr)) { assert(!/\(1\)|\.crswap$|\.part$|~r.*\.tmp$/i.test(k), 'junk file: ' + k); assert(v > 0, 'empty file: ' + k); } };

(async () => {
  setWeb();
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'aiub-e2e-'));
  const ctx = await chromium.launchPersistentContext(prof, { headless: true, executablePath: CHROME, args: ['--headless=new', '--disable-extensions-except=' + EXT, '--load-extension=' + EXT ] });
  await route(ctx);
  const pg = await ctx.newPage();
  await pg.goto('https://portal.aiub.edu/Student'); await pg.waitForTimeout(2500);   // the extension refreshes the dashboard once after it is installed
  try {
    await t('no folder chosen yet: the panel asks for the AIUB folder (one time) and the picker opens from its button', async () => {
      const s = await run(pg);
      assert(/Where should your course files be saved/.test(s.gate) && /D: drive/.test(s.gate) && /New folder/.test(s.gate), JSON.stringify(s));
      assert(!/Use Downloads/.test(s.gate), 'the Downloads folder must not be offered');
      await pg.locator('button', { hasText: 'Choose folder' }).click();   // headless Chrome cancels the folder window at once: the panel must stay calm
      await pg.waitForTimeout(800);
      const g = await pg.evaluate(() => { const h = [...document.documentElement.children].find(e => e.shadowRoot && e.shadowRoot.getElementById('p')); return h.shadowRoot.getElementById('g').textContent; });
      assert(/Where should your course files be saved/.test(g) && !/Not ready yet/.test(g), g);
    });
    await chooseFolder(pg);
    let first;
    await t('first run: every file saved, numbered in course order, tagged, zip unpacked, portal+Teams copy saved once', async () => {
      const s = await run(pg); first = await tree(pg); noJunk(first);
      assert(/All done/.test(s.m), JSON.stringify(s));
      assert.deepStrictEqual(names(first), [
        'DATA MINING [B]/01 - COURSE OUTLINE (PORTAL).PDF', 'DATA MINING [B]/02 - LECTURE 1 (PORTAL).PDF', 'DATA MINING [B]/03 - LECTURE 2 (PORTAL+TEAMS).PDF', 'DATA MINING [B]/04 - LECTURE 4 (PORTAL).PDF',
        'DATA MINING [B]/Lab/01 - LAB 1 (TEAMS).PDF',
        'RESEARCH METHODOLOGY [P]/01 - RM TOPIC 1 (PORTAL).PDF', 'RESEARCH METHODOLOGY [P]/02 - APA REFERENCING STYLE (PORTAL).PDF',
        'RESEARCH METHODOLOGY [P]/Readings/01 - WEEK 1 (PORTAL ZIP).PDF', 'RESEARCH METHODOLOGY [P]/Readings/02 - WEEK 2 (PORTAL ZIP).PDF'].sort());
      assert.strictEqual(first['DATA MINING [B]/02 - LECTURE 1 (PORTAL).PDF'], 12000);
    });
    await t('second run, nothing new: "up to date", nothing downloaded again; "Change folder" is shown', async () => {
      W.hits = []; const s = await run(pg);
      assert.strictEqual(s.fd, 'block', JSON.stringify(s));
      assert(/up to date/i.test(s.m), JSON.stringify(s)); assert.deepStrictEqual(fetched(), []);
      assert.deepStrictEqual(await tree(pg), first);
    });
    await t('one file deleted -> after refresh it is back, with the same name and number', async () => {
      await rm(pg, 'DATA MINING [B]/03 - LECTURE 2 (PORTAL+TEAMS).PDF');
      const s = await run(pg); assert(/1 new file/.test(s.m), JSON.stringify(s));
      assert.deepStrictEqual(await tree(pg), first);
    });
    await t('a whole course folder deleted -> after refresh the folder and all its files are back', async () => {
      await rm(pg, 'RESEARCH METHODOLOGY [P]');
      const s = await run(pg); assert(/4 new files/.test(s.m), JSON.stringify(s));
      assert.deepStrictEqual(await tree(pg), first);
    });
    await t('a Teams sub-folder deleted -> it comes back', async () => {
      await rm(pg, 'DATA MINING [B]/Lab');
      await run(pg); assert.deepStrictEqual(await tree(pg), first);
    });
    await t('the person\'s own file in a course folder is never touched', async () => {
      await addOwn(pg, 'DATA MINING [B]/my notes.txt');
      await run(pg); const tr = await tree(pg);
      assert.strictEqual(tr['DATA MINING [B]/my notes.txt'], 8); delete tr['DATA MINING [B]/my notes.txt'];
      assert.deepStrictEqual(tr, first);
    });
    await t('teacher uploads Lecture 3 late -> it gets its place (04) and later files are renumbered, nothing downloaded twice', async () => {
      portalFile('dm', 'Lecture 3.pdf', 11000, '20-Oct-26 09:00:00', 'l3');
      W.hits = []; const s = await run(pg); const tr = await tree(pg); noJunk(tr);
      assert(/1 new file/.test(s.m), JSON.stringify(s));
      const dm = names(tr).filter(k => /^DATA MINING \[B\]\/\d/.test(k));
      assert.deepStrictEqual(dm, ['DATA MINING [B]/01 - COURSE OUTLINE (PORTAL).PDF', 'DATA MINING [B]/02 - LECTURE 1 (PORTAL).PDF', 'DATA MINING [B]/03 - LECTURE 2 (PORTAL+TEAMS).PDF', 'DATA MINING [B]/04 - LECTURE 3 (PORTAL).PDF', 'DATA MINING [B]/05 - LECTURE 4 (PORTAL).PDF']);
      assert.strictEqual(tr['DATA MINING [B]/05 - LECTURE 4 (PORTAL).PDF'], 14000);   // renamed, same content
      assert.deepStrictEqual(fetched(), ['/files/dm/l3']);
      first = tr;
    });
    await t('teacher edits Lecture 1 online -> new copy downloaded, old copy kept in "_Old versions"', async () => {
      W.blobs['/files/dm/l1'] = body('dml1-v2', 15000);
      await run(pg); const tr = await tree(pg); noJunk(tr);
      assert.strictEqual(tr['DATA MINING [B]/02 - LECTURE 1 (PORTAL).PDF'], 15000);
      const old = names(tr).filter(k => k.startsWith('_Old versions/'));
      assert.strictEqual(old.length, 1); assert(/^_Old versions\/DATA MINING \[B\]\/02 - LECTURE 1 \(PORTAL\) \(OLD \d{4}-\d\d-\d\d\)\.PDF$/.test(old[0]), old[0]);
      assert.strictEqual(tr[old[0]], 12000);
      first = tr;
    });
    await t('the whole AIUB folder deleted -> it is made again and every file comes back', async () => {
      await rmRoot(pg);
      await run(pg); const tr = await tree(pg); noJunk(tr);
      const want = names(first).filter(k => !k.startsWith('_Old versions/') && !k.endsWith('my notes.txt'));
      assert.deepStrictEqual(names(tr), want);
      first = tr;
    });
    await t('the extension\'s memory cleared too -> still nothing downloaded twice (files are found by name)', async () => {
      const sw = ctx.serviceWorkers()[0]; await sw.evaluate(() => chrome.storage.local.clear());
      W.hits = []; const s = await run(pg);
      assert(/up to date/i.test(s.m), JSON.stringify(s)); assert.deepStrictEqual(await tree(pg), first);
      assert.deepStrictEqual(fetched(), []);
    });
    await t('AIUB folder moved to another place (e.g. D: drive) and chosen there with "Change folder" -> nothing downloaded again', async () => {
      await pg.evaluate(async () => {   // move AIUB into "D-drive/Study", then the folder record points to the new place
        const top = await navigator.storage.getDirectory(), src = await top.getDirectoryHandle('AIUB');
        const study = await (await top.getDirectoryHandle('D-drive', { create: true })).getDirectoryHandle('Study', { create: true });
        async function copy(a, b) { for await (const [k, h] of a.entries()) { if (h.kind === 'file') { const w = await (await b.getFileHandle(k, { create: true })).createWritable(); await w.write(await h.getFile()); await w.close(); } else await copy(h, await b.getDirectoryHandle(k, { create: true })); } }
        const root = await study.getDirectoryHandle('AIUB', { create: true }); await copy(src, root); await top.removeEntry('AIUB', { recursive: true });
        const db = await new Promise(res => { const q = indexedDB.open('aiub-slide-downloader', 1); q.onsuccess = () => res(q.result); });
        await new Promise(res => { const tx = db.transaction('folder', 'readwrite'); tx.objectStore('folder').put({ root, parent: study }, 'rec'); tx.oncomplete = res; }); db.close();
      });
      W.hits = []; const s = await run(pg);
      assert(/up to date/i.test(s.m), JSON.stringify(s)); assert.deepStrictEqual(fetched(), []);
      const moved = await pg.evaluate(async () => { const out = []; async function walk(d, p) { for await (const [k, h] of d.entries()) h.kind === 'file' ? out.push(p + k) : await walk(h, p + k + '/'); }
        await walk(await (await (await (await navigator.storage.getDirectory()).getDirectoryHandle('D-drive')).getDirectoryHandle('Study')).getDirectoryHandle('AIUB'), ''); return out.sort(); });
      assert.deepStrictEqual(moved, names(first));
      await pg.evaluate(async () => {   // back to the normal test place for the next check
        const top = await navigator.storage.getDirectory(); await top.removeEntry('D-drive', { recursive: true });
      });
    });
    await t('AIUB chosen directly (no parent known) and then deleted -> the panel says so and asks to choose it again', async () => {
      await pg.evaluate(async () => {   // record: root only
        const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('AIUB', { create: true });
        const db = await new Promise(res => { const q = indexedDB.open('aiub-slide-downloader', 1); q.onsuccess = () => res(q.result); });
        await new Promise(res => { const tx = db.transaction('folder', 'readwrite'); tx.objectStore('folder').put({ root, parent: null }, 'rec'); tx.oncomplete = res; }); db.close();
      });
      await rmRoot(pg);
      const s = await run(pg); assert(/AIUB folder was not found/.test(s.gate), JSON.stringify(s));
    });
  } finally { await ctx.close(); }
  console.log(`\n${n} checks passed in real Chrome`); process.exit(0);
})().catch(e => { console.error('FAIL:', e); process.exit(1); });
