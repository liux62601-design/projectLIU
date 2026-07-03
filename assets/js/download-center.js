/**
 * download-center.js — Download Center Engine
 * Enterprise Tutorial Website
 * @namespace TechTutorial
 * @module download-center
 * @version 1.0.0
 *
 * Features:
 *   - Load download data from downloads/data/downloads.json
 *   - Render download cards with metadata (icon, title, version, size, date, downloads)
 *   - Category filtering: All, Software, Firmware, PDF, Source Code
 *   - Search/filter by title or description text (debounced)
 *   - Simulated download counter with localStorage persistence
 *   - Download stats cards (total downloads, total files, latest version)
 *   - Loading skeleton while data loads
 *   - Empty state when no results match
 *   - Toast notification on download click
 *   - Download button animation
 *   - CSP-compatible (no inline handlers, no eval)
 */

(function () {
  'use strict';

  // ──────────────────────────────────────
  // Configuration
  // ──────────────────────────────────────

  /** @type {string} Path to the downloads JSON data file */
  var DATA_URL = 'data/downloads.json';

  /** @type {string} localStorage key prefix for per-item download counts */
  var LS_KEY_PREFIX = 'tt-dl-count-';

  /** @type {string} localStorage key for last download timestamp */
  var LS_LAST_DL_KEY = 'tt-dl-last';

  /** @type {number} Number of skeleton placeholder cards to show */
  var SKELETON_COUNT = 6;

  /** @type {number} Toast auto-dismiss time in milliseconds */
  var TOAST_DURATION = 3500;

  /** @type {number} Download button reset delay in milliseconds */
  var DOWNLOAD_RESET_DELAY = 1800;

  /** @type {number} Search debounce delay in milliseconds */
  var SEARCH_DEBOUNCE = 250;

  // ──────────────────────────────────────
  // Private state
  // ──────────────────────────────────────

  /** @type {Array} Raw download data loaded from JSON */
  var allData = [];

  /** @type {string} Currently active category filter */
  var currentFilter = 'all';

  /** @type {string} Current search query */
  var currentSearch = '';

  /** @type {number} Debounce timer for search input */
  var searchTimer = 0;

  /** @type {boolean} Whether initial data has been loaded */
  var dataLoaded = false;

  // ──────────────────────────────────────
  // DOM references (populated on init)
  // ──────────────────────────────────────

  /** @type {HTMLElement} Download cards grid container */
  var grid = null;

  /** @type {HTMLElement} Filter bar element */
  var filterBar = null;

  /** @type {HTMLInputElement} Search input */
  var searchInput = null;

  /** @type {HTMLElement} Result count display */
  var resultCount = null;

  /** @type {HTMLElement} Empty state container */
  var emptyState = null;

  /** @type {HTMLButtonElement} Clear filters button */
  var clearFiltersBtn = null;

  /** @type {HTMLElement} Toast container */
  var toastContainer = null;

  /** @type {NodeList} All filter buttons */
  var filterButtons = [];

  // Stats card elements
  /** @type {HTMLElement} */
  var statTotalDownloads = null;
  /** @type {HTMLElement} */
  var statTotalFiles = null;
  /** @type {HTMLElement} */
  var statLatestVersion = null;

  // ──────────────────────────────────────
  // Utility helpers
  // ──────────────────────────────────────

  /**
   * Format a number with thousand separators.
   * @param {number} n
   * @returns {string}
   */
  function formatNumber(n) {
    if (n == null || isNaN(n)) { return '0'; }
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Format an ISO date string "YYYY-MM-DD" to a readable format.
   * @param {string} dateStr
   * @returns {string}
   */
  function formatDate(dateStr) {
    if (!dateStr) { return ''; }
    var parts = dateStr.split('-');
    if (parts.length === 3) {
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var m = parseInt(parts[1], 10);
      var d = parseInt(parts[2], 10);
      var y = parts[0];
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return months[m - 1] + ' ' + d + ', ' + y;
      }
    }
    return dateStr;
  }

  /**
   * Get the localized category label.
   * @param {string} cat
   * @returns {string}
   */
  function getCategoryLabel(cat) {
    var labels = {
      'all': '全部',
      'software': '软件',
      'firmware': '固件',
      'pdf': 'PDF',
      'source': '源代码'
    };
    return labels[cat] || cat;
  }

  // ──────────────────────────────────────
  // Category icon SVGs
  // ──────────────────────────────────────

  /**
   * Return an inline SVG string for a given category icon type.
   * @param {string} iconType - One of: software, firmware, pdf, source
   * @returns {string} SVG markup
   */
  function getCategoryIconSVG(iconType) {
    var icons = {
      software: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>' +
                  '<polyline points="3.27 6.96 12 12.01 20.73 6.96"/>' +
                  '<line x1="12" y1="22.08" x2="12" y2="12"/>' +
                '</svg>',

      firmware: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<rect x="6" y="6" width="12" height="12" rx="2"/>' +
                  '<path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M18 9h4M2 15h4M18 15h4"/>' +
                  '<line x1="9" y1="10" x2="9" y2="14"/>' +
                  '<line x1="12" y1="10" x2="12" y2="14"/>' +
                  '<line x1="15" y1="10" x2="15" y2="14"/>' +
                '</svg>',

      pdf: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
             '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>' +
             '<polyline points="14 2 14 8 20 8"/>' +
             '<line x1="12" y1="18" x2="12" y2="12"/>' +
             '<line x1="9" y1="15" x2="15" y2="15"/>' +
           '</svg>',

      source: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<polyline points="16 18 22 12 16 6"/>' +
                '<polyline points="8 6 2 12 8 18"/>' +
                '<line x1="14" y1="4" x2="10" y2="20"/>' +
              '</svg>'
    };
    return icons[iconType] || icons.software;
  }

  // ──────────────────────────────────────
  // localStorage download counter
  // ──────────────────────────────────────

  /**
   * Get the locally tracked download count for an item.
   * @param {string} id - Item ID
   * @returns {number}
   */
  function getLocalDownloadCount(id) {
    try {
      var val = localStorage.getItem(LS_KEY_PREFIX + id);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Increment the locally tracked download count for an item.
   * @param {string} id - Item ID
   * @returns {number} The new count
   */
  function incrementLocalDownloadCount(id) {
    var current = getLocalDownloadCount(id);
    var next = current + 1;
    try {
      localStorage.setItem(LS_KEY_PREFIX + id, next.toString());
    } catch (e) {
      // Storage full or unavailable — silently skip
    }
    // Update last download timestamp
    try {
      localStorage.setItem(LS_LAST_DL_KEY, Date.now().toString());
    } catch (e) {
      // ignore
    }
    return next;
  }

  // ──────────────────────────────────────
  // Stats computation
  // ──────────────────────────────────────

  /**
   * Compute aggregate download statistics.
   * @returns {{ totalDownloads: number, totalFiles: number, latestVersion: string }}
   */
  function computeStats() {
    var totalDownloads = 0;
    var totalFiles = allData.length;
    var latestVersion = '';
    var latestDate = '';

    for (var i = 0; i < allData.length; i++) {
      var item = allData[i];
      var baseDl = item.downloads || 0;
      var localDl = getLocalDownloadCount(item.id);
      totalDownloads += baseDl + localDl;

      // Track most recent version (by date)
      if (item.date && item.date > latestDate) {
        latestDate = item.date;
        latestVersion = item.version || '';
      }
    }

    return {
      totalDownloads: totalDownloads,
      totalFiles: totalFiles,
      latestVersion: latestVersion
    };
  }

  /**
   * Update the stats cards in the DOM.
   */
  function updateStatsCards() {
    var stats = computeStats();

    if (statTotalDownloads) {
      statTotalDownloads.textContent = formatNumber(stats.totalDownloads);
    }
    if (statTotalFiles) {
      statTotalFiles.textContent = formatNumber(stats.totalFiles);
    }
    if (statLatestVersion) {
      statLatestVersion.textContent = stats.latestVersion || '--';
    }
  }

  /**
   * Animate a stats card value with a pop effect.
   * @param {HTMLElement} el
   */
  function animateStatValue(el) {
    if (!el) { return; }
    el.classList.remove('pop');
    // Trigger reflow
    void el.offsetWidth;
    el.classList.add('pop');
  }

  // ──────────────────────────────────────
  // Toast notifications
  // ──────────────────────────────────────

  /**
   * Show a toast notification.
   * @param {string} message - Toast message text
   * @param {string} [type='info'] - Toast type: 'info', 'success', 'error'
   */
  function showToast(message, type) {
    type = type || 'info';

    if (!toastContainer) {
      toastContainer = document.getElementById('toast-container');
    }
    if (!toastContainer) {
      // Create container if missing
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      toastContainer.setAttribute('id', 'toast-container');
      toastContainer.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastContainer);
    }

    var toast = document.createElement('div');
    var typeClass = 'toast-' + type;
    toast.className = 'toast ' + typeClass;
    toast.setAttribute('role', 'status');
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Auto-remove after duration
    var timer = setTimeout(function () {
      dismissToast(toast);
    }, TOAST_DURATION);

    // Click to dismiss early
    toast.addEventListener('click', function () {
      clearTimeout(timer);
      dismissToast(toast);
    });
  }

  /**
   * Dismiss a toast element with fade-out.
   * @param {HTMLElement} toast
   */
  function dismissToast(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';

    var onTransitionEnd = function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      toast.removeEventListener('transitionend', onTransitionEnd);
    };
    toast.addEventListener('transitionend', onTransitionEnd);

    // Fallback cleanup
    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  }

  // ──────────────────────────────────────
  // Loading skeleton
  // ──────────────────────────────────────

  /**
   * Show skeleton loading placeholders.
   */
  function showSkeleton() {
    if (!grid) { return; }
    grid.innerHTML = '';

    for (var i = 0; i < SKELETON_COUNT; i++) {
      var skeletonCard = document.createElement('div');
      skeletonCard.className = 'skeleton-card';
      skeletonCard.setAttribute('aria-hidden', 'true');
      skeletonCard.innerHTML =
        '<div class="skeleton skeleton-icon"></div>' +
        '<div class="skeleton-lines">' +
          '<div class="skeleton skeleton-line" style="width: 65%; height: 16px;"></div>' +
          '<div class="skeleton skeleton-line" style="width: 85%; height: 12px;"></div>' +
          '<div class="skeleton skeleton-line skeleton-line-short" style="height: 12px;"></div>' +
        '</div>' +
        '<div class="skeleton skeleton-btn-placeholder"></div>';
      grid.appendChild(skeletonCard);
    }
  }

  /**
   * Hide the skeleton (clear the grid).
   */
  function hideSkeleton() {
    if (!grid) { return; }
    grid.innerHTML = '';
  }

  // ──────────────────────────────────────
  // Card rendering
  // ──────────────────────────────────────

  /**
   * Create a single download card element.
   * @param {Object} item - Download item data
   * @returns {HTMLElement}
   */
  function createCard(item) {
    var baseDownloads = item.downloads || 0;
    var localDownloads = getLocalDownloadCount(item.id);
    var totalDownloads = baseDownloads + localDownloads;

    var card = document.createElement('div');
    card.className = 'download-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-id', item.id);
    card.setAttribute('data-category', item.category);

    // Icon
    var iconDiv = document.createElement('div');
    iconDiv.className = 'download-icon';
    iconDiv.innerHTML = getCategoryIconSVG(item.icon || 'software');
    iconDiv.setAttribute('aria-hidden', 'true');

    // Info
    var infoDiv = document.createElement('div');
    infoDiv.className = 'download-info';

    var titleEl = document.createElement('h4');
    titleEl.textContent = item.title;

    var descEl = document.createElement('p');
    descEl.className = 'download-desc';
    descEl.textContent = item.description || '';

    var metaDiv = document.createElement('div');
    metaDiv.className = 'download-meta';

    // Version
    var versionSpan = document.createElement('span');
    versionSpan.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' +
                            (item.version || '--');

    // Size
    var sizeSpan = document.createElement('span');
    sizeSpan.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> ' +
                         (item.size || '--');

    // Date
    var dateSpan = document.createElement('span');
    dateSpan.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ' +
                        formatDate(item.date);

    // Downloads counter (will be updated on click)
    var dlStatsSpan = document.createElement('span');
    dlStatsSpan.className = 'download-stats';
    dlStatsSpan.setAttribute('data-dl-id', item.id);
    dlStatsSpan.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> ' +
                           formatNumber(totalDownloads);

    metaDiv.appendChild(versionSpan);
    metaDiv.appendChild(sizeSpan);
    metaDiv.appendChild(dateSpan);
    metaDiv.appendChild(dlStatsSpan);

    infoDiv.appendChild(titleEl);
    infoDiv.appendChild(descEl);
    infoDiv.appendChild(metaDiv);

    // Download button
    var btnDiv = document.createElement('div');
    btnDiv.style.flexShrink = '0';

    var dlBtn = document.createElement('button');
    dlBtn.className = 'btn btn-primary btn-sm download-btn';
    dlBtn.setAttribute('type', 'button');
    dlBtn.setAttribute('aria-label', '下载 ' + item.title);
    dlBtn.innerHTML = '<svg class="btn-icon-dl" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
                      ' <span class="btn-text-dl">下载</span>';

    // Click handler via closure
    dlBtn.addEventListener('click', (function (downloadItem, button, statsSpan) {
      return function (e) {
        e.preventDefault();
        onDownloadClick(downloadItem, button, statsSpan);
      };
    })(item, dlBtn, dlStatsSpan));

    btnDiv.appendChild(dlBtn);

    // Assemble card
    card.appendChild(iconDiv);
    card.appendChild(infoDiv);
    card.appendChild(btnDiv);

    return card;
  }

  // ──────────────────────────────────────
  // Download click handler
  // ──────────────────────────────────────

  /**
   * Handle a download button click.
   * @param {Object} item - Download item data
   * @param {HTMLButtonElement} btn - The clicked button
   * @param {HTMLElement} statsSpan - The download stats span element
   */
  function onDownloadClick(item, btn, statsSpan) {
    // Increment local counter
    var newLocalCount = incrementLocalDownloadCount(item.id);
    var totalDl = (item.downloads || 0) + newLocalCount;

    // Add downloading state to button
    btn.classList.add('downloading');
    btn.setAttribute('aria-busy', 'true');
    var btnTextSpan = btn.querySelector('.btn-text-dl');
    if (btnTextSpan) {
      btnTextSpan.textContent = '下载中...';
    }

    // Animate icon
    var iconEl = btn.querySelector('.btn-icon-dl');
    if (iconEl) {
      // Briefly change to checkmark
      var originalIconHTML = iconEl.outerHTML;
      iconEl.outerHTML = '<svg class="btn-icon-dl" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
    }

    // Update the download stats display on the card
    if (statsSpan) {
      statsSpan.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> ' +
                           formatNumber(totalDl);
      // Brief highlight
      statsSpan.style.color = 'var(--accent)';
      statsSpan.style.fontWeight = '600';
      setTimeout(function () {
        statsSpan.style.color = '';
        statsSpan.style.fontWeight = '';
      }, 1200);
    }

    // Update all stats cards
    updateStatsCards();

    // Show toast
    showToast('下载已开始：' + item.title, 'info');

    // Reset button after delay
    setTimeout(function () {
      btn.classList.remove('downloading');
      btn.removeAttribute('aria-busy');
      if (btnTextSpan) {
        btnTextSpan.textContent = '下载';
      }
      // Restore original download icon
      var currentIcon = btn.querySelector('.btn-icon-dl');
      if (currentIcon) {
        currentIcon.outerHTML = '<svg class="btn-icon-dl" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
      }
    }, DOWNLOAD_RESET_DELAY);
  }

  // ──────────────────────────────────────
  // Filter and search logic
  // ──────────────────────────────────────

  /**
   * Determine if an item matches the current filters.
   * @param {Object} item
   * @returns {boolean}
   */
  function itemMatchesFilter(item) {
    // Category filter
    if (currentFilter !== 'all' && item.category !== currentFilter) {
      return false;
    }

    // Search filter (case-insensitive match on title or description)
    if (currentSearch) {
      var query = currentSearch.toLowerCase();
      var title = (item.title || '').toLowerCase();
      var desc = (item.description || '').toLowerCase();
      if (title.indexOf(query) === -1 && desc.indexOf(query) === -1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Render all download cards into the grid.
   */
  function renderCards() {
    if (!grid) { return; }
    hideSkeleton();

    var visibleItems = [];
    for (var i = 0; i < allData.length; i++) {
      if (itemMatchesFilter(allData[i])) {
        visibleItems.push(allData[i]);
      }
    }

    // Update result count
    if (resultCount) {
      if (visibleItems.length === 0) {
        resultCount.textContent = '';
      } else if (visibleItems.length === allData.length && currentFilter === 'all' && !currentSearch) {
        resultCount.textContent = '共 ' + allData.length + ' 个文件';
      } else {
        resultCount.textContent = '找到 ' + visibleItems.length + ' / ' + allData.length + ' 个文件';
      }
    }

    // Show empty state or render cards
    if (visibleItems.length === 0) {
      if (emptyState) {
        emptyState.style.display = '';
      }
      grid.innerHTML = '';
      return;
    }

    // Hide empty state
    if (emptyState) {
      emptyState.style.display = 'none';
    }

    // Render cards
    grid.innerHTML = '';
    for (var j = 0; j < visibleItems.length; j++) {
      var card = createCard(visibleItems[j]);
      grid.appendChild(card);
    }
  }

  /**
   * Set the active category filter and re-render.
   * @param {string} category
   */
  function setFilter(category) {
    currentFilter = category;

    // Update active button state
    for (var i = 0; i < filterButtons.length; i++) {
      var btn = filterButtons[i];
      var btnCat = btn.getAttribute('data-category');
      if (btnCat === category) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    }

    renderCards();
  }

  /**
   * Handle filter button click.
   * @param {string} category
   */
  function onFilterClick(category) {
    setFilter(category);
  }

  /**
   * Handle search input (debounced).
   */
  function onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      currentSearch = (searchInput.value || '').trim();
      renderCards();
    }, SEARCH_DEBOUNCE);
  }

  /**
   * Handle Escape key in search field.
   * @param {KeyboardEvent} e
   */
  function onSearchKeyDown(e) {
    if (e.key === 'Escape') {
      searchInput.value = '';
      currentSearch = '';
      renderCards();
      searchInput.blur();
    }
  }

  /**
   * Clear all filters and search, re-render.
   */
  function clearAllFilters() {
    currentSearch = '';
    if (searchInput) {
      searchInput.value = '';
    }
    setFilter('all');
  }

  // ──────────────────────────────────────
  // Data loading
  // ──────────────────────────────────────

  /**
   * Fetch download data from JSON and initialize.
   */
  function loadData() {
    showSkeleton();

    fetch(DATA_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }
        return response.json();
      })
      .then(function (data) {
        allData = data || [];
        dataLoaded = true;

        // Update stats
        updateStatsCards();

        // Render cards
        renderCards();

        // Update result count display
        if (resultCount) {
          resultCount.textContent = '共 ' + allData.length + ' 个文件';
        }
      })
      .catch(function (err) {
        console.error('[TT Download Center] Failed to load download data:', err);
        hideSkeleton();

        if (emptyState) {
          emptyState.style.display = '';
          var h3 = emptyState.querySelector('h3');
          var p = emptyState.querySelector('p');
          if (h3) { h3.textContent = '数据加载失败'; }
          if (p) { p.textContent = '请检查网络连接后刷新页面重试'; }
        }

        // Still show stats with zeros
        updateStatsCards();
      });
  }

  // ──────────────────────────────────────
  // Public API
  // ──────────────────────────────────────

  /**
   * Initialize the Download Center component.
   * Call on DOMContentLoaded for the downloads page.
   *
   * Requirements:
   *   - #downloads-grid for the download cards grid
   *   - #filter-bar with .filter-btn children
   *   - #download-search-input for search
   *   - #result-count for result display
   *   - #empty-state for no-results state
   *   - #download-stats-cards with stat card elements
   *   - #toast-container for notifications (auto-created if missing)
   *   - downloads/data/downloads.json as the data source
   *
   * @public
   * @memberof TechTutorial
   */
  function initDownloadCenter() {
    // Grab DOM references
    grid = document.getElementById('downloads-grid');
    filterBar = document.getElementById('filter-bar');
    searchInput = document.getElementById('download-search-input');
    resultCount = document.getElementById('result-count');
    emptyState = document.getElementById('empty-state');
    clearFiltersBtn = document.getElementById('clear-filters-btn');
    toastContainer = document.getElementById('toast-container');

    // Stats card elements
    statTotalDownloads = document.getElementById('stat-total-downloads');
    statTotalFiles = document.getElementById('stat-total-files');
    statLatestVersion = document.getElementById('stat-latest-version');

    // If the grid element is missing, this page doesn't need the download center
    if (!grid) {
      return;
    }

    // Gather filter buttons
    if (filterBar) {
      filterButtons = filterBar.querySelectorAll('.filter-btn');
      [].forEach.call(filterButtons, function (btn) {
        var category = btn.getAttribute('data-category');
        if (!category) { return; }
        btn.addEventListener('click', function () {
          onFilterClick(category);
        });
      });
    }

    // Bind search input
    if (searchInput) {
      searchInput.setAttribute('autocomplete', 'off');
      searchInput.addEventListener('input', onSearchInput);
      searchInput.addEventListener('keydown', onSearchKeyDown);
    }

    // Bind clear filters button
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', function () {
        clearAllFilters();
      });
    }

    // Load data
    loadData();
  }

  // ──────────────────────────────────────
  // Expose to global namespace
  // ──────────────────────────────────────

  window.TechTutorial = window.TechTutorial || {};
  window.TechTutorial.initDownloadCenter = initDownloadCenter;

  // ──────────────────────────────────────
  // Auto-initialize when DOM is ready
  // ──────────────────────────────────────

  function autoInit() {
    if (document.getElementById('downloads-grid')) {
      initDownloadCenter();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    // DOM already loaded (deferred script)
    autoInit();
  }

})();
