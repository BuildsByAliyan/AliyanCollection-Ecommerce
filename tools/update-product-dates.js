#!/usr/bin/env node
/* Sab dateAdded ko aage shift karta hai taake sab se nayi date = aaj (ya --newest YYYY-MM-DD) ho; ordering same rehti hai
 * Use:  node tools/update-product-dates.js [path] [--newest 2026-10-20] [--write]
 */
const fs = require('fs');
const args = process.argv.slice(2);
const file = args[0] && !args[0].startsWith('--') ? args[0] : 'docs/js/data/products.js';
const write = args.includes('--write');
const ni = args.indexOf('--newest');
const newest = ni > -1 ? args[ni + 1] : new Date().toISOString().slice(0, 10);
const re = /(["']?dateAdded["']?\s*:\s*["'])(\d{4}-\d{2}-\d{2})(["'])/g;
const src = fs.readFileSync(file, 'utf8');
const dayMs = 86400000;
const toMs = (s) => Date.parse(s + 'T00:00:00Z');
const dates = [...src.matchAll(re)].map((m) => toMs(m[2]));
if (!dates.length) { console.log('Koi dateAdded nahi mili: ' + file); process.exit(0); }
const shift = Math.round((toMs(newest) - Math.max(...dates)) / dayMs);
const out = src.replace(re, (m, a, d, b) => a + new Date(toMs(d) + shift * dayMs).toISOString().slice(0, 10) + b);
console.log((write ? 'Updated ' : 'Would update ') + dates.length + ' dates, shift = ' + shift + ' days (newest -> ' + newest + ')');
if (write) { fs.writeFileSync(file + '.bak', src); fs.writeFileSync(file, out); }
