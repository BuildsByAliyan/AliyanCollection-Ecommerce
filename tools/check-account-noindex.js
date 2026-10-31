#!/usr/bin/env node
/* Checks the 4 private pages in docs/pages/account/: robots meta must be noindex, exactly one <h1>,
 * a title and a description. Plain node, no packages.
 *   node tools/check-account-noindex.js            (exit code 1 if any page fails)
 * Why this matters: robots.txt is NOT read on the GitHub project URL, so this meta tag is the only
 * thing that keeps these pages out of Google. */
const fs = require('fs');
const path = require('path');

const dir = path.join(process.argv[2] || 'docs', 'pages', 'account');
const pages = ['myaccount.html', 'order.html', 'trackyourorder.html', 'wishlist.html'];
let failed = 0;

pages.forEach((name) => {
  const file = path.join(dir, name);
  const problems = [];
  let robots = '(missing)', h1 = 0, title = '', desc = '';
  if (!fs.existsSync(file)) {
    problems.push('file not found');
  } else {
    const html = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');   // ignore comments
    const m = html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i);
    robots = m ? m[1] : '(missing)';
    h1 = (html.match(/<h1[\s>]/gi) || []).length;
    title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
    desc = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [, ''])[1].trim();
    if (!/(^|[\s,])noindex([\s,]|$)/i.test(robots)) problems.push('robots meta is not noindex');
    if (h1 !== 1) problems.push('h1 count is ' + h1 + ' (must be 1)');
    if (!title) problems.push('no <title>');
    if (!desc) problems.push('no meta description');
    if (/rel="canonical"/i.test(html)) problems.push('has a canonical link (not needed on a noindex page)');
  }
  console.log((problems.length ? 'FAIL ' : 'OK   ') + name.padEnd(22) + 'robots=' + robots.padEnd(18) + 'h1=' + h1 + '  title=' + JSON.stringify(title) + (problems.length ? '  <- ' + problems.join('; ') : ''));
  if (problems.length) failed++;
});

// the private pages must never be listed in the sitemap
const sm = path.join(process.argv[2] || 'docs', 'sitemap.xml');
if (fs.existsSync(sm) && /pages\/account\//.test(fs.readFileSync(sm, 'utf8'))) {
  console.log('FAIL sitemap.xml lists an account page'); failed++;
} else {
  console.log('OK   sitemap.xml has no account pages');
}
console.log(failed ? '\n' + failed + ' problem(s)' : '\nAll good: 4/4 pages are noindex with exactly one h1.');
process.exit(failed ? 1 : 0);
