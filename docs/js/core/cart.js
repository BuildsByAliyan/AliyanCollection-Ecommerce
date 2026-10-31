/* =====================================================================
   js/core/cart.js
   Aliyan Collection - shopping cart LOGIC (no HTML here).
   The slide-in panel is drawn by components/cart-panel.js, which listens
   to the event below.
   Loaded after storage.js.  Plain script -> window.AliyanCart
   ---------------------------------------------------------------------
   Each cart line is saved as  { id, size, quantity }  only.
   Name, price and image are ALWAYS read from data/products.js, so a
   customer can never change a price by editing localStorage, and
   products you delete from products.js disappear from old carts.
   (Old carts from the first version of the site are cleaned up too.)

   READ
     AliyanCart.getItems()      -> [{ key, id, size, name, price, image,
                                      quantity, subtotal, product }]
     AliyanCart.getCount()      -> total pieces (shown on the header bubble)
     AliyanCart.getLineCount()  -> number of different lines
     AliyanCart.getTotal()      -> number, e.g. 245.5
     AliyanCart.isEmpty()
     AliyanCart.has(id[, size])
   CHANGE   (key = item.key from getItems(); pass id, or id|size, for lines
             without a size)
     AliyanCart.add(productOrId, { quantity: 1, size: 'M' })
          -> { ok, item, quantity, capped, reason }
     AliyanCart.setQuantity(key, qty)   (0 removes the line)
     AliyanCart.increase(key)   AliyanCart.decrease(key)
     AliyanCart.remove(key)     AliyanCart.clear()
   LISTEN
     document 'aliyan:cart-changed'  ->  event.detail = { action, key,
                                           items, count, total }
     AliyanCart.subscribe(fn)  -> fn(detail); returns an unsubscribe function
     AliyanCart.EVENT          -> 'aliyan:cart-changed'
   ===================================================================== */
