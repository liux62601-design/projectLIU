/**
 * contact.js — Contact Form Validation and Submission
 * Enterprise Tutorial Website
 * @namespace TechTutorial
 * @module contact
 * @version 1.0.0
 *
 * Features:
 *   - Client-side validation: name, email, subject, message
 *   - Inline error display with .error-msg spans and .form-group.error
 *   - Error clearing on input focus
 *   - Loading state on submit button during simulated send
 *   - Configurable endpoint (default: console log + success toast)
 *   - Toast notifications via .toast-container
 *   - CSP-compatible (no inline handlers, no eval)
 */

(function () {
    'use strict';

    // ──────────────────────────────────────
    // Configuration
    // ──────────────────────────────────────

    /**
     * The form submission endpoint.
     * Set to a Formspree URL or similar service to enable real submission.
     * Leave empty to simulate submission (log to console, show success toast).
     * @type {string}
     */
    var SUBMIT_ENDPOINT = '';

    /** @type {number} Simulated send delay in milliseconds */
    var SIMULATE_DELAY = 1500;

    /** @type {number} Toast auto-dismiss time in milliseconds */
    var TOAST_DURATION = 4000;

    /** @type {number} Minimum message length */
    var MESSAGE_MIN_LENGTH = 10;

    /** @type {number} Minimum name length */
    var NAME_MIN_LENGTH = 2;

    // ──────────────────────────────────────
    // Private state
    // ──────────────────────────────────────

    /** @type {HTMLFormElement|null} The contact form */
    var form = null;

    /** @type {HTMLButtonElement|null} Submit button */
    var submitBtn = null;

    /** @type {string} Original button text, saved for restore */
    var originalBtnText = '';

    /** @type {HTMLElement|null} Toast container */
    var toastContainer = null;

    // ──────────────────────────────────────
    // Validation regex
    // ──────────────────────────────────────

    /**
     * RFC 5322 simplified email regex.
     * Covers the vast majority of real-world email addresses.
     */
    var EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

    // ──────────────────────────────────────
    // Error display
    // ──────────────────────────────────────

    /**
     * Show an error message for a form field.
     * @param {HTMLElement} field - The input/textarea element
     * @param {string} message - Error message text
     */
    function showError(field, message) {
        // Find the parent .form-group
        var group = field.closest('.form-group');
        if (!group) {
            return;
        }

        // Add error class to group
        group.classList.add('error');

        // Find or create .error-msg span
        var errorSpan = group.querySelector('.error-msg');
        if (!errorSpan) {
            errorSpan = document.createElement('span');
            errorSpan.className = 'error-msg';
            errorSpan.setAttribute('role', 'alert');
            group.appendChild(errorSpan);
        }
        errorSpan.textContent = message;

        // Add aria-invalid to the field
        field.setAttribute('aria-invalid', 'true');

        // Add aria-describedby linking to the error
        if (!errorSpan.id) {
            errorSpan.id = 'error-' + (field.name || field.id || Math.random().toString(36).slice(2, 9));
        }
        field.setAttribute('aria-describedby', errorSpan.id);
    }

    /**
     * Clear error state for a form field.
     * @param {HTMLElement} field - The input/textarea element
     */
    function clearError(field) {
        var group = field.closest('.form-group');
        if (!group) {
            return;
        }

        group.classList.remove('error');

        var errorSpan = group.querySelector('.error-msg');
        if (errorSpan) {
            errorSpan.textContent = '';
        }

        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
    }

    /**
     * Clear all errors on the form.
     */
    function clearAllErrors() {
        var groups = form.querySelectorAll('.form-group');
        [].forEach.call(groups, function (group) {
            group.classList.remove('error');
            var errorSpan = group.querySelector('.error-msg');
            if (errorSpan) {
                errorSpan.textContent = '';
            }
        });

        var fields = form.querySelectorAll('input, textarea, select');
        [].forEach.call(fields, function (field) {
            field.removeAttribute('aria-invalid');
            field.removeAttribute('aria-describedby');
        });
    }

    // ──────────────────────────────────────
    // Validation
    // ──────────────────────────────────────

    /**
     * Validate the entire form.
     * @returns {boolean} True if all fields are valid
     */
    function validateForm() {
        var isValid = true;

        // Name validation
        var nameField = form.querySelector('[name="name"]');
        if (nameField) {
            var nameVal = (nameField.value || '').trim();
            if (!nameVal) {
                showError(nameField, 'Name is required.');
                isValid = false;
            } else if (nameVal.length < NAME_MIN_LENGTH) {
                showError(nameField, 'Name must be at least ' + NAME_MIN_LENGTH + ' characters.');
                isValid = false;
            } else {
                clearError(nameField);
            }
        }

        // Email validation
        var emailField = form.querySelector('[name="email"]');
        if (emailField) {
            var emailVal = (emailField.value || '').trim();
            if (!emailVal) {
                showError(emailField, 'Email address is required.');
                isValid = false;
            } else if (!EMAIL_REGEX.test(emailVal)) {
                showError(emailField, 'Please enter a valid email address.');
                isValid = false;
            } else {
                clearError(emailField);
            }
        }

        // Subject validation
        var subjectField = form.querySelector('[name="subject"]');
        if (subjectField) {
            var subjectVal = (subjectField.value || '').trim();
            if (!subjectVal) {
                showError(subjectField, 'Subject is required.');
                isValid = false;
            } else {
                clearError(subjectField);
            }
        }

        // Message validation
        var messageField = form.querySelector('[name="message"]');
        if (messageField) {
            var messageVal = (messageField.value || '').trim();
            if (!messageVal) {
                showError(messageField, 'Message is required.');
                isValid = false;
            } else if (messageVal.length < MESSAGE_MIN_LENGTH) {
                showError(messageField, 'Message must be at least ' + MESSAGE_MIN_LENGTH + ' characters.');
                isValid = false;
            } else {
                clearError(messageField);
            }
        }

        return isValid;
    }

    // ──────────────────────────────────────
    // Toast notifications
    // ──────────────────────────────────────

    /**
     * Ensure the toast container exists in the DOM.
     */
    function ensureToastContainer() {
        toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            toastContainer.setAttribute('aria-live', 'polite');
            toastContainer.setAttribute('aria-atomic', 'true');
            document.body.appendChild(toastContainer);
        }
    }

    /**
     * Show a toast notification.
     * @param {'success'|'error'|'info'} type - Toast type
     * @param {string} message - Toast message
     */
    function showToast(type, message) {
        ensureToastContainer();

        var toast = document.createElement('div');
        toast.className = 'toast toast--' + type;
        toast.setAttribute('role', 'status');
        toast.textContent = message;

        // Add to container
        toastContainer.appendChild(toast);

        // Trigger reflow for CSS transition
        // eslint-disable-next-line no-unused-expressions
        toast.offsetHeight;
        toast.classList.add('toast--visible');

        // Auto-remove after duration
        var timer = setTimeout(function () {
            dismissToast(toast);
        }, TOAST_DURATION);

        // Click to dismiss early
        toast.addEventListener('click', function () {
            clearTimeout(timer);
            dismissToast(toast);
        });

        // Store timer on element for cleanup
        toast._dismissTimer = timer;
    }

    /**
     * Dismiss a toast element with fade-out animation.
     * @param {HTMLElement} toast
     */
    function dismissToast(toast) {
        toast.classList.remove('toast--visible');
        toast.classList.add('toast--hiding');

        // Remove from DOM after transition
        var onTransitionEnd = function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            toast.removeEventListener('transitionend', onTransitionEnd);
        };

        toast.addEventListener('transitionend', onTransitionEnd);

        // Fallback: remove after 500ms if transitionend doesn't fire
        setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 600);
    }

    // ──────────────────────────────────────
    // Form submission
    // ──────────────────────────────────────

    /**
     * Set the button to loading state.
     */
    function setLoadingState() {
        if (!submitBtn) {
            return;
        }
        originalBtnText = submitBtn.textContent || 'Submit';
        submitBtn.textContent = submitBtn.getAttribute('data-loading-text') || 'Sending...';
        submitBtn.disabled = true;
        submitBtn.classList.add('btn--loading');
        submitBtn.setAttribute('aria-busy', 'true');
    }

    /**
     * Restore the button from loading state.
     */
    function resetLoadingState() {
        if (!submitBtn) {
            return;
        }
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn--loading');
        submitBtn.removeAttribute('aria-busy');
    }

    /**
     * Gather form data as a plain object.
     * @returns {Object}
     */
    function gatherFormData() {
        var data = {};
        var fields = form.querySelectorAll('input[name], textarea[name], select[name]');
        [].forEach.call(fields, function (field) {
            if (field.type === 'checkbox') {
                data[field.name] = field.checked;
            } else if (field.type === 'radio') {
                if (field.checked) {
                    data[field.name] = field.value;
                }
            } else {
                data[field.name] = field.value;
            }
        });
        return data;
    }

    /**
     * Submit the form to the configured endpoint or simulate.
     * @param {Object} formData
     */
    function submitForm(formData) {
        if (SUBMIT_ENDPOINT) {
            // Real submission via fetch
            fetch(SUBMIT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error('Server responded with ' + response.status);
                    }
                    return response.json();
                })
                .then(function () {
                    onSubmissionSuccess();
                })
                .catch(function (err) {
                    onSubmissionError(err);
                });
        } else {
            // Simulated submission
            console.log('[TechTutorial Contact] Form data:', formData);

            setTimeout(function () {
                onSubmissionSuccess();
            }, SIMULATE_DELAY);
        }
    }

    /**
     * Handle successful submission.
     */
    function onSubmissionSuccess() {
        resetLoadingState();
        showToast('success', 'Thank you! Your message has been sent successfully.');
        form.reset();
        clearAllErrors();
    }

    /**
     * Handle submission error.
     * @param {Error} err
     */
    function onSubmissionError(err) {
        resetLoadingState();
        console.error('[TechTutorial Contact] Submission error:', err);
        showToast('error', 'Something went wrong. Please try again later.');
    }

    // ──────────────────────────────────────
    // Event handlers
    // ──────────────────────────────────────

    /**
     * Handle form submit event.
     * @param {Event} e
     */
    function onSubmit(e) {
        e.preventDefault();

        if (!validateForm()) {
            // Focus the first invalid field
            var firstInvalid = form.querySelector('.form-group.error input, .form-group.error textarea, .form-group.error select');
            if (firstInvalid) {
                firstInvalid.focus();
            }
            return;
        }

        setLoadingState();
        var formData = gatherFormData();
        submitForm(formData);
    }

    /**
     * Handle focus on a form field — clear its error.
     * @param {Event} e
     */
    function onFieldFocus(e) {
        clearError(e.target);
    }

    /**
     * Handle blur on a form field — validate that single field.
     * @param {Event} e
     */
    function onFieldBlur(e) {
        var field = e.target;

        // Only validate if the field has a value (don't show required errors on blur)
        if (!field.value || !field.value.trim()) {
            return;
        }

        if (field.name === 'email' && field.value.trim()) {
            if (!EMAIL_REGEX.test(field.value.trim())) {
                showError(field, 'Please enter a valid email address.');
            }
        }

        if (field.name === 'message' && field.value.trim()) {
            if (field.value.trim().length < MESSAGE_MIN_LENGTH) {
                showError(field, 'Message must be at least ' + MESSAGE_MIN_LENGTH + ' characters.');
            }
        }

        if (field.name === 'name' && field.value.trim()) {
            if (field.value.trim().length < NAME_MIN_LENGTH) {
                showError(field, 'Name must be at least ' + NAME_MIN_LENGTH + ' characters.');
            }
        }
    }

    // ──────────────────────────────────────
    // Public API
    // ──────────────────────────────────────

    /**
     * Initialize the contact form component.
     * Call on DOMContentLoaded.
     *
     * Requirements:
     *   - A <form> with class or ID containing 'contact'
     *   - Fields with name="name", name="email", name="subject", name="message"
     *   - .form-group wrappers around each field for error display
     *   - Optional .toast-container in the DOM (auto-created if absent)
     *
     * Configuration:
     *   Set SUBMIT_ENDPOINT inside this module to a real endpoint URL
     *   (e.g., 'https://formspree.io/f/your-form-id') to enable real submission.
     *
     * @public
     * @memberof TechTutorial
     */
    function initContact() {
        // Find the form
        form = document.querySelector('.contact-form') ||
               document.querySelector('#contact-form') ||
               document.querySelector('form[data-contact]');

        if (!form) {
            console.warn('[TechTutorial Contact] No contact form found in the DOM.');
            return;
        }

        // Find submit button
        submitBtn = form.querySelector('[type="submit"]') ||
                    form.querySelector('button[type="submit"]') ||
                    form.querySelector('.btn--submit');

        // Ensure form has novalidate to use our custom validation
        form.setAttribute('novalidate', '');

        // Bind submit handler
        form.addEventListener('submit', onSubmit);

        // Bind per-field validation handlers
        var fields = form.querySelectorAll('input[name], textarea[name], select[name]');
        [].forEach.call(fields, function (field) {
            field.addEventListener('focus', onFieldFocus);
            field.addEventListener('blur', onFieldBlur);
        });

        // Ensure toast container exists
        ensureToastContainer();
    }

    // ──────────────────────────────────────
    // Expose to global namespace
    // ──────────────────────────────────────

    window.TechTutorial = window.TechTutorial || {};
    window.TechTutorial.initContact = initContact;

})();
