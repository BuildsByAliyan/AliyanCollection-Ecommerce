/* =====================================================================
   js/pages/account.js
   Aliyan Collection - ACCOUNT PAGES. One script, two pages:
     pages/account/myaccount.html  -> Login + Register forms
     pages/account/wishlist.html   -> wishlist table + "Share Your Own
                                      Product" form
   Loaded LAST on the page, after all core + component scripts.
   Plain script (no import/export). Each part starts only if its HTML is
   on the page, so the same file is safe on both pages.
   ---------------------------------------------------------------------
   IMPORTANT - this is a static site (GitHub Pages): there is no server,
   so there is no real login. Login and Register both just say clearly that
   accounts are coming soon (nothing is saved, no e-mail is promised).
   To get real accounts later connect a service (Firebase / Supabase /
   your own API) here.

   MY ACCOUNT
     * #loginForm / #regForm : "coming soon" message in #status-popup
   WISHLIST
     * rows drawn from AliyanWishlist (image, name, price, Add to Cart,
       Remove) - redraws by itself when the wishlist changes anywhere
     * empty wishlist -> "No products added" message
     * share form: name + e-mail + optional photo (image, max 5 MB).
       A static site cannot upload files, so the form opens the visitor's
       e-mail app with the details filled in (photo is attached by them).
   Needs: config.js, products.js, utils.js, storage.js, cart.js,
          wishlist.js, toast.js
   ===================================================================== */
