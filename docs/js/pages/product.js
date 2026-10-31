/* =====================================================================
   js/pages/product.js
   Aliyan Collection - PRODUCT DETAIL PAGE (pages/shop/product.html).
   Loaded LAST on the page, after all core + component scripts.
   Plain script (no import/export).
   ---------------------------------------------------------------------
   Link format :  product.html?id=M-101   (case does not matter)
   What it does
     * reads the product from data/products.js and fills the page
       (name, price, discount, image, SKU, condition, breadcrumb, title)
     * "Product not found" screen for a missing / wrong id
     * size picker  - clothes: XS-XL, shoes: EU sizes, bags / jewellery /
                      watches: no size (one size)
     * quantity + / -  (1 up to config.maxQtyPerItem)
     * Add to Cart (opens the cart panel), Wishlist heart (stays in sync)
     * rating / stock / reviews tab: shown ONLY when the product has real data
       (rating + reviewCount, stock, reviews[] in products.js) - never invented
     * tabs (Description / Specifications / Reviews / Shipping)
     * share links (Facebook, WhatsApp, copy link)
     * "You May Also Like" - related products of the same category
     * SEO + share previews for the selected product: title, description, canonical,
       og/twitter tags and JSON-LD (Product + BreadcrumbList). Only real data from
       products.js; rating only with rating + reviewCount; availability only with stock.
       Unknown id -> noindex, no canonical, no product markup.
   Needs: config.js, products.js, utils.js, storage.js, cart.js,
          wishlist.js, toast.js, cart-panel.js, product-card.js
   ===================================================================== */
