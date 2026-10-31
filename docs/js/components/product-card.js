/* =====================================================================
   js/components/product-card.js
   Aliyan Collection - builds product cards and makes them work.
   Loaded after cart-panel.js, BEFORE the page script (home.js, shop.js ...).
   Plain script -> window.AliyanProductCard
   ---------------------------------------------------------------------
   Needs: config.js, products.js, utils.js, cart.js, wishlist.js.
   Optional: toast.js, cart-panel.js. Styles: css/components/product-card.css

   TWO LAYOUTS (same class names as css/components/product-card.css)
     'home'  image + name + price + "Add to Cart" button
             -> home page, search results, related products
     'shop'  image + SKU + name + price, hover bar with
             "Add to Cart" and "Wishlist" buttons
             -> shop pages (men / women / kids), wishlist page

   API
     AliyanProductCard.html(product, { layout:'home'|'shop', eager:false })
                                            -> HTML string of ONE card
     AliyanProductCard.render(container, products, options)
                                            -> number of cards drawn
         container : element or CSS selector
         products  : array of products (from AliyanProducts)
         options   : { layout, emptyMessage, append:false, eager:false }
     AliyanProductCard.renderIds(container, 'M-101,W-101', options)
                                            -> same, from ids (array or "a,b,c")
     AliyanProductCard.syncWishlist()       refresh all heart buttons
     AliyanProductCard.sizeMode(product)    -> 'none' | 'shoes' | 'clothes'
     AliyanProductCard.needsSize(product)   -> true when a size must be chosen

   CLICKS (handled automatically for every card on the page)
     .add-to-cart      -> adds 1 piece to the cart and opens the cart panel
                          (clothes / shoes: opens the product page to pick a size)
     .add-to-wishlist  -> adds / removes from wishlist (+ toast)
     tap on the card   -> opens the product page
   ===================================================================== */
