// main.js
// Generic helper functions for the AHELP website.

// Toggles the dark mode class on the document and persists the setting in localStorage.
function updateDarkMode(isDark) {
    const doc = document.documentElement;
    const body = document.body;
    if (isDark) {
        doc.classList.add('dark-mode');
        body.classList.add('dark-mode');
    } else {
        doc.classList.remove('dark-mode');
        body.classList.remove('dark-mode');
    }
}

// Initialise dark mode based on localStorage and set up the toggle button.
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Read the user's preference from localStorage. Defaults to false.
        const isDarkStored = localStorage.getItem('darkMode') === 'true';
        updateDarkMode(isDarkStored);
    } catch (e) {
        // If we can't access localStorage (e.g. privacy mode), fall back to no dark mode.
        updateDarkMode(false);
    }
    const toggleButton = document.getElementById('dark-mode-toggle');
    if (toggleButton) {
        // Reflect the initial state on the icon. We use a moon/sun emoji for simplicity.
        const iconSpan = document.getElementById('dark-mode-icon');
        const refreshIcon = (dark) => {
            if (iconSpan) {
                iconSpan.textContent = dark ? '☀️' : '🌙';
            }
        };
        // Set the initial icon.
        refreshIcon(document.body.classList.contains('dark-mode'));
        toggleButton.addEventListener('click', () => {
            const currentlyDark = document.body.classList.contains('dark-mode');
            const newState = !currentlyDark;
            updateDarkMode(newState);
            try {
                localStorage.setItem('darkMode', newState);
            } catch (e) {
                // Ignore if localStorage isn't available.
            }
            refreshIcon(newState);
        });
    }
});

/*
 * Update navigation displays for user name and points.
 * Any element with class `nav-user-name` will be populated with the
 * current user's name (taken from `ahelpUserName` in localStorage).
 * Any element with class `nav-points` will display the current
 * accumulated points (stored in `userPoints`).
 * This function is idempotent and can be safely called multiple times.
 */
function updateNavInfo() {
    try {
        let name = 'Guest';
        let points = 0;
        
        try {
            const storedName = localStorage.getItem('ahelpUserName');
            if (storedName?.trim().length > 0) {
                name = storedName.trim();
            }
        } catch (e) {
            logError(e, 'Reading username');
        }
        
        try {
            const storedPoints = parseInt(localStorage.getItem('userPoints'));
            if (!isNaN(storedPoints)) {
                points = storedPoints;
            }
        } catch (e) {
            logError(e, 'Reading points');
        }

        // Update with accessibility improvements
        document.querySelectorAll('.nav-user-name').forEach(elem => {
            elem.textContent = name;
            elem.setAttribute('aria-label', `Current user: ${name}`);
        });

        document.querySelectorAll('.nav-points').forEach(elem => {
            elem.textContent = points;
            elem.setAttribute('aria-label', `Current points: ${points}`);
        });
    } catch (e) {
        logError(e, 'UpdateNavInfo');
    }
}

// Add error logging
function logError(error, context = '') {
    console.error(`[AHELP Error] ${context}:`, error);
    // Could be extended to send to error tracking service
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// CSRF token handling
function getCSRFToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
}

// Session management
function checkSession() {
    const lastActivity = localStorage.getItem('lastActivity');
    const now = Date.now();
    if (lastActivity && (now - parseInt(lastActivity)) > 30 * 60 * 1000) { // 30 minutes
        // Session expired
        window.location.href = '/login.html';
        return false;
    }
    localStorage.setItem('lastActivity', now.toString());
    return true;
}

// Input validation
function validateInput(value, type) {
    const patterns = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^\d{10}$/,
        username: /^[a-zA-Z0-9_]{3,20}$/
    };
    return patterns[type]?.test(value) ?? true;
}

// Debounced version of updateNavInfo for performance
const debouncedUpdateNav = debounce(updateNavInfo, 250);

// Enhanced event listeners with session check
document.addEventListener('DOMContentLoaded', () => {
    if (checkSession()) {
        updateNavInfo();
        // Check session every minute
        setInterval(checkSession, 60000);
    }
});

// Add visibility change handler to refresh data
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && checkSession()) {
        debouncedUpdateNav();
    }
});

// Analytics tracking
function trackEvent(category, action, label = '') {
    try {
        if (window.gtag) {
            gtag('event', action, {
                'event_category': category,
                'event_label': label
            });
        }
    } catch (e) {
        logError(e, 'Analytics');
    }
}

// User preferences management
const UserPreferences = {
    get: (key, defaultValue) => {
        try {
            const value = localStorage.getItem(`pref_${key}`);
            return value !== null ? JSON.parse(value) : defaultValue;
        } catch (e) {
            logError(e, 'PreferencesGet');
            return defaultValue;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(`pref_${key}`, JSON.stringify(value));
            return true;
        } catch (e) {
            logError(e, 'PreferencesSet');
            return false;
        }
    }
};

// Keyboard accessibility helpers
function handleKeyboardNavigation(event) {
    if (event.key === 'Escape') {
        // Close any open modals/dropdowns
        document.querySelectorAll('[data-modal]').forEach(modal => 
            modal.classList.add('hidden')
        );
    }
}

// Add keyboard event listener
document.addEventListener('keydown', handleKeyboardNavigation);

// Export utilities for use in other scripts
window.AHELP = {
    validateInput,
    getCSRFToken,
    checkSession,
    logError,
    debounce,
    trackEvent,
    UserPreferences,
    handleKeyboardNavigation
};

// Initialize analytics tracking for important user actions
document.addEventListener('DOMContentLoaded', () => {
    // Track dark mode changes
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            trackEvent('Preferences', 'Toggle Dark Mode');
        });
    }
});