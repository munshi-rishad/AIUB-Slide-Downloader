#!/usr/bin/env node
/* Checks the extension/ folder against the Chrome Web Store rules this project has to follow.
   Usage:  node scripts/validate.js            (exit code 1 when something is wrong)
   Also used by tests/store.test.js and scripts/pack.js. */
'use strict';
const fs = require('fs');
const path = require('path');

const ALLOWED_PERMISSIONS = ['scripting', 'storage'];
const ALLOWED_HOSTS = ['https://portal.aiub.edu/*', 'https://aiubedu60714.sharepoint.com/*'];
const USED_BY = {   // every permission must be used somewhere in the code (the Web Store rejects unused permissions)
  scripting: /chrome\.scripting\./, storage: /chrome\.storage\./,
};
const FORBIDDEN_API = [/connectNative|sendNativeMessage|nativeMessaging/, /chrome\.notifications/, /chrome\.alarms/, /chrome\.management/, /chrome\.proxy/, /chrome\.cookies/, /chrome\.webRequest/, /chrome\.debugger/];
const REMOTE_CODE = [/\beval\s*\(/, /new\s+Function\s*\(/, /importScripts\(\s*['"`]https?:/, /<script[^>]+src=["']?https?:/i, /document\.write\s*\(/, /createElement\(\s*['"]script['"]\s*\)/, /import\(\s*['"`]https?:/];

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString('latin1', 1, 4) !== 'PNG') return null;
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

function validate(dir) {
  const errors = [], info = [];
  const err = m => errors.push(m);
  const rd = f => fs.readFileSync(path.join(dir, f), 'utf8');
  const has = f => fs.existsSync(path.join(dir, f));

  let m;
  try { m = JSON.parse(rd('manifest.json')); } catch (e) { return { errors: ['manifest.json is missing or is not valid JSON: ' + e.message], info }; }

  if (m.manifest_version !== 3) err('manifest_version must be 3');
  if (!/^\d+(\.\d+){0,3}$/.test(m.version || '')) err('version must be 1-4 dot-separated integers, got ' + m.version);
  if (!m.name || m.name.length > 75) err('name is missing or longer than 75 characters');
  if (!m.description || m.description.length > 132) err('description is missing or longer than 132 characters (' + (m.description || '').length + ')');
  if ('key' in m) err('"key" must not be in the manifest: the Chrome Web Store gives the extension its own ID');
  if ('update_url' in m) err('"update_url" must not be in the manifest: updates come from the Chrome Web Store');
  if (m.externally_connectable || m.oauth2 || m.content_security_policy) err('unexpected security-related manifest key');

  for (const p of m.permissions || []) if (!ALLOWED_PERMISSIONS.includes(p)) err('permission not allowed in this project: ' + p);
  for (const h of m.host_permissions || []) if (!ALLOWED_HOSTS.includes(h)) err('host permission not allowed in this project: ' + h);
  if ((m.optional_permissions || []).length || (m.optional_host_permissions || []).length) err('optional permissions are not used by this project');

  // files named in the manifest must be in the package
  const need = new Set();
  const sw = m.background && m.background.service_worker; if (sw) need.add(sw); else err('background.service_worker is missing');
  Object.values(m.icons || {}).forEach(f => need.add(f));
  Object.values((m.action && m.action.default_icon) || {}).forEach(f => need.add(f));
  (m.content_scripts || []).forEach(cs => { (cs.js || []).forEach(f => need.add(f)); (cs.css || []).forEach(f => need.add(f)); });
  need.add('changes.json');
  for (const f of need) if (!has(f)) err('file named in the manifest is missing: ' + f);
  for (const s of ['16', '48', '128']) {
    if (!(m.icons && m.icons[s])) { err('icon ' + s + ' is missing in the manifest'); continue; }
    if (has(m.icons[s])) { const z = pngSize(path.join(dir, m.icons[s])); if (!z || z[0] !== +s || z[1] !== +s) err('icon ' + m.icons[s] + ' must be a ' + s + 'x' + s + ' PNG'); }
  }

  // every JS / HTML file
  const files = fs.readdirSync(dir).filter(f => /\.(js|html|json)$/.test(f));
  let all = '';
  for (const f of files) {
    const t = rd(f);
    if (f.endsWith('.js')) {
      all += '\n' + t;
      for (const rx of REMOTE_CODE) if (rx.test(t)) err(f + ': looks like remotely hosted code (' + rx + ')');
      for (const rx of FORBIDDEN_API) if (rx.test(t)) err(f + ': uses an API this project must not use (' + rx + ')');
      if (/https?:\/\/(raw\.githubusercontent|codeload\.github|api\.github)/.test(t)) err(f + ': talks to GitHub (updates must come from the Web Store only)');
      for (const mm of t.matchAll(/importScripts\(([^)]*)\)/g)) for (const x of mm[1].matchAll(/['"]([^'"]+)['"]/g)) if (!has(x[1])) err(f + ': importScripts file is missing: ' + x[1]);
    }
    if (f.endsWith('.html')) for (const mm of t.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/gi)) { if (/^https?:/i.test(mm[1])) err(f + ': remote script ' + mm[1]); else if (!has(mm[1])) err(f + ': script file is missing: ' + mm[1]); }
    if (f.endsWith('.html') && /<script(?![^>]*\ssrc=)[^>]*>[^<]/i.test(t)) err(f + ': inline script (not allowed in extension pages)');
    if (f.endsWith('.json')) { try { JSON.parse(t); } catch (e) { err(f + ' is not valid JSON'); } }
  }
  for (const p of m.permissions || []) if (USED_BY[p] && !USED_BY[p].test(all)) err('permission "' + p + '" is not used anywhere in the code (Web Store rejects unused permissions)');

  // the folder name: capital letters only
  const lib = rd('lib.js');
  const root = (lib.match(/ROOT_DIR:\s*'([^']*)'/) || [])[1];
  if (root !== 'AIUB') err("CFG.ROOT_DIR must be exactly 'AIUB' (capital letters), got " + JSON.stringify(root));
  if (/toLowerCase\(\)[^;\n]*ROOT\b|ROOT\b[^;\n]*toLowerCase\(\)/.test(rd('background.js'))) err('background.js must not lower-case the root folder name');

  // only package files: nothing else may sit in extension/
  for (const f of fs.readdirSync(dir)) if (/^\.|\.(md|bat|ps1|zip|map|test\.js)$/i.test(f)) err('file must not be in the extension folder: ' + f);

  info.push(`${m.name} v${m.version} · ${files.length} text files · permissions: ${(m.permissions || []).join(', ')} · hosts: ${(m.host_permissions || []).length}`);
  return { errors, info };
}

module.exports = validate;
if (require.main === module) {
  const dir = path.resolve(__dirname, '..', 'extension');
  const r = validate(dir);
  r.info.forEach(x => console.log('info  ' + x));
  r.errors.forEach(x => console.log('ERROR ' + x));
  console.log(r.errors.length ? `\n${r.errors.length} problem(s): not ready for the Chrome Web Store` : '\nOK: the extension follows the checked Chrome Web Store rules');
  process.exit(r.errors.length ? 1 : 0);
}
