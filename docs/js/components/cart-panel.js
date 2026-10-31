/* =====================================================================
   js/components/cart-panel.js
   Aliyan Collection - the slide-in shopping cart (HTML side).
   The cart LOGIC lives in core/cart.js; this file only draws it and
   handles clicks. Loaded after header.js (the panel HTML comes from
   partials/header.html).  Plain script -> window.AliyanCartPanel
   ---------------------------------------------------------------------
   Needs: config.js, utils.js, cart.js. Optional: toast.js, header.js.

   API
     AliyanCartPanel.open() / close() / toggle() / isOpen()
     AliyanCartPanel.render()          redraw the list (done automatically)
   GLOBALS (used by onclick="" in partials/footer.html)
     openCartPanel()   closeCartPanel()   toggleCartPanel()

   What it does
     * Opens from the header cart icon (#cart-icon-link), the footer link
       or any code calling AliyanCartPanel.open().
     * Closes with the X, the dark overlay, or the Escape key.
     * + / - buttons change the quantity, the bin button removes a line.
     * Keeps the page from scrolling behind it, keeps keyboard focus inside
       while open, and gives focus back when closed.
     * Empty cart -> shows "Your cart is currently empty." (no checkout).
   ===================================================================== */
(function (global) {
    'use strict';

    if (global.AliyanCartPanel) { return; }       // script included twice -> run once

    var doc = global.document;
    var cfg = global.AliyanConfig || {};
    var U = global.AliyanUtils || {};
    var Cart = global.AliyanCart;

    var state = {
        open: false,
        locked: false,
        wantOpen: false,        // open() was called before the panel HTML existed
        lastFocus: null,
        overlay: null
    };

    /* ------------------------- Helpers ------------------------- */

    function byId(id) { return doc.getElementById(id); }

    var ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

    function esc(value) {
        if (typeof U.escapeHtml === 'function') { return U.escapeHtml(value); }
        return String(value === undefined || value === null ? '' : value)
            .replace(/[&<>"'`]/g, function (ch) { return ESCAPES[ch]; });
    }

    function money(value) {
        if (typeof U.formatPrice === 'function') { return U.formatPrice(value); }
        return '$' + (isFinite(Number(value)) ? Number(value) : 0).toFixed(2);
    }

    function toast(message, type) {
        if (global.AliyanToast) { global.AliyanToast.show(message, type); }
    }

    function focusEl(el) {
        if (!el || typeof el.focus !== 'function') { return; }
        try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    }

    /* ------------------------- Overlay ------------------------- */

    function getOverlay() {
        if (state.overlay && doc.body.contains(state.overlay)) { return state.overlay; }
        var el = byId('cart-overlay');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'cart-overlay';
            el.setAttribute('aria-hidden', 'true');
            doc.body.appendChild(el);
        }
        state.overlay = el;
        return el;
    }

    /* ------------------------- Drawing ------------------------- */

    /* The items go into their own <div id="cart-items-list">, so the
       "empty" message in the partial is never wiped out. */
    function getList() {
        var list = byId('cart-items-list');
        if (list) { return list; }
        var container = byId('cart-items-container');
        if (!container) { return null; }
        list = doc.createElement('div');
        list.id = 'cart-items-list';
        container.insertBefore(list, container.firstChild);
        return list;
    }

    function itemHtml(item) {
        var key = esc(item.key);
        var name = esc(item.name);
        var url = typeof U.productUrl === 'function' ? U.productUrl(item.id) : '#';
        var image = typeof U.imageUrl === 'function' ? U.imageUrl(item.image) : item.image;

        var oldPrice = item.originalPrice > item.price
            ? '<span class="original-price">' + esc(money(item.originalPrice)) + '</span>'
            : '';
        var size = item.size ? '<br><small class="cart-item-size">Size: ' + esc(item.size) + '</small>' : '';

        return '' +
            '<div class="cart-item" data-key="' + key + '">' +
                '<a href="' + esc(url) + '" tabindex="-1" aria-hidden="true">' +
                    '<img class="cart-item-img" src="' + esc(image) + '" alt="' + name + '" loading="lazy">' +
                '</a>' +
                '<div class="cart-item-details">' +
                    '<h4><a href="' + esc(url) + '">' + name + '</a>' + size + '</h4>' +
                    '<span class="cart-item-price">' + oldPrice + esc(money(item.price)) + '</span>' +
                    '<div class="cart-item-quantity-controls">' +
                        '<button type="button" data-cart-action="decrease" data-key="' + key + '" aria-label="Decrease quantity of ' + name + '">\u2212</button>' +
                        '<span aria-live="polite">' + esc(item.quantity) + '</span>' +
                        '<button type="button" data-cart-action="increase" data-key="' + key + '" aria-label="Increase quantity of ' + name + '">+</button>' +
                    '</div>' +
                '</div>' +
                '<button type="button" class="cart-item-remove" data-cart-action="remove" data-key="' + key + '" aria-label="Remove ' + name + ' from cart">\u2716</button>' +
            '</div>';
    }

    function findControl(list, key, action) {
        var controls = list.querySelectorAll('[data-cart-action]');
        for (var i = 0; i < controls.length; i += 1) {
            if (controls[i].getAttribute('data-key') === key && controls[i].getAttribute('data-cart-action') === action) {
                return controls[i];
            }
        }
        return null;
    }

    function render() {
        if (!Cart || !byId('cart-panel')) { return; }

        var list = getList();
        var container = byId('cart-items-container');
        if (!list || !container) { return; }

        var items = Cart.getItems();
        var scrollTop = container.scrollTop;

        // remember which button had keyboard focus
        var active = doc.activeElement;
        var focused = null;
        if (active && list.contains(active) && active.getAttribute('data-cart-action')) {
            focused = { key: active.getAttribute('data-key'), action: active.getAttribute('data-cart-action') };
        }

        list.innerHTML = items.map(itemHtml).join('');
        container.scrollTop = scrollTop;

        if (focused) {
            var again = findControl(list, focused.key, focused.action);
            focusEl(again || byId('cart-close-btn'));
        }

        var isEmpty = items.length === 0;
        var emptyMessage = byId('cart-empty-message');
        var footer = byId('cart-footer');
        var countEl = byId('cart-count-panel');
        var totalEl = byId('cart-total-price');

        if (emptyMessage) { emptyMessage.style.display = isEmpty ? 'block' : 'none'; }
        if (footer) { footer.style.display = isEmpty ? 'none' : ''; }
        if (countEl) { countEl.textContent = String(Cart.getCount()); }
        if (totalEl) { totalEl.textContent = Number(Cart.getTotal()).toFixed(2); }
    }

    /* ------------------------- Open / close ------------------------- */

    function isOpen() { return state.open; }

    function open() {
        var panel = byId('cart-panel');
        if (!panel) {                       // header not loaded yet -> open as soon as it is
            state.wantOpen = true;
            return false;
        }
        if (state.open) { render(); return true; }

        // only one overlay layer at a time
        var header = global.AliyanHeader;
        if (header) {
            if (typeof header.closeSearch === 'function') { header.closeSearch(); }
            if (typeof header.closeMenu === 'function') { header.closeMenu(); }
        }

        render();
        state.lastFocus = doc.activeElement;
        state.open = true;

        getOverlay().classList.add('open');
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
        panel.setAttribute('aria-modal', 'true');

        if (!state.locked && typeof U.lockScroll === 'function') {
            U.lockScroll();
            state.locked = true;
        }

        var icon = byId('cart-icon-link');
        if (icon) { icon.setAttribute('aria-expanded', 'true'); }

        focusEl(byId('cart-close-btn'));
        return true;
    }

    function close() {
        state.wantOpen = false;
        if (!state.open) { return; }
        state.open = false;

        var panel = byId('cart-panel');
        var overlay = state.overlay || byId('cart-overlay');

        // give focus back BEFORE hiding the panel from screen readers
        var back = state.lastFocus;
        state.lastFocus = null;
        if (back && doc.body.contains(back) && !(panel && panel.contains(back))) { focusEl(back); }
        else if (panel && panel.contains(doc.activeElement)) { doc.activeElement.blur(); }

        if (panel) {
            panel.classList.remove('open');
            panel.setAttribute('aria-hidden', 'true');
            panel.removeAttribute('aria-modal');
        }
        if (overlay) { overlay.classList.remove('open'); }

        if (state.locked && typeof U.unlockScroll === 'function') {
            U.unlockScroll();
            state.locked = false;
        }

        var icon = byId('cart-icon-link');
        if (icon) { icon.setAttribute('aria-expanded', 'false'); }
    }

    function toggle() {
        if (state.open) { close(); } else { open(); }
    }

    /* ------------------------- Clicks on the cart lines ------------------------- */

    function handleAction(button) {
        if (!Cart) { return; }
        var key = button.getAttribute('data-key');
        var action = button.getAttribute('data-cart-action');
        if (!key) { return; }

        if (action === 'increase') {
            if (!Cart.increase(key)) {
                toast('Maximum ' + Cart.MAX_QTY + ' pieces of one item per order.', 'info');
            }
        } else if (action === 'decrease') {
            Cart.decrease(key);
        } else if (action === 'remove') {
            Cart.remove(key);
        }
        // the cart fires its event -> render() runs by itself
    }

    /* ------------------------- Keep keyboard focus inside the panel ------------------------- */

    function trapTab(event) {
        var panel = byId('cart-panel');
        if (!panel) { return; }
        var nodes = panel.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]');
        var focusable = Array.prototype.filter.call(nodes, function (n) {
            return n.getAttribute('tabindex') !== '-1' && n.offsetParent !== null;
        });
        if (!focusable.length) { return; }

        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        var current = doc.activeElement;

        if (event.shiftKey && (current === first || !panel.contains(current))) {
            event.preventDefault();
            focusEl(last);
        } else if (!event.shiftKey && (current === last || !panel.contains(current))) {
            event.preventDefault();
            focusEl(first);
        }
    }

    /* ------------------------- Events (bound once, work even before the HTML exists) ------------------------- */

    function bindEvents() {

        doc.addEventListener('click', function (event) {
            var target = event.target;
            if (!target || !target.closest) { return; }

            if (target.closest('#cart-icon-link')) {
                event.preventDefault();
                toggle();
                return;
            }

            if (target.closest('#cart-close-btn') || target.closest('#cart-overlay')) {
                close();
                return;
            }

            var control = target.closest('#cart-panel [data-cart-action]');
            if (control) { handleAction(control); }
        });

        doc.addEventListener('keydown', function (event) {
            if (!state.open) { return; }
            if (event.key === 'Escape' || event.key === 'Esc') { close(); }
            else if (event.key === 'Tab') { trapTab(event); }
        });

        // any change of the cart (add, remove, other browser tab) redraws the panel
        if (Cart && typeof Cart.subscribe === 'function') {
            Cart.subscribe(render);
        }

        // header HTML arrived (it may have arrived BEFORE this script ran -> checked below)
        doc.addEventListener('aliyan:header-ready', onPanelAvailable);
    }

    function onPanelAvailable() {
        render();
        if (state.wantOpen) {
            state.wantOpen = false;
            open();
        }
    }

    /* ------------------------- Public API ------------------------- */

    global.AliyanCartPanel = {
        open: open,
        close: close,
        toggle: toggle,
        isOpen: isOpen,
        render: render
    };

    // used by onclick="openCartPanel(); return false;" in partials/footer.html
    global.openCartPanel = open;
    global.closeCartPanel = close;
    global.toggleCartPanel = toggle;

    bindEvents();

    if (byId('cart-panel')) { onPanelAvailable(); }

})(window);
