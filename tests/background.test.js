// Run:  node tests/background.test.js   -- runs extension/background.js against a fake Chrome (no browser, no network)
'use strict';
const assert = require('assert'), fs = require('fs'), vm = require('vm'), path = require('path');
const EXT = path.join(__dirname, '..', 'extension');
let n = 0;
const t = async (name, fn) => { await fn(); n++; console.log('ok  ' + name); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- a tiny fake of the Chrome APIs background.js uses ---------- */
function makeChrome(web) {
  const C = { store: {}, downloads: [], reloaded: [] };
  const L = { installed: [], message: [], connect: [], det: [], changed: [] };
  const addL = a => ({ addListener: f => a.push(f) });
  C.L = L;
  C.api = {
    runtime: { getManifest: () => ({ version: '12.0' }), getURL: f => 'ext://' + f, onInstalled: addL(L.installed), onMessage: addL(L.message), onConnect: addL(L.connect), lastError: null },
    storage: { local: { get: async k => { const o = {}; [].concat(k).forEach(x => { if (x in C.store) o[x] = C.store[x]; }); return o; }, set: async o => Object.assign(C.store, o), remove: async k => { delete C.store[k]; } } },
    tabs: { onRemoved: addL([]), query: async () => [{ id: 7, url: 'https://portal.aiub.edu/Student' }], reload: id => C.reloaded.push(id), create: async () => {}, update: async () => {} },
    windows: { update: async () => {} },
    action: { onClicked: addL([]), setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
    scripting: { executeScript: async () => {} },
    downloads: {
      onDeterminingFilename: addL(L.det), onChanged: addL(L.changed),
      download(o, cb) {
        const id = C.downloads.length + 1, it = { id, url: o.url, filename: 'C:\\Users\\t\\Downloads\\server.pdf', state: 'in_progress' };
        C.downloads.push(it);
        setTimeout(() => {
          cb(id); let sug = null;
          for (const f of L.det) f(it, s => { sug = s; });
          it.filename = 'C:\\Users\\t\\Downloads\\' + ((sug && sug.filename) || o.filename).replace(/\//g, '\\'); it.state = 'complete'; it.exists = true;
          L.changed.forEach(f => f({ id, state: { current: 'complete' } }));
        }, 5);
      },
      async search(q) { let r = C.downloads; if (q.filenameRegex) { const rx = new RegExp(q.filenameRegex); r = r.filter(d => rx.test(d.filename)); } if (q.state) r = r.filter(d => d.state === q.state); if (q.exists) r = r.filter(d => d.exists); return r; },
    },
  };
  C.fetch = async (u, o) => {
    if (u.startsWith('ext://')) return { json: async () => JSON.parse(fs.readFileSync(path.join(EXT, u.slice(6)), 'utf8')) };
    const w = web[u]; if (!w) throw new TypeError('Failed to fetch');
    const body = Buffer.from(w.body), parts = []; for (let i = 0; i < body.length; i += 300000) parts.push(new Uint8Array(body.subarray(i, i + 300000)));
    return { ok: (w.status || 200) < 400, status: w.status || 200, headers: new Map(Object.entries(w.headers || {})), body: { getReader: () => ({ read: async () => parts.length ? { done: false, value: parts.shift() } : { done: true } }) } };
  };
  C.fetch.headersGet = true;
  return C;
}
function load(C) {
  const ctx = vm.createContext({ chrome: C.api, console, setTimeout, clearTimeout, setInterval, clearInterval, URL, Promise, Date, Math, JSON, Map, Set, Array, Object, String, Number, RegExp, Error, TypeError, parseInt, Uint8Array, TextDecoder, Blob, AbortController, btoa, atob,
    fetch: async (u, o) => { const r = await C.fetch(u, o); if (r.headers instanceof Map) { const h = r.headers; r.headers = { get: k => h.get(k.toLowerCase()) || null }; } return r; } });
  ctx.self = ctx; ctx.globalThis = ctx;
  ctx.importScripts = (...fl) => fl.forEach(f => vm.runInContext(fs.readFileSync(path.join(EXT, f), 'utf8'), ctx, { filename: f }));
  vm.runInContext(fs.readFileSync(path.join(EXT, 'background.js'), 'utf8'), ctx, { filename: 'background.js' });
  const send = (m, tab = 1) => new Promise(res => { const r = C.L.message.map(f => f(m, { tab: { id: tab } }, res)); if (!r.some(Boolean)) res(undefined); });
  return { ctx, send };
}
// the panel side of the "aiub-dl" port: collects the bytes, acknowledges every piece, can be slow
function pull(C, job, opt = {}) {
  return new Promise(resolve => {
    const toPanel = [], fromPanel = [], disc = [];
    let maxOpen = 0, open = 0;
    const port = { name: 'aiub-dl', postMessage: m => toPanel.forEach(f => f(m)), onMessage: { addListener: f => fromPanel.push(f) }, onDisconnect: { addListener: f => disc.push(f) } };
    const out = { parts: [], head: null };
    toPanel.push(async m => {
      if (m.op === 'head') { out.head = m; fromPanel.forEach(f => f({ op: 'go' })); }
      if (m.op === 'data') { open++; maxOpen = Math.max(maxOpen, open); out.parts.push(Buffer.from(m.b64, 'base64')); await sleep(opt.slow || 0); open--; fromPanel.forEach(f => f({ op: 'ack' })); }
      if (m.op === 'end') resolve({ ...out, ok: true, bytes: Buffer.concat(out.parts), maxOpen });
      if (m.op === 'err') resolve({ ...out, ok: false, err: m.err });
    });
    C.L.connect.forEach(f => f(port));
    fromPanel.forEach(f => f({ op: 'get', ...job }));
  });
}

(async () => {
  const big = Buffer.alloc(5 * 1048576 + 123); for (let i = 0; i < big.length; i++) big[i] = (i * 7) & 255;
  const web = {
    'https://portal.aiub.edu/f/1': { body: big, headers: { 'content-type': 'application/pdf' } },
    'https://portal.aiub.edu/f/2': { body: 'PK', headers: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment; filename="Lab Sheet.pptx"' } },
    'https://portal.aiub.edu/f/login': { body: '<html>login</html>', headers: { 'content-type': 'text/html' } },
    'https://portal.aiub.edu/f/404': { body: 'no', status: 404, headers: {} },
  };

  await t('a 5 MB file is streamed in 1 MB pieces, every byte arrives in order', async () => {
    const C = makeChrome(web); load(C);
    const r = await pull(C, { url: 'https://portal.aiub.edu/f/1', name: 'Lecture 1.pdf' });
    assert(r.ok, r.err); assert.strictEqual(r.head.ext, ''); assert.strictEqual(r.parts.length, 6); assert(r.bytes.equals(big));
  });
  await t('a slow disk is never flooded: at most 4 pieces are waiting to be written', async () => {
    const C = makeChrome(web); load(C);
    const r = await pull(C, { url: 'https://portal.aiub.edu/f/1', name: 'x.pdf' }, { slow: 20 });
    assert(r.ok); assert(r.maxOpen <= 4, 'max open ' + r.maxOpen); assert(r.bytes.equals(big));
  });
  await t('a name without extension gets it from the server (in capital letters)', async () => {
    const C = makeChrome(web); load(C);
    const r = await pull(C, { url: 'https://portal.aiub.edu/f/2', name: 'Lab Sheet' });
    assert(r.ok); assert.strictEqual(r.head.ext, '.PPTX');
  });
  await t('a login page instead of the file is an error (never saved as a slide)', async () => {
    const C = makeChrome(web); load(C);
    const r = await pull(C, { url: 'https://portal.aiub.edu/f/login', name: 'Lecture.pdf' });
    assert(!r.ok); assert(/web page/.test(r.err)); assert.strictEqual(r.head, null);
  });
  await t('HTTP errors and no internet are reported', async () => {
    const C = makeChrome(web); load(C);
    assert(/HTTP 404/.test((await pull(C, { url: 'https://portal.aiub.edu/f/404', name: 'a.pdf' })).err));
    assert(/failed to fetch/i.test((await pull(C, { url: 'https://portal.aiub.edu/f/none', name: 'a.pdf' })).err));
  });
  await t('one run at a time across portal tabs', async () => {
    const C = makeChrome(web), { send } = load(C);
    assert((await send({ cmd: 'lock' }, 1)).ok);
    assert((await send({ cmd: 'lock' }, 2)).busy);
    await send({ cmd: 'unlock' }, 1);
    assert((await send({ cmd: 'lock' }, 2)).ok);
  });
  await t('after a Web Store update: "what is new" is kept for the panel, the dashboard is refreshed', async () => {
    const C = makeChrome(web); load(C);
    await Promise.all(C.L.installed.map(f => f({ reason: 'update', previousVersion: '11.2' })));
    assert.strictEqual(C.store.justUpdated.to, '12.0'); assert(C.store.justUpdated.notes[0].items.length > 0); assert.deepStrictEqual(C.reloaded, [7]);
  });
  await t('the service worker never contacts GitHub or a native program', async () => {
    const src = fs.readFileSync(path.join(EXT, 'background.js'), 'utf8');
    assert(!/github|connectNative|nativeMessaging/i.test(src));
  });
  console.log(`\n${n} tests passed`); process.exit(0);
})().catch(e => { console.error('FAIL:', e); process.exit(1); });
