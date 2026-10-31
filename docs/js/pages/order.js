/* =====================================================================
   js/pages/order.js
   Aliyan Collection - CHECKOUT PAGE (pages/account/order.html).
   Loaded LAST on the page, after all core + component scripts.
   Plain script (no import/export).
   ---------------------------------------------------------------------
   What it does
     * order summary drawn from the cart (name / price / size always come
       from data/products.js, never from localStorage)
     * empty cart  -> "Your cart is empty" box instead of the form
     * payment method  -> Cash on Delivery, plus EasyPaisa / JazzCash as MANUAL transfer
       (customer sends money, then WhatsApps the screenshot) - those two appear only
       when switched on in config.js (payments). No PayPal / card (no gateway on a static
       site). Card details are NEVER collected.
     * validation with clear messages (name, email, phone, address, and
       the account number / email of the chosen online method)
     * Confirm Order  -> saves the order in localStorage (key
       config.storageKeys.orders), clears the cart, opens the
       confirmation pop-up with the order number + estimated delivery text
     * pop-up also gets a "Resend Order on WhatsApp" button - a static
       site has no server, so this is how the order reaches the shop
     * order history of this browser (status is only an ESTIMATE worked out from the date)

   Saved order format (same fields as the first version of the site):
     { orderNumber, date, customer:{name,email,phone,address},
       paymentMethod, paymentAccount, items:[{id,name,price,quantity,
       size,image}], total, status }
   Needs: config.js, products.js, utils.js, storage.js, cart.js, toast.js
   ===================================================================== */
