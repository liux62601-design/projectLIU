/**
 * TechTutorial Utilities
 * Shared helper functions for the TechTutorial site.
 * Exposed on: window.TechTutorial.utils
 *
 * Usage: <script defer src="assets/js/utils.js"></script>
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Namespace
  // ---------------------------------------------------------------------------
  window.TechTutorial = window.TechTutorial || {};

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------
  var uidCounter = 0;

  /**
   * Generate a unique ID with an optional prefix.
   * Not crypto-grade; fine for DOM ids and event keys.
   */
  function generateId(prefix) {
    prefix = prefix || 'tt';
    uidCounter += 1;
    return prefix + '-' + Date.now().toString(36) + '-' + uidCounter.toString(36);
  }

  // ---------------------------------------------------------------------------
  // Debounce & throttle
  // ---------------------------------------------------------------------------

  /**
   * Debounce – delays fn until after `delay` ms of inactivity.
   * @param {Function} fn
   * @param {number}   delay  milliseconds
   * @returns {Function}
   */
  function debounce(fn, delay) {
    delay = delay || 200;
    var timer = null;
    return function () {
      var context = this;
      var args = arguments;
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(function () {
        timer = null;
        fn.apply(context, args);
      }, delay);
    };
  }

  /**
   * Throttle – invoke fn at most once every `limit` ms.
   * @param {Function} fn
   * @param {number}   limit  milliseconds
   * @returns {Function}
   */
  function throttle(fn, limit) {
    limit = limit || 200;
    var inThrottle = false;
    return function () {
      var context = this;
      var args = arguments;
      if (!inThrottle) {
        fn.apply(context, args);
        inThrottle = true;
        setTimeout(function () {
          inThrottle = false;
        }, limit);
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Date formatting
  // ---------------------------------------------------------------------------

  var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  /**
   * Format an ISO date string (e.g. "2026-06-22") to "June 22, 2026".
   * Falls back to a locale string for any other format.
   */
  function formatDate(dateString) {
    if (!dateString) { return ''; }
    var parts = dateString.split('-');
    if (parts.length === 3) {
      var year  = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10);
      var day   = parseInt(parts[2], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return MONTHS[month - 1] + ' ' + day + ', ' + year;
      }
    }
    // Fallback for other formats
    var d = new Date(dateString);
    if (isNaN(d.getTime())) { return dateString; }
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // ---------------------------------------------------------------------------
  // File-size formatting
  // ---------------------------------------------------------------------------

  var SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

  /**
   * Format a byte count to a human-readable string (e.g. 1572864 → "1.5 MB").
   */
  function formatFileSize(bytes) {
    bytes = parseInt(bytes, 10);
    if (isNaN(bytes) || bytes < 0) { return '0 B'; }
    if (bytes === 0) { return '0 B'; }
    var i = 0;
    var size = bytes;
    while (size >= 1024 && i < SIZE_UNITS.length - 1) {
      size /= 1024;
      i++;
    }
    return size % 1 === 0
      ? size + ' ' + SIZE_UNITS[i]
      : size.toFixed(1) + ' ' + SIZE_UNITS[i];
  }

  // ---------------------------------------------------------------------------
  // Slugify
  // ---------------------------------------------------------------------------

  function slugify(text) {
    if (!text) { return ''; }
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/&/g, '-and-')          // Replace & with 'and'
      .replace(/[\s]+/g, '-')          // Replace spaces with -
      .replace(/[^\w\-]+/g, '')        // Remove all non-word chars
      .replace(/\-\-+/g, '-')          // Replace multiple - with single -
      .replace(/^-+/, '')              // Trim - from start
      .replace(/-+$/, '');             // Trim - from end
  }

  // ---------------------------------------------------------------------------
  // Query parameters
  // ---------------------------------------------------------------------------

  function getQueryParam(name, url) {
    url = url || window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    var results = regex.exec(url);
    if (!results) { return null; }
    if (!results[2]) { return ''; }
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }

  // ---------------------------------------------------------------------------
  // Copy to clipboard
  // ---------------------------------------------------------------------------

  /**
   * Copy `text` to the clipboard. Returns a Promise that resolves to
   * `true` on success, `false` on failure.
   */
  function copyToClipboard(text) {
    // Modern async clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text).then(function () {
        return true;
      }).catch(function () {
        return fallbackCopy(text);
      });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    // Make it invisible but keep it in the layout so execCommand works
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    var success = false;
    try {
      success = document.execCommand('copy');
    } catch (e) {
      // ignore
    }
    document.body.removeChild(textArea);
    return success;
  }

  // ---------------------------------------------------------------------------
  // LocalStorage wrapper
  // ---------------------------------------------------------------------------

  var storage = {
    /**
     * Get a parsed value from localStorage.
     * Returns `defaultValue` if the key does not exist or on error.
     */
    get: function (key, defaultValue) {
      try {
        var raw = localStorage.getItem(key);
        if (raw === null) { return defaultValue; }
        return JSON.parse(raw);
      } catch (e) {
        return defaultValue;
      }
    },

    /**
     * Set a value in localStorage (JSON-stringified).
     */
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        // Storage full or unavailable – silently fail
      }
    },

    /**
     * Remove a key from localStorage.
     */
    remove: function (key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // ignore
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Device / environment detection
  // ---------------------------------------------------------------------------

  /**
   * Returns 'mobile', 'tablet', or 'desktop'.
   */
  function getDeviceType() {
    var w = window.innerWidth;
    if (w < 768) { return 'mobile'; }
    if (w < 1024) { return 'tablet'; }
    return 'desktop';
  }

  /**
   * Returns true if the device supports touch events.
   */
  function isTouchDevice() {
    return ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0) ||
           (navigator.msMaxTouchPoints > 0);
  }

  // ---------------------------------------------------------------------------
  // Smooth scroll
  // ---------------------------------------------------------------------------

  /**
   * Smooth-scroll to `element` (element or selector string).
   * @param {Element|string} target - DOM element or CSS selector
   * @param {Object}         [opts]
   * @param {number}         [opts.offset=0]  - pixel offset from top
   * @param {string}         [opts.behavior='smooth']
   */
  function smoothScrollTo(target, opts) {
    opts = opts || {};
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) { return; }
    var offset = opts.offset || 0;
    var behavior = opts.behavior || 'smooth';

    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: behavior, block: 'start' });
    } else {
      // Fallback – instant scroll
      var top = el.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: 'auto' });
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.TechTutorial.utils = {
    generateId:      generateId,
    debounce:        debounce,
    throttle:        throttle,
    formatDate:      formatDate,
    formatFileSize:  formatFileSize,
    slugify:         slugify,
    getQueryParam:   getQueryParam,
    copyToClipboard: copyToClipboard,
    storage:         storage,
    getDeviceType:   getDeviceType,
    isTouchDevice:   isTouchDevice,
    smoothScrollTo:  smoothScrollTo
  };

})();
