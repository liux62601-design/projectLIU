/**
 * TechTutorial Scroll Animations
 * IntersectionObserver-based reveal animations, counter animations, and stat bars.
 * Exposed on: window.TechTutorial.animations
 *
 * Supported classes on observed elements:
 *   .reveal, .reveal-up, .reveal-down, .reveal-left, .reveal-right, .reveal-scale
 *   → .revealed is added once the element enters the viewport (threshold 0.15).
 *
 * Stagger children:
 *   .stagger-children  (on parent)
 *   → children get .revealed with a staggered delay when the parent enters.
 *
 * Stat bars:
 *   .stat-bar-fill with data-width="75"   (percentage)
 *   → width is animated from 0 to data-width when the bar enters viewport.
 *
 * Counters:
 *   .counter with data-target="1234"
 *   → inner text counts from 0 to target.
 */
(function () {
  'use strict';

  window.TechTutorial = window.TechTutorial || {};

  // ---------------------------------------------------------------------------
  // Reveal classes that should be observed
  // ---------------------------------------------------------------------------
  var REVEAL_CLASSES = [
    'reveal',
    'reveal-up',
    'reveal-down',
    'reveal-left',
    'reveal-right',
    'reveal-scale'
  ];

  var REVEAL_THRESHOLD    = 0.15;
  var STAGGER_DELAY_BASE  = 80;   // ms between each staggered child

  var revealObserver   = null;
  var statBarObserver  = null;
  var counterObserver  = null;
  var observedElements = [];

  // Animation frame helper for counter
  var raf = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            function (cb) { return setTimeout(cb, 16); };

  // ---------------------------------------------------------------------------
  // Generic element observer
  // ---------------------------------------------------------------------------

  function createObserver(callback, options) {
    if (typeof IntersectionObserver === 'undefined') {
      // No observer support – immediately reveal everything
      return {
        observe: function (el) {
          callback([{ isIntersecting: true, target: el }]);
        },
        unobserve: function () {},
        disconnect: function () {}
      };
    }
    return new IntersectionObserver(callback, options);
  }

  // ---------------------------------------------------------------------------
  // 1. Reveal animations
  // ---------------------------------------------------------------------------

  function onRevealIntersect(entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) { return; }
      var el = entry.target;

      // Handle stagger-children parents
      if (el.classList.contains('stagger-children')) {
        revealStaggerChildren(el);
      } else {
        el.classList.add('revealed');
      }

      // Stop watching once revealed
      if (revealObserver) {
        revealObserver.unobserve(el);
      }
    });
  }

  function revealStaggerChildren(parent) {
    var children = [].slice.call(parent.children);
    children.forEach(function (child, index) {
      var delay = index * STAGGER_DELAY_BASE;
      setTimeout(function () {
        child.classList.add('revealed');
      }, delay);
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Stat-bar-fill animations
  // ---------------------------------------------------------------------------

  function onStatBarIntersect(entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) { return; }
      var bar = entry.target;
      var targetWidth = bar.getAttribute('data-width');

      if (targetWidth !== null) {
        // Animate width from 0 to target
        bar.style.transition = 'none';
        bar.style.width = '0%';
        bar.style.transition = 'width 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        // Force reflow
        bar.offsetHeight;
        bar.style.width = targetWidth + '%';
      }

      if (statBarObserver) {
        statBarObserver.unobserve(bar);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Counter animations
  // ---------------------------------------------------------------------------

  function onCounterIntersect(entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) { return; }
      animateCounter(entry.target);
      if (counterObserver) {
        counterObserver.unobserve(entry.target);
      }
    });
  }

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-target'), 10);
    if (isNaN(target)) { return; }

    var duration = parseInt(el.getAttribute('data-duration'), 10) || 2000; // ms
    var start   = performance.now();
    var current = 0;

    function step(timestamp) {
      var elapsed = timestamp - start;
      var progress = Math.min(elapsed / duration, 1);

      // Ease-out quad
      var eased = 1 - (1 - progress) * (1 - progress);
      current = Math.floor(eased * target);

      el.textContent = current.toLocaleString();

      if (progress < 1) {
        raf(step);
      } else {
        el.textContent = target.toLocaleString();
      }
    }

    raf(step);
  }

  // ---------------------------------------------------------------------------
  // Public: observe a single element (for dynamically-added content)
  // ---------------------------------------------------------------------------

  function observeElement(el) {
    if (!el) { return; }

    // Check if it's a reveal element
    var hasRevealClass = REVEAL_CLASSES.some(function (cls) {
      return el.classList.contains(cls);
    });
    if (hasRevealClass || el.classList.contains('stagger-children')) {
      if (revealObserver) { revealObserver.observe(el); }
      observedElements.push(el);
    }

    // Check if it's a stat bar
    if (el.classList.contains('stat-bar-fill') && el.hasAttribute('data-width')) {
      if (statBarObserver) { statBarObserver.observe(el); }
      observedElements.push(el);
    }

    // Check if it's a counter
    if (el.classList.contains('counter') && el.hasAttribute('data-target')) {
      if (counterObserver) { counterObserver.observe(el); }
      observedElements.push(el);
    }
  }

  // ---------------------------------------------------------------------------
  // MutationObserver – watch for dynamically added elements
  // ---------------------------------------------------------------------------

  function setupMutationObserver() {
    if (typeof MutationObserver === 'undefined') { return; }

    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        [].slice.call(mutation.addedNodes).forEach(function (node) {
          if (node.nodeType !== Node.ELEMENT_NODE) { return; }

          // Check the node itself
          observeElement(node);

          // Check all descendants
          REVEAL_CLASSES.forEach(function (cls) {
            var els = node.querySelectorAll
              ? [].slice.call(node.querySelectorAll('.' + cls))
              : [];
            els.forEach(function (el) { observeElement(el); });
          });

          // Stagger containers
          if (node.querySelectorAll) {
            var staggers = node.querySelectorAll('.stagger-children');
            [].slice.call(staggers).forEach(function (el) { observeElement(el); });
          }

          // Stat bars
          if (node.querySelectorAll) {
            var bars = node.querySelectorAll('.stat-bar-fill[data-width]');
            [].slice.call(bars).forEach(function (el) { observeElement(el); });
          }

          // Counters
          if (node.querySelectorAll) {
            var counters = node.querySelectorAll('.counter[data-target]');
            [].slice.call(counters).forEach(function (el) { observeElement(el); });
          }
        });
      });
    });

    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ---------------------------------------------------------------------------
  // Initialise
  // ---------------------------------------------------------------------------

  function initAnimations() {
    // --- Reveal elements ---
    // Build a combined selector
    var revealSelector = REVEAL_CLASSES.map(function (cls) { return '.' + cls; }).join(',');
    revealSelector += ',.stagger-children';

    var revealElements = document.querySelectorAll(revealSelector);
    revealObserver = createObserver(onRevealIntersect, {
      threshold: REVEAL_THRESHOLD,
      rootMargin: '0px 0px -40px 0px'
    });
    [].slice.call(revealElements).forEach(function (el) {
      revealObserver.observe(el);
    });

    // --- Stat bars ---
    var statBars = document.querySelectorAll('.stat-bar-fill[data-width]');
    statBarObserver = createObserver(onStatBarIntersect, {
      threshold: 0.3
    });
    [].slice.call(statBars).forEach(function (bar) {
      statBarObserver.observe(bar);
    });

    // --- Counters ---
    var counters = document.querySelectorAll('.counter[data-target]');
    counterObserver = createObserver(onCounterIntersect, {
      threshold: 0.5
    });
    [].slice.call(counters).forEach(function (counter) {
      counterObserver.observe(counter);
    });

    // --- Watch for future elements ---
    setupMutationObserver();
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.TechTutorial.animations = {
    initAnimations:  initAnimations,
    observeElement:  observeElement
  };

})();
