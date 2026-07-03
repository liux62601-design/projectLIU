/**
 * faq.js — FAQ Accordion with Search
 * Enterprise Tutorial Website
 * @namespace TechTutorial
 * @module faq
 * @version 1.0.0
 *
 * Features:
 *   - Accordion: click .faq-question to toggle .open on parent .faq-item
 *   - Only one item open at a time (true accordion)
 *   - Filter: typing in .faq-search filters items by text match
 *   - Case-insensitive search; shows/hides items; opens first match
 *   - Smooth height animation via CSS max-height transition
 *   - CSP-compatible (no inline handlers, no eval)
 */

(function () {
    'use strict';

    // ──────────────────────────────────────
    // Private state
    // ──────────────────────────────────────

    /** @type {HTMLInputElement|null} Search input element */
    var searchInput = null;

    /** @type {NodeList|Array} All FAQ item elements */
    var faqItems = [];

    /** @type {HTMLElement|null} Currently open FAQ item */
    var currentlyOpen = null;

    /** @type {number} Debounce timer ID for search */
    var searchDebounce = 0;

    /** @type {number} Debounce delay in milliseconds */
    var DEBOUNCE_DELAY = 250;

    // ──────────────────────────────────────
    // Accordion logic
    // ──────────────────────────────────────

    /**
     * Toggle an FAQ item open/closed.
     * Closes any other open item (accordion behavior).
     * @param {HTMLElement} item - The .faq-item element
     */
    function toggleItem(item) {
        if (!item) {
            return;
        }

        // If clicking the already-open item, close it
        if (currentlyOpen === item) {
            closeItem(item);
            currentlyOpen = null;
            return;
        }

        // Close the currently open item if any
        if (currentlyOpen) {
            closeItem(currentlyOpen);
        }

        // Open the clicked item
        openItem(item);
        currentlyOpen = item;
    }

    /**
     * Open an FAQ item.
     * @param {HTMLElement} item
     */
    function openItem(item) {
        item.classList.add('open');

        // Accessibility: indicate expanded state
        var question = item.querySelector('.faq-question');
        if (question) {
            question.setAttribute('aria-expanded', 'true');
        }

        // Scroll item into view if needed (smoothly)
        if (typeof item.scrollIntoView === 'function') {
            // Check if item is fully visible; if not, scroll
            var rect = item.getBoundingClientRect();
            var isFullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
            if (!isFullyVisible) {
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    /**
     * Close an FAQ item.
     * @param {HTMLElement} item
     */
    function closeItem(item) {
        item.classList.remove('open');

        var question = item.querySelector('.faq-question');
        if (question) {
            question.setAttribute('aria-expanded', 'false');
        }
    }

    /**
     * Close all FAQ items (used when search clears).
     */
    function closeAll() {
        if (currentlyOpen) {
            closeItem(currentlyOpen);
            currentlyOpen = null;
        }
    }

    // ──────────────────────────────────────
    // Search / filter logic
    // ──────────────────────────────────────

    /**
     * Perform the search/filter against all FAQ items.
     * @param {string} query - The search string
     */
    function filterItems(query) {
        var term = query.trim().toLowerCase();
        var firstVisible = null;

        for (var i = 0; i < faqItems.length; i++) {
            var item = faqItems[i];

            // Get all text content from the item
            var text = (item.textContent || '').toLowerCase();

            if (term === '' || text.indexOf(term) !== -1) {
                // Show matching item
                item.style.display = '';

                // Track the first visible item
                if (!firstVisible) {
                    firstVisible = item;
                }
            } else {
                // Hide non-matching item
                item.style.display = 'none';

                // If the hidden item is currently open, close it
                if (currentlyOpen === item) {
                    closeItem(item);
                    currentlyOpen = null;
                }
            }
        }

        // If there's a search term, open the first matching item
        if (term !== '') {
            if (firstVisible) {
                // Close current before opening new one
                if (currentlyOpen && currentlyOpen !== firstVisible) {
                    closeItem(currentlyOpen);
                }
                openItem(firstVisible);
                currentlyOpen = firstVisible;
            }
        } else {
            // Search cleared — close all
            closeAll();
        }
    }

    /**
     * Handle input event on the search field (debounced).
     */
    function onSearchInput() {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(function () {
            filterItems(searchInput.value);
        }, DEBOUNCE_DELAY);
    }

    /**
     * Handle Escape key in search field — clear and close all.
     * @param {KeyboardEvent} e
     */
    function onSearchKeyDown(e) {
        if (e.key === 'Escape') {
            searchInput.value = '';
            filterItems('');
            searchInput.blur();
        }
    }

    // ──────────────────────────────────────
    // Click handler for FAQ questions
    // ──────────────────────────────────────

    /**
     * Handle click on a .faq-question element.
     * @param {HTMLElement} item - The parent .faq-item
     * @param {Event} e
     */
    function onQuestionClick(item, e) {
        // Don't toggle if the user clicked a link or button inside
        var target = e.target;
        if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a, button')) {
            return;
        }
        toggleItem(item);
    }

    /**
     * Handle keydown on a .faq-question for accessibility.
     * @param {HTMLElement} item
     * @param {KeyboardEvent} e
     */
    function onQuestionKeyDown(item, e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleItem(item);
        }
    }

    // ──────────────────────────────────────
    // Public API
    // ──────────────────────────────────────

    /**
     * Initialize the FAQ component.
     * Call on DOMContentLoaded.
     *
     * Requirements:
     *   - .faq-item elements wrapping each Q&A pair
     *   - .faq-question elements as clickable headers inside .faq-item
     *   - .faq-search input for optional filtering
     *
     * @public
     * @memberof TechTutorial
     */
    function initFAQ() {
        // Gather all FAQ items
        var items = document.querySelectorAll('.faq-item');
        faqItems = items;

        // Bind click and keyboard handlers to each question
        [].forEach.call(faqItems, function (item) {
            var question = item.querySelector('.faq-question');
            if (!question) {
                return;
            }

            // Ensure accessibility attributes
            question.setAttribute('tabindex', '0');
            question.setAttribute('role', 'button');
            question.setAttribute('aria-expanded', 'false');

            // Bind events via closure
            question.addEventListener('click', (function (faqItem) {
                return function (e) {
                    onQuestionClick(faqItem, e);
                };
            })(item));

            question.addEventListener('keydown', (function (faqItem) {
                return function (e) {
                    onQuestionKeyDown(faqItem, e);
                };
            })(item));
        });

        // Bind search input if present
        searchInput = document.querySelector('.faq-search');
        if (searchInput) {
            searchInput.setAttribute('autocomplete', 'off');
            searchInput.setAttribute('aria-label', 'Search FAQ');
            searchInput.addEventListener('input', onSearchInput);
            searchInput.addEventListener('keydown', onSearchKeyDown);
        }
    }

    // ──────────────────────────────────────
    // Expose to global namespace
    // ──────────────────────────────────────

    window.TechTutorial = window.TechTutorial || {};
    window.TechTutorial.initFAQ = initFAQ;

})();
