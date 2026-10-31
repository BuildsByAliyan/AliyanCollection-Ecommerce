/* =====================================================================
   js/components/toast.js
   Aliyan Collection - small pop-up messages ("Added to wishlist" etc.).
   Loaded BEFORE header.js / footer.js (other components use it).
   Plain script -> window.AliyanToast   (+ short alias  window.showToast)
   ---------------------------------------------------------------------
   Needs only config.js (optional). Styles: css/components/toast.css

   USE
     AliyanToast.show('Saved!');                       // plain message
     AliyanToast.show('Saved!', 'success');            // 'success' | 'error' | 'info'
     AliyanToast.show('Oops', 'error', 4000);          // custom time in ms
     AliyanToast.success('Done');   AliyanToast.error('Failed');   AliyanToast.info('FYI');
     AliyanToast.hide();
     showToast('Hello');                               // same as AliyanToast.show

   * Messages are inserted as TEXT (never HTML) -> always safe.
   * If the page has no <div id="toast">, it is created automatically.
   * A new toast replaces the one that is showing (no pile-up).
   ===================================================================== */
(function (global) {
    'use strict';

    if (global.AliyanToast) { return; }          // script included twice -> run once

    var doc = global.document;
    var cfg = global.AliyanConfig || {};

    var DEFAULT_MS = Number(cfg.toastDurationMs) > 0 ? Number(cfg.toastDurationMs) : 2500;
    var TYPES = ['success', 'error', 'info'];
    var timer = null;

    /* ------------------------- Element ------------------------- */

    function getElement() {
        if (!doc || !doc.body) { return null; }
        var el = doc.getElementById('toast');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'toast';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            doc.body.appendChild(el);
        }
        return el;
    }

    /* ------------------------- Show / hide ------------------------- */

    function hide() {
        clearTimeout(timer);
        timer = null;
        var el = doc && doc.getElementById('toast');
        if (el) { el.classList.remove('show'); }
    }

    function show(message, type, duration) {
        if (message === undefined || message === null || message === '') { return; }

        // show('text', 3000)  ->  second argument is the time
        if (typeof type === 'number') { duration = type; type = ''; }

        var el = getElement();
        if (!el) { return; }

        clearTimeout(timer);

        TYPES.forEach(function (t) { el.classList.remove(t); });
        if (TYPES.indexOf(type) !== -1) { el.classList.add(type); }

        el.textContent = String(message);
        el.classList.add('show');

        var ms = Number(duration) > 0 ? Number(duration) : (type === 'error' ? DEFAULT_MS + 1000 : DEFAULT_MS);
        timer = setTimeout(hide, ms);
    }

    /* ------------------------- Public API ------------------------- */

    var Toast = {
        show: show,
        hide: hide,
        success: function (message, duration) { show(message, 'success', duration); },
        error: function (message, duration) { show(message, 'error', duration); },
        info: function (message, duration) { show(message, 'info', duration); }
    };

    global.AliyanToast = Toast;
    global.showToast = show;

})(window);
