/**
 * TechTutorial Theme Manager
 * Dark / light mode toggle using data-theme on <html>.
 * Exposed on: window.TechTutorial.theme
 *
 * Priority:
 *   1. Saved preference (localStorage key 'theme')
 *   2. OS-level prefers-color-scheme media query
 *   3. Default to 'light'
 *
 * Dispatches a 'themechange' CustomEvent on <html> whenever toggled.
 */
(function () {
  'use strict';

  window.TechTutorial = window.TechTutorial || {};

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  var STORAGE_KEY = 'theme';
  var THEME_LIGHT = 'light';
  var THEME_DARK  = 'dark';
  var ATTR         = 'data-theme';

  var storage = (window.TechTutorial.utils && window.TechTutorial.utils.storage)
    || { get: function () { return null; }, set: function () {} };

  var currentTheme = THEME_LIGHT;

  // ---------------------------------------------------------------------------
  // Resolve system preference
  // ---------------------------------------------------------------------------

  function getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return THEME_DARK;
    }
    return THEME_LIGHT;
  }

  // ---------------------------------------------------------------------------
  // Apply theme to <html>
  // ---------------------------------------------------------------------------

  function applyTheme(theme) {
    if (theme !== THEME_DARK && theme !== THEME_LIGHT) {
      theme = THEME_LIGHT;
    }
    currentTheme = theme;
    document.documentElement.setAttribute(ATTR, theme);
  }

  // ---------------------------------------------------------------------------
  // Dispatch custom event so other modules (charts, maps, etc.) can react
  // ---------------------------------------------------------------------------

  function dispatchChangeEvent() {
    var event;
    try {
      event = new CustomEvent('themechange', {
        detail: { theme: currentTheme },
        bubbles: true,
        cancelable: false
      });
    } catch (e) {
      // IE11 fallback
      event = document.createEvent('CustomEvent');
      event.initCustomEvent('themechange', true, false, { theme: currentTheme });
    }
    document.documentElement.dispatchEvent(event);
  }

  // ---------------------------------------------------------------------------
  // Public: toggle
  // ---------------------------------------------------------------------------

  function toggleTheme() {
    var next = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    applyTheme(next);
    storage.set(STORAGE_KEY, next);
    dispatchChangeEvent();
    return next;
  }

  // ---------------------------------------------------------------------------
  // Public: getter
  // ---------------------------------------------------------------------------

  function getTheme() {
    return currentTheme;
  }

  // ---------------------------------------------------------------------------
  // Initialise on load
  // ---------------------------------------------------------------------------

  function initTheme() {
    var saved = storage.get(STORAGE_KEY);
    if (saved === THEME_DARK || saved === THEME_LIGHT) {
      applyTheme(saved);
    } else {
      applyTheme(getSystemPreference());
    }

    // Listen for OS-level changes while the page is open
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', function (e) {
          // Only auto-switch when the user hasn't explicitly set a preference
          var stored = storage.get(STORAGE_KEY);
          if (!stored) {
            applyTheme(e.matches ? THEME_DARK : THEME_LIGHT);
            dispatchChangeEvent();
          }
        });
      } else if (typeof mq.addListener === 'function') {
        // Deprecated but needed for older Safari
        mq.addListener(function (e) {
          var stored = storage.get(STORAGE_KEY);
          if (!stored) {
            applyTheme(e.matches ? THEME_DARK : THEME_LIGHT);
            dispatchChangeEvent();
          }
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.TechTutorial.theme = {
    initTheme:   initTheme,
    toggleTheme: toggleTheme,
    getTheme:    getTheme
  };

})();
