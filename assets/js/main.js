/**
 * TechTutorial – Main Entry Point
 *
 * Bootstraps all site modules once the DOM is ready.
 * Load this script last with `<script defer src="assets/js/main.js"></script>`
 * after utils.js, theme.js, navigation.js, and animations.js.
 */
(function () {
  'use strict';

  var TT = window.TechTutorial;

  // ---------------------------------------------------------------------------
  // Back-to-top button
  // ---------------------------------------------------------------------------

  function initBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) { return; }

    var scrollFn = (TT.utils && TT.utils.throttle)
      ? TT.utils.throttle(handleScroll, 150)
      : handleScroll;

    window.addEventListener('scroll', scrollFn, { passive: true });

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    function handleScroll() {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (y > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }

    // Check initial state
    handleScroll();
  }

  // ---------------------------------------------------------------------------
  // Copyright year
  // ---------------------------------------------------------------------------

  function setCopyrightYear() {
    var el = document.getElementById('current-year');
    if (el) {
      el.textContent = new Date().getFullYear();
    }
  }

  // ---------------------------------------------------------------------------
  // Service Worker registration
  // ---------------------------------------------------------------------------

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) { return; }

    // sw.js should be at the site root
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function (registration) {
        console.log('[TT] Service Worker registered:', registration.scope);
      })
      .catch(function (err) {
        console.warn('[TT] Service Worker registration failed:', err);
      });
  }

  // ---------------------------------------------------------------------------
  // PWA install prompt
  // ---------------------------------------------------------------------------

  var deferredPrompt = null;

  function initPWAInstall() {
    var installBtn = document.getElementById('pwa-install-btn');
    if (!installBtn) { return; }

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', function (e) {
      // Prevent the browser's default prompt
      e.preventDefault();
      deferredPrompt = e;

      // Show the install button
      installBtn.style.display = '';

      installBtn.addEventListener('click', function () {
        if (!deferredPrompt) { return; }
        deferredPrompt.prompt();

        deferredPrompt.userChoice.then(function (choiceResult) {
          if (choiceResult.outcome === 'accepted') {
            console.log('[TT] PWA install accepted');
          }
          deferredPrompt = null;
          installBtn.style.display = 'none';
        });
      });
    });

    // Hide install button if the app was already installed
    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      installBtn.style.display = 'none';
      console.log('[TT] PWA installed');
    });
  }

  // ---------------------------------------------------------------------------
  // Keyboard accessibility: focus-visible polyfill behaviour
  // ---------------------------------------------------------------------------

  function initKeyboardAccessibility() {
    // Add a class to body so CSS can differentiate mouse from keyboard focus
    document.body.addEventListener('mousedown', function () {
      document.body.classList.add('using-mouse');
    });
    document.body.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        document.body.classList.remove('using-mouse');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // External link handling (open in new tab, add rel="noopener")
  // ---------------------------------------------------------------------------

  function initExternalLinks() {
    var links = document.querySelectorAll('a[href^="http"]:not([target])');
    [].slice.call(links).forEach(function (link) {
      if (link.hostname !== window.location.hostname) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  function boot() {
    // Theme must be applied before the first paint – initTheme is designed to
    // be called as early as possible (and is idempotent).
    if (TT.theme && typeof TT.theme.initTheme === 'function') {
      TT.theme.initTheme();
    }

    // Wire up the theme toggle button(s)
    var toggleBtns = document.querySelectorAll('.theme-toggle, [data-theme-toggle]');
    [].slice.call(toggleBtns).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (TT.theme && typeof TT.theme.toggleTheme === 'function') {
          TT.theme.toggleTheme();
        }
      });
    });

    // Navigation
    if (TT.navigation && typeof TT.navigation.initNavigation === 'function') {
      TT.navigation.initNavigation();
    }

    // Scroll animations
    if (TT.animations && typeof TT.animations.initAnimations === 'function') {
      TT.animations.initAnimations();
    }

    // Back to top
    initBackToTop();

    // Copyright year
    setCopyrightYear();

    // External links
    initExternalLinks();

    // Keyboard accessibility
    initKeyboardAccessibility();

    // Service Worker (offline support)
    registerServiceWorker();

    // PWA install prompt
    initPWAInstall();
  }

  // ---------------------------------------------------------------------------
  // DOMContentLoaded guard
  // ---------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    // DOM already loaded (deferred script)
    boot();
  }

})();
