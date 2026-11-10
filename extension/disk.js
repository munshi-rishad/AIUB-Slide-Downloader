/* ==========================================================================
   Disk: the AIUB folder on the computer (loaded before panel.js, in the portal page).
   This does exactly what the old Windows helper (host.ps1) did, but with Chrome's own File System Access API,
   so nothing has to be installed: the person chooses the AIUB folder once, Chrome asks "Allow on every visit",
   and from then on the extension can see which files are really there, save new ones, rename and move them.
   It only ever touches the chosen AIUB folder. File bytes come from background.js through a port ("aiub-dl").
   ========================================================================== */
(function () {
  'use strict';
  if (self.Disk) return;   // injected twice (icon click): keep the first copy
  const ROOT = (self.AIUB && AIUB.CFG.ROOT_DIR) || 'AIUB';
  const RW = { mode: 'readwrite' };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- the chosen folder is remembered in IndexedDB (a folder handle cannot go into chrome.storage) ---------- */
  const DB = 'aiub-slide-downloader', ST = 'folder';
  function idb(mode, fn) {
    return new Promise((res, rej) => {
      const q = indexedDB.open(DB, 1);
      q.onupgradeneeded = () => q.result.createObjectStore(ST);
      q.onerror = () => rej(q.error);
      q.onsuccess = () => {
        const db = q.result, tx = db.transaction(ST, mode), r = fn(tx.objectStore(ST));
        tx.oncomplete = () => { db.close(); res(r && r.result); };
        tx.onerror = () => { db.close(); rej(tx.error); };
      };
    });
  }
  const loadRec = () => idb('readonly', s => s.get('rec')).catch(() => null);
  const saveRec = rec => idb('readwrite', s => s.put(rec, 'rec'));

  let root = null, rec = null;
  const notFound = e => e && (e.name === 'NotFoundError' || e.name === 'TypeMismatchError');

  // 'ready' | 'none' (never chosen) | 'prompt' (Chrome needs one click to allow again) | 'missing' (folder deleted/moved) | 'unsupported'
  async function state() {
    root = null;
    if (typeof self.showDirectoryPicker !== 'function') return 'unsupported';
    rec = await loadRec();
    if (!rec || !rec.root) return 'none';
    const top = rec.parent || rec.root;
    let p; try { p = await top.queryPermission(RW); } catch (e) { return 'missing'; }
    if (p !== 'granted') return 'prompt';
    try { for await (const k of rec.root.keys()) break; root = rec.root; return 'ready'; }   // does the AIUB folder still exist?
    catch (e) {
      if (!notFound(e)) throw e;
      if (rec.parent) {   // AIUB was deleted, but we know the folder it was in: make it again (like the old helper did)
        try { rec.root = await rec.parent.getDirectoryHandle(ROOT, { create: true }); await saveRec(rec); root = rec.root; return 'ready'; }
        catch (e2) { return 'missing'; }
      }
      return 'missing';
    }
  }
  // must be called from a click: opens Chrome's folder chooser
  async function choose() {
    const pick = await self.showDirectoryPicker({ id: 'aiub-folder', mode: 'readwrite', startIn: 'desktop' });
    const r = pick.name.toUpperCase() === ROOT ? { root: pick, parent: null } : { root: await pick.getDirectoryHandle(ROOT, { create: true }), parent: pick };
    await saveRec(r); rec = r; root = r.root;
    return label();
  }
  // must be called from a click: Chrome shows "Allow this time / Allow on every visit / Don't allow"
  async function allow() {
    rec = rec || await loadRec();
    if (!rec) return 'none';
    try { await (rec.parent || rec.root).requestPermission(RW); } catch (e) {}
    return state();
  }
  const label = () => (rec && rec.parent ? rec.parent.name + ' → ' : '') + ROOT;

  /* ---------- names: every part is cleaned on its own, so nothing can leave the AIUB folder ---------- */
  const safe = s => { const t = String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().replace(/[. ]+$/, ''); return t || 'file'; };
  const segs = p => String(p || '').split('/').filter(x => x.trim()).map(safe);
  async function dirAt(parts, create) {   // null when it does not exist (and create is false)
    if (!root) throw new Error('the AIUB folder is not available');
    let d = root;
    for (const s of parts) {
      try { d = await d.getDirectoryHandle(s, { create: !!create }); }
      catch (e) { if (notFound(e) && !create) return null; throw e; }
    }
    return d;
  }
  async function fileIn(dir, name) { try { return await dir.getFileHandle(name); } catch (e) { if (notFound(e)) return null; throw e; } }
  const SKIP = /(\.part|\.crswap)$|^~r.*\.tmp$/i;   // half-written files and our own temporary names
  async function names(dir) {   // files with content (a file of 0 bytes is a download that did not finish)
    const out = [];
    for await (const [n, h] of dir.entries()) {
      if (h.kind !== 'file' || SKIP.test(n)) continue;
      try { if ((await h.getFile()).size > 0) out.push(n); } catch (e) {}
    }
    return out;
  }

  // which files does each folder contain? Folders are created (like the old helper) -> { folder: [names] }
  async function listAll(folders) {
    const map = {};
    for (const f of folders) { const p = segs(f); map[f] = await names(await dirAt(p.length ? p : ['file'], true)); }
    return map;
  }
  // the same, WITHOUT creating anything (folders an older version used)
  async function listX(folders) {
    const map = {};
    for (const f of folders) { const p = segs(f), d = p.length ? await dirAt(p, false) : null; map[f] = d ? await names(d) : []; }
    return map;
  }

  /* ---------- rename / move (also into other folders) ---------- */
  async function moveFile(fromDir, fromName, toDir, toName) {
    const h = await fromDir.getFileHandle(fromName);
    if (typeof h.move === 'function') {
      try { await h.move(toDir, toName); return; }
      catch (e) { if (!/not ?supported|NotSupportedError|InvalidModification/i.test(e.name + ' ' + e.message)) throw e; }
    }
    // a Chrome without move(): copy, then delete the original (only after the copy is complete)
    const data = await h.getFile(), nh = await toDir.getFileHandle(toName, { create: true }), w = await nh.createWritable();
    try { await w.write(data); await w.close(); } catch (e) { try { await w.abort(); } catch (_) {} try { await toDir.removeEntry(toName); } catch (_) {} throw e; }
    await fromDir.removeEntry(fromName);
  }
  async function prune(parts) {   // remove a folder that became empty after moving files out of it (and empty parents), never AIUB itself
    for (let i = parts.length; i > 0; i--) {
      const d = await dirAt(parts.slice(0, i), false); if (!d) continue;
      let empty = true; for await (const k of d.keys()) { empty = false; break; }
      if (!empty) return;
      const up = await dirAt(parts.slice(0, i - 1), false); if (!up) return;
      try { await up.removeEntry(parts[i - 1]); } catch (e) { return; }
    }
  }
  // pairs: [{ f: 'Course/Old.pdf', t: 'Course/Sub/New.pdf' }] -> { ok, done: [indexes that moved] }
  // Step 1 moves every file to a temp name (so swaps cannot collide), step 2 to its new place.
  // Never overwrites another file; a file that is open in another program is left alone until next time.
  async function moveAll(pairs) {
    const moved = [], done = [], fromDirs = new Map();
    for (let k = 0; k < pairs.length; k++) {
      const fp = segs(pairs[k].f), tp = segs(pairs[k].t);
      if (fp.length < 2 || tp.length < 2) continue;
      if (fp.join('/') === tp.join('/')) continue;   // exactly the same (a change of capital letters only IS a real rename)
      try {
        const fd = await dirAt(fp.slice(0, -1), false); if (!fd || !(await fileIn(fd, fp[fp.length - 1]))) continue;
        const tmp = '~r' + k + '-' + Math.random().toString(36).slice(2, 8) + '.tmp';
        await moveFile(fd, fp[fp.length - 1], fd, tmp);
        moved.push({ k, fd, tmp, fp, tp });
      } catch (e) {}
    }
    for (const x of moved) {
      try {
        const td = await dirAt(x.tp.slice(0, -1), true), tn = x.tp[x.tp.length - 1];
        if (await fileIn(td, tn)) { await moveFile(x.fd, x.tmp, x.fd, x.fp[x.fp.length - 1]); continue; }   // the new name is taken by another file: put it back
        await moveFile(x.fd, x.tmp, td, tn); done.push(x.k); fromDirs.set(x.fp.slice(0, -1).join('/'), x.fp.slice(0, -1));
      } catch (e) { try { await moveFile(x.fd, x.tmp, x.fd, x.fp[x.fp.length - 1]); } catch (_) {} }
    }
    for (const p of fromDirs.values()) await prune(p);
    return { ok: true, done };
  }

  /* ---------- saving one file: background.js fetches it (portal / Teams / inside a zip) and streams the bytes here ---------- */
  const RETRYABLE = /failed to fetch|network|timeout|interrupted|disconnected|terminated|aborted|load failed|connection|HTTP (408|429|5\d\d)/i;
  function fromB64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function saveOnce({ url, folder, name, zip }) {
    return new Promise(resolve => {
      let port, dir, fh, w, final = '', created = false, chain = Promise.resolve(), finished = false, idle;
      const finish = async (r, failed) => {
        if (finished) return; finished = true; clearTimeout(idle);
        try { port.disconnect(); } catch (e) {}
        if (failed) {
          if (w) { try { await w.abort(); } catch (e) {} }
          if (created && dir && final) { try { const h = await fileIn(dir, final); if (h && (await h.getFile()).size === 0) await dir.removeEntry(final); } catch (e) {} }
        }
        resolve(r);
      };
      const fail = e => finish({ status: 'fail', err: String((e && e.message) || e || 'failed') }, true);
      const watch = () => { clearTimeout(idle); idle = setTimeout(() => fail('timeout: no data for 120 seconds'), 120000); };
      const step = async m => {
        if (finished) return;
        if (m.op === 'err') return fail(m.err);
        if (m.op === 'head') {   // the server answered: now the final name is known (an extension may be added)
          dir = await dirAt(segs(folder).length ? segs(folder) : ['file'], true);
          final = safe(name + (m.ext || ''));
          created = !(await fileIn(dir, final));
          fh = await dir.getFileHandle(final, { create: true });
          w = await fh.createWritable();   // Chrome writes into a temporary file and swaps it in on close(): never a half file under the real name
          port.postMessage({ op: 'go' });
          return;
        }
        if (m.op === 'data') { await w.write(fromB64(m.b64)); port.postMessage({ op: 'ack' }); return; }
        if (m.op === 'end') { await w.close(); w = null; return finish({ status: 'done', name: final }); }
      };
      try {
        if (!root) throw new Error('the AIUB folder is not available');
        port = chrome.runtime.connect({ name: 'aiub-dl' });
        port.onMessage.addListener(m => { watch(); chain = chain.then(() => step(m)).catch(fail); });
        port.onDisconnect.addListener(() => { chain.then(() => fail('the download was interrupted')); });
        watch();
        port.postMessage({ op: 'get', url, zip, name });
      } catch (e) { fail(e); }
    });
  }
  async function save(job) {   // a dropped connection is tried again twice (the internet often comes back within seconds)
    let r;
    for (let i = 0; i < 3; i++) {
      r = await saveOnce(job);
      if (r.status === 'done' || !RETRYABLE.test(r.err || '')) return r;
      await sleep(i ? 5000 : 1500);
    }
    return r;
  }

  self.Disk = { state, choose, allow, label, listAll, listX, moveAll, save };
})();