(function (global) {
    'use strict';

    if (global.AliyanProductCard) { return; }     // script included twice -> run once

    var doc = global.document;
    var cfg = global.AliyanConfig || {};
    var U = global.AliyanUtils || {};
    var Products = global.AliyanProducts;

    var ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

    /* ------------------------- Helpers ------------------------- */

    function esc(value) {
        if (typeof U.escapeHtml === 'function') { return U.escapeHtml(value); }
        return String(value === undefined || value === null ? '' : value)
            .replace(/[&<>"'`]/g, function (ch) { return ESCAPES[ch]; });
    }

    function money(value) {
        if (typeof U.formatPrice === 'function') { return U.formatPrice(value); }
        return '$' + (isFinite(Number(value)) ? Number(value) : 0).toFixed(2);
    }

    function productUrl(id) {
        if (typeof U.productUrl === 'function') { return U.productUrl(id); }
        return 'pages/shop/product.html?id=' + encodeURIComponent(id);
    }

    /* ---- Size rules (ONE place - card, wishlist and product page all use this) ----
       'none'    -> bags, watches, jewellery, scarf ... (one size, goes straight to cart)
       'shoes'   -> shoes / sneakers / heels / boots (needs a size)
       'clothes' -> everything else (needs a size)                                    */
    function sizeMode(product) {
        var name = String((product && product.name) || '');
        if (/\b(earrings?|necklaces?|watch(es)?|sunglasses|scarf|scarves|handbag|backpack|belt|bag)\b/i.test(name)) { return 'none'; }
        if (/\b(sneakers?|shoes?|heels?|boots?|flats?)\b/i.test(name)) { return 'shoes'; }
        return 'clothes';
    }

    function needsSize(product) {
        return !!product && sizeMode(product) !== 'none';
    }

    function imageUrl(product) {
        if (typeof U.imageUrl === 'function') { return U.imageUrl(product); }
        return product.image || '';
    }

    function iconUrl(fileName) {
        var path = 'assets/icons/ui/' + fileName;
        return typeof cfg.url === 'function' ? cfg.url(path) : path;
    }

    function toast(message, type) {
        if (global.AliyanToast) { global.AliyanToast.show(message, type); }
    }

    function resolveContainer(container) {
        if (typeof container === 'string') { return doc.querySelector(container); }
        return container && container.nodeType === 1 ? container : null;
    }

    /* ------------------------- Pieces of a card ------------------------- */

    function saleTag(product) {
        return product.onSale ? '<span class="sale-tag">SALE</span>' : '';
    }

    function priceHtml(product) {
        var old = product.originalPrice > product.price
            ? '<span class="original-price">' + esc(money(product.originalPrice)) + '</span>'
            : '';
        return old + esc(money(product.price));
    }

    function imageHtml(product, eager) {
        return '<img src="' + esc(imageUrl(product)) + '" alt="' + esc(product.name) + '"' +
            (eager ? '' : ' loading="lazy"') + ' decoding="async">';
    }

    function wishlistState(id) {
        return !!(global.AliyanWishlist && global.AliyanWishlist.has(id));
    }

    function wishlistLabel(name, on) {
        return (on ? 'Remove ' : 'Add ') + name + (on ? ' from wishlist' : ' to wishlist');
    }

    /* ------------------------- One card (HTML string) ------------------------- */

    function layoutHome(product, eager) {
        var id = esc(product.id);
        var url = esc(productUrl(product.id));
        return '' +
            '<article class="product-card" data-product-id="' + id + '">' +
                saleTag(product) +
                '<a class="product-link" href="' + url + '" aria-label="View ' + esc(product.name) + '">' +
                    imageHtml(product, eager) +
                '</a>' +
                '<div class="product-info">' +
                    '<h4><a href="' + url + '">' + esc(product.name) + '</a></h4>' +
                    '<span class="price">' + priceHtml(product) + '</span>' +
                    '<button type="button" class="btn add-to-cart" data-product-id="' + id + '">Add to Cart</button>' +
                '</div>' +
            '</article>';
    }

    function layoutShop(product, eager) {
        var id = esc(product.id);
        var name = esc(product.name);
        var on = wishlistState(product.id);
        return '' +
            '<article class="product-card" data-product-id="' + id + '">' +
                saleTag(product) +
                '<a class="product-link" href="' + esc(productUrl(product.id)) + '">' +
                    imageHtml(product, eager) +
                    '<div class="product-info">' +
                        (product.sku ? '<p class="product-sku">SKU: ' + esc(product.sku) + '</p>' : '') +
                        '<h4>' + name + '</h4>' +
                        '<div class="product-price">' + priceHtml(product) + '</div>' +
                    '</div>' +
                '</a>' +
                '<div class="product-actions">' +
                    '<button type="button" class="action-btn add-to-cart" data-product-id="' + id + '" aria-label="Add ' + name + ' to cart">' +
                        '<img src="' + esc(iconUrl('icon-add-to-cart.svg')) + '" alt="" aria-hidden="true">' +
                        '<span class="action-label">Add to Cart</span>' +
                    '</button>' +
                    '<button type="button" class="action-btn add-to-wishlist' + (on ? ' in-wishlist active' : '') + '" data-product-id="' + id + '"' +
                        ' aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + esc(wishlistLabel(product.name, on)) + '">' +
                        '<img src="' + esc(iconUrl(on ? 'icon-wishlist-active.svg' : 'icon-wishlist.svg')) + '" alt="" aria-hidden="true">' +
                        '<span class="action-label">' + (on ? 'Wishlisted' : 'Wishlist') + '</span>' +
                    '</button>' +
                '</div>' +
            '</article>';
    }

    function cardHtml(product, options) {
        if (!product || product.id === undefined || product.id === null) { return ''; }
        options = options || {};
        var eager = !!options.eager;
        return options.layout === 'shop' ? layoutShop(product, eager) : layoutHome(product, eager);
    }

    /* ------------------------- Many cards ------------------------- */

    function render(container, products, options) {
        var el = resolveContainer(container);
        if (!el) { return 0; }
        options = options || {};

        var list = Array.isArray(products) ? products.filter(Boolean) : [];

        if (!list.length) {
            if (!options.append) {
                var message = options.emptyMessage === undefined ? 'No products found.' : options.emptyMessage;
                el.innerHTML = message ? '<p class="no-products-message">' + esc(message) + '</p>' : '';
            }
            return 0;
        }

        var html = list.map(function (p) { return cardHtml(p, options); }).join('');
        if (options.append) { el.insertAdjacentHTML('beforeend', html); }
        else { el.innerHTML = html; }
        return list.length;
    }

    function renderIds(container, ids, options) {
        var products = Products && typeof Products.getByIds === 'function' ? Products.getByIds(ids) : [];
        return render(container, products, options);
    }

    /* ------------------------- Wishlist hearts ------------------------- */

    function syncWishlist() {
        var buttons = doc.querySelectorAll('.product-card .add-to-wishlist[data-product-id]');
        Array.prototype.forEach.call(buttons, function (button) {
            var id = button.getAttribute('data-product-id');
            var on = wishlistState(id);
            var product = Products && Products.getById(id);

            button.classList.toggle('in-wishlist', on);
            button.classList.toggle('active', on);
            button.setAttribute('aria-pressed', on ? 'true' : 'false');
            if (product) { button.setAttribute('aria-label', wishlistLabel(product.name, on)); }

            var img = button.querySelector('img');
            if (img) {
                img.removeAttribute('data-fallback-done');
                img.src = iconUrl(on ? 'icon-wishlist-active.svg' : 'icon-wishlist.svg');
            }
            var label = button.querySelector('.action-label');
            if (label) { label.textContent = on ? 'Wishlisted' : 'Wishlist'; }
        });
    }

    /* ------------------------- Clicks (one listener for ALL cards) ------------------------- */

    function productIdOf(element) {
        var id = element.getAttribute('data-product-id');
        if (id) { return id; }
        var card = element.closest('.product-card[data-product-id]');
        return card ? card.getAttribute('data-product-id') : '';
    }

    function handleAddToCart(button) {
        var Cart = global.AliyanCart;
        var id = productIdOf(button);
        if (!Cart || !id) { return; }

        /* Clothes / shoes need a size -> open the product page so the customer can pick one.
           (Adding from the card without a size made the same item appear twice in the cart.) */
        var product = Products && typeof Products.getById === 'function' ? Products.getById(id) : null;
        if (needsSize(product)) {
            toast('Please choose a size first.', 'info');
            global.location.href = productUrl(id);
            return;
        }

        var result = Cart.add(id);

        if (!result.ok) {
            toast('Sorry, this product is not available right now.', 'error');
            return;
        }
        if (result.capped) {
            toast('Maximum ' + Cart.MAX_QTY + ' pieces of one item per order.', 'info');
        }

        var panel = global.AliyanCartPanel;
        if (panel && typeof panel.open === 'function') {
            panel.open();                                  // the panel shows the new item
        } else if (!result.capped) {
            toast('Added to cart', 'success');
        }
    }

    function handleWishlist(button) {
        var Wishlist = global.AliyanWishlist;
        var id = productIdOf(button);
        if (!Wishlist || !id) { return; }

        var result = Wishlist.toggle(id);
        if (!result.ok) {
            toast('Sorry, this product is not available right now.', 'error');
            return;
        }
        toast(result.added ? 'Added to wishlist' : 'Removed from wishlist', result.added ? 'success' : 'info');
        // hearts are refreshed by the wishlist event (see below)
    }

    function bindEvents() {

        doc.addEventListener('click', function (event) {
            var target = event.target;
            if (!target || !target.closest) { return; }

            var cartButton = target.closest('.product-card .add-to-cart');
            if (cartButton) {
                event.preventDefault();
                handleAddToCart(cartButton);
                return;
            }

            var wishButton = target.closest('.product-card .add-to-wishlist');
            if (wishButton) {
                event.preventDefault();
                handleWishlist(wishButton);
                return;
            }

            // tap on an empty part of the card -> open the product page
            var card = target.closest('.product-card[data-product-id]');
            if (card &&
                !event.defaultPrevented &&
                event.button === 0 &&
                !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey &&
                !target.closest('a, button, input, select, textarea, label')) {
                global.location.href = productUrl(card.getAttribute('data-product-id'));
            }
        });

        if (global.AliyanWishlist && typeof global.AliyanWishlist.subscribe === 'function') {
            global.AliyanWishlist.subscribe(syncWishlist);
        }
    }

    /* ------------------------- Public API ------------------------- */

    global.AliyanProductCard = {
        html: cardHtml,
        render: render,
        renderIds: renderIds,
        syncWishlist: syncWishlist,
        sizeMode: sizeMode,
        needsSize: needsSize
    };
    global.needsSize = needsSize;

    bindEvents();

})(window);
