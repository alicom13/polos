/*!
 * Polos v1.1 - Display Helper Utilities
 * Features: Responsive display control, No dependencies
 * Copyright 2025 Polos Style
 * Licensed under MIT (https://github.com/alicom13/polos)
 */
(function() {
    'use strict';
    
    // Responsive Display Helpers
    function applyDisplayHelpers() {
        const isLargeScreen = window.matchMedia('(min-width: 768px)').matches;
        const isMediumScreen = window.matchMedia('(576px <= width <= 767.98px)').matches;
        const isSmallScreen = window.matchMedia('(max-width: 575.98px)').matches;
        
        // Helper function to set display
        function setDisplay(selector, displayValue) {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = displayValue;
            });
        }
        
        // Large screens
        if (isLargeScreen) {
            setDisplay('.t-tl', 'block');
            setDisplay('.s-sl', 'none');
        }
        
        // Medium screens
        if (isMediumScreen) {
            setDisplay('.t-tm', 'block');
            setDisplay('.s-sm', 'none');
        }
        
        // Small screens
        if (isSmallScreen) {
            setDisplay('.t-ts', 'block');
            setDisplay('.s-ss', 'none');
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    function initialize() {
        console.log('Polos Display Helpers Loaded');
        
        // Run on load
        applyDisplayHelpers();
        
        // Run on resize with debounce
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(applyDisplayHelpers, 100);
        });
    }
    
    // Public API for manual control
    window.Polos = {
        // Refresh display helpers
        refresh: function() {
            applyDisplayHelpers();
        },
        
        // Check current screen size
        getScreenSize: function() {
            if (window.matchMedia('(min-width: 768px)').matches) return 'large';
            if (window.matchMedia('(576px <= width <= 767.98px)').matches) return 'medium';
            if (window.matchMedia('(max-width: 575.98px)').matches) return 'small';
            return 'unknown';
        },
        
        // Manual display control
        show: function(selector) {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'block';
            });
        },
        
        hide: function(selector) {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
            });
        },
        
        // Responsive show/hide
        showOn: function(selector, breakpoint) {
            const mediaQueries = {
                'large': '(min-width: 768px)',
                'medium': '(576px <= width <= 767.98px)',
                'small': '(max-width: 575.98px)'
            };
            
            if (window.matchMedia(mediaQueries[breakpoint]).matches) {
                this.show(selector);
            }
        },
        
        hideOn: function(selector, breakpoint) {
            const mediaQueries = {
                'large': '(min-width: 768px)',
                'medium': '(576px <= width <= 767.98px)',
                'small': '(max-width: 575.98px)'
            };
            
            if (window.matchMedia(mediaQueries[breakpoint]).matches) {
                this.hide(selector);
            }
        }
    };
})();
