/* =====================================================================
   js/core/wishlist.js
   Aliyan Collection - wishlist LOGIC (no HTML here).
   The header number, card hearts and the wishlist table are drawn by
   other scripts that listen to the event below.
   Loaded after cart.js.  Plain script -> window.AliyanWishlist
   ---------------------------------------------------------------------
   Only product IDs are saved ( ["M-101", "W-107"] ). Everything else is
   read from data/products.js. Wishlists from the first version of the
   site (they saved whole objects) are converted automatically.

   READ
     AliyanWishlist.getIds()     -> ["M-101", ...]
     AliyanWishlist.getItems()   -> [product, ...]   (newest saved first)
     AliyanWishlist.getCount()
     AliyanWishlist.has(id)
   CHANGE
     AliyanWishlist.add(id)      -> { ok, added }
     AliyanWishlist.remove(id)   -> true / false
     AliyanWishlist.toggle(id)   -> { ok, added }  (added=false means removed)
     AliyanWishlist.clear()
   LISTEN
     document 'aliyan:wishlist-changed' -> event.detail = { action, id,
                                              ids, count }
     AliyanWishlist.subscribe(fn)  -> fn(detail); returns unsubscribe fn
     AliyanWishlist.EVENT          -> 'aliyan:wishlist-changed'
   ===================================================================== */
(function (global) {
    'use strict';

    var cfg = global.AliyanConfig;
    var Products = global.AliyanProducts;
    var Storage = global.AliyanStorage;
    var doc = global.document;

    var KEY = (cfg && cfg.storageKeys && cfg.storageKeys.wishlist) || 'aliyanWishlist';
    var EVENT = 'aliyan:wishlist-changed';

    /* saved product ids, oldest first */
    var ids = [];

    /* ------------------------- Helpers ------------------------- */

    function findProduct(id) {
        if (id && typeof id === 'object') { id = id.id; }
        return Products && typeof Products.getById === 'function' ? Products.getById(id) : null;
    }

    /* accepts ids ("M-101") and old-style objects ({ id: "M-101", ... }) */
    function sanitize(raw) {
        var out = [];
        if (!Array.isArray(raw)) { return out; }
        raw.forEach(function (entry) {
            var product = findProduct(entry);
            if (product && out.indexOf(product.id) === -1) { out.push(product.id); }
        });
        return out;
    }

    function save() {
        Storage.set(KEY, ids);
    }

    function load() {
        var raw = Storage.get(KEY, []);
        ids = sanitize(raw);
        if (JSON.stringify(raw) !== JSON.stringify(ids)) { save(); }
    }

    function emit(action, id) {
        var detail = { action: action, id: id || null, ids: ids.slice(), count: ids.length };
        try {
            doc.dispatchEvent(new global.CustomEvent(EVENT, { detail: detail }));
        } catch (e) { /* very old browser: ignore */ }
    }

    /* ------------------------- Public API ------------------------- */

    var Wishlist = {
        EVENT: EVENT,

        getIds: function () { return ids.slice(); },

        getItems: function () {
            return ids.slice().reverse().map(findProduct).filter(Boolean);
        },

        getCount: function () { return ids.length; },

        has: function (id) {
            var product = findProduct(id);
            return !!product && ids.indexOf(product.id) !== -1;
        },

        add: function (id) {
            var product = findProduct(id);
            if (!product) { return { ok: false, added: false }; }
            if (ids.indexOf(product.id) !== -1) { return { ok: true, added: false }; }   // already there
            ids.push(product.id);
            save();
            emit('add', product.id);
            return { ok: true, added: true };
        },

        remove: function (id) {
            var product = findProduct(id);
            var key = product ? product.id : String(id);
            var i = ids.indexOf(key);
            if (i === -1) { return false; }
            ids.splice(i, 1);
            save();
            emit('remove', key);
            return true;
        },

        toggle: function (id) {
            var product = findProduct(id);
            if (!product) { return { ok: false, added: false }; }
            if (ids.indexOf(product.id) !== -1) {
                Wishlist.remove(product.id);
                return { ok: true, added: false };
            }
            return Wishlist.add(product.id);
        },

        clear: function () {
            if (!ids.length) { return; }
            ids = [];
            save();
            emit('clear');
        },

        subscribe: function (fn) {
            if (typeof fn !== 'function') { return function () {}; }
            var handler = function (event) { fn(event.detail); };
            doc.addEventListener(EVENT, handler);
            return function () { doc.removeEventListener(EVENT, handler); };
        }
    };

    /* ------------------------- Start ------------------------- */

    load();

    // changed in another browser tab -> reload and tell the page
    if (Storage && typeof Storage.onExternalChange === 'function') {
        Storage.onExternalChange(function (changedKey) {
            if (changedKey === null || changedKey === KEY) {
                load();
                emit('sync');
            }
        });
    }

    global.AliyanWishlist = Wishlist;

})(window);