(function (global) {
    'use strict';

    var doc = global.document;
    var cfg = global.AliyanConfig || {};
    var U = global.AliyanUtils;
    var Products = global.AliyanProducts;
    var Cart = global.AliyanCart;
    var Wishlist = global.AliyanWishlist;
    var Storage = global.AliyanStorage;

    if (!doc || !U || !Products) {
        if (global.console) { global.console.error('product.js: a core script did not load.'); }
        return;
    }

    var SELECTED_KEY = (cfg.storageKeys && cfg.storageKeys.selectedProduct) || 'selectedProduct';
    var MAX_QTY = (Cart && Cart.MAX_QTY) || cfg.maxQtyPerItem || 10;
    var SITE_NAME = cfg.siteName || 'Aliyan Collection';

    var CATEGORY_TAGS = { men: 'Men\u2019s Collection', women: 'Women\u2019s Collection', kids: 'Kids\u2019 Collection' };

    var SHOE_SIZES = {
        men: { list: ['40', '41', '42', '43', '44', '45'], pick: '42', range: 'EU 40 \u2013 45' },
        women: { list: ['36', '37', '38', '39', '40', '41'], pick: '38', range: 'EU 36 \u2013 41' },
        kids: { list: ['28', '29', '30', '31', '32', '33'], pick: '30', range: 'EU 28 \u2013 33' }
    };

    var state = {
        product: null,
        sizeMode: 'clothes',       // 'clothes' | 'shoes' | 'none'
        size: '',
        qty: 1
    };

    var el = {};
    var addedTimer = null;

    /* ------------------------- Helpers ------------------------- */

    function byId(id) { return doc.getElementById(id); }

    function toast(message, type) {
        if (global.AliyanToast) { global.AliyanToast.show(message, type); }
    }

    function setText(id, text) {
        var node = byId(id);
        if (node) { node.textContent = text; }
        return node;
    }

    /* name -> which kind of size the product needs */
    /* (rule lives in components/product-card.js so cards, wishlist and this page always agree) */
    function detectSizeMode(product) {
        var card = global.AliyanProductCard;
        if (card && typeof card.sizeMode === 'function') { return card.sizeMode(product); }
        return 'clothes';
    }

    function conditionLabel(product) {
        return product.condition === 'pre-owned' ? 'Pre-owned' : 'New';
    }

    /* The shop data has no long text, so a short description is written from the product facts */
    function describe(product) {
        var label = (product.categoryLabel || 'Fashion').toLowerCase();
        var used = product.condition === 'pre-owned';
        var short = product.name + ' from our ' + label + '\u2019s collection. ' +
            (used
                ? 'A carefully checked pre-owned piece in great condition \u2014 style with a smaller footprint.'
                : 'Premium quality crafted with careful attention to detail, designed for lasting comfort and timeless style.');
        var long = 'The ' + product.name + ' is part of our curated ' + label + ' collection \u2014 thoughtfully selected and carefully checked. ' +
            (used
                ? 'Every pre-owned item is inspected before it is listed, so you get great value without compromising on quality. '
                : 'From fabric selection to the final stitch, every detail matters. ') +
            'Whether you\u2019re dressing for a casual day out or a polished occasion, this piece effortlessly adapts to your lifestyle.';
        return { short: short, long: long };
    }

    function pageUrl(id) {
        try {
            var url = new URL(global.location.href);
            url.search = '?id=' + encodeURIComponent(id);
            url.hash = '';
            return url.toString();
        } catch (e) {
            return global.location.href;
        }
    }

    function setMeta(selector, value) {
        var node = doc.querySelector(selector);
        if (node) { node.setAttribute('content', value); }
    }

    /* ------------------------- Search engines + share previews ------------------------- */

    function absUrl(path) {
        try { return new URL(path, global.location.href).href; } catch (e) { return path; }
    }

    function upsertMeta(attr, key, value) {
        var node = doc.querySelector('meta[' + attr + '="' + key + '"]');
        if (!node) {
            node = doc.createElement('meta');
            node.setAttribute(attr, key);
            doc.head.appendChild(node);
        }
        node.setAttribute('content', value);
    }

    function setCanonical(href) {
        var link = doc.querySelector('link[rel="canonical"]');
        if (!href) {
            if (link && link.parentNode) { link.parentNode.removeChild(link); }
            return;
        }
        if (!link) {
            link = doc.createElement('link');
            link.setAttribute('rel', 'canonical');
            doc.head.appendChild(link);
        }
        link.setAttribute('href', href);
    }

    function setJsonLd(id, data) {
        var node = byId(id);
        if (!data) {
            if (node && node.parentNode) { node.parentNode.removeChild(node); }
            return;
        }
        if (!node) {
            node = doc.createElement('script');
            node.type = 'application/ld+json';
            node.id = id;
            doc.head.appendChild(node);
        }
        node.textContent = JSON.stringify(data).replace(/</g, '\\u003c');   // JSON.stringify skips undefined fields
    }

    function updateSeo(product, metaText, shortText) {
        var url = pageUrl(product.id);
        var image = absUrl(U.imageUrl(product));
        var title = product.name + ' | ' + SITE_NAME;

        setCanonical(url);
        upsertMeta('property', 'og:type', 'product');
        upsertMeta('property', 'og:url', url);
        upsertMeta('property', 'og:image', image);
        upsertMeta('property', 'og:image:alt', product.name);
        upsertMeta('name', 'twitter:title', title);
        upsertMeta('name', 'twitter:description', metaText);
        upsertMeta('name', 'twitter:image', image);
        upsertMeta('name', 'twitter:image:alt', product.name);

        var condition = product.condition === 'pre-owned' ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition';
        var ld = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            'name': product.name,
            'image': [image],
            'description': shortText,
            'sku': product.sku || undefined,
            'brand': { '@type': 'Brand', 'name': SITE_NAME },
            'category': product.categoryLabel || undefined,
            'itemCondition': condition,
            'url': url
        };

        var price = Number(product.price);
        if (isFinite(price) && price > 0 && cfg.currencyCode) {
            ld.offers = {
                '@type': 'Offer',
                'url': url,
                'priceCurrency': cfg.currencyCode,       // USD now, PKR automatically after the price switch
                'price': price.toFixed(2),
                'itemCondition': condition
            };
            // availability only when products.js really has a stock number
            if (typeof product.stock === 'number' && isFinite(product.stock)) {
                ld.offers.availability = product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
            }
        }

        // rating only with BOTH a rating and a review count in products.js (never invented)
        var rating = Number(product.rating);
        var count = Number(product.reviewCount);
        if (rating > 0 && rating <= 5 && count > 0) {
            ld.aggregateRating = { '@type': 'AggregateRating', 'ratingValue': rating, 'reviewCount': count };
        }
        setJsonLd('product-jsonld', ld);

        // same trail as the visible breadcrumb: Home > Category > Product
        var pages = (cfg.paths && cfg.paths.pages) || {};
        var crumbs = [{ name: 'Home', item: absUrl(typeof cfg.url === 'function' ? cfg.url('index.html') : '../../index.html') }];
        if (pages[product.category] && typeof cfg.url === 'function') {
            crumbs.push({ name: product.categoryLabel || 'Shop', item: absUrl(cfg.url(pages[product.category])) });
        }
        crumbs.push({ name: product.name, item: url });
        setJsonLd('breadcrumb-jsonld', {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            'itemListElement': crumbs.map(function (c, i) {
                return { '@type': 'ListItem', 'position': i + 1, 'name': c.name, 'item': c.item };
            })
        });
    }

    /* ------------------------- Not found ------------------------- */

    function showNotFound() {
        var notFound = byId('product-not-found');
        var section = byId('product-section');
        if (notFound) { notFound.hidden = false; }
        if (section) { section.hidden = true; }

        [U.qs('.tabs-section'), U.qs('.related-section')].forEach(function (node) {
            if (node) { node.hidden = true; }
        });

        setText('bc-product-name', 'Not found');
        doc.title = 'Product not found | ' + SITE_NAME;

        // wrong / missing id: keep it out of search results, no canonical, no product markup
        var nfText = 'Sorry, we could not find this product at ' + SITE_NAME + '. Browse men\u2019s, women\u2019s and kids\u2019 fashion instead.';
        upsertMeta('name', 'robots', 'noindex');
        upsertMeta('name', 'description', nfText);
        upsertMeta('property', 'og:title', doc.title);
        upsertMeta('property', 'og:description', nfText);
        upsertMeta('name', 'twitter:title', doc.title);
        upsertMeta('name', 'twitter:description', nfText);
        setCanonical('');
        setJsonLd('product-jsonld', null);
        setJsonLd('breadcrumb-jsonld', null);
        var nfHeading = byId('nf-heading');          // it is an h2 in the HTML so the page has one h1 only
        if (nfHeading) {
            nfHeading.setAttribute('role', 'heading');
            nfHeading.setAttribute('aria-level', '1');
        }
    }

    /* ------------------------- Fill the page ------------------------- */

    function fillProduct(product) {
        var text = describe(product);
        var catLabel = product.categoryLabel || 'Shop';

        // title + search engines
        doc.title = product.name + ' | ' + SITE_NAME;
        var metaText = 'Buy ' + product.name + ' from ' + SITE_NAME + ', Karachi, for ' + U.formatPrice(product.price) +
            '. ' + (CATEGORY_TAGS[product.category] || 'Fashion') + ', ' +
            (product.condition === 'pre-owned' ? 'pre-owned' : 'brand new') + '. Cash on delivery available.';
        setMeta('meta[name="description"]', metaText);
        setMeta('meta[property="og:title"]', product.name + ' | ' + SITE_NAME);
        setMeta('meta[property="og:description"]', metaText);
        updateSeo(product, metaText, text.short);

        // breadcrumb
        var bcLink = byId('bc-cat-link');
        var pages = (cfg.paths && cfg.paths.pages) || {};
        if (bcLink) {
            bcLink.textContent = catLabel;
            if (pages[product.category] && typeof cfg.url === 'function') { bcLink.href = cfg.url(pages[product.category]); }
        }
        setText('bc-product-name', product.name);

        // image
        var img = byId('pd-main-img');
        if (img) {
            img.removeAttribute('data-fallback-done');
            img.src = U.imageUrl(product);
            img.alt = product.name;
        }

        // sale badge, names, price
        var badge = byId('pd-sale-badge');
        if (badge) { badge.hidden = !product.onSale; }

        setText('pd-cat-tag', CATEGORY_TAGS[product.category] || 'Collection');
        setText('pd-name', product.name);
        setText('pd-price', U.formatPrice(product.price));
        setText('pd-orig-price', product.originalPrice > product.price ? U.formatPrice(product.originalPrice) : '');
        setText('pd-discount-badge', product.discountPercent > 0 ? '-' + product.discountPercent + '%' : '');

        setText('pd-desc', text.short);
        setText('tab-desc-body', text.long);

        // meta list + specification table
        setText('pd-sku', product.sku || '\u2014');
        setText('pd-meta-cat', catLabel);
        setText('pd-condition', conditionLabel(product));
        setText('spec-condition', product.condition === 'pre-owned' ? 'Pre-owned' : 'Brand New');
    }

    /* ------------------------- Rating, stock, reviews (real data only) ------------------------- */

    function stars(value) {
        var full = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
        return new Array(full + 1).join('\u2605') + new Array(6 - full).join('\u2606');
    }

    function renderRatingAndStock(product) {
        // rating: only with BOTH rating and reviewCount
        var ratingRow = byId('pd-rating');
        var rating = Number(product.rating);
        var count = Number(product.reviewCount);
        if (ratingRow) {
            if (rating > 0 && rating <= 5 && count > 0) {
                setText('pd-stars', stars(rating));
                var starsEl = byId('pd-stars');
                if (starsEl) { starsEl.setAttribute('aria-label', 'Rated ' + rating + ' out of 5'); }
                setText('pd-review-cnt', rating + ' / 5 (' + count + (count === 1 ? ' review)' : ' reviews)'));
                ratingRow.hidden = false;
            } else {
                ratingRow.hidden = true;
            }
        }

        // stock: only when products.js has a real stock number
        var hasStock = typeof product.stock === 'number' && isFinite(product.stock);
        var stockRow = byId('pd-stock-row');
        var availRow = byId('pd-availability-row');
        var inStock = hasStock && product.stock > 0;
        var stockText = hasStock ? (inStock ? 'In Stock' : 'Out of Stock') : '';

        if (stockRow) {
            stockRow.hidden = !hasStock;
            stockRow.classList.toggle('out-of-stock', hasStock && !inStock);
            setText('pd-stock-text', stockText);
        }
        if (availRow) {
            availRow.hidden = !hasStock;
            setText('pd-availability', stockText);
        }
        if (hasStock && !inStock && el.atc) {
            el.atc.disabled = true;
            el.atc.textContent = 'Out of Stock';
        }
    }

    function renderReviews(product) {
        var tabBtn = byId('tab-btn-reviews');
        var pane = byId('tab-reviews');
        var list = byId('reviews-list');
        var reviews = Array.isArray(product.reviews) ? product.reviews.filter(function (r) { return r && r.text; }) : [];

        if (!reviews.length) {
            // no real reviews -> no Reviews tab at all (removed so keyboard tab-moving skips it too)
            if (tabBtn && tabBtn.parentNode) { tabBtn.parentNode.removeChild(tabBtn); }
            if (pane && pane.parentNode) { pane.parentNode.removeChild(pane); }
            return;
        }

        if (tabBtn) { tabBtn.textContent = 'Reviews (' + reviews.length + ')'; }
        if (list) {
            list.innerHTML = reviews.map(function (r) {
                return '<div class="review-card">' +
                    '<p class="rv-name">' + U.escapeHtml(r.name || 'Customer') + '</p>' +
                    (Number(r.rating) > 0 ? '<p class="rv-stars">' + stars(r.rating) + '</p>' : '') +
                    '<p class="rv-text">' + U.escapeHtml(r.text) + '</p>' +
                '</div>';
            }).join('');
        }
    }

    /* ------------------------- Sizes ------------------------- */

    function setSpecSizes(textValue) {
        U.qsa('.spec-table tr').forEach(function (row) {
            var cells = row.querySelectorAll('td');
            if (cells.length > 1 && /available sizes/i.test(cells[0].textContent)) {
                cells[1].textContent = textValue;
            }
        });
    }

    function updateSizeLabel() {
        var label = byId('pd-size-label');
        if (label) { label.textContent = state.size ? '\u2014 ' + state.size : ''; }
    }

    function selectSize(size) {
        state.size = size;
        U.qsa('.size-btn', el.sizeRow).forEach(function (button) {
            var on = button.getAttribute('data-size') === size;
            button.classList.toggle('active', on);
            button.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        updateSizeLabel();
    }

    function setupSizes(product) {
        var row = el.sizeRow;
        var label = byId('pd-size-label');
        var labelBox = label ? label.closest('.opt-label') : null;
        if (!row) { return; }

        state.sizeMode = detectSizeMode(product);

        if (state.sizeMode === 'none') {
            // bags, jewellery, watches ... -> one size, nothing to choose
            state.size = '';
            row.hidden = true;
            if (labelBox) { labelBox.hidden = true; }
            setSpecSizes('One Size');
            return;
        }

        row.hidden = false;
        if (labelBox) { labelBox.hidden = false; }

        var ownSizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes.map(String) : null;

        if (state.sizeMode === 'shoes') {
            var set = SHOE_SIZES[product.category] || SHOE_SIZES.men;
            if (ownSizes) { set = { list: ownSizes, pick: ownSizes.indexOf(set.pick) !== -1 ? set.pick : ownSizes[0], range: ownSizes.join(', ') }; }
            row.innerHTML = set.list.map(function (size) {
                return '<button type="button" class="size-btn" data-size="' + U.escapeHtml(size) + '">' + U.escapeHtml(size) + '</button>';
            }).join('');
            if (labelBox && labelBox.firstChild) { labelBox.firstChild.nodeValue = 'Size (EU) '; }
            selectSize(set.pick);
            setSpecSizes(set.range);
            return;
        }

        // clothes with their own size list in products.js -> build the buttons from it
        if (ownSizes) {
            row.innerHTML = ownSizes.map(function (size) {
                return '<button type="button" class="size-btn" data-size="' + U.escapeHtml(size) + '">' + U.escapeHtml(size) + '</button>';
            }).join('');
            selectSize(ownSizes.indexOf('M') !== -1 ? 'M' : ownSizes[0]);
            setSpecSizes(ownSizes.join(', '));
            return;
        }

        // clothes: keep the buttons that are in the HTML, make sure one available size is selected
        var current = U.qs('.size-btn.active:not(:disabled)', row) || U.qs('.size-btn:not(:disabled)', row);
        selectSize(current ? current.getAttribute('data-size') : '');
    }

    /* ------------------------- Quantity ------------------------- */

    function renderQty() {
        setText('qty-val', String(state.qty));
        var minus = byId('qty-minus');
        var plus = byId('qty-plus');
        if (minus) { minus.disabled = state.qty <= 1; }
        if (plus) { plus.disabled = state.qty >= MAX_QTY; }
    }

    function changeQty(delta) {
        var next = state.qty + delta;
        if (next > MAX_QTY) {
            toast('Maximum ' + MAX_QTY + ' pieces of one item per order.', 'info');
            return;
        }
        if (next < 1) { return; }
        state.qty = next;
        renderQty();
    }

    /* ------------------------- Cart ------------------------- */

    function addToCart() {
        var product = state.product;
        if (!product || !Cart) { return; }

        var result = Cart.add(product.id, { quantity: state.qty, size: state.size });

        if (!result.ok) {
            toast('Sorry, this product is not available right now.', 'error');
            return;
        }
        if (result.capped) {
            toast('Maximum ' + MAX_QTY + ' pieces of one item per order.', 'info');
        }

        // short "Added" feedback on the button
        var button = el.atc;
        if (button) {
            clearTimeout(addedTimer);
            button.textContent = 'Added \u2713';
            addedTimer = setTimeout(function () { button.textContent = 'Add to Cart'; }, 1500);
        }

        var panel = global.AliyanCartPanel;
        if (panel && typeof panel.open === 'function') {
            panel.open();
        } else if (!result.capped) {
            toast('Added to cart', 'success');
        }
    }

    /* ------------------------- Wishlist ------------------------- */

    function syncWishlistButton() {
        var button = el.wish;
        if (!button || !state.product || !Wishlist) { return; }

        var on = Wishlist.has(state.product.id);
        button.classList.toggle('loved', on);
        button.classList.toggle('active', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
        button.setAttribute('title', on ? 'Remove from Wishlist' : 'Add to Wishlist');
        button.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Add to wishlist');
        button.textContent = on ? '\u2665' : '\u2661';
    }

    function toggleWishlist() {
        if (!state.product || !Wishlist) { return; }
        var result = Wishlist.toggle(state.product.id);
        if (!result.ok) {
            toast('Sorry, this product is not available right now.', 'error');
            return;
        }
        toast(result.added ? 'Added to wishlist' : 'Removed from wishlist', result.added ? 'success' : 'info');
        syncWishlistButton();
    }

    /* ------------------------- Share ------------------------- */

    function setupShare(product) {
        var url = pageUrl(product.id);
        var message = product.name + ' \u2013 ' + SITE_NAME;

        var fb = byId('share-facebook');
        if (fb) { fb.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url); }

        var wa = byId('share-whatsapp');
        if (wa) { wa.href = 'https://wa.me/?text=' + encodeURIComponent(message + ' ' + url); }

        var copy = byId('copy-link-btn');
        if (copy) {
            copy.addEventListener('click', function () {
                U.copyToClipboard(url).then(function (ok) {
                    toast(ok ? 'Link copied to clipboard' : 'Could not copy the link. Please copy it from the address bar.', ok ? 'success' : 'error');
                });
            });
        }
    }

    /* ------------------------- Tabs ------------------------- */

    function activateTab(name, focusButton) {
        var buttons = U.qsa('.tab-btn');
        var found = false;

        buttons.forEach(function (button) {
            var on = button.getAttribute('data-tab') === name;
            if (on) { found = true; }
            button.classList.toggle('active', on);
            button.setAttribute('aria-selected', on ? 'true' : 'false');
            button.setAttribute('tabindex', on ? '0' : '-1');
            if (on && focusButton) { button.focus(); }
        });
        if (!found) { return; }

        U.qsa('.tab-pane').forEach(function (pane) {
            pane.classList.toggle('active', pane.id === 'tab-' + name);
        });
    }

    function setupTabs() {
        var buttons = U.qsa('.tab-btn');
        if (!buttons.length) { return; }

        buttons.forEach(function (button) {
            button.addEventListener('click', function () { activateTab(button.getAttribute('data-tab'), false); });
            button.addEventListener('keydown', function (event) {
                var i = buttons.indexOf(button);
                var target = -1;
                if (event.key === 'ArrowRight') { target = (i + 1) % buttons.length; }
                else if (event.key === 'ArrowLeft') { target = (i - 1 + buttons.length) % buttons.length; }
                else if (event.key === 'Home') { target = 0; }
                else if (event.key === 'End') { target = buttons.length - 1; }
                if (target !== -1) {
                    event.preventDefault();
                    activateTab(buttons[target].getAttribute('data-tab'), true);
                }
            });
        });

        var current = U.qs('.tab-btn.active') || buttons[0];
        activateTab(current.getAttribute('data-tab'), false);
    }

    /* ------------------------- Related products ------------------------- */

    function renderRelated(product) {
        var grid = byId('related-grid');
        var section = U.qs('.related-section');
        if (!grid) { return; }

        var list = Products.getRelated(product, 4);
        if (!list.length || !global.AliyanProductCard) {
            if (section) { section.hidden = true; }
            return;
        }
        global.AliyanProductCard.render(grid, list, { layout: 'home', emptyMessage: '' });
    }

    /* ------------------------- Which product? ------------------------- */

    function findProduct() {
        var idFromLink = U.getQueryParam('id');

        if (idFromLink !== null && String(idFromLink).trim() !== '') {
            return Products.getById(idFromLink);              // wrong id -> null -> "not found"
        }

        // no id in the link: use the last product that was opened (old links)
        var saved = Storage ? Storage.get(SELECTED_KEY, null) : null;
        return saved && saved.id ? Products.getById(saved.id) : null;
    }

    /* ------------------------- Start ------------------------- */

    function init() {
        el.sizeRow = byId('size-row');
        el.atc = byId('atc-btn');
        el.wish = byId('wish-btn');

        var product = findProduct();
        if (!product) { showNotFound(); return; }

        state.product = product;
        if (Storage) { Storage.set(SELECTED_KEY, { id: product.id }); }

        fillProduct(product);
        renderRatingAndStock(product);
        renderReviews(product);
        setupSizes(product);
        renderQty();
        setupShare(product);
        setupTabs();
        renderRelated(product);
        syncWishlistButton();

        // size buttons (one listener, works for rebuilt shoe sizes too)
        if (el.sizeRow) {
            el.sizeRow.addEventListener('click', function (event) {
                var button = event.target.closest ? event.target.closest('.size-btn') : null;
                if (!button || button.disabled || !el.sizeRow.contains(button)) { return; }
                selectSize(button.getAttribute('data-size'));
            });
        }

        var minus = byId('qty-minus');
        var plus = byId('qty-plus');
        if (minus) { minus.addEventListener('click', function () { changeQty(-1); }); }
        if (plus) { plus.addEventListener('click', function () { changeQty(1); }); }
        if (el.atc) { el.atc.addEventListener('click', addToCart); }
        if (el.wish) { el.wish.addEventListener('click', toggleWishlist); }

        // heart stays correct when the wishlist changes elsewhere (cards, other tab)
        if (Wishlist && typeof Wishlist.subscribe === 'function') {
            Wishlist.subscribe(syncWishlistButton);
        }
    }

    U.onReady(init);

})(window);
