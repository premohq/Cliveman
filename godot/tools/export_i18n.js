// Lifts the browser build's translation dictionaries into JSON for the port.
// The dictionaries are keyed by the exact English string, as window.t() looks
// them up, so they are copied verbatim rather than re-keyed.
//   node godot-port/tools/export_i18n.js
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const out = path.resolve(__dirname, '..', 'data', 'i18n');
fs.mkdirSync(out, { recursive: true });

global.window = { _translations: {} };
for (const lang of ['fr', 'es', 'zh', 'pt', 'ru', 'hi', 'ar']) {
  require(path.join(root, 'engine', 'i18n', lang + '.js'));
  const dict = window._translations[lang];
  fs.writeFileSync(path.join(out, lang + '.json'), JSON.stringify(dict, null, 1), 'utf8');
  console.log(lang, Object.keys(dict).length, 'keys');
}
