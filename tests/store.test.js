'use strict';
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const validate = require('../scripts/validate');
const src = path.resolve(__dirname, '..', 'extension');
assert.deepStrictEqual(validate(src).errors, []);
function copy(mut) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ext-')); for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(d, f));
  mut(d); return validate(d).errors.join('\n');
}
const man = (d, fn) => { const p = path.join(d, 'manifest.json'), m = JSON.parse(fs.readFileSync(p, 'utf8')); fn(m); fs.writeFileSync(p, JSON.stringify(m)); };
assert(/"key"/.test(copy(d => man(d, m => m.key = 'x'))));
assert(/permission not allowed/.test(copy(d => man(d, m => m.permissions.push('cookies')))));
assert(/host permission/.test(copy(d => man(d, m => m.host_permissions.push('<all_urls>')))));
assert(/132/.test(copy(d => man(d, m => m.description = 'x'.repeat(140)))));
assert(/ROOT_DIR/.test(copy(d => { const p = path.join(d, 'lib.js'); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace("ROOT_DIR: 'AIUB'", "ROOT_DIR: 'aiub'")); })));
assert(/must not be in the extension/.test(copy(d => fs.writeFileSync(path.join(d, 'Setup.bat'), 'x'))));
console.log('store tests passed');
