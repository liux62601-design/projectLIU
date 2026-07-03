/**
 * pwa.js — PWA Install Prompt and Service Worker Registration
 * Enterprise Tutorial Website
 * @namespace TechTutorial
 * @module pwa
 * @version 2.0.0
 *
 * Features:
 *   - Service Worker registration with proper scope detection
 *   - Update detection and notification when new SW is waiting
 *   - BeforeInstallPrompt event capture for custom install UI
 *   - Install/dismiss handling with session-aware state
 *   - appinstalled event listener for install confirmation
 *   - Standalone display-mode detection (already installed check)
 *   - CSP-compatible: no inline handlers, no innerHTML with scripts
 */

(function () {
    'use strict';

    // ──────────────────────────────────────
    // Private state
    // ──────────────────────────────────────

    /** @type {BeforeInstallPromptEvent|null} Stored install prompt event */
    var deferredPrompt = null;

    /** @type {boolean} Whether the user has dismissed the prompt this session */
    var installPromptDismissed = false;

    /** @type {HTMLElement|null} The install prompt element */
    var installPromptEl = null;

    /** @type {HTMLElement|null} The install button */
    var installBtn = null;

    /** @type {HTMLElement|null} The dismiss button */
    var dismissBtn = null;

    /** @type {ServiceWorkerRegistration|null} Active SW registration */
    var swRegistration = null;

    // Session storage key for tracking dismissal
    var DISMISS_KEY = 'pwa-install-dismissed';

    // ──────────────────────────────────────
    // Service Worker Registration
    // ──────────────────────────────────────

    /**
     * Determine the correct service worker scope.
     * Handles deployment at subdirectories (e.g., GitHub Pages project sites).
     * @returns {{ swUrl: string, scope: string }}
     */
    function getSWConfig() {
        var pathname = window.location.pathname;
        // Remove trailing filename if present (e.g., /page/index.html → /page/)
        var basePath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
        // Build full SW URL
        var swUrl = new URL('sw.js', window.location.origin + basePath).href;
        // Scope is the directory containing sw.js
        var scope = basePath;

        return { swUrl: swUrl, scope: scope };
    }

    /**
     * Register the service worker.
     */
    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('[PWA] Service workers are not supported in this browser.');
            return Promise.resolve(null);
        }

        var config = getSWConfig();

        return navigator.serviceWorker.register(config.swUrl, { scope: config.scope })
            .then(function (registration) {
                swRegistration = registration;
                console.log('[PWA] Service Worker registered. Scope:', registration.scope);

                // If there's already an installing worker (update in progress)
                if (registration.installing) {
                    console.log('[PWA] Service Worker installing...');
                    trackInstalling(registration.installing, registration);
                }

                // If a waiting worker exists (update ready to activate)
                if (registration.waiting) {
                    console.log('[PWA] Service Worker update waiting to activate.');
                    showUpdateNotification(registration);
                }

                // Listen for future updates
                registration.addEventListener('updatefound', function () {
                    var newWorker = registration.installing;
                    if (!newWorker) return;
                    console.log('[PWA] New Service Worker found.');
                    trackInstalling(newWorker, registration);
                });

                return registration;
            })
            .catch(function (error) {
                console.warn('[PWA] Service Worker registration failed:', error.message || error);
                return null;
            });
    }

    /**
     * Track a service worker through its installation lifecycle.
     * @param {ServiceWorker} worker
     * @param {ServiceWorkerRegistration} registration
     */
    function trackInstalling(worker, registration) {
        worker.addEventListener('statechange', function () {
            switch (worker.state) {
                case 'installed':
                    console.log('[PWA] Service Worker installed.');
                    if (navigator.serviceWorker.controller) {
                        // A new version is available (not first install)
                        console.log('[PWA] New content available — refresh to update.');
                        showUpdateNotification(registration);
                    } else {
                        // First install — content is now available offline
                        console.log('[PWA] Content cached for offline use.');
                    }
                    break;
                case 'activated':
                    console.log('[PWA] Service Worker activated.');
                    break;
                case 'redundant':
                    console.log('[PWA] Service Worker became redundant.');
                    break;
                default:
                    break;
            }
        });
    }

    /**
     * Show an update-available notification using a toast element.
     * @param {ServiceWorkerRegistration} registration
     */
    function showUpdateNotification(registration) {
        var container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.className = 'toast toast--info';
        toast.setAttribute('role', 'alert');

        // Text node for the message
        var messageText = document.createTextNode('A new version is available. ');

        // Refresh button
        var refreshBtn = document.createElement('button');
        refreshBtn.className = 'btn btn--sm btn--primary';
        refreshBtn.textContent = 'Refresh';
        refreshBtn.setAttribute('type', 'button');
        refreshBtn.addEventListener('click', function () {
            // Tell the waiting SW to skip waiting and activate immediately
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            window.location.reload();
        });

        toast.appendChild(messageText);
        toast.appendChild(refreshBtn);
        container.appendChild(toast);

        // Auto-dismiss after 12 seconds
        var dismissTimer = setTimeout(function () {
            dismissToast(toast);
        }, 12000);

        // Store timer reference for cleanup
        toast._dismissTimer = dismissTimer;
    }

    /**
     * Remove a toast element with fade animation.
     * @param {HTMLElement} toast
     */
    function dismissToast(toast) {
        if (toast._dismissTimer) {
            clearTimeout(toast._dismissTimer);
        }
        toast.classList.add('toast--hiding');
        var onEnd = function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            toast.removeEventListener('transitionend', onEnd);
        };
        toast.addEventListener('transitionend', onEnd);
        // Fallback removal
        setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 600);
    }

    // ──────────────────────────────────────
    // Install Prompt
    // ──────────────────────────────────────

    /**
     * Restore the install-prompt dismissal state from session storage.
     */
    function restoreDismissalState() {
        try {
            if (sessionStorage.getItem(DISMISS_KEY) === 'true') {
                installPromptDismissed = true;
            }
        } catch (e) {
            // sessionStorage unavailable (e.g., privacy mode in some browsers)
            installPromptDismissed = false;
        }
    }

    /**
     * Persist the dismissal state to session storage.
     */
    function persistDismissal() {
        try {
            sessionStorage.setItem(DISMISS_KEY, 'true');
        } catch (e) {
            // Silently ignore
        }
    }

    /**
     * Check if the app is already running in standalone mode (installed).
     * @returns {boolean}
     */
    function isStandalone() {
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
            return true;
        }
        // Fallback for iOS
        if (navigator.standalone !== undefined && navigator.standalone) {
            return true;
        }
        return false;
    }

    /**
     * Show the custom install prompt.
     */
    function showInstallPrompt() {
        if (!installPromptEl || installPromptDismissed) return;

        // Don't show if already installed
        if (isStandalone()) {
            installPromptDismissed = true;
            return;
        }

        // Small delay to let the page finish loading
        setTimeout(function () {
            if (installPromptDismissed) return;
            installPromptEl.classList.add('show');
            installPromptEl.setAttribute('aria-hidden', 'false');
        }, 3000);
    }

    /**
     * Hide the custom install prompt.
     */
    function hideInstallPrompt() {
        if (!installPromptEl) return;
        installPromptEl.classList.remove('show');
        installPromptEl.setAttribute('aria-hidden', 'true');
    }

    /**
     * Handle the install button click.
     */
    function onInstallClick() {
        if (!deferredPrompt) {
            console.log('[PWA] Install prompt not available. The app may already be installed.');
            hideInstallPrompt();
            return;
        }

        // Show the native install prompt
        deferredPrompt.prompt();

        // Wait for user choice
        deferredPrompt.userChoice.then(function (choiceResult) {
            console.log('[PWA] User install choice:', choiceResult.outcome);
            deferredPrompt = null;
            hideInstallPrompt();

            if (choiceResult.outcome === 'accepted') {
                installPromptDismissed = true;
                persistDismissal();
            }
        });
    }

    /**
     * Handle the dismiss button click.
     */
    function onDismissClick() {
        installPromptDismissed = true;
        persistDismissal();
        hideInstallPrompt();
      deferredPrompt = null;
    }

    /**
     * Initialize the install prompt system.
     * Binds the beforeinstallprompt event, install/dismiss buttons, and appinstalled.
     */
    function initInstallPrompt() {
        // Cache DOM elements
        installPromptEl = document.querySelector('.pwa-install-prompt');
        installBtn = document.querySelector('.pwa-install-btn');
        dismissBtn = document.querySelector('.pwa-dismiss-btn');

        // Restore session state
        restoreDismissalState();

        // Already installed check
        if (isStandalone()) {
            console.log('[PWA] App is running in standalone mode (already installed).');
            installPromptDismissed = true;
        }

        // Capture the beforeinstallprompt event (fired by Chrome/Edge)
        window.addEventListener('beforeinstallprompt', function (event) {
            // Prevent the default mini-infobar from appearing
            event.preventDefault();

            // Store the event for later use
            deferredPrompt = event;

            console.log('[PWA] beforeinstallprompt captured. App is installable.');

            // Show our custom prompt
            showInstallPrompt();
        });

        // Bind install button
        if (installBtn) {
            installBtn.addEventListener('click', onInstallClick);
        }

        // Bind dismiss button
        if (dismissBtn) {
            dismissBtn.addEventListener('click', onDismissClick);
        }

        // Listen for successful installation
        window.addEventListener('appinstalled', function () {
            console.log('[PWA] App was successfully installed.');
            deferredPrompt = null;
            installPromptDismissed = true;
            persistDismissal();
            hideInstallPrompt();
        });

        // Listen for changes to display mode (e.g., user uninstalls, then revisits)
        if (window.matchMedia) {
            var displayModeQuery = window.matchMedia('(display-mode: standalone)');
            // Use the modern addEventListener API
            if (displayModeQuery.addEventListener) {
                displayModeQuery.addEventListener('change', function (e) {
                    if (e.matches) {
                        hideInstallPrompt();
                    }
                });
            }
        }
    }

    // ──────────────────────────────────────
    // Periodic SW update checks
    // ──────────────────────────────────────

    /**
     * Periodically check for service worker updates.
     * Called every ~60 minutes when the page is open.
     */
    function startPeriodicUpdates() {
        if (!navigator.serviceWorker || !swRegistration) return;

        // Check for updates every 60 minutes
        setInterval(function () {
            if (swRegistration) {
                swRegistration.update().catch(function (err) {
                    // Network errors are expected when offline
                    if (err.name !== 'TypeError') {
                        console.warn('[PWA] SW update check failed:', err.message || err);
                    }
                });
            }
        }, 60 * 60 * 1000);
    }

    // ──────────────────────────────────────
    // Online/Offline detection
    // ──────────────────────────────────────

    /**
     * Listen for connectivity changes and notify the user.
     */
    function initConnectivityDetection() {
        function showOnlineStatus(isOnline) {
            var statusEl = document.querySelector('.connectivity-status');
            if (!statusEl) {
                statusEl = document.createElement('div');
                statusEl.className = 'connectivity-status';
                statusEl.setAttribute('aria-live', 'polite');
                document.body.appendChild(statusEl);
            }

            if (isOnline) {
                statusEl.textContent = 'Back online';
                statusEl.className = 'connectivity-status connectivity-status--online';
                setTimeout(function () {
                    statusEl.classList.add('connectivity-status--hide');
                }, 3000);
            } else {
                statusEl.textContent = 'You are offline. Some features may be limited.';
                statusEl.className = 'connectivity-status connectivity-status--offline';
                statusEl.classList.remove('connectivity-status--hide');
            }
        }

        window.addEventListener('online', function () {
            showOnlineStatus(true);
            // Re-check for SW updates when coming back online
            if (swRegistration) {
                swRegistration.update();
            }
        });

        window.addEventListener('offline', function () {
            showOnlineStatus(false);
        });
    }

    // ──────────────────────────────────────
    // Public API
    // ──────────────────────────────────────

    /**
     * Initialize all PWA features.
     * Call on DOMContentLoaded or as early as possible.
     *
     * Features initialized:
     *   1. Service Worker registration with update lifecycle
     *   2. Custom install prompt (beforeinstallprompt)
     *   3. Install/dismiss button handlers
     *   4. appinstalled event listener
     *   5. Standalone mode detection
     *   6. Periodic SW update checks
     *   7. Online/offline connectivity status
     *
     * @public
     * @memberof TechTutorial
     * @returns {Promise} Resolves when SW registration completes
     */
    function initPWA() {
        // Register the service worker first
        return registerServiceWorker().then(function (reg) {
            swRegistration = reg;

            // Initialize install prompt UI
            initInstallPrompt();

            // Start periodic SW update checks
            startPeriodicUpdates();

            // Monitor connectivity
            initConnectivityDetection();

            return reg;
        });
    }

    // ──────────────────────────────────────
    // Expose to global namespace
    // ──────────────────────────────────────

    window.TechTutorial = window.TechTutorial || {};
    window.TechTutorial.initPWA = initPWA;

})();
