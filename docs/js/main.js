/* ==========================================================================
   Masla-e-Karachi — main.js
   --------------------------------------------------------------------------
   Is file mein sab "zinda" cheezein hain. Har hissa alag function hai aur
   try/catch mein chalta hai — ek hissa toot jaye to baaqi website chalti rahe.

   1.  SEO: canonical / og:url / og:image mein SITE_URL lagana (config.js se)
   2.  "Visit Real Website" buttons ka link (sirf https, config.js se)
   3.  Contact email link (config.js se)
   4.  Link security: javascript: links band, bahar ke links par rel=noopener
   5.  Header: scroll par "is-scrolled" look
   6.  Mobile menu: Escape, bahar click, Tab bahar jaye to band, resize par band
   7.  In-page links: sahi jagah focus (keyboard + screen reader ke liye),
       404 page ke <base> wale bug se bachao
   8.  "On this page" list mein jo section nazar aa raha ho use highlight
   9.  .reveal wali cheezein scroll par nazar aana (jump karne par bhi theek)
   10. Scroll progress bar: jin browsers mein CSS-only version nahi chalta
   11. Mouse ke peeche halka hara noor (sirf desktop, config se band ho sakta)
   12. "Upar jao" button (config se band ho sakta)
   13. Emergency bar: line hamesha chalti rahe (infinite marquee)

   Sab kuch CSP-safe hai: koi inline <style>, eval ya inline handler nahi.
   Styles sirf JS ke CSSOM (el.style.x = ...) se lagti hain, jo
   "style-src 'self'" mein allowed hai.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.MEK_CONFIG || {};
  var doc = document;
  var root = doc.documentElement;
  var DEBUG = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  var SEO_PLACEHOLDER = 'https://YOUR-USERNAME.github.io/masla-e-karachi-landing/';

  /* ---------- chhote helpers ---------- */
  function each(selector, fn, scope) {
    Array.prototype.forEach.call((scope || doc).querySelectorAll(selector), fn);
  }

  function one(selector) { return doc.querySelector(selector); }

  function media(query) {
    return !!(window.matchMedia && window.matchMedia(query).matches);
  }

  function reduced() { return media('(prefers-reduced-motion: reduce)'); }

  function isRtl() { return root.getAttribute('dir') === 'rtl'; }

  function scrollY() { return window.pageYOffset || root.scrollTop || 0; }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  /* scroll jaise bhaari events: ek frame mein sirf ek baar kaam */
  function throttle(fn) {
    var queued = false;
    var raf = window.requestAnimationFrame || function (cb) { return window.setTimeout(cb, 16); };
    return function () {
      if (queued) { return; }
      queued = true;
      raf(function () { queued = false; fn(); });
    };
  }

  function safe(name, fn) {
    try { fn(); } catch (err) {
      if (DEBUG && window.console) { window.console.error('[MEK] ' + name + ':', err); }
    }
  }

  function safeDecode(s) {
    try { return decodeURIComponent(s); } catch (e) { return ''; }
  }

  function addRel(a, tokens) {
    var cur = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
    tokens.forEach(function (t) { if (cur.indexOf(t) < 0) { cur.push(t); } });
    a.setAttribute('rel', cur.join(' '));
  }

  /* Sirf https (ya localhost par http), user:pass wale link nahi */
  function safeUrl(raw) {
    var s = String(raw || '').trim();
    if (!s) { return ''; }
    var u;
    try { u = new URL(s); } catch (e) { return ''; }
    if (u.username || u.password) { return ''; }
    if (u.protocol === 'https:') { return u.href; }
    if (u.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(u.hostname)) { return u.href; }
    return '';
  }

  function lang() {
    return (window.MEK_I18N && window.MEK_I18N.lang) || root.getAttribute('lang') || 'en';
  }

  /* ==========================================================================
     1. SEO — SITE_URL lagana
     ========================================================================== */
  function setupSeo() {
    var base = String(CFG.SITE_URL || '').trim();
    if (!/^https:\/\/[^\s]+$/i.test(base)) { return; }
    if (base.charAt(base.length - 1) !== '/') { base += '/'; }

    each('link[rel="canonical"], meta[property="og:url"], meta[property="og:image"], meta[name="twitter:image"]', function (el) {
      var attr = el.tagName === 'LINK' ? 'href' : 'content';
      var val = el.getAttribute(attr) || '';
      if (val.indexOf(SEO_PLACEHOLDER) === 0) {
        el.setAttribute(attr, base + val.slice(SEO_PLACEHOLDER.length));
      }
    });
  }

  /* ==========================================================================
     2. ASLI WEBSITE KA LINK
     Har link jis par data-live-link ho, uska href config.js se aata hai.
     ========================================================================== */
  function setupLiveLinks() {
    var url = safeUrl(CFG.LIVE_SITE_URL);
    if (!url && DEBUG && window.console) {
      window.console.warn('[MEK] LIVE_SITE_URL sahi https:// link nahi hai (config.js)');
    }

    each('[data-live-link]', function (a) {
      if (url) {
        a.setAttribute('href', url);
        a.removeAttribute('aria-disabled');
        addRel(a, ['noopener']);
      } else {
        a.setAttribute('href', '#');
        a.setAttribute('aria-disabled', 'true');
        a.addEventListener('click', function (e) { e.preventDefault(); });
      }
    });
  }

  /* ==========================================================================
     3. CONTACT EMAIL
     ========================================================================== */
  function setupContactLinks() {
    var email = String(CFG.CONTACT_EMAIL || '').trim();
    var valid = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/.test(email);

    each('[data-contact-link]', function (a) {
      if (valid) {
        a.setAttribute('href', 'mailto:' + email);
        a.removeAttribute('data-i18n'); /* taake zubaan badalne par email na badle */
        a.removeAttribute('aria-disabled');
        a.textContent = email;
      } else {
        a.setAttribute('aria-disabled', 'true');
        a.addEventListener('click', function (e) { e.preventDefault(); });
      }
    });
  }

  /* ==========================================================================
     4. LINK SECURITY
     ========================================================================== */
  function hardenLinks() {
    each('a[href]', function (a) {
      var raw = (a.getAttribute('href') || '').replace(/[\u0000-\u0020]/g, '');

      /* javascript: / data: / vbscript: links foran khatam */
      if (/^(javascript|data|vbscript):/i.test(raw)) {
        a.removeAttribute('href');
        return;
      }

      var external = false;
      if (/^(https?:)?\/\//i.test(raw)) {
        try { external = new URL(a.href, window.location.href).host !== window.location.host; }
        catch (e) { external = true; }
      }

      if (external) {
        /* asli website ka referrer rehne do (traffic kahan se aaya), baaqi par nahi */
        addRel(a, a.hasAttribute('data-live-link') ? ['noopener'] : ['noopener', 'noreferrer']);
      } else if (a.getAttribute('target') === '_blank') {
        addRel(a, ['noopener']);
      }
    });
  }

  /* ==========================================================================
     5. HEADER — scroll par look badalna
     ========================================================================== */
  function setupHeader() {
    var header = one('.site-header');
    if (!header) { return; }
    var update = function () { header.classList.toggle('is-scrolled', scrollY() > 8); };
    update();
    window.addEventListener('scroll', throttle(update), { passive: true });
  }

  /* ==========================================================================
     6. MOBILE MENU
     ========================================================================== */
  function setupMenu() {
    var header = one('.site-header');
    var toggle = one('.nav-toggle');
    var nav = doc.getElementById('site-nav');
    if (!header || !toggle || !nav) { return; }

    function isOpen() { return header.classList.contains('is-open'); }

    function setOpen(open) {
      header.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function () { setOpen(!isOpen()); });

    /* Menu ke kisi link par click karte hi band */
    nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) { setOpen(false); }
    });

    /* Escape dabane par band, focus wapas button par */
    doc.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    /* Menu ke bahar click karne par band */
    doc.addEventListener('click', function (e) {
      if (isOpen() && !header.contains(e.target)) { setOpen(false); }
    });

    /* Tab dabate dabate focus header se bahar nikal jaye to band */
    header.addEventListener('focusout', function (e) {
      if (isOpen() && e.relatedTarget && !header.contains(e.relatedTarget)) { setOpen(false); }
    });

    /* Back button se wapas aao to menu band mile */
    window.addEventListener('pageshow', function () { setOpen(false); });

    /* Screen bari ho jaye (desktop) to menu band kar do */
    var wide = window.matchMedia ? window.matchMedia('(min-width: 62.5rem)') : null;
    if (wide) {
      var onChange = function (e) { if (e.matches) { setOpen(false); } };
      if (wide.addEventListener) { wide.addEventListener('change', onChange); }
      else if (wide.addListener) { wide.addListener(onChange); }
    }
  }

  /* ==========================================================================
     7. IN-PAGE LINKS (#section) — focus + 404 <base> fix
     Scroll ka offset CSS ke scroll-padding-top se aata hai.
     ========================================================================== */
  function focusTarget(el) {
    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '-1');
      el.addEventListener('blur', function onBlur() {
        el.removeAttribute('tabindex');
        el.removeEventListener('blur', onBlur);
      });
    }
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }

  function setupAnchors() {
    /* 404.html <base href> lagata hai; us par "#main" ka matlab home page ho jata hai.
       Aise mein hum link ko khud sambhalte hain. */
    var manual = !!doc.baseURI && doc.baseURI.split('#')[0] !== window.location.href.split('#')[0];

    doc.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) { return; }

      var href = a.getAttribute('href');
      if (href.length < 2) { return; }
      var target = doc.getElementById(safeDecode(href.slice(1)));
      if (!target) { return; }

      if (manual) {
        e.preventDefault();
        target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
        try { window.history.replaceState(null, '', window.location.pathname + window.location.search + href); }
        catch (err) { /* koi baat nahi */ }
      }
      focusTarget(target);
    });
  }

  /* ==========================================================================
     8. "ON THIS PAGE" HIGHLIGHT
     ========================================================================== */
  function setupToc() {
    var items = [];
    each('.toc a[href^="#"]', function (a) {
      var el = doc.getElementById(safeDecode(a.getAttribute('href').slice(1)));
      if (el) { items.push({ a: a, el: el }); }
    });
    if (!items.length) { return; }

    function mark(active) {
      items.forEach(function (it) {
        var on = it === active;
        it.a.classList.toggle('is-active', on);
        if (on) { it.a.setAttribute('aria-current', 'true'); } else { it.a.removeAttribute('aria-current'); }
      });
    }

    function update() {
      var header = one('.site-header');
      var line = (header ? header.offsetHeight : 0) + Math.round(window.innerHeight * 0.2);
      var active = null;
      items.forEach(function (it) {
        if (it.el.getBoundingClientRect().top <= line) { active = it; }
      });
      if (window.innerHeight + scrollY() >= root.scrollHeight - 4) { active = items[items.length - 1]; }
      mark(active);
    }

    update();
    window.addEventListener('scroll', throttle(update), { passive: true });
    window.addEventListener('resize', throttle(update));
  }

  /* ==========================================================================
     9. REVEAL (scroll par nazar aana)
     ========================================================================== */
  function setupReveal() {
    if (!doc.querySelector('.reveal')) { return; }

    function showAll() { each('.reveal', function (el) { el.classList.add('is-visible'); }); }

    window.addEventListener('beforeprint', showAll);

    if (reduced() || !('IntersectionObserver' in window)) { showAll(); return; }

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        /* Jo cheez screen ke UPAR reh gayi (hash se neeche jump kiya) use bhi dikha do,
           warna wapas scroll karne par gayab mile */
        var passed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        if (entry.isIntersecting || passed) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    each('.reveal', function (el) { io.observe(el); });
  }

  /* ==========================================================================
     10. SCROLL PROGRESS — fallback
     CSS-only version sirf un browsers mein chalta hai jo scroll-driven animation
     samajhte hain. Baaqi (Firefox, purana Safari) ke liye yeh JS wala.
     ========================================================================== */
  function setupProgressFallback() {
    var wrap = one('.scroll-progress');
    var bar = one('.scroll-progress__bar');
    if (!wrap || !bar || reduced()) { return; }
    if (window.CSS && window.CSS.supports && window.CSS.supports('animation-timeline: scroll()')) { return; }

    var w = wrap.style;
    w.display = 'block';
    w.position = 'fixed';
    w.top = '0';
    w.left = '0';
    w.right = '0';
    w.height = '3px';
    w.zIndex = '300';
    w.pointerEvents = 'none';

    var b = bar.style;
    b.display = 'block';
    b.height = '100%';
    b.boxShadow = '0 0 12px #39ff14, 0 0 2px #7dff63';
    b.transform = 'scaleX(0)';
    b.willChange = 'transform';

    function direction() {
      var rtl = isRtl();
      b.background = 'linear-gradient(' + (rtl ? 'to left' : 'to right') + ', #22c70a, #39ff14, #7dff63)';
      b.transformOrigin = rtl ? '100% 50%' : '0 50%';
    }

    var update = throttle(function () {
      var max = root.scrollHeight - window.innerHeight;
      var p = max > 0 ? clamp(scrollY() / max, 0, 1) : 0;
      b.transform = 'scaleX(' + p.toFixed(4) + ')';
    });

    direction();
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    doc.addEventListener('mek:langchange', direction);
  }

  /* ==========================================================================
     11. CURSOR GLOW — mouse ke peeche halka hara noor
     Sirf mouse wale desktop par. Touch / reduced-motion par bilkul nahi.
     ========================================================================== */
  function setupCursorGlow() {
    if (CFG.FX_CURSOR_GLOW === false) { return; }
    if (!media('(hover: hover) and (pointer: fine)') || reduced()) { return; }

    var el = doc.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    var s = el.style;
    s.position = 'fixed';
    s.top = '0';
    s.left = '0';
    s.width = '520px';
    s.height = '520px';
    s.marginTop = '-260px';
    s.marginLeft = '-260px';
    s.borderRadius = '50%';
    s.pointerEvents = 'none';
    s.zIndex = '1';
    s.opacity = '0';
    s.transition = 'opacity 0.4s ease';
    s.willChange = 'transform, opacity';
    s.mixBlendMode = 'screen';
    s.background = 'radial-gradient(circle, rgba(57,255,20,0.09) 0%, rgba(57,255,20,0.035) 35%, rgba(57,255,20,0) 65%)';
    doc.body.appendChild(el);

    var tx = 0, ty = 0, x = 0, y = 0, raf = 0, seen = false;

    function loop() {
      x += (tx - x) * 0.14;   /* naram peecha karna (easing) */
      y += (ty - y) * 0.14;
      s.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      if (Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4) { raf = window.requestAnimationFrame(loop); }
      else { raf = 0; }
    }

    doc.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') { return; }
      tx = e.clientX;
      ty = e.clientY;
      if (!seen) { x = tx; y = ty; seen = true; }
      s.opacity = '1';
      if (!raf) { raf = window.requestAnimationFrame(loop); }
    }, { passive: true });

    root.addEventListener('mouseleave', function () { s.opacity = '0'; });
    window.addEventListener('beforeprint', function () { s.display = 'none'; });
    window.addEventListener('afterprint', function () { s.display = ''; });
  }

  /* ==========================================================================
     12. BACK TO TOP
     ========================================================================== */
  function setupBackToTop() {
    if (CFG.BACK_TO_TOP === false) { return; }

    var LABEL = { en: 'Back to top', ur: 'اوپر جائیں' };
    var SHOW_AFTER = 700;

    var btn = doc.createElement('button');
    btn.type = 'button';

    var NS = 'http://www.w3.org/2000/svg';
    var svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.4');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    ['M12 19V5', 'm5 12 7-7 7 7'].forEach(function (d) {
      var p = doc.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    btn.appendChild(svg);

    var s = btn.style;
    s.position = 'fixed';
    s.insetInlineEnd = 'calc(1rem + env(safe-area-inset-right, 0px))';
    s.insetBlockEnd = 'calc(1rem + env(safe-area-inset-bottom, 0px))';
    s.zIndex = '90';
    s.width = '2.9rem';
    s.height = '2.9rem';
    s.padding = '0';
    s.display = 'grid';
    s.placeItems = 'center';
    s.borderRadius = '50%';
    s.border = '1px solid rgba(57,255,20,0.45)';
    s.background = 'rgba(13,13,13,0.9)';
    s.color = '#39ff14';
    s.cursor = 'pointer';
    s.boxShadow = '0 8px 24px -8px rgba(0,0,0,0.8), 0 0 18px rgba(57,255,20,0.22)';
    s.webkitBackdropFilter = 'blur(8px)';
    s.backdropFilter = 'blur(8px)';
    s.opacity = '0';
    s.visibility = 'hidden';
    s.transform = 'translateY(12px)';
    s.transition = 'opacity 0.25s ease, transform 0.25s ease, visibility 0s linear 0.25s, background-color 0.2s ease, color 0.2s ease';

    function label() {
      var text = LABEL[lang()] || LABEL.en;
      btn.setAttribute('aria-label', text);
      btn.setAttribute('title', text);
    }

    function hot(on) {
      s.background = on ? '#39ff14' : 'rgba(13,13,13,0.9)';
      s.color = on ? '#0d0d0d' : '#39ff14';
    }

    var shown = false;
    function update() {
      var want = scrollY() > SHOW_AFTER;
      if (want === shown) { return; }
      shown = want;
      s.opacity = want ? '1' : '0';
      s.visibility = want ? 'visible' : 'hidden';
      s.transform = want ? 'none' : 'translateY(12px)';
      s.transitionDelay = want ? '0s' : '0s, 0s, 0.25s, 0s, 0s';
      btn.tabIndex = want ? 0 : -1;
    }

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      var top = doc.getElementById('top');   /* focus upar le jao, button gayab hota hai */
      if (top) { focusTarget(top); }
    });
    btn.addEventListener('mouseenter', function () { hot(true); });
    btn.addEventListener('mouseleave', function () { hot(false); });
    btn.addEventListener('focus', function () { hot(true); });
    btn.addEventListener('blur', function () { hot(false); });

    label();
    btn.tabIndex = -1;
    doc.body.appendChild(btn);
    update();

    window.addEventListener('scroll', throttle(update), { passive: true });
    doc.addEventListener('mek:langchange', label);
    window.addEventListener('beforeprint', function () { s.display = 'none'; });
    window.addEventListener('afterprint', function () { s.display = 'grid'; });
  }

  /* ==========================================================================
     13. EMERGENCY BAR — chalti hui line (infinite marquee)
     HTML nahi badla. Asli <p> bar ke andar hi rehta hai (screen reader ek hi baar
     padhta hai); baaqi sab copies aria-hidden hain. CSS: css/layout/topbar.css
     ========================================================================== */
  function setupEmergencyMarquee() {
    var bar = one('.emergency-bar');
    var inner = bar && bar.querySelector('.emergency-bar__inner');
    var orig = inner && inner.querySelector('p');
    if (!bar || !inner || !orig) { return; }

    var SPEED = 60;            /* pixel per second: hamesha ek jaisi raftaar */
    var track = null, g1 = null, g2 = null;
    var builtCopies = 0, builtText = '';

    function make(cls) {
      var d = doc.createElement('div');
      d.className = cls;
      return d;
    }

    function clone() {
      var c = orig.cloneNode(true);
      c.removeAttribute('data-i18n-html');  /* i18n sirf asli <p> ko badle */
      c.removeAttribute('data-i18n');
      c.setAttribute('aria-hidden', 'true');
      c.classList.add('emergency-bar__clone');
      return c;
    }

    function ensureStructure() {
      if (track) { return; }
      track = make('emergency-bar__track');
      g1 = make('emergency-bar__group');
      g2 = make('emergency-bar__group');
      g2.setAttribute('aria-hidden', 'true');
      track.appendChild(g1);
      track.appendChild(g2);
      inner.appendChild(track);
      g1.appendChild(orig);
      bar.classList.add('emergency-bar--marquee');
    }

    function sync(force) {
      ensureStructure();

      /* Naap ke liye pehle sirf asli <p> */
      var text = orig.textContent || '';
      var itemW = orig.getBoundingClientRect().width;
      if (!itemW) { return; }
      var gap = parseFloat(window.getComputedStyle(g1).columnGap) || 0;
      var barW = inner.clientWidth || window.innerWidth;
      var copies = Math.ceil(barW / (itemW + gap)) + 1;

      if (force || copies !== builtCopies || text !== builtText || g1.children.length !== copies) {
        while (g1.children.length > 1) { g1.removeChild(g1.lastChild); }
        while (g2.firstChild) { g2.removeChild(g2.firstChild); }
        var i;
        for (i = 1; i < copies; i++) { g1.appendChild(clone()); }
        for (i = 0; i < copies; i++) { g2.appendChild(clone()); }
        builtCopies = copies;
        builtText = text;
      }

      /* Group ki chowrai / raftaar = chalne ka waqt (CSSOM, inline style attribute nahi) */
      var groupW = g1.getBoundingClientRect().width;
      if (groupW > 0) {
        bar.style.setProperty('--marquee-duration', (groupW / SPEED).toFixed(2) + 's');
      }
    }

    sync(true);

    var onResize = throttle(function () { sync(false); });
    window.addEventListener('resize', onResize);

    /* Zubaan badli: text naya hai, copies dobara banao */
    doc.addEventListener('mek:langchange', function () { safe('marquee', function () { sync(true); }); });

    /* Font aane ke baad chowrai badalti hai: dobara naapo */
    if (doc.fonts && doc.fonts.ready) {
      doc.fonts.ready.then(function () { safe('marquee', function () { sync(true); }); });
    }
    window.addEventListener('load', function () { safe('marquee', function () { sync(true); }); });
  }

  /* ==========================================================================
     SHURUAAT
     ========================================================================== */
  function init() {
    safe('seo', setupSeo);
    safe('liveLinks', setupLiveLinks);
    safe('contactLinks', setupContactLinks);
    safe('hardenLinks', hardenLinks);
    safe('header', setupHeader);
    safe('menu', setupMenu);
    safe('anchors', setupAnchors);
    safe('toc', setupToc);
    safe('reveal', setupReveal);
    safe('progress', setupProgressFallback);
    safe('cursorGlow', setupCursorGlow);
    safe('backToTop', setupBackToTop);
    safe('marquee', setupEmergencyMarquee);

    /* Zubaan badalne par i18n naye links (<a> in translated text) laata hai: dobara check */
    doc.addEventListener('mek:langchange', function () { safe('hardenLinks', hardenLinks); });
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
