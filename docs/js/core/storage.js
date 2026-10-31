/* =====================================================================
   js/core/storage.js
   Aliyan Collection - safe wrapper around localStorage / sessionStorage.
   Loaded after utils.js, BEFORE cart.js / wishlist.js.
   Plain script -> everything is on  window.AliyanStorage
   ---------------------------------------------------------------------
   Why a wrapper?
     * localStorage can be blocked (private mode, strict browser settings)
       -> the site must NOT crash. Data is then kept in memory for the visit.
     * corrupted / hand-edited JSON must not crash the site either.
   API (values can be objects, arrays, numbers, strings, booleans):
     AliyanStorage.get(key, fallback)
     AliyanStorage.set(key, value)      -> true / false
     AliyanStorage.remove(key)
     AliyanStorage.has(key)
     AliyanStorage.session.get / set / remove    (same, but per browser tab)
     AliyanStorage.onExternalChange(fn)  -> fn(key) when ANOTHER tab changes
                                            a value (used to keep cart in sync)
     AliyanStorage.isPersistent          -> false when only memory is used
   ===================================================================== */
(function (global) {
    'use strict';

    function detect(kind) {
        try {
            var store = global[kind];
            var testKey = '__aliyan_storage_test__';
            store.setItem(testKey, '1');
            store.removeItem(testKey);
            return store;
        } catch (e) {
            return null;
        }
    }

    function createStore(kind) {
        var backend = detect(kind);
        var memory = {};

        return {
            persistent: !!backend,

            get: function (key, fallback) {
                var raw = null;
                try {
                    raw = backend ? backend.getItem(key) : (Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null);
                } catch (e) {
                    raw = Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
                }
                if (raw === null || raw === undefined) { return fallback; }
                try {
                    return JSON.parse(raw);
                } catch (e) {
                    // corrupted value: drop it so it cannot break the site again
                    this.remove(key);
                    return fallback;
                }
            },

            set: function (key, value) {
                var raw;
                try {
                    raw = JSON.stringify(value);
                } catch (e) {
                    return false;
                }
                if (raw === undefined) { return false; }
                memory[key] = raw;                       // always keep a memory copy
                if (!backend) { return true; }
                try {
                    backend.setItem(key, raw);
                    return true;
                } catch (e) {
                    return false;                        // quota exceeded etc. (memory copy still works)
                }
            },

            remove: function (key) {
                delete memory[key];
                try { if (backend) { backend.removeItem(key); } } catch (e) { /* ignore */ }
            },

            has: function (key) {
                if (Object.prototype.hasOwnProperty.call(memory, key)) { return true; }
                try { return !!backend && backend.getItem(key) !== null; } catch (e) { return false; }
            }
        };
    }

    var local = createStore('localStorage');
    var session = createStore('sessionStorage');

    /* ---------- Changes made in ANOTHER tab ---------- */
    var externalListeners = [];

    if (global.addEventListener) {
        global.addEventListener('storage', function (event) {
            // event.key is null when the whole storage was cleared
            externalListeners.slice().forEach(function (fn) {
                try { fn(event.key); } catch (e) { /* one bad listener must not stop the others */ }
            });
        });
    }

    var Storage = {
        get: function (key, fallback) { return local.get(key, fallback); },
        set: function (key, value) { return local.set(key, value); },
        remove: function (key) { local.remove(key); },
        has: function (key) { return local.has(key); },

        session: {
            get: function (key, fallback) { return session.get(key, fallback); },
            set: function (key, value) { return session.set(key, value); },
            remove: function (key) { session.remove(key); },
            has: function (key) { return session.has(key); }
        },

        isPersistent: local.persistent,

        onExternalChange: function (fn) {
            if (typeof fn !== 'function') { return function () {}; }
            externalListeners.push(fn);
            return function () {
                var i = externalListeners.indexOf(fn);
                if (i !== -1) { externalListeners.splice(i, 1); }
            };
        }
    };

    global.AliyanStorage = Storage;

})(window);
