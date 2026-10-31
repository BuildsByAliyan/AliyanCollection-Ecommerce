#!/usr/bin/env node
/* products.js ke daam USD se PKR mein badalta hai. Rate AAP batate ho (guess nahi karta).
 * Use:  node tools/convert-prices.js --rate 280 [--round 10] [path] [--write]
 *   (bina --write ke sirf dry-run: file nahi badalti)
 *   --write ke saath: pehle products.js.bak banta hai, phir daam badalte hain.
 */
const fs = require('fs');
const a = process.argv.slice(2);
const get = (k) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : undefined; };
const rate = parseFloat(get('--rate'));
const round = parseInt(get('--round') || '10', 10);
const write = a.includes('--write');
const file = a.find((x, i) => !x.startsWith('--') && !['--rate', '--round'].includes(a[i - 1])) || 'docs/js/data/products.js';
if (!rate || rate <= 0) { console.error('--rate zaroori hai (1 USD = ? PKR)'); process.exit(1); }
const src = fs.readFileSync(file, 'utf8');
const re = /(["']?(?:price|oldPrice|originalPrice|salePrice|compareAtPrice)["']?\s*:\s*)(\d+(?:\.\d+)?)/g;
let n = 0;
const out = src.replace(re, (m, k, v) => { n++; return k + (Math.round((parseFloat(v) * rate) / round) * round); });
console.log((write ? 'Converted ' : 'Would convert ') + n + ' price value(s) at rate ' + rate);
if (write) { fs.writeFileSync(file + '.bak', src); fs.writeFileSync(file, out); }