(function (global) {
    'use strict';

    var cfg = global.AliyanConfig;
    var Products = global.AliyanProducts;
    var Storage = global.AliyanStorage;
    var doc = global.document;

    var KEY = (cfg && cfg.storageKeys && cfg.storageKeys.cart) || 'aliyanCart';
    var MAX_QTY = (cfg && cfg.maxQtyPerItem) || 10;
    var EVENT = 'aliyan:cart-changed';

    /* in-memory lines: [{ id, size, quantity }] */
    var lines = [];

    /* ------------------------- Helpers ------------------------- */

    function cleanSize(size) {
        return String(size === undefined || size === null ? '' : size)
            .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    }

    function makeKey(id, size) {
        return size ? id + '|' + size : id;
    }

    function cleanQty(value) {
        var n = Math.floor(Number(value));
        if (!isFinite(n) || n < 1) { return 1; }
        return Math.min(n, MAX_QTY);
    }

    function round2(n) {
        return Math.round(n * 100) / 100;
    }

    function findProduct(id) {
        return Products && typeof Products.getById === 'function' ? Products.getById(id) : null;
    }

    function indexOfKey(key) {
        key = String(key);
        for (var i = 0; i < lines.length; i += 1) {
            if (makeKey(lines[i].id, lines[i].size) === key) { return i; }
        }
        return -1;
    }

    /* ------------------------- Load / save ------------------------- */

    /* Turns whatever is in localStorage into a clean list of lines */
    function sanitize(raw) {
        var out = [];
        if (!Array.isArray(raw)) { return out; }

        raw.forEach(function (entry) {
            if (!entry || typeof entry !== 'object') { return; }
            var product = findProduct(entry.id);
            if (!product) { return; }                       // unknown / removed product
            var size = cleanSize(entry.size);
            var qty = cleanQty(entry.quantity !== undefined ? entry.quantity : entry.qty);
            var key = makeKey(product.id, size);

            // merge duplicates of the same product + size
            for (var i = 0; i < out.length; i += 1) {
                if (makeKey(out[i].id, out[i].size) === key) {
                    out[i].quantity = Math.min(MAX_QTY, out[i].quantity + qty);
                    return;
                }
            }
            out.push({ id: product.id, size: size, quantity: qty });
        });
        return out;
    }

    function save() {
        Storage.set(KEY, lines);
    }

    function load() {
        var raw = Storage.get(KEY, []);
        lines = sanitize(raw);
        // rewrite storage if it contained old / invalid data
        if (JSON.stringify(raw) !== JSON.stringify(lines)) { save(); }
    }

    /* ------------------------- Read ------------------------- */

    function getItems() {
        var items = [];
        lines.forEach(function (line) {
            var product = findProduct(line.id);
            if (!product) { return; }
            items.push({
                key: makeKey(line.id, line.size),
                id: product.id,
                size: line.size,
                name: product.name,
                price: product.price,
                originalPrice: product.originalPrice,
                image: product.image,
                category: product.category,
                quantity: line.quantity,
                subtotal: round2(product.price * line.quantity),
                product: product
            });
        });
        return items;
    }

    function getCount() {
        return lines.reduce(function (sum, line) { return sum + line.quantity; }, 0);
    }

    function getTotal() {
        return round2(getItems().reduce(function (sum, item) { return sum + item.subtotal; }, 0));
    }

    /* ------------------------- Events ------------------------- */

    function emit(action, key) {
        var detail = { action: action, key: key || null, items: getItems(), count: getCount(), total: getTotal() };
        try {
            doc.dispatchEvent(new global.CustomEvent(EVENT, { detail: detail }));
        } catch (e) { /* very old browser: ignore */ }
    }

    /* ------------------------- Change ------------------------- */

    function add(productOrId, options) {
        var product = productOrId && typeof productOrId === 'object' ? findProduct(productOrId.id) : findProduct(productOrId);
        if (!product) { return { ok: false, reason: 'not-found' }; }

        if (typeof options === 'number') { options = { quantity: options }; }
        options = options || {};

        var size = cleanSize(options.size);
        var qty = cleanQty(options.quantity === undefined ? 1 : options.quantity);
        var key = makeKey(product.id, size);
        var i = indexOfKey(key);
        var capped = false;

        if (i === -1) {
            lines.push({ id: product.id, size: size, quantity: qty });
            i = lines.length - 1;
        } else {
            var wanted = lines[i].quantity + qty;
            if (wanted > MAX_QTY) { capped = true; }
            lines[i].quantity = Math.min(MAX_QTY, wanted);
        }

        save();
        emit('add', key);

        var item = getItems().filter(function (it) { return it.key === key; })[0] || null;
        return { ok: true, item: item, quantity: lines[i].quantity, capped: capped, reason: capped ? 'max-quantity' : '' };
    }

    function setQuantity(key, qty) {
        var i = indexOfKey(key);
        if (i === -1) { return false; }
        var n = Math.floor(Number(qty));
        if (!isFinite(n) || n <= 0) { return remove(key); }
        lines[i].quantity = Math.min(MAX_QTY, n);
        save();
        emit('update', String(key));
        return true;
    }

    function increase(key) {
        var i = indexOfKey(key);
        if (i === -1) { return false; }
        if (lines[i].quantity >= MAX_QTY) { return false; }
        return setQuantity(key, lines[i].quantity + 1);
    }

    function decrease(key) {
        var i = indexOfKey(key);
        if (i === -1) { return false; }
        return setQuantity(key, lines[i].quantity - 1);      // reaching 0 removes the line
    }

    function remove(key) {
        var i = indexOfKey(key);
        if (i === -1) { return false; }
        lines.splice(i, 1);
        save();
        emit('remove', String(key));
        return true;
    }

    function clear() {
        if (!lines.length) { return; }
        lines = [];
        save();
        emit('clear');
    }

    /* ------------------------- Public API ------------------------- */

    var Cart = {
        EVENT: EVENT,
        MAX_QTY: MAX_QTY,

        getItems: getItems,
        getCount: getCount,
        getLineCount: function () { return lines.length; },
        getTotal: getTotal,
        isEmpty: function () { return lines.length === 0; },
        has: function (id, size) {
            var product = findProduct(id);
            return !!product && indexOfKey(makeKey(product.id, cleanSize(size))) !== -1;
        },

        add: add,
        setQuantity: setQuantity,
        increase: increase,
        decrease: decrease,
        remove: remove,
        clear: clear,

        subscribe: function (fn) {
            if (typeof fn !== 'function') { return function () {}; }
            var handler = function (event) { fn(event.detail); };
            doc.addEventListener(EVENT, handler);
            return function () { doc.removeEventListener(EVENT, handler); };
        }
    };

    /* ------------------------- Start ------------------------- */

    load();

    // the cart was changed in another browser tab -> reload it and tell the page
    if (Storage && typeof Storage.onExternalChange === 'function') {
        Storage.onExternalChange(function (changedKey) {
            if (changedKey === null || changedKey === KEY) {
                load();
                emit('sync');
            }
        });
    }

    global.AliyanCart = Cart;

})(window);
