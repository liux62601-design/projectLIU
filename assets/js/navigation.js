/**
 * TechTutorial Navigation
 * Sticky header, mobile menu, smooth-scroll anchor links, active-section detection.
 * Exposed on: window.TechTutorial.navigation
 *
 * Expected DOM:
 *   - <nav class="navbar">        – the sticky nav element
 *   - <button class="hamburger">  – mobile menu toggle (or .mobile-menu-toggle)
 *   - <div class="mobile-menu">   – the sliding mobile nav
 *   - nav links: a[href^="#"]    – anchor links within the nav
 *   - sections: section[id]       – each content section with an id
 */
(function () {
  'use strict';

  window.TechTutorial = window.TechTutorial || {};

  var utils = window.TechTutorial.utils || {};

  // ---------------------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------------------
  var navbar       = null;
  var hamburger    = null;
  var mobileMenu   = null;
  var navLinks     = [];
  var sections     = [];

  var SCROLL_THRESHOLD = 10;
  var BREAKPOINT       = 1024;
  var isMenuOpen       = false;

  // ---------------------------------------------------------------------------
  // Sticky-nav scroll effect
  // ---------------------------------------------------------------------------

  function onScroll() {
    if (!navbar) { return; }
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (y > SCROLL_THRESHOLD) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  // ---------------------------------------------------------------------------
  // Mobile menu
  // ---------------------------------------------------------------------------

  function openMenu() {
    if (!mobileMenu) { return; }
    mobileMenu.classList.add('open');
    if (hamburger) { hamburger.classList.add('open'); }
    isMenuOpen = true;
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    if (!mobileMenu) { return; }
    mobileMenu.classList.remove('open');
    if (hamburger) { hamburger.classList.remove('open'); }
    isMenuOpen = false;
    document.body.style.overflow = '';
  }

  function toggleMenu() {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  function onHamburgerClick(e) {
    e.preventDefault();
    toggleMenu();
  }

  function onMobileLinkClick(e) {
    closeMenu();
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && isMenuOpen) {
      closeMenu();
    }
  }

  // ---------------------------------------------------------------------------
  // Active-section detection via IntersectionObserver
  // ---------------------------------------------------------------------------

  var observer = null;

  function setupActiveDetection() {
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: no active-class detection
      return;
    }

    sections = [].slice.call(document.querySelectorAll('section[id]'));

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // Remove .active from all links
          navLinks.forEach(function (link) { link.classList.remove('active'); });

          // Add .active to the matching link
          var id = entry.target.getAttribute('id');
          var activeLink = document.querySelector(
            '.navbar a[href="#' + CSSEscape(id) + '"], .mobile-menu a[href="#' + CSSEscape(id) + '"]'
          );
          if (activeLink) {
            activeLink.classList.add('active');
          }
        }
      });
    }, {
      rootMargin: '0px 0px -60% 0px',
      threshold: 0
    });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  // ---------------------------------------------------------------------------
  // CSS.escape polyfill (safe fallback for older browsers)
  // ---------------------------------------------------------------------------
  function CSSEscape(value) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(value);
    }
    // Minimal polyfill
    return value.replace(/[^\w-]/g, '\\$&');
  }

  // ---------------------------------------------------------------------------
  // Anchor-link smooth scroll
  // ---------------------------------------------------------------------------

  function onAnchorClick(e) {
    var link = e.currentTarget;
    var href = link.getAttribute('href') || '';

    // Only intercept same-page hash links
    if (href.charAt(0) !== '#') { return; }
    var targetId = href.slice(1);
    if (!targetId) { return; }

    var target = document.getElementById(targetId);
    if (!target) { return; }

    e.preventDefault();

    // Close mobile menu first
    closeMenu();

    // Smooth scroll
    var navHeight = navbar ? navbar.offsetHeight : 0;
    var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight;

    window.scrollTo({ top: top, behavior: 'smooth' });

    // Update URL hash without jumping (for shareable links)
    if (history.pushState) {
      history.pushState(null, null, '#' + targetId);
    } else {
      window.location.hash = '#' + targetId;
    }
  }

  // ---------------------------------------------------------------------------
  // Resize handler – close mobile menu above breakpoint
  // ---------------------------------------------------------------------------

  function onResize() {
    if (window.innerWidth >= BREAKPOINT && isMenuOpen) {
      closeMenu();
    }
  }

  // ---------------------------------------------------------------------------
  // Gather DOM elements
  // ---------------------------------------------------------------------------

  function gatherElements() {
    navbar     = document.querySelector('.navbar');
    hamburger  = document.querySelector('.hamburger') || document.querySelector('.mobile-menu-toggle');
    mobileMenu = document.querySelector('.mobile-menu');

    // All anchor links inside the nav
    var linkNodes = document.querySelectorAll('.navbar a[href^="#"], .mobile-menu a[href^="#"]');
    navLinks = [].slice.call(linkNodes);
  }

  // ---------------------------------------------------------------------------
  // Bind events
  // ---------------------------------------------------------------------------

  function bindEvents() {
    var scrollFn = utils.throttle ? utils.throttle(onScroll, 100) : onScroll;
    window.addEventListener('scroll', scrollFn, { passive: true });

    if (hamburger) {
      hamburger.addEventListener('click', onHamburgerClick);
    }

    // Close mobile menu when any link inside it is clicked
    if (mobileMenu) {
      var mobileLinks = mobileMenu.querySelectorAll('a[href^="#"]');
      [].slice.call(mobileLinks).forEach(function (link) {
        link.addEventListener('click', onMobileLinkClick);
      });
    }

    // Escape key
    document.addEventListener('keydown', onKeydown);

    // Anchor-link smooth scroll
    navLinks.forEach(function (link) {
      link.addEventListener('click', onAnchorClick);
    });

    // Resize
    var resizeFn = utils.debounce ? utils.debounce(onResize, 150) : onResize;
    window.addEventListener('resize', resizeFn, { passive: true });
  }

  // ---------------------------------------------------------------------------
  // Public init
  // ---------------------------------------------------------------------------

  function initNavigation() {
    gatherElements();
    bindEvents();
    setupActiveDetection();

    // Run once on load in case the page is already scrolled
    onScroll();
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.TechTutorial.navigation = {
    initNavigation: initNavigation,
    openMenu:       openMenu,
    closeMenu:      closeMenu,
    toggleMenu:     toggleMenu
  };

})();
