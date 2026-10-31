/* =====================================================================
   js/components/footer.js
   Aliyan Collection - loads partials/footer.html into every page.
   Loaded after header.js. Plain script -> window.AliyanFooter
   ---------------------------------------------------------------------
   HOW IT WORKS
     1. Every page has  <div id="site-footer"></div>.
     2. This script fetches  partials/footer.html , replaces {{BASE}}
        with the right path for the current page and puts it in that div.
        (If fetch is not possible - e.g. the page was opened by double
        click as file:// - a built-in copy of the same HTML is used.)
     3. It writes the current year into #footer-year and keeps the
        WhatsApp / e-mail links in sync with js/config.js.
     4. It fires  document 'aliyan:footer-ready'  and resolves
        AliyanFooter.ready.
   The LIVE CLOCK text inside the footer is updated by header.js.

   API
     AliyanFooter.ready        Promise (resolved when the footer is in the page)
     AliyanFooter.isReady()
   ===================================================================== */
(function (global) {
    'use strict';

    if (global.AliyanFooter) { return; }          // script included twice -> run once

    var doc = global.document;
    var cfg = global.AliyanConfig || {};
    var U = global.AliyanUtils || {};

    var READY_EVENT = 'aliyan:footer-ready';

    /* Built-in copy of partials/footer.html (used only when the fetch fails) */
    var FALLBACK_HTML = [
        "<footer class=\"footer\">",
        "    <div class=\"footer-container\">",
        "        <div class=\"footer-grid\">",
        "",
        "            <!-- ============ Brand / Contact ============ -->",
        "            <div class=\"footer-column footer-main\">",
        "                <img src=\"{{BASE}}assets/images/brand/logo-monogram-dark.jpg\" alt=\"Aliyan Collection\" class=\"footer-logo\" loading=\"lazy\">",
        "                <p class=\"footer-description\">",
        "                    Premium fashion collection offering the latest trends in men's, women's, and kids' apparel.",
        "                    Quality meets style in every piece we curate for our valued customers.",
        "                </p>",
        "                <div class=\"footer-contact-info\">",
        "                    <p><strong>Email:</strong> <a href=\"mailto:connect.aliyansaleem@gmail.com\">connect.aliyansaleem@gmail.com</a></p>",
        "                    <p><strong>Phone:</strong> <a href=\"tel:\" data-phone-link>Call us</a></p>",
        "                    <p><strong>Location:</strong> Korangi, Karachi, Pakistan</p>",
        "                </div>",
        "                <div class=\"social-links\">",
        "                    <a href=\"https://facebook.com/creativestudi0.pk_\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Facebook\">",
        "                        <img src=\"{{BASE}}assets/icons/social/icon-facebook.svg\" alt=\"Facebook\" loading=\"lazy\">",
        "                    </a>",
        "                    <a href=\"https://instagram.com/creativestudi0.pk_\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Instagram\">",
        "                        <img src=\"{{BASE}}assets/icons/social/icon-instagram.svg\" alt=\"Instagram\" loading=\"lazy\">",
        "                    </a>",
        "                    <a href=\"https://www.tiktok.com/@creativestudi0.pk_\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"TikTok\">",
        "                        <img src=\"{{BASE}}assets/icons/social/icon-tiktok.svg\" alt=\"TikTok\" loading=\"lazy\">",
        "                    </a>",
        "                    <a href=\"https://wa.me/\" data-whatsapp-link target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"WhatsApp\">",
        "                        <img src=\"{{BASE}}assets/icons/social/icon-whatsapp.svg\" alt=\"WhatsApp\" loading=\"lazy\">",
        "                    </a>",
        "                </div>",
        "            </div>",
        "",
        "            <!-- ============ Shop ============ -->",
        "            <div class=\"footer-column\">",
        "                <h4>Shop</h4>",
        "                <ul>",
        "                    <li><a href=\"{{BASE}}pages/shop/mens.html\">Men's Collection</a></li>",
        "                    <li><a href=\"{{BASE}}pages/shop/women.html\">Women's Collection</a></li>",
        "                    <li><a href=\"{{BASE}}pages/shop/kids.html\">Kids Collection</a></li>",
        "                    <li><a href=\"{{BASE}}index.html#new-arrivals\">New Arrivals</a></li>",
        "                    <li><a href=\"{{BASE}}index.html#special-sale\">Special Sale</a></li>",
        "                </ul>",
        "            </div>",
        "",
        "            <!-- ============ Support ============ -->",
        "            <div class=\"footer-column\">",
        "                <h4>Support</h4>",
        "                <ul>",
        "                    <li><a href=\"{{BASE}}pages/info/contact.html\">Contact Us</a></li>",
        "                    <li><a href=\"{{BASE}}pages/info/about.html\">About Us</a></li>",
        "                    <li><a href=\"{{BASE}}pages/legal/privacy.html\">Privacy Policy</a></li>",
        "                    <li><a href=\"{{BASE}}pages/legal/return.html\">Return Policy</a></li>",
        "                    <li><a href=\"{{BASE}}pages/account/trackyourorder.html\">Track Order</a></li>",
        "                </ul>",
        "            </div>",
        "",
        "            <!-- ============ Account ============ -->",
        "            <div class=\"footer-column\">",
        "                <h4>Account</h4>",
        "                <ul>",
        "                    <li><a href=\"#\" onclick=\"openCartPanel(); return false;\">Shopping Cart</a></li>",
        "                    <li><a href=\"{{BASE}}pages/account/myaccount.html\">My Account</a></li>",
        "                    <li><a href=\"{{BASE}}pages/account/wishlist.html\">My Wishlist</a></li>",
        "                    <li><a href=\"{{BASE}}pages/account/order.html#order-history\">Order History</a></li>",
        "                    <li><a href=\"{{BASE}}pages/account/order.html\">Checkout</a></li>",
        "                </ul>",
        "            </div>",
        "        </div>",
        "",
        "        <!-- ============ Accepted Payments ============ -->",
        "        <div class=\"footer-payments\" aria-label=\"Accepted payment methods\">",
        "            <img src=\"{{BASE}}assets/icons/payment/payment-cash-on-delivery.svg\" alt=\"Cash on Delivery\" loading=\"lazy\">",
        "        </div>",
        "",
        "        <!-- ============ Bottom Bar ============ -->",
        "        <div class=\"footer-bottom\">",
        "            <span class=\"live-clock\" id=\"live-clock\"></span>",
        "            <p>&copy; <span id=\"footer-year\">2026</span> Aliyan Collection. All rights reserved.</p>",
        "        </div>",
        "    </div>",
        "</footer>"
    ].join('\n');

    var ready = false;
    var resolveReady;
    var readyPromise = new Promise(function (resolve) { resolveReady = resolve; });

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

    /* ------------------------- After the footer is in the page ------------------------- */

    function fillDynamicParts() {
        var year = doc.getElementById('footer-year');
        if (year) { year.textContent = String(new Date().getFullYear()); }

        // keep contact links equal to config.js (one place to change them)
        if (typeof cfg.whatsappLink === 'function') {
            Array.prototype.forEach.call(doc.querySelectorAll('.footer a[href^="https://wa.me/"]'), function (a) {
                a.setAttribute('href', cfg.whatsappLink());
            });
        }
        if (typeof cfg.phoneLink === 'function') {
            Array.prototype.forEach.call(doc.querySelectorAll('.footer a[data-phone-link]'), function (a) {
                a.setAttribute('href', cfg.phoneLink());
                a.textContent = cfg.phoneText();
            });
        }
        if (cfg.contactEmail) {
            Array.prototype.forEach.call(doc.querySelectorAll('.footer a[href^="mailto:"]'), function (a) {
                a.setAttribute('href', 'mailto:' + cfg.contactEmail);
                a.textContent = cfg.contactEmail;
            });
        }
    }

    function finish() {
        fillDynamicParts();
        ready = true;
        try {
            doc.dispatchEvent(new global.CustomEvent(READY_EVENT));
        } catch (e) { /* very old browser: ignore */ }
        resolveReady();
    }

    function mount() {
        var host = doc.getElementById('site-footer');
        if (!host) { finish(); return; }              // page without a footer placeholder

        loadPartial('footer.html', FALLBACK_HTML, 'class="footer"').then(function (html) {
            host.innerHTML = html;
            finish();
        });
    }

    global.AliyanFooter = {
        ready: readyPromise,
        isReady: function () { return ready; }
    };

    if (typeof U.onReady === 'function') { U.onReady(mount); }
    else if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', mount); }
    else { mount(); }

})(window);
