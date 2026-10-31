#!/usr/bin/env node
/* partials/*.html ka content JS ke FALLBACK_HTML (array of string lines) mein copy karta hai,
 * taake partial aur fallback hamesha ek jaise rahein (fallback tab chalta hai jab fetch fail ho, jaise file://).
 *
 * Use:  node tools/sync-fallback.js            (header + footer, dry-run)
 *       node tools/sync-fallback.js --write    (js ke saath .bak banata hai)
 *
 * Partial badlo -> ye script chalao -> --write.
 * Ye FALLBACK_HTML = [ "line", "line", ... ].join('\n');  wale format ke liye hai (jo project mein hai).
 */
const fs = require('fs');
const write = process.argv.includes('--write');
const pairs = [
  ['docs/partials/header.html', 'docs/js/components/header.js'],
  ['docs/partials/footer.html', 'docs/js/components/footer.js']
];
const re = /(var FALLBACK_HTML = \[\n)([\s\S]*?)(\n    \]\.join\('\\n'\);)/;
let failed = false;
let changed = 0;
for (const [html, js] of pairs) {
  // the big leading "PARTIAL: ..." documentation comment is for people editing the partial - not needed in the JS copy
  const h = fs.readFileSync(html, 'utf8').replace(/\r\n/g, '\n').replace(/^\s*<!--[\s\S]*?PARTIAL:[\s\S]*?-->\s*/, '').trim();
  const j = fs.readFileSync(js, 'utf8');
  if (!re.test(j)) { console.error("FALLBACK_HTML (array + .join('\\n')) nahi mila: " + js); failed = true; continue; }
  const lines = h.split('\n').map((l) => '        ' + JSON.stringify(l.replace(/\s+$/, '')));
  const next = j.replace(re, (m, a, b, c) => a + lines.join(',\n') + c);
  if (next === j) { console.log('Already in sync: ' + js); continue; }
  changed++;
  console.log((write ? 'Synced: ' : 'Would sync: ') + js);
  if (write) { fs.writeFileSync(js + '.bak', j); fs.writeFileSync(js, next); }
}
if (!write && changed) { console.log('(dry-run) --write ke saath dobara chalao.'); }
process.exit(failed ? 1 : 0);