(function (global) {
    'use strict';

    var doc = global.document;
    var cfg = global.AliyanConfig || {};
    var U = global.AliyanUtils;
    var Cart = global.AliyanCart;
    var Wishlist = global.AliyanWishlist;

    if (!doc || !U) {
        if (global.console) { global.console.error('account.js: utils.js did not load.'); }
        return;
    }

    var MAX_PHOTO_BYTES = 5 * 1024 * 1024;

    /* ------------------------- Helpers ------------------------- */

    function byId(id) { return doc.getElementById(id); }
    function esc(value) { return U.escapeHtml(value); }

    function toast(message, type, ms) {
        if (global.AliyanToast) { global.AliyanToast.show(message, type, ms); }
    }

    function safe(name, fn) {
        try { fn(); } catch (error) {
            if (global.console) { global.console.error('account.js [' + name + ']:', error); }
        }
    }

    /* ===================================================================
       MY ACCOUNT  (login + register)
       =================================================================== */

    var popupTimer = null;

    /* bottom-right message box; falls back to a toast if the box is missing */
    function showPopup(message, ms) {
        var popup = byId('status-popup');
        if (!popup) { toast(message); return; }

        clearTimeout(popupTimer);
        popup.textContent = message;
        popup.classList.add('active');
        popupTimer = setTimeout(function () { popup.classList.remove('active'); }, ms || 3000);
    }

    /* Accounts do not exist yet (static site, no server). So both forms are honest about it:
       nothing is "logged in", nothing is saved, and no e-mail is promised. */
    var COMING_SOON_MESSAGE = 'Account login is coming soon. You can place your order without logging in.';

    function bindComingSoon(formId) {
        var form = byId(formId);
        if (!form) { return; }

        form.noValidate = true;

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            // never keep a typed password around; nothing typed here is stored anywhere
            var fields = form.querySelectorAll('input');
            for (var i = 0; i < fields.length; i++) { fields[i].value = ''; }

            showPopup(COMING_SOON_MESSAGE, 5000);
        });
    }

    function initLogin() { bindComingSoon('loginForm'); }

    function initRegister() { bindComingSoon('regForm'); }

    /* ===================================================================
       WISHLIST TABLE
       =================================================================== */

    function rowHtml(product) {
        var url = esc(U.productUrl(product.id));
        var id = esc(product.id);
        var old = product.originalPrice > product.price
            ? '<span class="original-price">' + esc(U.formatPrice(product.originalPrice)) + '</span> '
            : '';

        return '' +
            '<tr data-product-id="' + id + '">' +
                '<td>' +
                    '<a class="wishlist-product" href="' + url + '">' +
                        '<img class="product-image" src="' + esc(U.imageUrl(product)) + '" alt="' + esc(product.name) + '" loading="lazy">' +
                        '<span>' + esc(product.name) + '</span>' +
                    '</a>' +
                '</td>' +
                '<td>' + old + esc(U.formatPrice(product.price)) + '</td>' +
                '<td class="actions">' +
                    '<button type="button" class="btn dark wishlist-add-btn" data-product-id="' + id + '">Add to Cart</button>' +
                    '<button type="button" class="remove-wishlist-btn" data-product-id="' + id + '" aria-label="Remove ' + esc(product.name) + ' from wishlist">Remove</button>' +
                '</td>' +
            '</tr>';
    }

    function initWishlistTable() {
        var body = byId('wishlist-table-body');
        if (!body || !Wishlist) { return; }

        var wrap = byId('wishlist-table-wrap');
        var empty = byId('empty-wishlist-message');

        function render() {
            var items = Wishlist.getItems();
            body.innerHTML = items.map(rowHtml).join('');
            if (wrap) { wrap.hidden = items.length === 0; }
            if (empty) { empty.hidden = items.length > 0; }
        }

        body.addEventListener('click', function (event) {
            var target = event.target;
            if (!target || !target.closest) { return; }

            var addBtn = target.closest('.wishlist-add-btn');
            if (addBtn && Cart) {
                var wishId = addBtn.getAttribute('data-product-id');

                /* clothes / shoes need a size -> product page (same rule as the product cards) */
                var allProducts = global.AliyanProducts;
                var wishProduct = allProducts && typeof allProducts.getById === 'function' ? allProducts.getById(wishId) : null;
                var card = global.AliyanProductCard;
                if (wishProduct && card && typeof card.needsSize === 'function' && card.needsSize(wishProduct)) {
                    toast('Please choose a size first.', 'info');
                    global.location.href = U.productUrl(wishId);
                    return;
                }

                var result = Cart.add(wishId);
                if (!result.ok) { toast('Sorry, this product is not available right now.', 'error'); return; }
                if (result.capped) { toast('Maximum ' + Cart.MAX_QTY + ' pieces of one item per order.', 'info'); }

                var panel = global.AliyanCartPanel;
                if (panel && typeof panel.open === 'function') { panel.open(); }
                else if (!result.capped) { toast('Added to cart', 'success'); }
                return;
            }

            var removeBtn = target.closest('.remove-wishlist-btn');
            if (removeBtn) {
                Wishlist.remove(removeBtn.getAttribute('data-product-id'));   // the event below redraws the table
                toast('Removed from wishlist', 'info');
            }
        });

        Wishlist.subscribe(render);                           // also fires when ANOTHER tab changes it
        render();
    }

    /* ===================================================================
       SHARE YOUR OWN PRODUCT  (wishlist page)
       =================================================================== */

    function initShareForm() {
        var form = byId('share-product-form');
        if (!form) { return; }

        var nameInput = byId('share-name');
        var emailInput = byId('share-email');
        var fileInput = byId('share-photo');
        var fileName = byId('file-name');
        var chooseBtn = byId('file-choose-btn');

        form.noValidate = true;

        function resetFileLabel() {
            if (fileName) { fileName.textContent = 'No file chosen'; }
        }

        // the real input covers the button; this helps keyboard users (Enter / Space on the button)
        if (chooseBtn && fileInput) {
            chooseBtn.addEventListener('click', function () { fileInput.click(); });
        }

        if (fileInput) {
            fileInput.addEventListener('change', function () {
                var file = fileInput.files && fileInput.files[0];

                if (!file) { resetFileLabel(); return; }

                if (!/^image\//i.test(file.type)) {
                    toast('Please choose an image file (JPG, PNG, WEBP...).', 'error');
                    fileInput.value = '';
                    resetFileLabel();
                    return;
                }
                if (file.size > MAX_PHOTO_BYTES) {
                    toast('This photo is too large. Please choose one under 5 MB.', 'error');
                    fileInput.value = '';
                    resetFileLabel();
                    return;
                }
                if (fileName) { fileName.textContent = file.name; }
            });
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var name = String(nameInput.value || '').trim();
            var email = String(emailInput.value || '').trim();
            var file = fileInput && fileInput.files && fileInput.files[0];

            if (name.length < 2) { toast('Please enter your name.', 'error'); nameInput.focus(); return; }
            if (!U.isValidEmail(email)) { toast('Please enter a valid email address.', 'error'); emailInput.focus(); return; }

            var to = cfg.contactEmail || '';
            var subject = 'Product submission from ' + name;
            var bodyText = [
                'Hello ' + (cfg.siteName || 'Aliyan Collection') + ',',
                '',
                'I would like to share my product.',
                '',
                'Name: ' + name,
                'Email: ' + email,
                'Photo: ' + (file ? file.name + ' (please attach this photo to the email)' : 'I will attach a photo to this email')
            ].join('\n');

            // open the visitor's e-mail app with everything filled in
            var link = doc.createElement('a');
            link.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(bodyText);
            link.style.display = 'none';
            doc.body.appendChild(link);
            link.click();
            doc.body.removeChild(link);

            toast('Opening your email app \u2014 please attach your photo and press send.', 'success', 5000);
            form.reset();
            resetFileLabel();
        });
    }

    /* ------------------------- Start ------------------------- */

    U.onReady(function () {
        safe('login', initLogin);
        safe('register', initRegister);
        safe('wishlist table', initWishlistTable);
        safe('share form', initShareForm);
    });

})(window);
