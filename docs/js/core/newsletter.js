/* Aliyan Collection - Newsletter: ek hi storage key, email validation, duplicate check, optional remote endpoint
 * config.js:  newsletterKey: 'aliyan_newsletter_emails',  newsletterEndpoint: ''  (Formspree / Mailchimp proxy / Apps Script URL)
 * Use:  AliyanNewsletter.subscribe(email, CONFIG).then(function (r) { r.status === 'subscribed' | 'duplicate' | 'invalid' })
 */
(function (global) {
  'use strict';
  var DEFAULT_KEY = 'aliyan_newsletter_emails';
  var LEGACY_KEYS = ['aliyanNewsletter'];

  function read(k) {
    try {
      var v = JSON.parse(global.localStorage.getItem(k) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function write(k, list) {
    try { global.localStorage.setItem(k, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }

  function migrate(k) {
    LEGACY_KEYS.forEach(function (old) {
      var list = read(old);
      if (!list.length) return;
      var cur = read(k);
      list.forEach(function (e) {
        e = typeof e === 'string' ? e : (e && e.email);
        e = e ? String(e).toLowerCase() : '';
        if (e && cur.indexOf(e) < 0) cur.push(e);
      });
      write(k, cur);
      try { global.localStorage.removeItem(old); } catch (e2) { /* ignore */ }
    });
  }

  function subscribe(email, cfg) {
    cfg = cfg || global.AliyanConfig || global.ALIYAN_CONFIG || global.CONFIG || {};
    var k = cfg.newsletterKey || DEFAULT_KEY;
    migrate(k);
    email = String(email || '').trim().toLowerCase();
    if (!isEmail(email)) return Promise.resolve({ status: 'invalid' });
    var list = read(k);
    if (list.indexOf(email) > -1) return Promise.resolve({ status: 'duplicate' });
    list.push(email);
    write(k, list);
    var ep = cfg.newsletterEndpoint;
    if (!ep || typeof fetch !== 'function') return Promise.resolve({ status: 'subscribed', remote: false });
    return fetch(ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email: email, source: global.location ? global.location.pathname : '' })
    }).then(function (r) { return { status: 'subscribed', remote: r.ok }; })
      .catch(function () { return { status: 'subscribed', remote: false }; });
  }

  global.AliyanNewsletter = { subscribe: subscribe, isEmail: isEmail, DEFAULT_KEY: DEFAULT_KEY };
})(typeof window !== 'undefined' ? window : globalThis);
