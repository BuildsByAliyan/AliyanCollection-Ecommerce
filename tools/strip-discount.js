#!/usr/bin/env node
/* products.js se purani 'discount' field hatata hai (discountPercent computed rehta hai)
 * Use:  node tools/strip-discount.js [path]          (dry-run)
 *       node tools/strip-discount.js [path] --write  (.bak bana kar likhta hai)
 */
const fs = require('fs');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'docs/js/data/products.js';
const write = process.argv.includes('--write');
const src = fs.readFileSync(file, 'utf8');
let count = 0;
let out = src.replace(/^[ \t]*["']?discount["']?[ \t]*:[ \t]*["'][^"'\n]*["'][ \t]*,?[ \t]*\r?\n/gm, (m) => { count++; return ''; });
out = out.replace(/[ \t]*["']?discount["']?[ \t]*:[ \t]*["'][^"'\n]*["'][ \t]*,?/g, (m) => { count++; return ''; });
console.log((write ? 'Removed' : 'Would remove') + ' ' + count + ' discount field(s) in ' + file);
if (write) { fs.writeFileSync(file + '.bak', src); fs.writeFileSync(file, out); }
