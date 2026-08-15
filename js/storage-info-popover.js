// Shared storage-info popover — a small (i) button + text tooltip used by
// pages/WorkOrderCloseout.html, pages/dc144.html, pages/njfuel.html, and
// pages/njsearch.html against the shared .topbar-info-wrap/.topbar-info-popover
// markup and CSS in css/field-ui.css.
(function (global) {
  function init(options) {
    options = options || {};
    var btn = document.getElementById(options.buttonId || 'storage-info-btn');
    var pop = document.getElementById(options.popoverId || 'storage-info-popover');
    if (!btn || !pop) return null;

    function position() {
      var r = btn.getBoundingClientRect();
      var popW = pop.offsetWidth || 260;
      var left = Math.min(Math.max(8, r.right - popW), document.documentElement.clientWidth - popW - 8);
      pop.style.left = left + 'px';
      pop.style.top = (r.bottom + 8) + 'px';
    }

    function close() {
      pop.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }

    function open() {
      pop.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      position();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (pop.hidden) open(); else close();
    });
    document.addEventListener('click', function (e) {
      if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) close();
    });
    // Capture phase so this always sees Escape first, even when a focused
    // child widget (e.g. a panel search input) calls stopPropagation() on
    // its own bubble-phase keydown handler.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !pop.hidden) { close(); btn.focus(); }
    }, true);
    window.addEventListener('scroll', function () { if (!pop.hidden) position(); }, true);
    window.addEventListener('resize', function () { if (!pop.hidden) position(); });

    return { open: open, close: close };
  }

  global.StorageInfoPopover = { init: init };
})(window);
