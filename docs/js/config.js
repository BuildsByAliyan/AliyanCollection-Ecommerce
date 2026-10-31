/* =====================================================================
   js/config.js
   Aliyan Collection - ONE place for site settings.
   Loaded FIRST on every page (before data/products.js and everything else).
   Plain script (no import/export) -> everything is on  window.AliyanConfig
   ---------------------------------------------------------------------
   Change a value here and it changes everywhere on the site.
   ===================================================================== */
(function (global) {
    'use strict';

    var CONFIG = {

        /* ------------------------- Brand ------------------------- */
        siteName: 'Aliyan Collection',

        /* WhatsApp / phone number: country code + number, digits only (no + or spaces).
           ONE place: footer, contact page and order messages all read it from here. */
        whatsappNumber: '923700256087',
        contactEmail: 'connect.aliyansaleem@gmail.com',

        /* ------------------------- Money -------------------------
           ABHI daam products.js mein USD (dollar) mein hain, isliye yahan USD hi hai.
           PKR par jaane ke liye (dono saath karo, warna galat daam dikhenge):
             1) rate maloom karo (1 USD = ? PKR), phir:
                node tools/convert-prices.js --rate <RATE>            (dry-run)
                node tools/convert-prices.js --rate <RATE> --write    (products.js badal jata hai)
             2) neeche badlo:  currencySymbol: 'Rs ',  currencyCode: 'PKR',
                               currencyLocale: 'en-PK', currencyDecimals: 0            */
        currencySymbol: '$',
        currencyCode: 'USD',
        currencyLocale: 'en-US',
        currencyDecimals: 2,

        /* ------------------------- Payment options (order page) -------------------------
           Sirf wohi options jo asal mein kaam karte hain:
             cod       - Cash on Delivery (hamesha)
             easypaisa / jazzcash - MANUAL TRANSFER: customer aap ke account par paise bhejta hai
                         aur screenshot WhatsApp par bhejta hai. Ye option tab hi dikhta hai jab
                         enabled: true ho AUR accountNumber likha ho.
           PayPal / card nahi hain (static site mein payment gateway nahi).                  */
        payments: {
            easypaisa: { enabled: false, accountNumber: '', accountName: '' },
            jazzcash: { enabled: false, accountNumber: '', accountName: '' }
        },

        /* ------------------------- localStorage keys -------------------------
           Same names as the first version of the site, so customers who
           already have a cart / wishlist do not lose it.                      */
        storageKeys: {
            cart: 'aliyanCart',
            wishlist: 'aliyanWishlist',
            orders: 'aliyanOrderHistory',
            selectedProduct: 'selectedProduct'
        },

        /* sessionStorage key: intro video plays only once per visit */
        sessionKeys: {
            introPlayed: 'introPlayed'
        },

        /* ------------------------- Shop behaviour ------------------------- */
        maxQtyPerItem: 10,                 // max quantity of one product in cart
        productsPerPageOptions: [12, 24, 'all'],
        defaultGridColumns: 4,             // shop pages: 2, 3 or 4

        /* ------------------------- Timing (milliseconds) ------------------------- */
        sliderIntervalMs: 7000,            // hero slider auto-change
        toastDurationMs: 2500,             // how long a toast stays visible
        introMaxMs: 12000,                 // FALLBACK only: used if the video length is unknown (normally video duration + 0.8 s)
        introStartTimeoutMs: 3500,         // intro is skipped if the video has not started playing within this time
        introFadeMs: 1000,                 // must match #intro-screen transition in home.css
        stickyScrollPx: 50,                // header turns white after scrolling this far
        searchMinChars: 2,                 // search starts after this many letters

        /* ------------------------- Orders ------------------------- */
        /* Track-order status is worked out from the order date:
             0 - (dispatchAfterDays-1) days  -> Ordered
             dispatchAfterDays +             -> Dispatched
             deliverAfterDays  +             -> Delivered
           NOTE: these are only ESTIMATES worked out from the order date (a static site
           has no server to know the real status) - pages say "Estimated" accordingly. */
        dispatchAfterDays: 3,
        deliverAfterDays: 6,
        /* text shown in the order confirmation pop-up instead of a (fake) countdown */
        deliveryDaysText: '3-5 working days (estimate)',

        /* Optional backup: order ki copy kisi URL par bhi jaye (Formspree / Google Apps Script).
           Khali ('') rakho to sirf WhatsApp se order shop tak pohanchta hai. */
        orderEndpoint: '',

        /* ------------------------- Newsletter -------------------------
           Home aur Contact page DONO isi ek key mein emails rakhte hain (js/core/newsletter.js).
           newsletterEndpoint: Formspree / Google Apps Script URL - email owner tak bhi pohanchti hai.
           Khali ('') rakho to email sirf is browser mein save hoti hai.                       */
        newsletterKey: 'aliyan_newsletter_emails',
        newsletterEndpoint: '',

        /* ------------------------- Special Sale -------------------------
           endDate = sale ka aakhri din (Pakistan time, us din raat 11:59:59 tak).
                     Guzar jaye to sale section chhup jata hai.
           mode    = timer kya dikhaye (sirf yahan badlo, phir page reload):
                     'countdown' -> sale khatam hone mein kitne Days/Hours/Minutes/Seconds baaki hain (default)
                     'pkt-clock' -> live Pakistan clock: pehla box = hafte ka din (Mon=1 ... Fri=5 ... Sun=7),
                                    phir PKT ke Hours/Minutes/Seconds
           label   = heading ke neeche ka text. Khali ('') chhodo to endDate se khud banta hai ("Up to 30 Nov"),
                     isliye date aur text kabhi alag nahi hote.                                      */
        sale: { endDate: '2026-11-30', mode: 'countdown', label: '' },

        /* ------------------------- Time zone ------------------------- */
        timeZone: 'Asia/Karachi',          // live clock + sale end date use PKT

        /* ------------------------- Paths -------------------------
           All paths below are relative to the docs/ folder.
           Use  AliyanConfig.url('assets/...')  to get a path that works from
           index.html AND from pages/shop/..., pages/info/..., etc.          */
        paths: {
            partials: 'partials/',
            productImages: 'assets/images/products/',
            placeholderImage: 'assets/images/brand/logo-monogram-light.jpg',
            pages: {
                home: 'index.html',
                men: 'pages/shop/mens.html',
                women: 'pages/shop/women.html',
                kids: 'pages/shop/kids.html',
                product: 'pages/shop/product.html',
                wishlist: 'pages/account/wishlist.html',
                order: 'pages/account/order.html',
                account: 'pages/account/myaccount.html',
                track: 'pages/account/trackyourorder.html',
                contact: 'pages/info/contact.html'
            }
        }
    };

    /* ------------------------- Helpers ------------------------- */

    /* "../../" on pages/shop/*.html, "" on index.html (set by <body data-base="...">) */
    CONFIG.base = '';
    try {
        if (global.document && global.document.body) {
            CONFIG.base = global.document.body.getAttribute('data-base') || '';
        }
    } catch (e) { CONFIG.base = ''; }

    /* AliyanConfig.url('pages/shop/mens.html') -> correct relative URL for this page */
    CONFIG.url = function (path) {
        path = String(path || '');
        if (/^(https?:)?\/\//i.test(path) || path.indexOf('data:') === 0 || path.charAt(0) === '#') {
            return path;                   // already absolute / data / hash link
        }
        return CONFIG.base + path.replace(/^\/+/, '');
    };

    /* AliyanConfig.formatPrice(59.9) -> "$59.90"   (PKR setup: formatPrice(12500) -> "Rs 12,500") */
    CONFIG.formatPrice = function (value) {
        var n = Number(value);
        if (!isFinite(n)) { n = 0; }
        var digits = typeof CONFIG.currencyDecimals === 'number' ? CONFIG.currencyDecimals : 2;
        var text;
        try {
            text = n.toLocaleString(CONFIG.currencyLocale || 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
        } catch (e) {
            text = n.toFixed(digits);
        }
        return CONFIG.currencySymbol + text;
    };

    /* AliyanConfig.whatsappLink('Hello') -> https://wa.me/9237...?text=Hello */
    CONFIG.whatsappLink = function (message) {
        var link = 'https://wa.me/' + CONFIG.whatsappNumber;
        if (message) { link += '?text=' + encodeURIComponent(message); }
        return link;
    };

    /* AliyanConfig.phoneLink() -> "tel:+923700256087"   (same number as whatsappNumber) */
    CONFIG.phoneLink = function () {
        return 'tel:+' + String(CONFIG.whatsappNumber || '').replace(/\D/g, '');
    };

    /* AliyanConfig.phoneText() -> "+92 370 0256087"  (Pakistan numbers are spaced, others just get a +) */
    CONFIG.phoneText = function () {
        var d = String(CONFIG.whatsappNumber || '').replace(/\D/g, '');
        if (d.length === 12 && d.indexOf('92') === 0) { return '+92 ' + d.slice(2, 5) + ' ' + d.slice(5); }
        return d ? '+' + d : '';
    };

    /* Freeze so no script can change a setting by accident */
    (function freeze(obj) {
        Object.keys(obj).forEach(function (key) {
            var v = obj[key];
            if (v && typeof v === 'object') { freeze(v); }
        });
        Object.freeze(obj);
    })(CONFIG);

    global.AliyanConfig = CONFIG;

})(window);
