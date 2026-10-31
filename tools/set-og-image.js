#!/usr/bin/env node
/* og:image ka relative path poore https URL mein badalta hai (pages ke folder ke hisaab se sahi resolve karta hai)
 * Use:  node tools/set-og-image.js https://USERNAME.github.io/REPO [--write]
 *       (docs/ ke andar ke sab .html check karta hai, partials/ chhod kar)
 */
const fs = require('fs');
const path = require('path');
const base = (process.argv[2] || '').replace(/\/+$/, '');
const write = process.argv.includes('--write');
if (!/^https?:\/\//.test(base)) { console.error('Pehla argument full base URL do, jaise https://user.github.io/repo'); process.exit(1); }
const docs = 'docs';
function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name === 'partials' || e.name === 'assets' ? [] : walk(p);
    return e.name.endsWith('.html') ? [p] : [];
  });
}
let total = 0;
for (const f of walk(docs)) {
  const dir = path.dirname(path.relative(docs, f)).split(path.sep).join('/');
  const prefix = base + '/' + (dir === '.' ? '' : dir + '/');
  const fix = (rel) => new URL(rel, prefix).href;
  const src = fs.readFileSync(f, 'utf8');
  const a = /(<meta[^>]*property=["']og:image["'][^>]*content=["'])(?!https?:\/\/)([^"']+)(["'])/gi;
  const b = /(<meta[^>]*content=["'])(?!https?:\/\/)([^"']+)(["'][^>]*property=["']og:image["'])/gi;
  let n = 0;
  const out = src.replace(a, (m, x, rel, y) => { n++; return x + fix(rel) + y; }).replace(b, (m, x, rel, y) => { n++; return x + fix(rel) + y; });
  if (n) { total += n; console.log((write ? 'Fixed ' : 'Would fix ') + f); if (write) fs.writeFileSync(f, out); }
}
console.log('Total og:image tags: ' + total);
