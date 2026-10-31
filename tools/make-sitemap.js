#!/usr/bin/env node
/* docs/ ke andar ke .html pages se docs/sitemap.xml banata hai.
 *
 * Use (plain node, koi package nahi):
 *   node tools/make-sitemap.js                      -> neeche wala BASE_URL use hota hai
 *   node tools/make-sitemap.js https://USER.github.io/REPO [docsDir]
 *   node tools/make-sitemap.js --lastmod=2026-10-26 -> lastmod khud set karo (default: aaj ki date)
 */
const fs = require('fs');
const path = require('path');

// ---- Site ka asli URL - SIRF YAHAN badlo (aakhir mein "/" nahi) -------------------------------
const BASE_URL = 'https://buildsbyaliyan.github.io/AliyanCollection-Ecommerce';
// ----------------------------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = args.find((a) => a.startsWith('--lastmod='));
const positional = args.filter((a) => !a.startsWith('--'));
const base = (positional[0] || BASE_URL).replace(/\/+$/, '');
const docs = positional[1] || 'docs';
if (!/^https?:\/\//.test(base)) { console.error('Base URL do, jaise https://user.github.io/repo'); process.exit(1); }

// lastmod: --lastmod=YYYY-MM-DD ya aaj ki date (is computer ke hisab se)
const lastmod = flag ? flag.split('=')[1] : new Date().toLocaleDateString('en-CA');
if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) { console.error('--lastmod ka format YYYY-MM-DD hona chahiye'); process.exit(1); }

// account/ private pages aur product.html (?id ke baghair khali page) sitemap mein nahi
const skip = new Set(['partials', 'assets', 'css', 'js', 'account']);
const skipFiles = new Set(['404.html', 'footer.html', 'product.html']);

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return skip.has(e.name) ? [] : walk(p);
    return e.name.endsWith('.html') && !skipFiles.has(e.name) ? [p] : [];
  });
}

// Google priority / changefreq ko hint se zyada nahi maanta, phir bhi sahi values likhte hain
function info(u) {
  if (u === 'index.html') return { changefreq: 'weekly', priority: '1.0' };
  if (u.startsWith('pages/shop/')) return { changefreq: 'weekly', priority: '0.8' };
  if (u === 'pages/info/blog.html') return { changefreq: 'weekly', priority: '0.7' };
  if (u.startsWith('pages/legal/')) return { changefreq: 'yearly', priority: '0.3' };
  return { changefreq: 'monthly', priority: '0.6' };            // about, contact ...
}

const urls = walk(docs).map((f) => path.relative(docs, f).split(path.sep).join('/')).sort();
const lines = urls.map((u) => {
  const loc = u === 'index.html' ? base + '/' : base + '/' + u;
  const i = info(u);
  return '  <url><loc>' + loc + '</loc><lastmod>' + lastmod + '</lastmod><changefreq>' + i.changefreq + '</changefreq><priority>' + i.priority + '</priority></url>';
});
const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
  .concat(lines).concat(['</urlset>', '']).join('\n');

fs.writeFileSync(path.join(docs, 'sitemap.xml'), xml);
console.log('sitemap.xml likhi: ' + urls.length + ' pages, lastmod ' + lastmod + ' -> ' + path.join(docs, 'sitemap.xml'));
