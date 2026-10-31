/* =====================================================================
   js/pages/home.js
   Aliyan Collection - HOME PAGE (index.html) only.
   Loaded LAST on the page, after all core + component scripts.
   Plain script (no import/export).
   ---------------------------------------------------------------------
   What it does
     1. Intro splash video   - plays once per visit, then fades out
                               (ends on: video end, click, error, or no start
                               within config.introStartTimeoutMs; ?intro=1 forces
                               it, ?intro=0 skips it)
     2. Hero slider          - auto-play, arrows, dots, swipe, pause on
                               hover / hidden tab, no autoplay if the
                               visitor asked for reduced motion
     3. Product grids        - every  [data-product-ids="M-101,W-101"]
                               element is filled from data/products.js
     4. Sale countdown       - counts down to config sale.endDate (js/core/sale-countdown.js),
                               hides the sale section when the sale is over
     5. Newsletter form      - validation + toast (uses js/core/newsletter.js, same key as Contact page)
     6. In-page links        - smooth scroll for  #new-arrivals  etc.
   Needs: config.js, products.js, utils.js, storage.js, toast.js,
          product-card.js, sale-countdown.js, newsletter.js
   ===================================================================== */
(function (global) {
    'use strict';

    var doc = global.document;
    var cfg = global.AliyanConfig || {};
    var U = global.AliyanUtils;
    var Products = global.AliyanProducts;
    var Storage = global.AliyanStorage;

    if (!doc || !U) {
        if (global.console) { global.console.error('home.js: utils.js did not load.'); }
        return;
    }


    /* ------------------------- Helpers ------------------------- */

    function toast(message, type) {
        if (global.AliyanToast) { global.AliyanToast.show(message, type); }
    }

    function prefersReducedMotion() {
        try {
            return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) { return false; }
    }

    /* one broken part must never stop the others from starting */
    function safe(name, fn) {
        try { fn(); } catch (error) {
            if (global.console) { global.console.error('home.js [' + name + ']:', error); }
        }
    }

    /* ===================================================================
       1. INTRO SPLASH
       - home.js is the ONLY owner of play() (video-loader just sets the src)
       - "already seen" flag is written only AFTER the video really started
       - ends when the video ends (max wait = video length + 0.8 s)
       - never leaves a black screen: no start within introStartTimeoutMs,
         blocked autoplay, 404 or error -> splash fades out, flag NOT set
       - ?intro=1 forces the splash (ignores the flag), ?intro=0 skips it
       =================================================================== */
    function initIntro() {
        var intro = U.qs('#intro-screen');
        if (!intro) { return; }

        var key = (cfg.sessionKeys && cfg.sessionKeys.introPlayed) || 'introPlayed';
        var mode = U.getQueryParam ? U.getQueryParam('intro') : null;
        var alreadyPlayed = Storage ? Storage.session.get(key, false) : false;

        // seen already in this visit (unless forced), ?intro=0, or visitor prefers less motion -> no splash
        if (mode === '0' || (alreadyPlayed && mode !== '1') || prefersReducedMotion()) {
            if (intro.parentNode) { intro.parentNode.removeChild(intro); }
            return;
        }

        var video = U.qs('#intro-video', intro);
        var fadeMs = Number(cfg.introFadeMs) > 0 ? Number(cfg.introFadeMs) : 1000;
        var maxMs = Number(cfg.introMaxMs) > 0 ? Number(cfg.introMaxMs) : 12000;
        var startMs = Number(cfg.introStartTimeoutMs) > 0 ? Number(cfg.introStartTimeoutMs) : 3500;
        var started = false;
        var finished = false;
        var maxTimer = null;
        var startTimer = null;

        U.lockScroll();                                       // page cannot scroll under the splash

        function finish() {
            if (finished) { return; }
            finished = true;
            clearTimeout(maxTimer);
            clearTimeout(startTimer);

            intro.classList.add('fade-out');
            intro.setAttribute('aria-hidden', 'true');
            if (video) {
                try { video.pause(); } catch (e) { /* ignore */ }
            }

            setTimeout(function () {
                if (intro.parentNode) { intro.parentNode.removeChild(intro); }
                U.unlockScroll();
            }, fadeMs + 50);
        }

        intro.addEventListener('click', finish);              // tap anywhere to skip

        if (!video) { finish(); return; }

        // Max wait = real video length + 0.8 s; introMaxMs only if the length is unknown.
        function armMaxTimer() {
            clearTimeout(maxTimer);
            var d = video.duration;
            var wait = (isFinite(d) && d > 0) ? Math.max(0, d - (video.currentTime || 0)) * 1000 + 800 : maxMs;
            maxTimer = setTimeout(finish, wait);
        }

        video.muted = true;                                   // autoplay is only allowed while muted
        video.setAttribute('playsinline', '');

        video.addEventListener('playing', function () {
            if (started || finished) { return; }
            started = true;
            clearTimeout(startTimer);
            if (Storage) { Storage.session.set(key, true); }  // flag only once the splash really plays
            armMaxTimer();
        });
        video.addEventListener('loadedmetadata', function () { if (started) { armMaxTimer(); } });
        video.addEventListener('ended', finish);
        video.addEventListener('error', finish);              // 404 / unsupported file

        // video-loader already chose the file (desktop or mobile); make sure it did, then start
        var loader = global.AliyanVideoLoader;
        if (loader && loader.apply && !(loader.sourceOf && loader.sourceOf(video))) { loader.apply(video); }
        if (video.error) { finish(); return; }

        startTimer = setTimeout(finish, startMs);             // slow network / blocked -> no black screen

        try {
            var playing = video.play();
            if (playing && typeof playing.catch === 'function') {
                playing.catch(finish);                        // autoplay blocked -> leave the splash, flag stays unset
            }
        } catch (e) { finish(); }
    }

    /* ===================================================================
       2. HERO SLIDER
       =================================================================== */
    function initSlider() {
        var hero = U.qs('.hero');
        var wrapper = U.qs('#slider-wrapper');
        if (!hero || !wrapper) { return; }

        var slides = U.qsa('.slide', wrapper);
        if (!slides.length) { return; }

        var dotsBox = U.qs('#pagination-dots');
        var arrows = U.qsa('[data-slide-dir]', hero);
        var interval = Number(cfg.sliderIntervalMs) > 0 ? Number(cfg.sliderIntervalMs) : 5000;
        var autoplayAllowed = !prefersReducedMotion() && slides.length > 1;
        var index = 0;
        var timer = null;
        var dots = [];

        slides.forEach(function (slide, i) {
            if (slide.classList.contains('active')) { index = i; }
        });

        /* ----- dots ----- */
        if (dotsBox) {
            dotsBox.innerHTML = '';
            if (slides.length > 1) {
                slides.forEach(function (slide, i) {
                    var dot = doc.createElement('button');
                    dot.type = 'button';
                    dot.className = 'dot';
                    dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
                    dot.addEventListener('click', function () { goTo(i, true); });
                    dotsBox.appendChild(dot);
                    dots.push(dot);
                });
            }
        }

        /* ----- one slide only: no arrows ----- */
        if (slides.length < 2) {
            arrows.forEach(function (arrow) { arrow.hidden = true; });
        }

        function render() {
            slides.forEach(function (slide, i) {
                var on = i === index;
                slide.classList.toggle('active', on);
                slide.setAttribute('aria-hidden', on ? 'false' : 'true');
            });
            dots.forEach(function (dot, i) {
                var on = i === index;
                dot.classList.toggle('active', on);
                if (on) { dot.setAttribute('aria-current', 'true'); }
                else { dot.removeAttribute('aria-current'); }
            });
        }

        function goTo(n, userAction) {
            index = ((n % slides.length) + slides.length) % slides.length;
            render();
            if (userAction) { start(); }                      // restart the timer after a manual change
        }

        function next() { goTo(index + 1, false); }

        function stop() {
            if (timer) { clearInterval(timer); timer = null; }
        }

        function start() {
            stop();
            if (autoplayAllowed && !doc.hidden) { timer = setInterval(next, interval); }
        }

        /* ----- arrows ----- */
        arrows.forEach(function (arrow) {
            arrow.addEventListener('click', function () {
                var dir = parseInt(arrow.getAttribute('data-slide-dir'), 10) || 1;
                goTo(index + dir, true);
            });
        });

        /* ----- keyboard: left / right arrow while the slider has focus ----- */
        hero.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowLeft') { goTo(index - 1, true); }
            else if (event.key === 'ArrowRight') { goTo(index + 1, true); }
        });

        /* ----- pause while the mouse is over it (not on touch screens) ----- */
        var canHover = false;
        try { canHover = !!(global.matchMedia && global.matchMedia('(hover: hover)').matches); } catch (e) { canHover = false; }
        if (canHover) {
            hero.addEventListener('mouseenter', stop);
            hero.addEventListener('mouseleave', start);
        }
        hero.addEventListener('focusin', stop);
        hero.addEventListener('focusout', start);

        /* ----- stop while the browser tab is in the background ----- */
        doc.addEventListener('visibilitychange', function () {
            if (doc.hidden) { stop(); } else { start(); }
        });

        /* ----- swipe on phones ----- */
        var touchX = 0, touchY = 0, touching = false;
        wrapper.addEventListener('touchstart', function (event) {
            if (!event.touches || event.touches.length !== 1) { touching = false; return; }
            touching = true;
            touchX = event.touches[0].clientX;
            touchY = event.touches[0].clientY;
        }, { passive: true });

        wrapper.addEventListener('touchend', function (event) {
            if (!touching || !event.changedTouches || !event.changedTouches.length) { return; }
            touching = false;
            var dx = event.changedTouches[0].clientX - touchX;
            var dy = event.changedTouches[0].clientY - touchY;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                goTo(dx < 0 ? index + 1 : index - 1, true);
            }
        }, { passive: true });

        render();
        start();
    }

    /* ===================================================================
       3. PRODUCT GRIDS  ( [data-product-ids="M-101,W-101,..."] )
       =================================================================== */
    function initProductGrids() {
        var grids = U.qsa('[data-product-ids]');
        if (!grids.length) { return; }

        var Card = global.AliyanProductCard;
        if (!Card || !Products) {
            if (global.console) { global.console.warn('home.js: product-card.js or products.js is missing.'); }
            return;
        }

        grids.forEach(function (grid) {
            var list = Products.getByIds(grid.getAttribute('data-product-ids') || '');

            if (!list.length) {
                // nothing to show -> hide the whole section instead of an empty box
                var section = grid.closest('section');
                if (section) { section.hidden = true; }
                return;
            }
            Card.render(grid, list, { layout: 'home', emptyMessage: '' });
        });
    }

    /* ===================================================================
       4. SALE COUNTDOWN (real timer to cfg.sale.endDate)
       =================================================================== */
    function initCountdown() {
        if (global.AliyanSaleCountdown) {
            global.AliyanSaleCountdown.init({ config: cfg, section: '#special-sale' });
        }
    }

    /* ===================================================================
       5. NEWSLETTER
       =================================================================== */
    function initNewsletter() {
        var form = U.qs('#newsletter-form');
        if (!form) { return; }

        var input = form.elements.email || U.qs('input[type="email"]', form);
        if (!input) { return; }

        form.noValidate = true;                               // we show our own messages

        input.addEventListener('input', function () { input.classList.remove('invalid'); });

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var News = global.AliyanNewsletter;
            if (!News) {
                toast('Newsletter is not available right now. Please try again later.', 'error');
                return;
            }

            // one shared module + one storage key for Home and Contact (js/core/newsletter.js)
            News.subscribe(input.value, cfg).then(function (result) {
                if (result.status === 'invalid') {
                    input.classList.add('invalid');
                    input.focus();
                    toast('Please enter a valid email address.', 'error');
                } else if (result.status === 'duplicate') {
                    input.classList.remove('invalid');
                    toast('You are already subscribed. Thank you!', 'info');
                    form.reset();
                } else {
                    input.classList.remove('invalid');
                    toast('Thank you for subscribing!', 'success');
                    form.reset();
                }
            });
        });
    }

    /* ===================================================================
       6. SMOOTH SCROLL for links like  href="#new-arrivals"
          (only inside <main>; header / footer links are left alone)
       =================================================================== */
    function initAnchors() {
        U.on(doc, 'click', '#main-content a[href^="#"]', function (event, link) {
            var hash = link.getAttribute('href') || '';
            if (hash.length < 2) { return; }

            var id = hash.slice(1);
            try { id = decodeURIComponent(id); } catch (e) { /* keep raw id */ }

            var target = doc.getElementById(id);
            if (!target) { return; }

            event.preventDefault();
            target.style.scrollMarginTop = '80px';            // keep the fixed header off the heading
            target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });

            try { global.history.pushState(null, '', hash); } catch (e) { /* file:// etc. */ }
        });
    }

    /* ------------------------- Start ------------------------- */

    U.onReady(function () {
        safe('intro', initIntro);
        safe('slider', initSlider);
        safe('product grids', initProductGrids);
        safe('countdown', initCountdown);
        safe('newsletter', initNewsletter);
        safe('anchors', initAnchors);
    });

})(window);
