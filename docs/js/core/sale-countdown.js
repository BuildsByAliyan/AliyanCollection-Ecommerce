/* =====================================================================
   js/core/sale-countdown.js
   Aliyan Collection - Special Sale timer (sab kuch Pakistan time / PKT)

   HTML (#special-sale section):
     data-cd="days" | "hours" | "minutes" | "seconds"     -> the 4 number boxes
     data-cd-label="days" | ... (optional data-label-countdown / data-label-clock)
                                                          -> the 4 small labels
     data-sale-label                                      -> subtitle (e.g. "Up to 30 Nov")

   config.js  ->  sale: { endDate: '2026-11-30', mode: 'countdown', label: '' }
     mode 'countdown' (default) : remaining DAYS / HOURS / MINUTES / SECONDS until
                                  endDate 23:59:59 PKT. Same on every device.
     mode 'pkt-clock'           : live Pakistan clock. First box = weekday number
                                  (Mon=1 ... Fri=5 ... Sun=7), then PKT hours, minutes, seconds.
     label : text under the heading. Empty -> built from endDate ("Up to 30 Nov").

   Rules
     - Every figure comes from Asia/Karachi (cfg.timeZone), NEVER from the visitor's
       device timezone (no local getHours()/getDay()).
     - Ticks on the real second boundary, calculated from Date.now() (correct even
       when the tab was in the background).
     - When endDate has passed the whole sale section is hidden (both modes).
     - Pure functions are exposed for testing with a fixed timestamp:
         AliyanSaleCountdown.getParts(endMs, nowMs)
         AliyanSaleCountdown.getClockParts(nowMs, timeZone)
         AliyanSaleCountdown.getDisplay(mode, endMs, nowMs, timeZone)
   ===================================================================== */
