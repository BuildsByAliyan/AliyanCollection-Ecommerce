/* =====================================================================
   js/components/header.js
   Aliyan Collection - header: loads partials/header.html, mobile menu,
   search, sticky header, active link, cart/wishlist number bubbles and
   the LIVE CLOCK (footer text "Live (PKT): ...").
   Loaded after toast.js, BEFORE footer.js / cart-panel.js / product-card.js.
   Plain script -> window.AliyanHeader
   ---------------------------------------------------------------------
   HOW IT WORKS
     1. Every page has  <div id="site-header"></div>.
     2. This script fetches  partials/header.html , replaces {{BASE}} with
        the right path for the current page and puts it inside that div.
        (If fetch is not possible - e.g. the page was opened by double
        click as file:// - a built-in copy of the same HTML is used, so
        the site never loses its header.)
     3. Then it switches on: menu, search, sticky, counts, clock.
     4. It fires  document 'aliyan:header-ready'  and resolves
        AliyanHeader.ready  -> other scripts can wait for the header.

   API
     AliyanHeader.ready            Promise (resolved when header is in the page)
     AliyanHeader.isReady()
     AliyanHeader.openMenu() / closeMenu() / toggleMenu() / isMenuOpen()
     AliyanHeader.openSearch() / closeSearch() / toggleSearch() / isSearchOpen()
     AliyanHeader.setActive('mens')   mark a menu link (data-nav) as current
     AliyanHeader.updateCounts()      refresh cart + wishlist bubbles
   GLOBAL (used by inline onclick="" in partials/header.html)
     toggleMobileMenu()
   Depends on: config.js, utils.js, storage.js, cart.js, wishlist.js (loaded earlier)
   ===================================================================== */
