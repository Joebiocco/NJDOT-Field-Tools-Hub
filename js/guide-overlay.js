// Shared guide/tutorial overlay — used by pages/njsearch.html, pages/njfuel.html,
// pages/dc144.html, and pages/WorkOrderCloseout.html against the shared
// .guide-overlay/.guide-modal markup and CSS in css/field-ui.css.
//
// Reconciled from 4 near-duplicate copies. dc144.html's version was the most
// complete (focus trap, documentElement reparenting so the overlay always
// covers the full viewport regardless of any ancestor transform, guarded
// Escape) and is the new shared baseline for all 4 pages.
(function (global) {
  function init(options) {
    options = options || {};
    var overlay  = document.getElementById(options.overlayId || 'guide-overlay');
    var openBtn  = document.getElementById(options.openButtonId || 'open-guide');
    var closeBtn = document.getElementById(options.closeButtonId || 'guide-close');
    var doneBtn  = document.getElementById(options.doneButtonId || 'guide-done');
    if (!overlay || !openBtn) return null;

    var opener = null;

    function focusableNodes() {
      var nodes = overlay.querySelectorAll(
        'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      );
      return Array.prototype.filter.call(nodes, function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      });
    }

    function trapTabKey(e) {
      if (e.key !== 'Tab' || !overlay.classList.contains('open')) return;
      var focusable = focusableNodes();
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function openGuide() {
      // Reparent to <html> so the overlay covers the full viewport even if
      // an ancestor has a transform/contain context applied (hub/tool page
      // transitions set these transiently — see CLAUDE.md's animation rules).
      try {
        document.body.style.transform = 'none';
        document.body.style.willChange = 'auto';
      } catch (_) {}
      if (overlay.parentNode !== document.documentElement) {
        document.documentElement.appendChild(overlay);
      }
      opener = document.activeElement;
      document.addEventListener('keydown', trapTabKey);
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(function () {
        try { overlay.focus(); } catch (_) {}
      });
    }

    function closeGuide() {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', trapTabKey);
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        try { opener.focus(); } catch (_) {}
      }
      opener = null;
    }

    openBtn.addEventListener('click', openGuide);
    if (closeBtn) closeBtn.addEventListener('click', closeGuide);
    if (doneBtn) doneBtn.addEventListener('click', closeGuide);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeGuide();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeGuide();
    });

    if (options.storageKey) {
      try {
        var shown = parseInt(localStorage.getItem(options.storageKey) || '0', 10);
        var gateOk = typeof options.autoShowGate !== 'function' || options.autoShowGate();
        if (shown < 2 && gateOk) {
          localStorage.setItem(options.storageKey, String(shown + 1));
          setTimeout(openGuide, options.autoShowDelay || 650);
        }
      } catch (_) {}
    }

    return { open: openGuide, close: closeGuide };
  }

  global.GuideOverlay = { init: init };
})(window);