(function (global) {
    'use strict';

    var doc = global.document;
    var cfg = global.AliyanConfig || {};
    var U = global.AliyanUtils;
    var Cart = global.AliyanCart;
    var Storage = global.AliyanStorage;

    if (!doc || !U || !Cart || !Storage) {
        if (global.console) { global.console.error('order.js: a core script did not load.'); }
        return;
    }

    var ORDERS_KEY = (cfg.storageKeys && cfg.storageKeys.orders) || 'aliyanOrderHistory';
    var MAX_HISTORY = 50;
    var ONLINE_METHODS = ['easypaisa', 'jazzcash'];          // manual transfer (see config.js payments)
    var PAYMENT_LABELS = {
        cod: 'Cash on Delivery',
        easypaisa: 'EasyPaisa',
        jazzcash: 'JazzCash',
        paypal: 'PayPal',                 // old saved orders only - no longer offered
        card: 'Card'
    };

    var el = {};
    var modal = { open: false, lastFocus: null, locked: false };
    var submitting = false;

    /* ------------------------- Helpers ------------------------- */

    function byId(id) { return doc.getElementById(id); }
    function esc(value) { return U.escapeHtml(value); }
    function money(value) { return U.formatPrice(value); }

    function toast(message, type) {
        if (global.AliyanToast) { global.AliyanToast.show(message, type); }
    }

    function paymentLabel(method) {
        return PAYMENT_LABELS[method] || U.capitalize(method) || 'Cash on Delivery';
    }

    function selectedPayment() {
        var checked = U.qs('input[name="payment"]:checked', el.form);
        return checked ? checked.value : 'cod';
    }

    function value(input) { return input ? String(input.value || '').trim() : ''; }

    /* Ordered -> Estimated: Dispatched -> Delivery date passed, worked out from the order date
       (see config.js). Only an ESTIMATE - the site cannot know the real parcel status. */
    function getStatus(dateValue) {
        var days = U.daysBetween(dateValue);
        var dispatchAfter = Number(cfg.dispatchAfterDays) || 3;
        var deliverAfter = Number(cfg.deliverAfterDays) || 6;

        if (days >= deliverAfter) { return { text: 'Estimated delivery date passed', className: 'status-delivered' }; }
        if (days >= dispatchAfter) { return { text: 'Estimated: Dispatched', className: 'status-dispatched' }; }
        return { text: 'Ordered', className: 'status-ordered' };
    }

    /* ------------------------- Saved orders ------------------------- */

    function loadOrders() {
        var raw = Storage.get(ORDERS_KEY, []);
        if (!Array.isArray(raw)) { return []; }
        return raw.filter(function (order) { return order && typeof order === 'object'; });
    }

    function saveOrders(list) {
        return Storage.set(ORDERS_KEY, list.slice(0, MAX_HISTORY));
    }

    /* ------------------------- Order summary ------------------------- */

    function renderSummary() {
        var items = Cart.getItems();
        var empty = items.length === 0;

        if (el.empty) { el.empty.hidden = !empty; }
        if (el.container) { el.container.hidden = empty; }
        if (!el.items) { return; }

        el.items.innerHTML = items.map(function (item) {
            var sizeText = item.size ? ' <span class="order-item-size">(Size ' + esc(item.size) + ')</span>' : '';
            return '' +
                '<div class="order-item">' +
                    '<img src="' + esc(U.imageUrl(item.product)) + '" alt="' + esc(item.name) + '" loading="lazy">' +
                    '<div class="order-item-details">' +
                        '<div class="order-item-name">' + esc(item.name) + sizeText + '</div>' +
                        '<div class="order-item-price">' + esc(money(item.price)) + ' each</div>' +
                    '</div>' +
                    '<div class="order-item-quantity">Qty: ' + esc(item.quantity) + '</div>' +
                    '<div class="order-item-subtotal">' + esc(money(item.subtotal)) + '</div>' +
                '</div>';
        }).join('');

        if (el.total) { el.total.textContent = money(Cart.getTotal()); }
    }

    /* ------------------------- Payment method ------------------------- */

    /* EasyPaisa / JazzCash options appear ONLY when config.js payments.<name> is enabled + has an account number */
    function paymentConfig(name) {
        var all = cfg.payments || {};
        var item = all[name] || {};
        var number = String(item.accountNumber || '').trim();
        return { enabled: !!item.enabled && !!number, number: number, holder: String(item.accountName || '').trim() };
    }

    function setupPaymentOptions() {
        ONLINE_METHODS.forEach(function (name) {
            var conf = paymentConfig(name);
            var option = byId(name + '-option');
            var radio = byId(name);
            var info = byId(name + '-info');

            if (option) { option.hidden = !conf.enabled; }
            if (radio) { radio.disabled = !conf.enabled; if (!conf.enabled) { radio.checked = false; } }
            if (info && conf.enabled) {
                info.textContent = 'Send the total amount to ' + paymentLabel(name) + ' account ' + conf.number +
                    (conf.holder ? ' (' + conf.holder + ')' : '') + '.';
            }
        });

        // nothing selected (e.g. the chosen method is switched off) -> Cash on Delivery
        var cod = byId('cod');
        if (cod && !U.qs('input[name="payment"]:checked', el.form)) { cod.checked = true; }
    }

    function updatePaymentFields() {
        var method = selectedPayment();

        ONLINE_METHODS.forEach(function (name) {
            var box = byId(name + '-fields');
            if (!box) { return; }
            var show = name === method;
            box.hidden = !show;
            if (!show) {
                U.qsa('input', box).forEach(function (input) { input.classList.remove('invalid'); });
            }
        });

        if (el.paymentNote) { el.paymentNote.hidden = method === 'cod'; }
    }

    /* ------------------------- Validation ------------------------- */

    function validate() {
        var rules = [
            { input: el.name, ok: value(el.name).length >= 2, message: 'Please enter your full name.' },
            { input: el.email, ok: U.isValidEmail(value(el.email)), message: 'Please enter a valid email address.' },
            { input: el.phone, ok: U.isValidPhone(value(el.phone)), message: 'Please enter a valid phone number (e.g. 03XX-XXXXXXX).' },
            { input: el.address, ok: value(el.address).length >= 8, message: 'Please enter your complete delivery address.' }
        ];

        var first = null;
        rules.forEach(function (rule) {
            if (!rule.input) { return; }
            rule.input.classList.toggle('invalid', !rule.ok);
            if (!rule.ok && !first) { first = rule; }
        });

        if (first) {
            first.input.focus();
            return { ok: false, message: first.message };
        }
        return { ok: true };
    }

    /* ------------------------- Place the order ------------------------- */

    function buildOrder(items) {
        var method = selectedPayment();

        return {
            orderNumber: U.generateOrderId(),
            date: new Date().toISOString(),
            customer: {
                name: value(el.name),
                email: value(el.email).toLowerCase(),
                phone: value(el.phone),
                address: value(el.address)
            },
            paymentMethod: method,
            paymentAccount: '',                      // no customer account needed (manual transfer / COD)
            items: items.map(function (item) {
                return {
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    size: item.size,
                    image: item.image
                };
            }),
            total: Cart.getTotal(),
            status: 'Ordered'
        };
    }

    function whatsappMessage(order) {
        var lines = [
            'New order from ' + (cfg.siteName || 'Aliyan Collection'),
            'Order: ' + order.orderNumber,
            '',
            'Name: ' + order.customer.name,
            'Phone: ' + order.customer.phone,
            'Email: ' + order.customer.email,
            'Address: ' + order.customer.address,
            'Payment: ' + paymentLabel(order.paymentMethod) + (order.paymentMethod && order.paymentMethod !== 'cod' ? ' (manual transfer - screenshot to follow)' : '') +
                (order.paymentAccount ? ' (' + order.paymentAccount + ')' : ''),
            '',
            'Items:'
        ];
        order.items.forEach(function (item, i) {
            lines.push((i + 1) + '. ' + item.name + (item.size ? ' (Size ' + item.size + ')' : '') +
                ' x' + item.quantity + ' - ' + money(item.price * item.quantity));
        });
        lines.push('', 'Total: ' + money(order.total));
        return lines.join('\n');
    }

    function setSubmitting(on) {
        submitting = on;
        if (el.submit) {
            el.submit.disabled = on;
            el.submit.textContent = on ? 'Placing order\u2026' : 'Confirm Order';
        }
    }

    function onSubmit(event) {
        event.preventDefault();
        if (submitting) { return; }

        var items = Cart.getItems();
        if (!items.length) {
            toast('Your cart is empty. Please add items before placing an order.', 'error');
            renderSummary();
            return;
        }

        var check = validate();
        if (!check.ok) {
            toast(check.message, 'error');
            return;
        }

        setSubmitting(true);

        try {
            var order = buildOrder(items);
            var orders = loadOrders();
            orders.unshift(order);

            if (!saveOrders(orders)) {
                toast('Your order could not be saved on this device. Please try again.', 'error');
                setSubmitting(false);
                return;                                       // cart is kept
            }

            /* Order shop owner tak: WhatsApp khulta hai (SYNC - click handler ke andar, warna popup block hota hai)
               + optional backup cfg.orderEndpoint par. Fail ho bhi jaye to order save rehta hai. */
            try {
                if (global.AliyanOrderNotify) {
                    global.AliyanOrderNotify.notify(order, cfg, whatsappMessage(order));
                }
            } catch (notifyError) {
                if (global.console) { global.console.error('order.js: could not notify the shop', notifyError); }
            }

            Cart.clear();
            el.form.reset();
            updatePaymentFields();
            renderHistory();
            openModal(order);
        } catch (error) {
            if (global.console) { global.console.error('order.js: could not place the order', error); }
            toast('Something went wrong. Please try again.', 'error');
        }

        setSubmitting(false);
    }

    /* ------------------------- Confirmation pop-up ------------------------- */

    /* No fake timer: just the estimated delivery text from config.js (deliveryDaysText) */
    function showDeliveryEstimate() {
        var node = byId('delivery-estimate');
        if (node && cfg.deliveryDaysText) { node.textContent = cfg.deliveryDaysText; }
    }

    function modalFocusables() {
        return U.qsa('a[href], button:not([disabled])', el.modal).filter(function (node) {
            return !node.hidden && node.offsetParent !== null;
        });
    }

    function openModal(order) {
        if (!el.modal) { return; }

        var numberEl = byId('modal-order-number');
        if (numberEl) { numberEl.textContent = 'Order #' + order.orderNumber; }

        if (el.whatsapp) { el.whatsapp.href = cfg.whatsappLink ? cfg.whatsappLink(whatsappMessage(order)) : '#'; }

        modal.lastFocus = doc.activeElement;
        el.modal.classList.add('active');
        el.modal.setAttribute('aria-hidden', 'false');
        modal.open = true;

        if (!modal.locked) { U.lockScroll(); modal.locked = true; }
        showDeliveryEstimate();

        var closeBtn = byId('modal-close-btn');
        if (closeBtn) { closeBtn.focus(); }
    }

    function closeModal() {
        if (!el.modal || !modal.open) { return; }

        el.modal.classList.remove('active');
        el.modal.setAttribute('aria-hidden', 'true');
        modal.open = false;

        if (modal.locked) { U.unlockScroll(); modal.locked = false; }

        if (modal.lastFocus && typeof modal.lastFocus.focus === 'function' && doc.body.contains(modal.lastFocus)) {
            try { modal.lastFocus.focus(); } catch (e) { /* ignore */ }
        }
    }

    function bindModal() {
        if (!el.modal) { return; }

        // WhatsApp button (created here - the HTML has no such button)
        var continueBtn = byId('modal-continue-btn');
        if (continueBtn && continueBtn.parentNode) {
            var wa = doc.createElement('a');
            wa.id = 'modal-whatsapp-btn';
            wa.className = 'btn dark';
            wa.target = '_blank';
            wa.rel = 'noopener noreferrer';
            wa.textContent = 'Resend Order on WhatsApp';
            wa.style.marginRight = '10px';
            wa.style.marginBottom = '10px';
            continueBtn.parentNode.insertBefore(wa, continueBtn);
            el.whatsapp = wa;
        }

        var closeBtn = byId('modal-close-btn');
        if (closeBtn) { closeBtn.addEventListener('click', closeModal); }

        if (continueBtn) {
            continueBtn.addEventListener('click', function () {
                closeModal();
                var home = cfg.paths && cfg.paths.pages && cfg.paths.pages.home;
                global.location.href = typeof cfg.url === 'function' ? cfg.url(home || 'index.html') : (home || '../../index.html');
            });
        }

        // click on the dark area outside the box
        el.modal.addEventListener('click', function (event) {
            if (event.target === el.modal) { closeModal(); }
        });

        doc.addEventListener('keydown', function (event) {
            if (!modal.open) { return; }

            if (event.key === 'Escape') { closeModal(); return; }

            if (event.key === 'Tab') {                        // keep keyboard focus inside the pop-up
                var nodes = modalFocusables();
                if (!nodes.length) { return; }
                var first = nodes[0];
                var last = nodes[nodes.length - 1];
                if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        });
    }

    /* ------------------------- Order history ------------------------- */

    function historyHtml(order) {
        var number = order.orderNumber || order.orderId || '\u2014';
        var when = order.date || order.orderDate;
        var status = getStatus(when);
        var items = Array.isArray(order.items) ? order.items : [];
        var total = Number(order.total);

        if (!isFinite(total)) {
            total = items.reduce(function (sum, item) {
                return sum + U.toNumber(item.price) * U.toNumber(item.quantity, 1);
            }, 0);
        }

        var itemsHtml = items.map(function (item) {
            var qty = U.toNumber(item.quantity, 1);
            var line = U.toNumber(item.price) * qty;
            return '<p>' + esc(item.name || 'Product') + (item.size ? ' (Size ' + esc(item.size) + ')' : '') +
                ' (x' + esc(qty) + ') - ' + esc(money(line)) + '</p>';
        }).join('');

        return '' +
            '<div class="history-item">' +
                '<div class="history-header">' +
                    '<h4>Order #' + esc(number) + '</h4>' +
                    '<span class="history-status ' + status.className + '">' + status.text + '</span>' +
                '</div>' +
                '<p><strong>Date:</strong> ' + esc(U.formatDate(when) || '\u2014') + '</p>' +
                '<p><strong>Payment:</strong> ' + esc(paymentLabel(order.paymentMethod)) + '</p>' +
                '<div class="history-items"><strong>Items:</strong>' + itemsHtml + '</div>' +
                '<p><strong>Total:</strong> ' + esc(money(total)) + '</p>' +
            '</div>';
    }

    function renderHistory() {
        if (!el.history) { return; }
        var orders = loadOrders();

        U.qsa('.history-item', el.history).forEach(function (node) {
            if (node.parentNode) { node.parentNode.removeChild(node); }
        });

        if (el.historyEmpty) { el.historyEmpty.hidden = orders.length > 0; }
        if (orders.length) {
            el.history.insertAdjacentHTML('beforeend', orders.map(historyHtml).join(''));
        }
    }

    /* ------------------------- Prefill from the last order ------------------------- */

    function prefill() {
        var last = loadOrders()[0];
        var customer = last && last.customer;
        if (!customer) { return; }

        if (el.name && !el.name.value) { el.name.value = customer.name || ''; }
        if (el.email && !el.email.value) { el.email.value = customer.email || ''; }
        if (el.phone && !el.phone.value) { el.phone.value = customer.phone || ''; }
        if (el.address && !el.address.value) { el.address.value = customer.address || ''; }
    }

    /* ------------------------- Start ------------------------- */

    function init() {
        el.form = byId('order-form');
        el.empty = byId('order-empty');
        el.container = byId('order-container');
        el.items = byId('order-items-container');
        el.total = byId('order-total-amount');
        el.name = byId('customer-name');
        el.email = byId('customer-email');
        el.phone = byId('customer-phone');
        el.address = byId('customer-address');
        el.paymentNote = byId('payment-note');
        el.history = byId('order-history-container');
        el.historyEmpty = byId('order-history-empty');
        el.modal = byId('confirmation-modal');
        el.submit = el.form ? el.form.querySelector('.confirm-order-btn') : null;

        renderSummary();
        renderHistory();

        if (!el.form) { return; }

        el.form.noValidate = true;                            // our own messages, not the browser's
        prefill();
        setupPaymentOptions();
        updatePaymentFields();
        bindModal();

        el.form.addEventListener('submit', onSubmit);
        el.form.addEventListener('change', function (event) {
            if (event.target && event.target.name === 'payment') { updatePaymentFields(); }
        });
        el.form.addEventListener('input', function (event) {
            if (event.target && event.target.classList) { event.target.classList.remove('invalid'); }
        });

        // cart changed in the cart panel / another tab -> summary follows
        Cart.subscribe(renderSummary);

        // orders changed in another tab -> history follows
        Storage.onExternalChange(function (key) {
            if (key === null || key === ORDERS_KEY) { renderHistory(); }
        });
    }

    U.onReady(init);

})(window);
