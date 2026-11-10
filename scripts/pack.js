#!/usr/bin/env node
/* Builds the ZIP that is uploaded to the Chrome Web Store (no dependencies: only Node).
   Usage:  node scripts/pack.js          -> dist/AIUB-Slide-Downloader-v<version>-store.zip
   The ZIP contains only the files of extension/, with manifest.json at the TOP LEVEL (not inside a folder). */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const validate = require('./validate');

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

function makeZip(entries) {   // entries: [{ name, data: Buffer }]
  const DOS_TIME = 0, DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;   // fixed time: the same files always give the same ZIP
  const local = [], central = []; let off = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8'), raw = e.data, def = zlib.deflateRawSync(raw, { level: 9 });
    const useDef = def.length < raw.length, body = useDef ? def : raw, crc = crc32(raw);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(useDef ? 8 : 0, 8);
    lh.writeUInt16LE(DOS_TIME, 10); lh.writeUInt16LE(DOS_DATE, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26);
    local.push(lh, name, body);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(useDef ? 8 : 0, 10);
    ch.writeUInt16LE(DOS_TIME, 12); ch.writeUInt16LE(DOS_DATE, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    central.push(ch, name);
    off += 30 + name.length + body.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...local, cd, end]);
}

function pack(extDir, outFile) {
  const r = validate(extDir);
  if (r.errors.length) throw new Error('not ready for the Web Store:\n  ' + r.errors.join('\n  '));
  const names = fs.readdirSync(extDir).filter(f => fs.statSync(path.join(extDir, f)).isFile()).sort();
  const zip = makeZip(names.map(n => ({ name: n, data: fs.readFileSync(path.join(extDir, n)) })));
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, zip);
  return { outFile, names, bytes: zip.length };
}

module.exports = { pack, makeZip, crc32 };
if (require.main === module) {
  const ext = path.resolve(__dirname, '..', 'extension');
  const v = JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'), 'utf8')).version;
  const r = pack(ext, path.resolve(__dirname, '..', 'dist', `AIUB-Slide-Downloader-v${v}-store.zip`));
  console.log(`${r.outFile}\n${r.names.length} files, ${(r.bytes / 1024).toFixed(1)} KB\n  ${r.names.join('\n  ')}`);
}
