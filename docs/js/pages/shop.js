/* =====================================================================
   js/pages/shop.js
   Aliyan Collection - SHOP PAGES: pages/shop/mens.html, women.html,
   kids.html  (one script for all three).
   Loaded LAST on the page, after all core + component scripts.
   Plain script (no import/export).
   ---------------------------------------------------------------------
   Which category?   <body data-category="men|women|kids">
   What it does
     * draws the product cards (AliyanProductCard, 'shop' layout)
     * filters : on-sale checkbox, condition (new / pre-owned),
                 price range (two sliders, adjusted to this category)
     * sorting : default, price low/high, newest, oldest
     * "Show 12 / 24 / All" + a "Show More" button when products are hidden
     * column buttons : List View, 2, 3, 4 grid (remembered for the visit)
     * Reset Filters / Clear Filters
     * optional links:  mens.html?sale=1   ?sort=price-asc   ?condition=new
   Needs: config.js, products.js, utils.js, storage.js, product-card.js
   ===================================================================== */
(function (global) {
    'use strict';

    var doc = global.document;
    var cfg = global.AliyanConfig || {};
    var U = global.AliyanUtils;
    var Products = global.AliyanProducts;
    var Card = global.AliyanProductCard;
    var Storage = global.AliyanStorage;

    if (!doc || !U || !Products) {
        if (global.console) { global.console.error('shop.js: a core script did not load.'); }
        return;
    }

    var LAYOUT_KEY = 'aliyanShopColumns';
    var SORTS = ['default', 'price-asc', 'price-desc', 'newest', 'oldest'];
    var COLUMN_BUTTONS = {
        'col-list-btn': 'list',
        'col-2-btn': '2',
        'col-3-btn': '3',
        'col-4-btn': '4'
    };
    var COLUMN_CLASSES = ['col-list', 'col-2', 'col-3', 'col-4'];

    /* ------------------------- Page state ------------------------- */

    var state = {
        category: 'all',
        onSale: false,
        conditions: [],            // [] = every condition
        min: 0,
        max: 0,
        rangeMin: 0,
        rangeMax: 0,
        sort: 'default',
        perPage: 'all',            // 12 | 24 | 'all'
        visible: 0,                // how many cards are allowed on screen (when perPage is a number)
        columns: '4'
    };

    var baseList = [];             // every product of this category
    var rendered = 0;              // how many cards are on screen now
    var renderTimer = null;

    var el = {};                   // cached elements

    /* ------------------------- Helpers ------------------------- */

    function byId(id) { return doc.getElementById(id); }

    function toInt(value, fallback) {
        var n = parseInt(value, 10);
        return isFinite(n) ? n : fallback;
    }

    function money0(n) { return (cfg.currencySymbol || '$') + Number(n).toLocaleString(cfg.currencyLocale || 'en-US'); }

    function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

    function isTruthyParam(value) {
        return value === '1' || value === 'true' || value === 'yes' || value === 'on';
    }

    function readCategory() {
        var raw = String(doc.body.getAttribute('data-category') || '').toLowerCase();
        return Products.categories.indexOf(raw) !== -1 ? raw : 'all';
    }

    function cacheElements() {
        el.grid = byId('product-listing-grid');
        el.count = byId('product-count-display');
        el.onSale = byId('filter-on-sale');
        el.conditionGroup = byId('condition-filter-group');
        el.minSlider = byId('min-price-slider');
        el.maxSlider = byId('max-price-slider');
        el.minDisplay = byId('min-price-display');
        el.maxDisplay = byId('max-price-display');
        el.sort = byId('sort-by');
        el.show = byId('show-count');
        el.reset = byId('reset-filters');
        el.noResults = byId('no-results');
        el.noResultsReset = byId('no-results-reset');
        el.loadMoreWrap = null;
        el.loadMoreBtn = null;
    }

    /* ------------------------- Filtering + sorting ------------------------- */

    function getFiltered() {
        var list = baseList.filter(function (p) {
            if (state.onSale && !p.onSale) { return false; }
            if (state.conditions.length && state.conditions.indexOf(p.condition) === -1) { return false; }
            return p.price >= state.min && p.price <= state.max;
        });

        // keep the original order for equal values (stable sort on every browser)
        var indexed = list.map(function (product, position) { return { product: product, position: position }; });

        indexed.sort(function (a, b) {
            var diff = 0;
            switch (state.sort) {
                case 'price-asc':  diff = a.product.price - b.product.price; break;
                case 'price-desc': diff = b.product.price - a.product.price; break;
                case 'newest':     diff = b.product.timestamp - a.product.timestamp; break;
                case 'oldest':     diff = a.product.timestamp - b.product.timestamp; break;
                default:           diff = 0;
            }
            return diff || (a.position - b.position);
        });

        return indexed.map(function (item) { return item.product; });
    }

    /* ------------------------- Drawing ------------------------- */

    function applyColumns() {
        if (!el.grid) { return; }
        COLUMN_CLASSES.forEach(function (cls) { el.grid.classList.remove(cls); });
        el.grid.classList.add('col-' + state.columns);

        Object.keys(COLUMN_BUTTONS).forEach(function (id) {
            var button = byId(id);
            if (!button) { return; }
            var on = COLUMN_BUTTONS[id] === state.columns;
            button.classList.toggle('active', on);
            button.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function updatePriceDisplay() {
        if (el.minDisplay) { el.minDisplay.textContent = money0(state.min); }
        if (el.maxDisplay) { el.maxDisplay.textContent = money0(state.max); }
    }

    function updateLoadMore(total, shown) {
        var needed = shown < total;

        if (needed && !el.loadMoreWrap && el.grid && el.grid.parentNode) {
            var wrap = doc.createElement('div');
            wrap.className = 'load-more-wrap';
            wrap.style.cssText = 'text-align:center;margin-top:30px;';

            var button = doc.createElement('button');
            button.type = 'button';
            button.className = 'btn dark';
            button.id = 'load-more-btn';
            button.addEventListener('click', onLoadMore);

            wrap.appendChild(button);
            el.grid.parentNode.insertBefore(wrap, el.grid.nextSibling);
            el.loadMoreWrap = wrap;
            el.loadMoreBtn = button;
        }

        if (el.loadMoreWrap) {
            el.loadMoreWrap.hidden = !needed;
            if (needed && el.loadMoreBtn) {
                el.loadMoreBtn.textContent = 'Show More (' + (total - shown) + ' left)';
            }
        }
    }

    function updateCount(total, shown) {
        if (!el.count) { return; }
        if (!total) { el.count.textContent = 'No products found'; return; }
        el.count.textContent = shown === total
            ? 'Showing all ' + plural(total, 'product')
            : 'Showing ' + shown + ' of ' + plural(total, 'product');
    }

    /* draw(true) adds only the new cards ("Show More"); draw() redraws everything */
    function draw(appendOnly) {
        if (!el.grid || !Card) { return; }

        var list = getFiltered();
        var total = list.length;
        var limit = state.perPage === 'all' ? total : Math.min(total, state.visible);
        var shownList = list.slice(0, limit);

        if (!total) {
            el.grid.innerHTML = '';
            rendered = 0;
            if (el.noResults) { el.noResults.hidden = false; }
        } else {
            if (el.noResults) { el.noResults.hidden = true; }

            if (appendOnly && rendered > 0 && rendered < limit) {
                Card.render(el.grid, shownList.slice(rendered), { layout: 'shop', append: true, emptyMessage: '' });
            } else {
                Card.render(el.grid, shownList, { layout: 'shop', emptyMessage: '' });
            }
            rendered = limit;
        }

        updateCount(total, limit);
        updateLoadMore(total, limit);
    }

    /* many slider "input" events in a row -> draw once per animation frame */
    function scheduleDraw() {
        if (renderTimer) { return; }
        var run = function () { renderTimer = null; draw(false); };
        renderTimer = global.requestAnimationFrame ? global.requestAnimationFrame(run) : setTimeout(run, 16);
    }

    /* ------------------------- Controls -> state ------------------------- */

    function resetVisible() {
        state.visible = state.perPage === 'all' ? 0 : state.perPage;
    }

    function readConditions() {
        if (!el.conditionGroup) { return []; }
        var values = [];
        U.qsa('input[name="condition"]:checked', el.conditionGroup).forEach(function (input) {
            values.push(input.value);
        });
        // both (or none) ticked means "no condition filter"
        return values.length === 2 ? [] : values;
    }

    function onMinInput() {
        var v = toInt(el.minSlider.value, state.rangeMin);
        if (v > state.max) { v = state.max; el.minSlider.value = v; }
        state.min = v;
        updatePriceDisplay();
        resetVisible();
        scheduleDraw();
    }

    function onMaxInput() {
        var v = toInt(el.maxSlider.value, state.rangeMax);
        if (v < state.min) { v = state.min; el.maxSlider.value = v; }
        state.max = v;
        updatePriceDisplay();
        resetVisible();
        scheduleDraw();
    }

    function onLoadMore() {
        var step = state.perPage === 'all' ? 12 : state.perPage;
        state.visible += step;
        draw(true);
    }

    function resetFilters() {
        state.onSale = false;
        state.conditions = [];
        state.min = state.rangeMin;
        state.max = state.rangeMax;

        if (el.onSale) { el.onSale.checked = false; }
        if (el.conditionGroup) {
            U.qsa('input[name="condition"]', el.conditionGroup).forEach(function (input) { input.checked = false; });
        }
        if (el.minSlider) { el.minSlider.value = state.rangeMin; }
        if (el.maxSlider) { el.maxSlider.value = state.rangeMax; }

        updatePriceDisplay();
        resetVisible();
        draw(false);
    }

    function setColumns(value) {
        if (value !== 'list' && value !== '2' && value !== '3' && value !== '4') { return; }
        state.columns = value;
        if (Storage) { Storage.session.set(LAYOUT_KEY, value); }
        applyColumns();
    }

    /* ------------------------- Start-up ------------------------- */

    function setupPriceSliders() {
        var range = Products.getPriceRange(state.category);
        state.rangeMin = range.min;
        state.rangeMax = range.max;
        state.min = range.min;
        state.max = range.max;

        [el.minSlider, el.maxSlider].forEach(function (slider) {
            if (!slider) { return; }
            slider.min = range.min;
            slider.max = range.max;
            slider.step = 1;
        });
        if (el.minSlider) { el.minSlider.value = range.min; }
        if (el.maxSlider) { el.maxSlider.value = range.max; }
        updatePriceDisplay();
    }

    /* optional  ?sale=1  ?sort=price-asc  ?condition=new  in the page link */
    function applyUrlParams() {
        if (isTruthyParam(U.getQueryParam('sale'))) {
            state.onSale = true;
            if (el.onSale) { el.onSale.checked = true; }
        }

        var sort = U.getQueryParam('sort');
        if (sort && SORTS.indexOf(sort) !== -1) {
            state.sort = sort;
            if (el.sort) { el.sort.value = sort; }
        }

        var condition = U.getQueryParam('condition');
        if (condition === 'new' || condition === 'pre-owned') {
            state.conditions = [condition];
            if (el.conditionGroup) {
                U.qsa('input[name="condition"]', el.conditionGroup).forEach(function (input) {
                    input.checked = input.value === condition;
                });
            }
        }
    }

    function setupPerPage() {
        var value = el.show ? el.show.value : 'all';
        state.perPage = value === 'all' ? 'all' : (toInt(value, 0) || 'all');
        resetVisible();
    }

    function setupColumns() {
        var saved = Storage ? Storage.session.get(LAYOUT_KEY, '') : '';
        var fallback = String(cfg.defaultGridColumns || 4);
        var wanted = ['list', '2', '3', '4'].indexOf(saved) !== -1 ? saved : fallback;
        state.columns = ['list', '2', '3', '4'].indexOf(wanted) !== -1 ? wanted : '4';
        applyColumns();
    }

    function bindEvents() {
        if (el.onSale) {
            el.onSale.addEventListener('change', function () {
                state.onSale = el.onSale.checked;
                resetVisible();
                draw(false);
            });
        }

        if (el.conditionGroup) {
            el.conditionGroup.addEventListener('change', function () {
                state.conditions = readConditions();
                resetVisible();
                draw(false);
            });
        }

        if (el.minSlider) { el.minSlider.addEventListener('input', onMinInput); }
        if (el.maxSlider) { el.maxSlider.addEventListener('input', onMaxInput); }

        if (el.sort) {
            el.sort.addEventListener('change', function () {
                state.sort = SORTS.indexOf(el.sort.value) !== -1 ? el.sort.value : 'default';
                resetVisible();
                draw(false);
            });
        }

        if (el.show) {
            el.show.addEventListener('change', function () {
                setupPerPage();
                draw(false);
            });
        }

        Object.keys(COLUMN_BUTTONS).forEach(function (id) {
            var button = byId(id);
            if (button) {
                button.addEventListener('click', function () { setColumns(COLUMN_BUTTONS[id]); });
            }
        });

        if (el.reset) { el.reset.addEventListener('click', resetFilters); }
        if (el.noResultsReset) { el.noResultsReset.addEventListener('click', resetFilters); }
    }

    function init() {
        cacheElements();

        if (!el.grid) { return; }                             // not a shop page
        if (!Card) {
            el.grid.innerHTML = '<p class="no-products-message">Products could not be loaded. Please refresh the page.</p>';
            if (global.console) { global.console.error('shop.js: product-card.js did not load.'); }
            return;
        }

        state.category = readCategory();
        baseList = Products.getByCategory(state.category);

        setupPriceSliders();
        applyUrlParams();
        setupPerPage();
        setupColumns();
        bindEvents();
        draw(false);
    }

    U.onReady(init);

})(window);
