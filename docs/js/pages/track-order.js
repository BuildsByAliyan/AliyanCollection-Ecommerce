/* =====================================================================
   js/pages/track-order.js
   Aliyan Collection - TRACK YOUR ORDER (pages/account/trackyourorder.html).
   Loaded LAST on the page, after all core + component scripts.
   Plain script (no import/export).
   ---------------------------------------------------------------------
   The customer types an EMAIL, a PHONE NUMBER (03XX..., +92 3XX... both
   work) or an ORDER NUMBER (ALY-...). Matching orders are read from the
   order history saved by order.js (localStorage, this browser/device).

   Status is only an ESTIMATE worked out from the order date (see config.js):
     0 - 2 days  -> Ordered       3 - 5 days -> Estimated: Dispatched
     6+ days     -> Estimated delivery date passed
   Optional link:  trackyourorder.html?contact=you@mail.com
                   trackyourorder.html?order=ALY-XXXX
   Needs: config.js, utils.js, storage.js, toast.js
   ===================================================================== */
(function (global) {
    'use strict';

    var doc = global.document;
    var cfg = global.AliyanConfig || {};
    var U = global.AliyanUtils;
    var Storage = global.AliyanStorage;

    if (!doc || !U || !Storage) {
        if (global.console) { global.console.error('track-order.js: a core script did not load.'); }
        return;
    }

    var ORDERS_KEY = (cfg.storageKeys && cfg.storageKeys.orders) || 'aliyanOrderHistory';
    var DAY_MS = 86400000;
    var PAYMENT_LABELS = {
        cod: 'Cash on Delivery',
        easypaisa: 'EasyPaisa',
        jazzcash: 'JazzCash',
        paypal: 'PayPal',
        card: 'Card'
    };
    var NO_ORDERS_TEXT = 'No orders were found for that email, phone number or order number on this device. ' +
        'Please check the details and try again.';

    var TRACK_NOTE = 'This is only an estimate, and it shows only orders placed on this device/browser. ' +
        'For the real status of your order, please contact us on WhatsApp.';

    var el = {};

    /* ------------------------- Helpers ------------------------- */

    function byId(id) { return doc.getElementById(id); }
    function esc(value) { return U.escapeHtml(value); }
    function money(value) { return U.formatPrice(value); }

    function toast(message, type) {
        if (global.AliyanToast) { global.AliyanToast.show(message, type); }
    }

    function prefersReducedMotion() {
        try {
            return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) { return false; }
    }

    function paymentLabel(method) {
        return PAYMENT_LABELS[method] || U.capitalize(method) || 'Cash on Delivery';
    }

    function loadOrders() {
        var raw = Storage.get(ORDERS_KEY, []);
        if (!Array.isArray(raw)) { return []; }
        return raw.filter(function (order) { return order && typeof order === 'object'; });
    }

    function orderNumberOf(order) {
        return String(order.orderNumber || order.orderId || '');
    }

    function orderDateOf(order) {
        return order.date || order.orderDate || '';
    }

    /* customer details; very old orders only had a single "contact" text */
    function customerOf(order) {
        var customer = order.customer && typeof order.customer === 'object' ? order.customer : {};
        var contact = String(order.contact || '');
        return {
            email: String(customer.email || (contact.indexOf('@') !== -1 ? contact : '')).trim().toLowerCase(),
            phone: String(customer.phone || (contact && contact.indexOf('@') === -1 ? contact : ''))
        };
    }

    function getStatus(dateValue) {
        var days = U.daysBetween(dateValue);
        var dispatchAfter = Number(cfg.dispatchAfterDays) || 3;
        var deliverAfter = Number(cfg.deliverAfterDays) || 6;

        if (days >= deliverAfter) {
            return { text: 'Estimated delivery date passed', className: 'status-delivered', delivered: true,
                message: 'The estimated delivery date has passed. If you have received your parcel, thank you for shopping with us! ' +
                    'If not, please contact us on WhatsApp.' };
        }
        if (days >= dispatchAfter) {
            return { text: 'Estimated: Dispatched', className: 'status-dispatched', delivered: false,
                message: 'Your order should have been dispatched by now (estimate based on your order date). ' +
                    'Contact us on WhatsApp for the real status.' };
        }
        return { text: 'Ordered', className: 'status-ordered', delivered: false, message: '' };
    }

    /* ------------------------- Searching ------------------------- */

    /* returns { orders: [...] }  or  { error: 'message' } */
    function search(query) {
        var q = String(query || '').trim();
        if (!q) { return { error: 'Please enter your email, phone number or order number.' }; }

        var orders = loadOrders();
        var found;

        if (q.indexOf('@') !== -1) {                          // email
            if (!U.isValidEmail(q)) { return { error: 'Please enter a valid email address.' }; }
            var email = q.toLowerCase();
            found = orders.filter(function (order) { return customerOf(order).email === email; });

        } else if (/^(ALY|AL)-/i.test(q)) {                   // order number
            var number = q.toUpperCase();
            found = orders.filter(function (order) { return orderNumberOf(order).toUpperCase() === number; });

        } else {                                              // phone number
            if (!U.isValidPhone(q)) {
                return { error: 'Please enter a valid email, phone number (e.g. 03XX-XXXXXXX) or order number.' };
            }
            found = orders.filter(function (order) { return U.samePhone(customerOf(order).phone, q); });
        }

        found.sort(function (a, b) {
            return new Date(orderDateOf(b)).getTime() - new Date(orderDateOf(a)).getTime();
        });

        return { orders: found };
    }

    /* ------------------------- Drawing ------------------------- */

    function orderHtml(order) {
        var when = orderDateOf(order);
        var status = getStatus(when);
        var items = Array.isArray(order.items) ? order.items : [];
        var total = Number(order.total);

        if (!isFinite(total)) {
            total = items.reduce(function (sum, item) {
                return sum + U.toNumber(item.price) * U.toNumber(item.quantity, 1);
            }, 0);
        }

        var productsHtml = items.map(function (item) {
            var qty = U.toNumber(item.quantity, 1);
            var line = U.toNumber(item.price) * qty;
            return '<div class="order-product">' +
                '<span>' + esc(item.name || 'Product') + (item.size ? ' (Size ' + esc(item.size) + ')' : '') + ' &times; ' + esc(qty) + '</span>' +
                '<span>' + esc(money(line)) + '</span>' +
            '</div>';
        }).join('');

        var startDate = new Date(when);
        var deliveryDate = '';
        if (!isNaN(startDate.getTime())) {
            var days = Number(cfg.deliverAfterDays) || 6;
            deliveryDate = U.formatDate(new Date(startDate.getTime() + days * DAY_MS));
        }

        var rows = '' +
            '<div class="order-product"><span>Order Date</span><span>' + esc(U.formatDate(when) || '\u2014') + '</span></div>' +
            (deliveryDate
                ? '<div class="order-product"><span>' + 'Estimated Delivery' + '</span><span>' + esc(deliveryDate) + '</span></div>'
                : '') +
            '<div class="order-product"><span>Payment</span><span>' + esc(paymentLabel(order.paymentMethod)) + '</span></div>' +
            '<div class="order-product"><span>Total</span><span>' + esc(money(total)) + '</span></div>';

        return '' +
            '<div class="order-item">' +
                '<div class="order-header">' +
                    '<h4>Order #' + esc(orderNumberOf(order) || '\u2014') + '</h4>' +
                    '<span class="order-status ' + status.className + '">' + status.text + '</span>' +
                '</div>' +
                '<div class="order-details">' + productsHtml + rows + '</div>' +
                (status.message ? '<div class="delivery-message">' + esc(status.message) + '</div>' : '') +
            '</div>';
    }

    function showResults(orders) {
        el.container.hidden = false;

        if (orders.length) {
            el.list.innerHTML = orders.map(orderHtml).join('');
            el.empty.hidden = true;
        } else {
            el.list.innerHTML = '';
            el.empty.textContent = NO_ORDERS_TEXT;
            el.empty.hidden = false;
        }

        el.container.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }

    function runSearch(query) {
        var result = search(query);
        if (result.error) {
            el.container.hidden = true;                       // do not leave old results under a wrong search
            toast(result.error, 'error');
            if (el.input) { el.input.focus(); }
            return;
        }
        showResults(result.orders);
    }

    /* ------------------------- Start ------------------------- */

    function init() {
        el.form = byId('track-order-form');
        el.input = byId('contact-input');
        el.container = byId('order-results-container');
        el.list = byId('order-results-list');
        el.empty = byId('order-results-empty');

        if (!el.form || !el.input || !el.container || !el.list || !el.empty) { return; }

        el.form.noValidate = true;

        // honest note under the form: estimate only + this device only
        var note = doc.createElement('p');
        note.id = 'track-note';
        note.textContent = TRACK_NOTE;
        note.style.cssText = 'margin:14px 0 0;font-size:0.9em;line-height:1.5;opacity:0.8;';
        el.form.parentNode.appendChild(note);

        el.form.addEventListener('submit', function (event) {
            event.preventDefault();
            runSearch(el.input.value);
        });

        // opened with ?contact=...  or  ?order=...  -> search straight away
        var fromLink = U.getQueryParam('contact') || U.getQueryParam('order');
        if (fromLink) {
            el.input.value = fromLink;
            runSearch(fromLink);
        }

        // order list changed in another tab -> keep the open results up to date
        Storage.onExternalChange(function (key) {
            if ((key === null || key === ORDERS_KEY) && !el.container.hidden && el.input.value.trim()) {
                var result = search(el.input.value);
                if (!result.error) {
                    el.list.innerHTML = result.orders.map(orderHtml).join('');
                    el.empty.hidden = result.orders.length > 0;
                }
            }
        });
    }

    U.onReady(init);

})(window);
