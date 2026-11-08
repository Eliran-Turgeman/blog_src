(function () {
  'use strict';
  var hero = document.querySelector('.telaviv-hero[data-parallax="true"]');
  if (!hero || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(pointer: coarse)').matches) return;

  var layers = Array.prototype.slice.call(hero.querySelectorAll('[data-depth]'));
  var frame = 0;
  var x = 0, y = 0;
  function paint() {
    frame = 0;
    layers.forEach(function (layer) {
      var depth = Number(layer.getAttribute('data-depth')) || 0;
      layer.style.transform = 'translate3d(' + (x * depth).toFixed(2) + 'px,' + (y * depth).toFixed(2) + 'px,0) scale(1.055)';
    });
  }
  function schedule() { if (!frame) frame = window.requestAnimationFrame(paint); }
  function reset() { x = 0; y = 0; schedule(); }
  hero.addEventListener('pointermove', function (event) {
    var box = hero.getBoundingClientRect();
    x = event.clientX - box.left - box.width / 2;
    y = event.clientY - box.top - box.height / 2;
    schedule();
  }, { passive: true });
  hero.addEventListener('pointerleave', reset, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.hidden) reset(); });
})();
