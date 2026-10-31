/* =====================================================================
   js/core/utils.js
   Aliyan Collection - small helper functions used by every other script.
   Loaded after config.js + data/products.js, BEFORE storage.js / cart.js.
   Plain script -> everything is on  window.AliyanUtils
   ---------------------------------------------------------------------
   DOM        : qs, qsa, on, onReady, lockScroll, unlockScroll
   Text       : escapeHtml, capitalize, slugify
   Numbers    : toNumber, clamp, pad2, formatPrice
   Validation : isValidEmail, isValidPhone, normalizePhone, samePhone
   URLs/images: getQueryParam, productUrl, imageUrl
   Time       : formatDate, daysBetween
   Misc       : debounce, throttle, uid, generateOrderId, copyToClipboard
   Also installs ONE global image-error handler: a broken product image is
   replaced by the placeholder picture (no broken-image icons anywhere).
   ===================================================================== */
(function (global) {
    'use strict';

    var doc = global.document;
    var cfg = global.AliyanConfig || {};
    var U = {};

    /* ------------------------- DOM ------------------------- */

    U.qs = function (selector, root) {
        return (root || doc).querySelector(selector);
    };

    U.qsa = function (selector, root) {
        return Array.prototype.slice.call((root || doc).querySelectorAll(selector));
    };

    /* Event delegation:  on(document, 'click', '.add-to-cart', function (e, matchedEl) {...}) */
    U.on = function (root, eventName, selector, handler) {
        if (!root) { return function () {}; }
        var listener = function (event) {
            var target = event.target;
            if (!target || !target.closest) { return; }
            var match = target.closest(selector);
            if (match && root.contains(match)) { handler.call(match, event, match); }
        };
        root.addEventListener(eventName, listener);
        return function () { root.removeEventListener(eventName, listener); };
    };

    /* Run fn when the HTML is ready (works even if called late) */
    U.onReady = function (fn) {
        if (doc.readyState === 'loading') {
            doc.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    };

    /* Stop the page scrolling behind the cart / menu / search / modal.
       A counter keeps it locked until EVERY opener has called unlockScroll(). */
    var scrollLocks = 0;
    U.lockScroll = function () {
        scrollLocks += 1;
        if (doc.body) { doc.body.classList.add('no-scroll'); }
    };
    U.unlockScroll = function () {
        scrollLocks = Math.max(0, scrollLocks - 1);
        if (scrollLocks === 0 && doc.body) { doc.body.classList.remove('no-scroll'); }
    };

    /* ------------------------- Text ------------------------- */

    var HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

    /* ALWAYS use this before putting text into innerHTML */
    U.escapeHtml = function (value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/[&<>"'`]/g, function (ch) { return HTML_ESCAPES[ch]; });
    };

    U.capitalize = function (text) {
        text = String(text || '');
        return text.charAt(0).toUpperCase() + text.slice(1);
    };

    U.slugify = function (text) {
        return String(text || '')
            .toLowerCase()
            .replace(/['’]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    /* ------------------------- Numbers ------------------------- */

    U.toNumber = function (value, fallback) {
        var n = parseFloat(value);
        return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
    };

    U.clamp = function (value, min, max) {
        return Math.min(max, Math.max(min, value));
    };

    U.pad2 = function (n) {
        n = Math.floor(Math.abs(Number(n) || 0));
        return n < 10 ? '0' + n : String(n);
    };

    /* formatPrice(59.9) -> "$59.90" */
    U.formatPrice = function (value) {
        if (typeof cfg.formatPrice === 'function') { return cfg.formatPrice(value); }
        var n = Number(value);
        return '$' + (isFinite(n) ? n : 0).toFixed(2);
    };

    /* ------------------------- Validation ------------------------- */

    U.isValidEmail = function (value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
    };

    /* Pakistan mobile numbers -> one form: 03XXXXXXXXX (11 digits).
       03001234567, +92 300 1234567, 0092 300 1234567 and 3001234567 all become 03001234567.
       Anything else just keeps its digits (so it fails isValidPhone). */
    U.normalizePhone = function (value) {
        var d = String(value || '').replace(/\D/g, '');
        if (d.indexOf('0092') === 0) { d = d.slice(2); }
        if (d.length === 12 && d.indexOf('92') === 0) { d = '0' + d.slice(2); }
        if (d.length === 10 && d.charAt(0) === '3') { d = '0' + d; }
        return d;
    };

    /* valid = 03 + 9 more digits (11 digits in total) after normalizing */
    U.isValidPhone = function (value) {
        return /^03\d{9}$/.test(U.normalizePhone(value));
    };

    /* the FULL normalized numbers must match (not just the last 10 digits) */
    U.samePhone = function (a, b) {
        var x = U.normalizePhone(a);
        var y = U.normalizePhone(b);
        return !!x && x === y;
    };

    /* ------------------------- URLs / images ------------------------- */

    U.getQueryParam = function (name) {
        try {
            return new URLSearchParams(global.location.search).get(name);
        } catch (e) {
            return null;
        }
    };

    /* productUrl('M-101') -> ".../pages/shop/product.html?id=M-101" (correct from any page) */
    U.productUrl = function (id) {
        var page = (cfg.paths && cfg.paths.pages && cfg.paths.pages.product) || 'pages/shop/product.html';
        var url = typeof cfg.url === 'function' ? cfg.url(page) : page;
        return url + '?id=' + encodeURIComponent(id);
    };

    /* imageUrl(product) or imageUrl('assets/images/...') -> path that works from this page */
    U.imageUrl = function (productOrPath) {
        var path = typeof productOrPath === 'string'
            ? productOrPath
            : (productOrPath && productOrPath.image) || '';
        if (!path) { return U.placeholderUrl(); }
        return typeof cfg.url === 'function' ? cfg.url(path) : path;
    };

    U.placeholderUrl = function () {
        var p = (cfg.paths && cfg.paths.placeholderImage) || '';
        return typeof cfg.url === 'function' ? cfg.url(p) : p;
    };

    /* ------------------------- Time ------------------------- */

    /* formatDate(date) -> "20 Oct 2026" */
    U.formatDate = function (date, options) {
        var d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) { return ''; }
        try {
            return d.toLocaleDateString('en-GB', options || { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return d.toDateString();
        }
    };

    /* whole days from a to b (b defaults to now); negative -> 0 */
    U.daysBetween = function (a, b) {
        var start = a instanceof Date ? a : new Date(a);
        var end = b ? (b instanceof Date ? b : new Date(b)) : new Date();
        var diff = Math.floor((end.getTime() - start.getTime()) / 86400000);
        return isFinite(diff) && diff > 0 ? diff : 0;
    };

    /* ------------------------- Misc ------------------------- */

    U.debounce = function (fn, wait) {
        var timer = null;
        var debounced = function () {
            var ctx = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(ctx, args); }, wait === undefined ? 200 : wait);
        };
        debounced.cancel = function () { clearTimeout(timer); };
        return debounced;
    };

    U.throttle = function (fn, wait) {
        var last = 0, timer = null;
        wait = wait === undefined ? 100 : wait;
        return function () {
            var ctx = this, args = arguments, now = Date.now();
            var remaining = wait - (now - last);
            if (remaining <= 0) {
                clearTimeout(timer); timer = null;
                last = now;
                fn.apply(ctx, args);
            } else if (!timer) {
                timer = setTimeout(function () {
                    last = Date.now(); timer = null;
                    fn.apply(ctx, args);
                }, remaining);
            }
        };
    };

    U.uid = function () {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    };

    /* "ALY-LK3F9Z-7QX2" - unique order number */
    U.generateOrderId = function () {
        var rand = Math.random().toString(36).slice(2, 6).toUpperCase();
        while (rand.length < 4) { rand += '0'; }
        return 'ALY-' + Date.now().toString(36).toUpperCase() + '-' + rand;
    };

    /* copyToClipboard('text') -> Promise<true|false> */
    U.copyToClipboard = function (text) {
        text = String(text);
        function fallback() {
            try {
                var ta = doc.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.top = '-1000px';
                doc.body.appendChild(ta);
                ta.select();
                var ok = doc.execCommand('copy');
                doc.body.removeChild(ta);
                return ok;
            } catch (e) {
                return false;
            }
        }
        if (global.navigator && global.navigator.clipboard && global.isSecureContext) {
            return global.navigator.clipboard.writeText(text)
                .then(function () { return true; })
                .catch(function () { return fallback(); });
        }
        return Promise.resolve(fallback());
    };

    /* ------------------------- Global image fallback ------------------------- */
    /* 'error' does not bubble, so listen in the capture phase on the document.
       A failed <img> is swapped ONCE for the placeholder (no endless loop). */
    if (doc && doc.addEventListener) {
        doc.addEventListener('error', function (event) {
            var img = event.target;
            if (!img || img.tagName !== 'IMG' || img.hasAttribute('data-no-fallback')) { return; }
            if (img.getAttribute('data-fallback-done')) { return; }
            var placeholder = U.placeholderUrl();
            if (!placeholder) { return; }
            img.setAttribute('data-fallback-done', '1');
            img.src = placeholder;
        }, true);
    }

    global.AliyanUtils = U;

})(window);
