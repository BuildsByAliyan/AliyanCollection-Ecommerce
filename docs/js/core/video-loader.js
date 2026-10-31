/* Aliyan Collection - sirf ek video load karta hai (mobile YA desktop), dono download nahi hoti
 * HTML:
 *   <video autoplay muted playsinline loop preload="metadata"
 *          data-src-mobile="assets/videos/mobile/xxx-mobile.mp4"
 *          data-src-desktop="assets/videos/desktop/xxx-desktop.mp4"
 *          data-breakpoint="768"></video>
 * (video tag ke andar <source> ya src NAHI hona chahiye). Script khud init ho jati hai.
 *
 * data-manual-play : (optional, e.g. the intro splash) the loader only sets src + load() and
 *                    NEVER calls play(); the page script owns play(). Such a video keeps the file
 *                    it started with, so a window resize can never restart it.
 * AliyanVideoLoader.apply(video) returns the chosen src; AliyanVideoLoader.sourceOf(video) returns
 * the src that was already chosen ('' if none yet).
 */
(function (global) {
  'use strict';

  function pick(v) {
    var bp = parseInt(v.getAttribute('data-breakpoint') || '768', 10);
    var mobile = global.matchMedia('(max-width: ' + bp + 'px)').matches;
    return mobile ? v.getAttribute('data-src-mobile') : v.getAttribute('data-src-desktop');
  }

  function isManual(v) { return v.hasAttribute('data-manual-play'); }

  function sourceOf(v) { return v.getAttribute('data-current') || ''; }

  function apply(v) {
    var current = sourceOf(v);
    // video page se hat chuki ho (splash khatam, intro hata diya) ya poori chal chuki ho -> kuch na karo
    if (!document.body.contains(v) || v.ended) return current;
    // manually controlled video: file ek baar chuni jati hai, resize par dobara load/restart nahi
    if (isManual(v) && current) return current;
    var src = pick(v);
    if (!src || current === src) return current;
    v.setAttribute('data-current', src);
    v.src = src;
    try {
      v.load();
      if (!isManual(v)) {
        var p = v.play();
        if (p && p.catch) p.catch(function () { /* autoplay blocked - ignore */ });
      }
    } catch (e) { /* ignore */ }
    return src;
  }

  function init(selector) {
    var vids = document.querySelectorAll(selector || 'video[data-src-mobile][data-src-desktop]');
    function all() { Array.prototype.forEach.call(vids, apply); }
    all();
    var t;
    global.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(all, 200); });
  }

  global.AliyanVideoLoader = { init: init, apply: apply, sourceOf: sourceOf };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }
})(window);