(function (global) {
    'use strict';

    var PKT = '+05:00';
    var DEFAULT_TZ = 'Asia/Karachi';
    var KEYS = ['days', 'hours', 'minutes', 'seconds'];
    var WEEKDAY = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };   // ISO weekday numbers
    var LABELS = {
        'countdown': { days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds' },
        'pkt-clock': { days: 'Day', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds' }
    };

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    /* '2026-11-30' -> 30 Nov 23:59:59 PKT (ms).  Poora date-time diya ho to wohi use hota hai. */
    function parseEnd(dateStr) {
        if (!dateStr) { return NaN; }
        var s = /T/.test(dateStr) ? dateStr : dateStr + 'T23:59:59' + PKT;
        return new Date(s).getTime();
    }

    /* ---------- COUNTDOWN: remaining time (a pure difference, so no timezone is involved) ---------- */
    function getParts(endMs, nowMs) {
        var diff = Math.max(0, endMs - nowMs);
        var sec = Math.floor(diff / 1000);
        return {
            done: diff === 0,
            days: Math.floor(sec / 86400),
            hours: Math.floor((sec % 86400) / 3600),
            minutes: Math.floor((sec % 3600) / 60),
            seconds: sec % 60
        };
    }

    /* ---------- PKT CLOCK: wall-clock time in the given zone ---------- */
    var formatters = {};
    function clockFormatter(tz) {
        if (!formatters[tz]) {
            formatters[tz] = new Intl.DateTimeFormat('en-US', {
                timeZone: tz, hourCycle: 'h23', weekday: 'short',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        }
        return formatters[tz];
    }

    function getClockParts(nowMs, tz) {
        tz = tz || DEFAULT_TZ;
        try {
            var map = {};
            clockFormatter(tz).formatToParts(new Date(nowMs)).forEach(function (part) { map[part.type] = part.value; });
            var weekday = WEEKDAY[map.weekday];
            if (weekday) {
                return {
                    weekday: weekday,
                    hours: Number(map.hour) % 24,            // some engines print 24 for midnight
                    minutes: Number(map.minute),
                    seconds: Number(map.second)
                };
            }
        } catch (e) { /* no Intl / unknown zone -> fixed PKT offset below */ }

        // Pakistan has no daylight saving: PKT is always UTC+5, so this fallback is exact for the default zone.
        var d = new Date(nowMs + 5 * 3600 * 1000);
        return {
            weekday: d.getUTCDay() === 0 ? 7 : d.getUTCDay(),
            hours: d.getUTCHours(),
            minutes: d.getUTCMinutes(),
            seconds: d.getUTCSeconds()
        };
    }

    /* What the 4 boxes must show right now. */
    function getDisplay(mode, endMs, nowMs, tz) {
        var over = !isNaN(endMs) && nowMs >= endMs;
        if (mode === 'pkt-clock') {
            var c = getClockParts(nowMs, tz);
            return { done: over, days: c.weekday, hours: c.hours, minutes: c.minutes, seconds: c.seconds };
        }
        return getParts(endMs, nowMs);
    }

    /* "Up to 30 Nov" - built from the end date, shown in the given zone. */
    function formatEndLabel(endMs, tz) {
        try {
            var map = {};
            new Intl.DateTimeFormat('en-GB', { timeZone: tz || DEFAULT_TZ, day: 'numeric', month: 'short' })
                .formatToParts(new Date(endMs)).forEach(function (part) { map[part.type] = part.value; });
            if (map.day && map.month) { return 'Up to ' + map.day + ' ' + map.month; }
        } catch (e) { /* keep the text that is already in the HTML */ }
        return '';
    }

    function init(options) {
        options = options || {};
        var cfg = options.config || global.AliyanConfig || global.ALIYAN_CONFIG || global.CONFIG || {};
        var saleCfg = cfg.sale || {};
        var mode = options.mode || saleCfg.mode || 'countdown';
        if (mode !== 'pkt-clock') { mode = 'countdown'; }
        var tz = options.timeZone || cfg.timeZone || DEFAULT_TZ;
        var endMs = parseEnd(options.endDate || saleCfg.endDate);
        var section = global.document.querySelector(options.section || '#special-sale');
        if (!section) { return null; }
        if (mode === 'countdown' && isNaN(endMs)) { return null; }     // no end date -> leave the HTML as it is

        section.setAttribute('data-sale-mode', mode);

        // labels under the 4 boxes (Days/Day, Hours, ...)
        var labelKind = mode === 'pkt-clock' ? 'clock' : 'countdown';
        KEYS.forEach(function (k) {
            var el = section.querySelector('[data-cd-label="' + k + '"]');
            if (el) { el.textContent = el.getAttribute('data-label-' + labelKind) || LABELS[mode][k]; }
        });

        // subtitle: config label wins, otherwise derived from endDate (HTML text stays as no-JS fallback)
        var sub = section.querySelector('[data-sale-label]');
        if (sub) {
            var text = saleCfg.label || (isNaN(endMs) ? '' : formatEndLabel(endMs, tz));
            if (text) { sub.textContent = text; }
        }

        var els = {};
        KEYS.forEach(function (k) { els[k] = section.querySelector('[data-cd="' + k + '"]'); });
        var timer = null;
        var stopped = false;

        function tick() {
            var p = getDisplay(mode, endMs, Date.now(), tz);
            KEYS.forEach(function (k) {
                var v = pad(p[k]);
                if (els[k] && els[k].textContent !== v) { els[k].textContent = v; }   // no needless DOM writes
            });
            if (p.done) {
                stopped = true;
                section.hidden = true;
                section.style.display = 'none';
            }
            return p;
        }

        function schedule() {
            if (stopped) { return; }
            // wake up just after the next full second, so the seconds box never lags or skips
            timer = setTimeout(function () { tick(); schedule(); }, 1000 - (Date.now() % 1000) + 5);
        }

        tick();
        schedule();
        return { mode: mode, stop: function () { stopped = true; if (timer) { clearTimeout(timer); } } };
    }

    global.AliyanSaleCountdown = {
        init: init,
        getParts: getParts,
        getClockParts: getClockParts,
        getDisplay: getDisplay,
        parseEnd: parseEnd,
        formatEndLabel: formatEndLabel
    };

})(typeof window !== 'undefined' ? window : globalThis);
