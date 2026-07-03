/**
 * gallery.js — Image Gallery with Lightbox and Carousel
 * Enterprise Tutorial Website
 * @namespace TechTutorial
 * @module gallery
 * @version 1.0.0
 *
 * Features:
 *   - Lightbox triggered by .showcase-item or [data-lightbox] elements
 *   - Keyboard navigation (Escape, Left/Right arrows)
 *   - Carousel prev/next when multiple images present
 *   - Body scroll lock when lightbox is open
 *   - CSS-driven fade in/out animations
 *   - CSP-compatible (no inline handlers, no eval)
 */

(function () {
    'use strict';

    // ──────────────────────────────────────
    // Private state
    // ──────────────────────────────────────

    /** @type {HTMLElement|null} Lightbox overlay element */
    var lightbox = null;

    /** @type {HTMLElement|null} Lightbox image element */
    var lightboxImg = null;

    /** @type {HTMLElement|null} Close button */
    var lightboxClose = null;

    /** @type {HTMLElement|null} Previous arrow */
    var lightboxPrev = null;

    /** @type {HTMLElement|null} Next arrow */
    var lightboxNext = null;

    /** @type {NodeList|Array} Collection of gallery trigger elements */
    var triggers = [];

    /** @type {number} Index of currently displayed image */
    var currentIndex = 0;

    /** @type {boolean} Whether lightbox is currently open */
    var isOpen = false;

    /** @type {string} CSS class added to body to prevent scroll */
    var BODY_LOCK_CLASS = 'lightbox-open';

    /** @type {string} Class for visible/fade-in state */
    var VISIBLE_CLASS = 'lightbox--visible';

    // ──────────────────────────────────────
    // DOM helpers
    // ──────────────────────────────────────

    /**
     * Get the full-size image URL from a trigger element.
     * Checks data-full attribute first, falls back to img src.
     * @param {HTMLElement} el
     * @returns {string}
     */
    function getImageSrc(el) {
        if (el.dataset && el.dataset.full) {
            return el.dataset.full;
        }
        var img = el.querySelector('img');
        if (img && img.src) {
            return img.src;
        }
        return '';
    }

    /**
     * Get the alt/caption text from a trigger element.
     * @param {HTMLElement} el
     * @returns {string}
     */
    function getImageCaption(el) {
        if (el.dataset && el.dataset.caption) {
            return el.dataset.caption;
        }
        var img = el.querySelector('img');
        if (img && img.alt) {
            return img.alt;
        }
        return '';
    }

    // ──────────────────────────────────────
    // Lightbox DOM creation (lazy, once)
    // ──────────────────────────────────────

    /**
     * Create the lightbox DOM structure and append to body.
     * Only called once — subsequent calls return early.
     */
    function ensureLightboxDOM() {
        if (lightbox) {
            return;
        }

        // Create the overlay
        lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.setAttribute('role', 'dialog');
        lightbox.setAttribute('aria-modal', 'true');
        lightbox.setAttribute('aria-label', 'Image lightbox');

        // Close button
        lightboxClose = document.createElement('button');
        lightboxClose.className = 'lightbox-close';
        lightboxClose.setAttribute('aria-label', 'Close lightbox');
        lightboxClose.setAttribute('type', 'button');
        lightboxClose.innerHTML = '&times;';

        // Previous arrow
        lightboxPrev = document.createElement('button');
        lightboxPrev.className = 'lightbox-arrow lightbox-arrow--prev';
        lightboxPrev.setAttribute('aria-label', 'Previous image');
        lightboxPrev.setAttribute('type', 'button');
        lightboxPrev.innerHTML = '&#10094;';

        // Next arrow
        lightboxNext = document.createElement('button');
        lightboxNext.className = 'lightbox-arrow lightbox-arrow--next';
        lightboxNext.setAttribute('aria-label', 'Next image');
        lightboxNext.setAttribute('type', 'button');
        lightboxNext.innerHTML = '&#10095;';

        // Content wrapper
        var content = document.createElement('div');
        content.className = 'lightbox-content';

        // Image element
        lightboxImg = document.createElement('img');
        lightboxImg.className = 'lightbox-image';
        lightboxImg.alt = '';

        // Caption
        var caption = document.createElement('div');
        caption.className = 'lightbox-caption';

        // Assemble
        content.appendChild(lightboxImg);
        content.appendChild(caption);
        lightbox.appendChild(lightboxClose);
        lightbox.appendChild(lightboxPrev);
        lightbox.appendChild(lightboxNext);
        lightbox.appendChild(content);

        document.body.appendChild(lightbox);

        // Bind event listeners once
        bindLightboxEvents();
    }

    // ──────────────────────────────────────
    // Event binding
    // ──────────────────────────────────────

    /**
     * Bind all lightbox interaction events.
     * Safe to call multiple times — uses flag to avoid double-binding.
     */
    var eventsBound = false;

    function bindLightboxEvents() {
        if (eventsBound) {
            return;
        }
        eventsBound = true;

        // Close button
        lightboxClose.addEventListener('click', closeLightbox);

        // Click on overlay background (not on content)
        lightbox.addEventListener('click', function (e) {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', onKeyDown);

        // Previous/Next buttons
        lightboxPrev.addEventListener('click', showPrev);
        lightboxNext.addEventListener('click', showNext);

        // Touch swipe support
        var touchStartX = 0;
        var touchEndX = 0;

        lightbox.addEventListener('touchstart', function (e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        lightbox.addEventListener('touchend', function (e) {
            touchEndX = e.changedTouches[0].screenX;
            var diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    showNext();
                } else {
                    showPrev();
                }
            }
        }, { passive: true });
    }

    // ──────────────────────────────────────
    // Lightbox open / close
    // ──────────────────────────────────────

    /**
     * Open the lightbox at a given index.
     * @param {number} index - Index within the triggers collection
     */
    function openLightbox(index) {
        ensureLightboxDOM();

        if (triggers.length === 0) {
            return;
        }

        currentIndex = Math.max(0, Math.min(index, triggers.length - 1));
        updateLightboxImage();

        // Show lightbox with fade-in
        lightbox.classList.add(VISIBLE_CLASS);
        document.body.classList.add(BODY_LOCK_CLASS);
        isOpen = true;

        // Show/hide arrows based on count
        updateArrowVisibility();

        // Focus trap: move focus to close button
        lightboxClose.focus();
    }

    /**
     * Close the lightbox.
     */
    function closeLightbox() {
        if (!lightbox || !isOpen) {
            return;
        }

        lightbox.classList.remove(VISIBLE_CLASS);
        document.body.classList.remove(BODY_LOCK_CLASS);
        isOpen = false;

        // Return focus to the trigger element
        if (triggers[currentIndex]) {
            triggers[currentIndex].focus();
        }
    }

    /**
     * Update the lightbox image and caption for the current index.
     */
    function updateLightboxImage() {
        var trigger = triggers[currentIndex];
        if (!trigger) {
            return;
        }

        var src = getImageSrc(trigger);
        var caption = getImageCaption(trigger);

        if (lightboxImg) {
            lightboxImg.src = src;
            lightboxImg.alt = caption;
        }

        var captionEl = lightbox.querySelector('.lightbox-caption');
        if (captionEl) {
            captionEl.textContent = caption;
        }

        // Update aria for screen readers
        if (lightbox) {
            lightbox.setAttribute('aria-label', 'Image ' + (currentIndex + 1) + ' of ' + triggers.length + ': ' + caption);
        }
    }

    /**
     * Show/hide prev/next arrows based on image count.
     */
    function updateArrowVisibility() {
        if (triggers.length <= 1) {
            lightboxPrev.style.display = 'none';
            lightboxNext.style.display = 'none';
        } else {
            lightboxPrev.style.display = '';
            lightboxNext.style.display = '';
        }
    }

    // ──────────────────────────────────────
    // Navigation
    // ──────────────────────────────────────

    /**
     * Show the previous image (carousel).
     */
    function showPrev() {
        if (triggers.length <= 1) {
            return;
        }
        currentIndex = (currentIndex - 1 + triggers.length) % triggers.length;
        updateLightboxImage();
    }

    /**
     * Show the next image (carousel).
     */
    function showNext() {
        if (triggers.length <= 1) {
            return;
        }
        currentIndex = (currentIndex + 1) % triggers.length;
        updateLightboxImage();
    }

    // ──────────────────────────────────────
    // Keyboard handler
    // ──────────────────────────────────────

    /**
     * Handle keyboard events.
     * @param {KeyboardEvent} e
     */
    function onKeyDown(e) {
        if (!isOpen) {
            return;
        }

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                closeLightbox();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                showPrev();
                break;
            case 'ArrowRight':
                e.preventDefault();
                showNext();
                break;
            default:
                break;
        }
    }

    // ──────────────────────────────────────
    // Trigger click handler
    // ──────────────────────────────────────

    /**
     * Handle click on a gallery trigger element.
     * @param {number} index
     * @param {Event} e
     */
    function onTriggerClick(index, e) {
        e.preventDefault();
        openLightbox(index);
    }

    // ──────────────────────────────────────
    // Public API
    // ──────────────────────────────────────

    /**
     * Initialize the gallery. Finds all trigger elements and binds click handlers.
     * Call this on DOMContentLoaded.
     *
     * Trigger selectors: .showcase-item, [data-lightbox]
     *
     * @public
     * @memberof TechTutorial
     */
    function initGallery() {
        // Collect all triggers
        var showcaseItems = document.querySelectorAll('.showcase-item');
        var lightboxItems = document.querySelectorAll('[data-lightbox]');

        // Merge NodeLists into a plain array (deduplicate)
        var triggerSet = [];
        var seen = new WeakSet();

        [].forEach.call(showcaseItems, function (el) {
            if (!seen.has(el)) {
                seen.add(el);
                triggerSet.push(el);
            }
        });

        [].forEach.call(lightboxItems, function (el) {
            if (!seen.has(el)) {
                seen.add(el);
                triggerSet.push(el);
            }
        });

        triggers = triggerSet;

        // Bind click handler to each trigger
        triggers.forEach(function (trigger, idx) {
            // Use a closure to capture the index
            trigger.addEventListener('click', (function (index) {
                return function (e) {
                    onTriggerClick(index, e);
                };
            })(idx));

            // Accessibility: make triggers focusable if not already
            if (!trigger.hasAttribute('tabindex')) {
                trigger.setAttribute('tabindex', '0');
            }
            if (!trigger.getAttribute('role')) {
                trigger.setAttribute('role', 'button');
            }

            // Allow Enter/Space to open
            trigger.addEventListener('keydown', (function (index) {
                return function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onTriggerClick(index, e);
                    }
                };
            })(idx));
        });
    }

    // ──────────────────────────────────────
    // Expose to global namespace
    // ──────────────────────────────────────

    window.TechTutorial = window.TechTutorial || {};
    window.TechTutorial.initGallery = initGallery;

})();