(function (global) {
    'use strict';

    if (global.AliyanHeader) { return; }          // script included twice -> run once

    var doc = global.document;
    var cfg = global.AliyanConfig || {};
    var U = global.AliyanUtils || {};

    var READY_EVENT = 'aliyan:header-ready';
    var MOBILE_MAX = 992;                         // same breakpoint as header.css
    var HOME_PAGE = 'home';

    /* Built-in copy of partials/header.html (used only when the fetch fails) */
    var FALLBACK_HTML = [
        "<!-- ===================== CART PANEL (slide-in) ===================== -->",
        "<div id=\"cart-panel\" aria-label=\"Shopping cart\" role=\"dialog\" aria-hidden=\"true\">",
        "    <div id=\"cart-header\">",
        "        <h3>Shopping Cart (<span id=\"cart-count-panel\">0</span>)</h3>",
        "        <span id=\"cart-close-btn\" role=\"button\" tabindex=\"0\" aria-label=\"Close cart\">✖</span>",
        "    </div>",
        "",
        "    <div id=\"cart-items-container\">",
        "        <div id=\"cart-empty-message\">Your cart is currently empty.</div>",
        "    </div>",
        "",
        "    <div id=\"cart-footer\">",
        "        <div id=\"cart-total-info\">",
        "            <span>Total:</span>",
        "            <span>$<span id=\"cart-total-price\">0.00</span></span>",
        "        </div>",
        "        <a href=\"{{BASE}}pages/account/order.html\" class=\"btn dark\">Proceed to Checkout</a>",
        "    </div>",
        "</div>",
        "",
        "<!-- ===================== SEARCH BAR ===================== -->",
        "<div id=\"search-bar\">",
        "    <div class=\"container\">",
        "        <div class=\"search-input-wrapper\">",
        "            <input type=\"text\" id=\"search-input\" placeholder=\"Search products...\" autocomplete=\"off\" aria-label=\"Search products\">",
        "            <span id=\"search-close-btn-bar\" role=\"button\" tabindex=\"0\" aria-label=\"Close search\">✖</span>",
        "        </div>",
        "    </div>",
        "</div>",
        "",
        "<!-- ===================== SEARCH RESULTS ===================== -->",
        "<div id=\"search-results-container\">",
        "    <div class=\"search-message\">Start typing to see matching products...</div>",
        "    <div class=\"search-product-grid\"></div>",
        "</div>",
        "",
        "<!-- ===================== MOBILE MENU ===================== -->",
        "<div class=\"mm-backdrop\" id=\"mobile-menu-backdrop\" onclick=\"toggleMobileMenu()\" aria-hidden=\"true\"></div>",
        "<aside class=\"mobile-nav\" id=\"mobile-menu\" aria-label=\"Mobile navigation\">",
        "",
        "    <!-- top: brand mark + close -->",
        "    <div class=\"mm-top\">",
        "        <a class=\"mm-brand\" href=\"{{BASE}}index.html\" aria-label=\"Aliyan Collection - Home\" onclick=\"toggleMobileMenu()\">",
        "            <img src=\"{{BASE}}assets/images/brand/logo-mark-floral.png\" alt=\"\" class=\"mm-brand-mark\">",
        "            <img src=\"{{BASE}}assets/images/brand/logo-wordmark.png\" alt=\"Aliyan Collection\" class=\"mm-brand-text\">",
        "        </a>",
        "        <div class=\"close-btn\" onclick=\"toggleMobileMenu()\" role=\"button\" tabindex=\"0\" aria-label=\"Close menu\">",
        "            ✖",
        "        </div>",
        "    </div>",
        "",
        "    <!-- search: opens the normal search bar (js/components/header.js) -->",
        "    <button type=\"button\" class=\"mm-search\" data-mm=\"search\" aria-label=\"Search products\">",
        "        <img src=\"{{BASE}}assets/icons/ui/icon-search.svg\" alt=\"\" class=\"mm-icon\">",
        "        <span>Search products...</span>",
        "    </button>",
        "",
        "    <!-- the 7 links -->",
        "    <nav aria-label=\"Mobile menu links\">",
        "        <ul class=\"mm-links\">",
        "            <li><a href=\"{{BASE}}index.html\" data-nav=\"home\" onclick=\"toggleMobileMenu()\">Home</a></li>",
        "            <li><a href=\"{{BASE}}index.html#new-arrivals\" data-nav=\"shop\" onclick=\"toggleMobileMenu()\">Shop</a></li>",
        "            <li><a href=\"{{BASE}}pages/shop/mens.html\" data-nav=\"mens\" onclick=\"toggleMobileMenu()\">Men</a></li>",
        "            <li><a href=\"{{BASE}}pages/shop/women.html\" data-nav=\"women\" onclick=\"toggleMobileMenu()\">Women</a></li>",
        "            <li><a href=\"{{BASE}}pages/shop/kids.html\" data-nav=\"kids\" onclick=\"toggleMobileMenu()\">Kids</a></li>",
        "            <li><a href=\"{{BASE}}pages/info/blog.html\" data-nav=\"blog\" onclick=\"toggleMobileMenu()\">Blog</a></li>",
        "            <li><a href=\"{{BASE}}pages/info/contact.html\" data-nav=\"contact\" onclick=\"toggleMobileMenu()\">Contact</a></li>",
        "        </ul>",
        "    </nav>",
        "",
        "    <!-- bottom: account / wishlist / cart + social + copyright -->",
        "    <div class=\"mm-bottom\">",
        "        <div class=\"mm-actions\">",
        "            <a href=\"{{BASE}}pages/account/myaccount.html\" class=\"mm-btn\" onclick=\"toggleMobileMenu()\">",
        "                <img src=\"{{BASE}}assets/icons/ui/icon-about.svg\" alt=\"\" class=\"mm-icon\">",
        "                <span>My Account</span>",
        "            </a>",
        "            <a href=\"{{BASE}}pages/account/wishlist.html\" class=\"mm-btn\" onclick=\"toggleMobileMenu()\">",
        "                <img src=\"{{BASE}}assets/icons/ui/icon-wishlist.svg\" alt=\"\" class=\"mm-icon\">",
        "                <span>My Wishlist</span>",
        "                <span class=\"mm-count\" data-badge=\"wishlist\">0</span>",
        "            </a>",
        "            <button type=\"button\" class=\"mm-btn mm-btn-primary\" data-mm=\"cart\">",
        "                <img src=\"{{BASE}}assets/icons/ui/icon-cart.svg\" alt=\"\" class=\"mm-icon\">",
        "                <span>Cart</span>",
        "                <span class=\"mm-count\" data-badge=\"cart\">0</span>",
        "            </button>",
        "        </div>",
        "",
        "        <div class=\"mm-social\">",
        "            <a href=\"https://facebook.com/creativestudi0.pk_\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Facebook\">",
        "                <img src=\"{{BASE}}assets/icons/social/icon-facebook.svg\" alt=\"\" class=\"mm-icon\">",
        "            </a>",
        "            <a href=\"https://instagram.com/creativestudi0.pk_\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Instagram\">",
        "                <img src=\"{{BASE}}assets/icons/social/icon-instagram.svg\" alt=\"\" class=\"mm-icon\">",
        "            </a>",
        "            <a href=\"https://www.tiktok.com/@creativestudi0.pk_\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"TikTok\">",
        "                <img src=\"{{BASE}}assets/icons/social/icon-tiktok.svg\" alt=\"\" class=\"mm-icon\">",
        "            </a>",
        "            <a href=\"https://wa.me/\" data-whatsapp-link target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"WhatsApp\">",
        "                <img src=\"{{BASE}}assets/icons/social/icon-whatsapp.svg\" alt=\"\" class=\"mm-icon\">",
        "            </a>",
        "        </div>",
        "",
        "        <p class=\"mm-copy\">&copy; <span class=\"mm-year\">2026</span> Aliyan Collection</p>",
        "    </div>",
        "</aside>",
        "",
        "<!-- ===================== MAIN HEADER ===================== -->",
        "<header class=\"header\" id=\"home\">",
        "    <div class=\"container navbar\">",
        "",
        "        <div class=\"hamburger\" onclick=\"toggleMobileMenu()\" role=\"button\" tabindex=\"0\" aria-label=\"Open menu\">",
        "            ☰",
        "        </div>",
        "",
        "        <nav aria-label=\"Main navigation\">",
        "            <ul class=\"nav-links\">",
        "                <li><a href=\"{{BASE}}index.html\" data-nav=\"home\">Home</a></li>",
        "                <li><a href=\"{{BASE}}pages/shop/mens.html\" data-nav=\"mens\">Men</a></li>",
        "                <li><a href=\"{{BASE}}pages/shop/women.html\" data-nav=\"women\">Women</a></li>",
        "                <li><a href=\"{{BASE}}pages/shop/kids.html\" data-nav=\"kids\">Kids</a></li>",
        "                <li><a href=\"{{BASE}}pages/info/blog.html\" data-nav=\"blog\">Blog</a></li>",
        "                <li><a href=\"{{BASE}}pages/info/contact.html\" data-nav=\"contact\">Contact</a></li>",
        "            </ul>",
        "        </nav>",
        "",
        "        <div class=\"logo\">",
        "            <a href=\"{{BASE}}index.html\" aria-label=\"Aliyan Collection - Home\">",
        "                <img src=\"{{BASE}}assets/images/brand/logo-mark-floral.png\" alt=\"Aliyan Collection Logo\">",
        "                <img src=\"{{BASE}}assets/images/brand/logo-wordmark.png\" alt=\"Aliyan Collection Text Logo\" class=\"logo-text-img\">",
        "            </a>",
        "        </div>",
        "",
        "        <div class=\"nav-icons\">",
        "            <a href=\"#\" id=\"search-icon-link\" aria-label=\"Search\">",
        "                <img src=\"{{BASE}}assets/icons/ui/icon-search.svg\" alt=\"Search\" class=\"nav-icon-img\">",
        "            </a>",
        "            <a href=\"{{BASE}}pages/account/myaccount.html\" id=\"about-icon-link\" aria-label=\"My account\">",
        "                <img src=\"{{BASE}}assets/icons/ui/icon-about.svg\" alt=\"My Account\" class=\"nav-icon-img\">",
        "            </a>",
        "            <a href=\"{{BASE}}pages/account/wishlist.html\" id=\"wishlist-icon-link\" aria-label=\"Wishlist\">",
        "                <img src=\"{{BASE}}assets/icons/ui/icon-wishlist.svg\" alt=\"Wishlist\" class=\"nav-icon-img\">",
        "                <span class=\"cart-count\" id=\"header-wishlist-count\">0</span>",
        "            </a>",
        "            <a href=\"#\" id=\"cart-icon-link\" aria-label=\"Shopping cart\">",
        "                <img src=\"{{BASE}}assets/icons/ui/icon-cart.svg\" alt=\"Cart\" class=\"nav-icon-img\">",
        "                <span class=\"cart-count\" id=\"header-cart-count\">0</span>",
        "            </a>",
        "        </div>",
        "",
        "    </div>",
        "</header>"
    ].join('\n');

    var state = {
        ready: false,
        menuOpen: false,
        searchOpen: false,
        menuLocked: false,
        searchLocked: false
    };

    var resolveReady;
    var readyPromise = new Promise(function (resolve) { resolveReady = resolve; });

    /* ------------------------- Small helpers ------------------------- */

    function byId(id) { return doc.getElementById(id); }

    function lock(flag) {
        if (!state[flag] && typeof U.lockScroll === 'function') {
            U.lockScroll();
            state[flag] = true;
        }
    }

    function unlock(flag) {
        if (state[flag] && typeof U.unlockScroll === 'function') {
            U.unlockScroll();
            state[flag] = false;
        }
    }

    function pageName() {
        return (doc.body && doc.body.getAttribute('data-page')) || '';
    }

    function closeCart() {
        var panel = global.AliyanCartPanel;
        if (panel && typeof panel.close === 'function') { panel.close(); }
    }

    /* ------------------------- Load the partial ------------------------- */

    /* Returns Promise<string>. Never rejects: falls back to the built-in HTML. */
    function loadPartial(file, fallback, marker) {
        var base = cfg.base || '';

        function prepare(html) { return String(html).split('{{BASE}}').join(base); }

        // file:// pages cannot fetch -> go straight to the built-in copy
        if (!global.fetch || !global.location || global.location.protocol === 'file:') {
            return Promise.resolve(prepare(fallback));
        }

        var folder = (cfg.paths && cfg.paths.partials) || 'partials/';
        var url = typeof cfg.url === 'function' ? cfg.url(folder + file) : base + folder + file;

        return global.fetch(url)
            .then(function (response) {
                if (!response.ok) { throw new Error('HTTP ' + response.status); }
                return response.text();
            })
            .then(function (text) {
                // a server may answer 200 with some other page -> make sure it is ours
                if (text.indexOf(marker) === -1) { throw new Error('unexpected content'); }
                return prepare(text);
            })
            .catch(function () { return prepare(fallback); });
    }

    /* ------------------------- Active menu link ------------------------- */

    var NAV_FOR_PAGE = { home: 'home', mens: 'mens', women: 'women', kids: 'kids', blog: 'blog', contact: 'contact' };

    function setActive(nav) {
        var links = doc.querySelectorAll('[data-nav]');
        Array.prototype.forEach.call(links, function (link) {
            var on = !!nav && link.getAttribute('data-nav') === nav;
            link.classList.toggle('active', on);
            if (on) { link.setAttribute('aria-current', 'page'); }
            else { link.removeAttribute('aria-current'); }
        });
    }

    /* ------------------------- Sticky header ------------------------- */

    /* Home: transparent at the top, white after scrolling.
       Other pages: always the white style (CSS), so .sticky is always on
       (this also gives the search bar the correct offset).                 */
    function updateSticky() {
        var header = doc.querySelector('.header');
        if (!header) { return; }
        var scrolled = global.pageYOffset || (doc.documentElement && doc.documentElement.scrollTop) || 0;
        var on = pageName() !== HOME_PAGE || scrolled > (Number(cfg.stickyScrollPx) || 50);
        header.classList.toggle('sticky', on);
        var bar = byId('search-bar');
        if (bar) { bar.classList.toggle('sticky', on); }
    }

    /* ------------------------- Mobile menu ------------------------- */

    function isMenuOpen() { return state.menuOpen; }

    function setMenu(open) {
        var menu = byId('mobile-menu');
        if (!menu || state.menuOpen === open) { return; }

        if (open) {
            closeSearch();
            closeCart();
        }

        state.menuOpen = open;
        menu.classList.toggle('open', open);
        menu.setAttribute('aria-hidden', open ? 'false' : 'true');

        var backdrop = byId('mobile-menu-backdrop');
        if (backdrop) { backdrop.classList.toggle('open', open); }

        var burger = doc.querySelector('.hamburger');
        if (burger) { burger.setAttribute('aria-expanded', open ? 'true' : 'false'); }

        if (open) { lock('menuLocked'); } else { unlock('menuLocked'); }

        // keyboard users: land on the close button when the menu opens
        if (open) {
            var closeBtn = menu.querySelector('.close-btn');
            if (closeBtn) {
                try { closeBtn.focus({ preventScroll: true }); } catch (e) { closeBtn.focus(); }
            }
        }
    }

    function openMenu() { setMenu(true); }
    function closeMenu() { setMenu(false); }
    function toggleMenu() { setMenu(!state.menuOpen); }

    /* ------------------------- Search ------------------------- */

    var MESSAGE_START = 'Start typing to see matching products...';

    function isSearchOpen() { return state.searchOpen; }

    function searchParts() {
        var box = byId('search-results-container');
        return {
            bar: byId('search-bar'),
            input: byId('search-input'),
            box: box,
            message: box ? box.querySelector('.search-message') : null,
            grid: box ? box.querySelector('.search-product-grid') : null
        };
    }

    function showMessage(parts, text) {
        if (!parts.message) { return; }
        parts.message.textContent = text;
        parts.message.style.display = 'block';
        if (parts.grid) { parts.grid.innerHTML = ''; }
    }

    function resetResults() {
        showMessage(searchParts(), MESSAGE_START);
    }

    /* Simple card, used only if product-card.js did not load */
    function plainCards(list) {
        var esc = U.escapeHtml || function (v) { return String(v); };
        return list.map(function (p) {
            var url = typeof U.productUrl === 'function' ? U.productUrl(p.id) : '#';
            var img = typeof U.imageUrl === 'function' ? U.imageUrl(p) : p.image;
            return '<div class="product-card"><a class="product-link" href="' + esc(url) + '">' +
                '<img src="' + esc(img) + '" alt="' + esc(p.name) + '"></a>' +
                '<div class="product-info"><h4>' + esc(p.name) + '</h4>' +
                '<span class="price">' + esc(U.formatPrice ? U.formatPrice(p.price) : p.price) + '</span></div></div>';
        }).join('');
    }

    function runSearch() {
        var parts = searchParts();
        if (!parts.input || !parts.box) { return; }

        var query = parts.input.value.trim();
        var minChars = Number(cfg.searchMinChars) || 2;

        if (query.length < minChars) { resetResults(); return; }

        var Products = global.AliyanProducts;
        var found = Products && typeof Products.search === 'function' ? Products.search(query) : [];

        if (!found.length) {
            showMessage(parts, 'No products found for \u201C' + query + '\u201D.');
            return;
        }

        if (parts.message) { parts.message.style.display = 'none'; }

        var Card = global.AliyanProductCard;
        if (parts.grid) {
            if (Card && typeof Card.render === 'function') {
                Card.render(parts.grid, found, { layout: 'home' });
            } else {
                parts.grid.innerHTML = plainCards(found);
            }
        }
    }

    var runSearchSoon = typeof U.debounce === 'function' ? U.debounce(runSearch, 200) : runSearch;

    function openSearch() {
        var parts = searchParts();
        if (!parts.bar || !parts.box || state.searchOpen) { return; }

        closeMenu();
        closeCart();

        state.searchOpen = true;
        updateSticky();
        parts.box.style.display = 'block';
        parts.bar.classList.add('open');
        parts.bar.setAttribute('aria-hidden', 'false');
        lock('searchLocked');
        resetResults();

        var icon = byId('search-icon-link');
        if (icon) { icon.setAttribute('aria-expanded', 'true'); }

        if (parts.input) {
            try { parts.input.focus({ preventScroll: true }); } catch (e) { parts.input.focus(); }
        }
    }

    function closeSearch() {
        if (!state.searchOpen) { return; }
        var parts = searchParts();

        state.searchOpen = false;
        if (parts.bar) {
            parts.bar.classList.remove('open');
            parts.bar.setAttribute('aria-hidden', 'true');
        }
        if (parts.box) { parts.box.style.display = 'none'; }
        if (parts.input) { parts.input.value = ''; }
        if (typeof runSearchSoon.cancel === 'function') { runSearchSoon.cancel(); }
        resetResults();
        unlock('searchLocked');

        var icon = byId('search-icon-link');
        if (icon) { icon.setAttribute('aria-expanded', 'false'); }
    }

    function toggleSearch() {
        if (state.searchOpen) { closeSearch(); } else { openSearch(); }
    }

    /* ------------------------- Number bubbles ------------------------- */

    /* Same number is also shown on the mobile-menu buttons: <span data-badge="cart|wishlist"> */
    function mirrorBadge(kind, n) {
        var list = doc.querySelectorAll('[data-badge="' + kind + '"]');
        Array.prototype.forEach.call(list, function (el) {
            el.textContent = n > 99 ? '99+' : String(n);
            el.classList.toggle('visible', n > 0);
        });
    }

    function setBadge(id, count, kind) {
        var n = Math.max(0, Math.floor(Number(count) || 0));
        if (kind) { mirrorBadge(kind, n); }

        var el = byId(id);
        if (!el) { return; }
        var previous = el.getAttribute('data-count');

        el.textContent = n > 99 ? '99+' : String(n);
        el.setAttribute('data-count', String(n));
        el.classList.toggle('visible', n > 0);

        // little "pop" when the number goes up
        if (previous !== null && n > Number(previous)) {
            el.classList.remove('bump');
            void el.offsetWidth;                       // restart the animation
            el.classList.add('bump');
            setTimeout(function () { el.classList.remove('bump'); }, 350);
        }
    }

    function updateCounts() {
        if (global.AliyanCart) { setBadge('header-cart-count', global.AliyanCart.getCount(), 'cart'); }
        if (global.AliyanWishlist) { setBadge('header-wishlist-count', global.AliyanWishlist.getCount(), 'wishlist'); }
    }

    /* Mobile menu: contact link + year come from config.js / the clock, never hard-coded */
    function fillMenuParts() {
        var menu = byId('mobile-menu');
        if (!menu) { return; }
        var year = menu.querySelector('.mm-year');
        if (year) { year.textContent = String(new Date().getFullYear()); }
        if (typeof cfg.whatsappLink === 'function') {
            Array.prototype.forEach.call(menu.querySelectorAll('a[data-whatsapp-link]'), function (a) {
                a.setAttribute('href', cfg.whatsappLink());
            });
        }
    }

    /* ------------------------- Live clock (footer) ------------------------- */

    function clockText() {
        var zone = cfg.timeZone || 'Asia/Karachi';
        var label = zone === 'Asia/Karachi' ? 'PKT' : zone;
        var now = new Date();
        try {
            return 'Live (' + label + '): ' + now.toLocaleString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hourCycle: 'h23', timeZone: zone
            });
        } catch (e) {
            return 'Live (' + label + '): ' + now.toLocaleString();
        }
    }

    function tickClock() {
        var el = byId('live-clock');                  // lives in the footer partial
        if (el && !doc.hidden) { el.textContent = clockText(); }
    }

    /* ------------------------- Events (bound once) ------------------------- */

    function bindEvents() {

        doc.addEventListener('click', function (event) {
            var target = event.target;
            if (!target || !target.closest) { return; }

            // little tap animation on the 4 icons
            var icon = target.closest('.nav-icons > a');
            if (icon) {
                icon.classList.add('clicked');
                setTimeout(function () { icon.classList.remove('clicked'); }, 250);
            }

            if (target.closest('#search-icon-link')) {
                event.preventDefault();
                toggleSearch();
                return;
            }

            if (target.closest('#search-close-btn-bar')) {
                closeSearch();
                return;
            }

            // mobile menu: search box -> normal search bar (it also closes the menu and focuses the input)
            if (target.closest('[data-mm="search"]')) {
                event.preventDefault();
                openSearch();
                return;
            }

            // mobile menu: cart button -> cart panel
            if (target.closest('[data-mm="cart"]')) {
                event.preventDefault();
                closeMenu();
                var panel = global.AliyanCartPanel;
                if (panel && typeof panel.open === 'function') { panel.open(); }
                else if (typeof global.openCartPanel === 'function') { global.openCartPanel(); }
                return;
            }

            // tap outside the mobile menu closes it
            if (state.menuOpen && !target.closest('#mobile-menu') && !target.closest('.hamburger')) {
                closeMenu();
            }
        });

        doc.addEventListener('keydown', function (event) {
            var key = event.key;

            if (key === 'Escape' || key === 'Esc') {
                if (state.searchOpen) { closeSearch(); }
                else if (state.menuOpen) {
                    closeMenu();
                    var burger = doc.querySelector('.hamburger');
                    if (burger) { try { burger.focus({ preventScroll: true }); } catch (e) { burger.focus(); } }
                }
                return;
            }

            // Enter / Space presses our <span role="button"> controls
            if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
                var el = event.target;
                if (el && el.matches && el.matches('[role="button"][tabindex]')) {
                    event.preventDefault();
                    el.click();
                }
            }
        });

        doc.addEventListener('input', function (event) {
            if (event.target && event.target.id === 'search-input') { runSearchSoon(); }
        });

        var onScroll = typeof U.throttle === 'function' ? U.throttle(updateSticky, 80) : updateSticky;
        global.addEventListener('scroll', onScroll, { passive: true });

        global.addEventListener('resize', function () {
            if (global.innerWidth > MOBILE_MAX && state.menuOpen) { closeMenu(); }
            updateSticky();
        });

        doc.addEventListener('visibilitychange', tickClock);

        // numbers on the icons follow the cart / wishlist (also across browser tabs)
        if (global.AliyanCart && typeof global.AliyanCart.subscribe === 'function') {
            global.AliyanCart.subscribe(function (detail) { setBadge('header-cart-count', detail.count, 'cart'); });
        }
        if (global.AliyanWishlist && typeof global.AliyanWishlist.subscribe === 'function') {
            global.AliyanWishlist.subscribe(function (detail) { setBadge('header-wishlist-count', detail.count, 'wishlist'); });
        }

        // footer arrives separately -> show the time there immediately
        doc.addEventListener('aliyan:footer-ready', tickClock);

        setInterval(tickClock, 1000);
    }

    /* ------------------------- Start ------------------------- */

    function finish() {
        setActive(NAV_FOR_PAGE[pageName()] || '');
        updateSticky();
        updateCounts();
        fillMenuParts();
        tickClock();

        var menu = byId('mobile-menu');
        if (menu) { menu.setAttribute('aria-hidden', 'true'); }
        var bar = byId('search-bar');
        if (bar) { bar.setAttribute('aria-hidden', 'true'); }

        state.ready = true;
        try {
            doc.dispatchEvent(new global.CustomEvent(READY_EVENT));
        } catch (e) { /* very old browser: ignore */ }
        resolveReady();
    }

    function mount() {
        var host = byId('site-header');
        if (!host) { finish(); return; }              // page without a header placeholder

        loadPartial('header.html', FALLBACK_HTML, 'id="cart-panel"').then(function (html) {
            host.innerHTML = html;
            finish();
        });
    }

    var Header = {
        ready: readyPromise,
        isReady: function () { return state.ready; },
        openMenu: openMenu,
        closeMenu: closeMenu,
        toggleMenu: toggleMenu,
        isMenuOpen: isMenuOpen,
        openSearch: openSearch,
        closeSearch: closeSearch,
        toggleSearch: toggleSearch,
        isSearchOpen: isSearchOpen,
        setActive: setActive,
        updateCounts: updateCounts
    };

    global.AliyanHeader = Header;
    global.toggleMobileMenu = toggleMenu;             // used by onclick="" in header.html

    bindEvents();

    if (typeof U.onReady === 'function') { U.onReady(mount); }
    else if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', mount); }
    else { mount(); }

})(window);
