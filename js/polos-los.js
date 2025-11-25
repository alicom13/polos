/*!
 * Polos v1.2 - Enhanced JavaScript Utilities
 * Features: Grid Management, Component Enhancement, State Management, Event System
 * Integrated with: Grid System, Page System, Box System, Display Helpers
 * Copyright 2025 Polos Style
 * Licensed under MIT (https://github.com/alicom13/polos)
 */

(function() {
    'use strict';
    
    // Configuration integrated with CSS systems
    const config = {
        breakpoints: {
            small: '(max-width: 575.98px)',
            medium: '(576px <= width <= 767.98px)', 
            large: '(min-width: 768px)'
        },
        selectors: {
            // Grid System
            grid: '.rw',
            gridItem: '.rw > *',
            autoColumn: '.c-auto',
            
            // Page System
            page: '.lmn',
            pageHeader: '.lmn-hd',
            pageBody: '.lmn-bd',
            pageFooter: '.lmn-ft',
            
            // Box System
            boxContainer: '.pl-box',
            boxItem: '.bx-itm',
            
            // Alignment System
            alignment: '[class*="pt-"]'
        },
        classes: {
            // State management
            loading: 'lmn-loading',
            interactive: 'js-interactive',
            enhanced: 'data-polos-enhanced',
            
            // Display helpers
            responsive: {
                show: ['t-tl', 't-tm', 't-ts'],
                hide: ['s-sl', 's-sm', 's-ss']
            },
            
            // Grid columns
            gridColumns: {
                large: ['cl-1', 'cl-2', 'cl-3', 'cl-4', 'cl-5', 'cl-6', 'cl-7', 'cl-8', 'cl-9', 'cl-10', 'cl-11', 'cl-12'],
                medium: ['cm-1', 'cm-2', 'cm-3', 'cm-4', 'cm-5', 'cm-6', 'cm-7', 'cm-8', 'cm-9', 'cm-10', 'cm-11', 'cm-12'],
                small: ['cs-1', 'cs-2', 'cs-3', 'cs-4', 'cs-5', 'cs-6', 'cs-7', 'cs-8', 'cs-9', 'cs-10', 'cs-11', 'cs-12']
            }
        }
    };
    
    // State management
    let currentScreenSize = '';
    let observers = [];
    let enhancedElements = new Set();
    
    // Enhanced Display Helpers dengan CSS Grid integration
    function applyDisplayHelpers() {
        const isLargeScreen = window.matchMedia(config.breakpoints.large).matches;
        const isMediumScreen = window.matchMedia(config.breakpoints.medium).matches;
        const isSmallScreen = window.matchMedia(config.breakpoints.small).matches;
        
        // Update screen size state
        const previousSize = currentScreenSize;
        if (isLargeScreen) currentScreenSize = 'large';
        else if (isMediumScreen) currentScreenSize = 'medium';
        else if (isSmallScreen) currentScreenSize = 'small';
        
        // Enhanced helper function dengan grid awareness
        function setDisplay(selector, displayValue) {
            document.querySelectorAll(selector).forEach(el => {
                // Preserve original display if not set by Polos
                if (!el.hasAttribute('data-polos-original-display')) {
                    const originalDisplay = el.style.display || getComputedStyle(el).display;
                    el.setAttribute('data-polos-original-display', originalDisplay);
                }
                
                // Special handling for grid items
                if (el.parentElement.classList.contains('rw') && displayValue === 'none') {
                    el.style.display = 'none';
                    el.setAttribute('data-polos-hidden', 'true');
                } else if (el.hasAttribute('data-polos-hidden') && displayValue !== 'none') {
                    el.style.display = el.getAttribute('data-polos-original-display') || 'block';
                    el.removeAttribute('data-polos-hidden');
                } else {
                    el.style.display = displayValue;
                }
            });
        }
        
        // Apply responsive classes dengan grid consideration
        if (isLargeScreen) {
            setDisplay('.t-tl', 'block');
            setDisplay('.s-sl', 'none');
            setDisplay('.t-tm', 'none');
            setDisplay('.t-ts', 'none');
            setDisplay('.s-sm', 'block');
            setDisplay('.s-ss', 'block');
            
            // Optimize grid for large screens
            optimizeGridLayout('large');
        }
        
        if (isMediumScreen) {
            setDisplay('.t-tm', 'block');
            setDisplay('.s-sm', 'none');
            setDisplay('.t-tl', 'none');
            setDisplay('.t-ts', 'none');
            setDisplay('.s-sl', 'block');
            setDisplay('.s-ss', 'block');
            
            // Optimize grid for medium screens
            optimizeGridLayout('medium');
        }
        
        if (isSmallScreen) {
            setDisplay('.t-ts', 'block');
            setDisplay('.s-ss', 'none');
            setDisplay('.t-tl', 'none');
            setDisplay('.t-tm', 'none');
            setDisplay('.s-sl', 'block');
            setDisplay('.s-sm', 'block');
            
            // Optimize grid for small screens
            optimizeGridLayout('small');
        }
        
        // Notify observers jika screen size berubah
        if (previousSize !== currentScreenSize) {
            notifyObservers('screenChange', { 
                from: previousSize, 
                to: currentScreenSize 
            });
        }
    }
    
    // Grid layout optimization
    function optimizeGridLayout(screenSize) {
        document.querySelectorAll(config.selectors.grid).forEach(grid => {
            // Handle auto-fit and auto-fill grids
            if (grid.classList.contains('auto-fit') || grid.classList.contains('auto-fill')) {
                // Additional optimization can be added here
                grid.style.gridTemplateColumns = ''; // Reset untuk CSS handling
            }
            
            // Ensure grid items are properly displayed
            grid.querySelectorAll(config.selectors.gridItem).forEach(item => {
                if (item.hasAttribute('data-polos-hidden')) {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    // Enhanced interactive components dengan semua sistem
    function enhanceInteractiveComponents() {
        // Enhance box items dengan hover effects
        document.querySelectorAll(config.selectors.boxItem).forEach(el => {
            if (!enhancedElements.has(el)) {
                el.addEventListener('mouseenter', function() {
                    if (!this.classList.contains('bx-compact')) {
                        this.style.transform = 'translateY(-2px)';
                    }
                });
                
                el.addEventListener('mouseleave', function() {
                    this.style.transform = '';
                });
                
                enhancedElements.add(el);
                el.setAttribute(config.classes.enhanced, 'true');
            }
        });
        
        // Enhance alignment containers
        document.querySelectorAll(config.selectors.alignment).forEach(el => {
            if (!enhancedElements.has(el)) {
                // Add responsive behavior to alignment containers
                el.addEventListener('click', function(e) {
                    if (this.classList.contains('js-interactive')) {
                        this.style.transform = 'scale(0.98)';
                        setTimeout(() => {
                            this.style.transform = '';
                        }, 150);
                    }
                });
                
                enhancedElements.add(el);
            }
        });
        
        // Enhance page components
        document.querySelectorAll(config.selectors.page).forEach(el => {
            if (!enhancedElements.has(el)) {
                // Add loading state capability
                if (!el.hasAttribute('data-polos-loadable')) {
                    el.setAttribute('data-polos-loadable', 'true');
                }
                enhancedElements.add(el);
            }
        });
    }
    
    // Grid management utilities
    function manageGridColumns(container, columns) {
        const grid = document.querySelector(container);
        if (!grid) return;
        
        // Reset existing columns
        grid.querySelectorAll('[class*="cl-"], [class*="cm-"], [class*="cs-"]')
            .forEach(el => {
                config.classes.gridColumns.large.forEach(cls => el.classList.remove(cls));
                config.classes.gridColumns.medium.forEach(cls => el.classList.remove(cls));
                config.classes.gridColumns.small.forEach(cls => el.classList.remove(cls));
            });
        
        // Apply new columns
        columns.forEach((col, index) => {
            const item = grid.children[index];
            if (item) {
                if (col.large) item.classList.add(`cl-${col.large}`);
                if (col.medium) item.classList.add(`cm-${col.medium}`);
                if (col.small) item.classList.add(`cs-${col.small}`);
            }
        });
    }
    
    // Observer pattern untuk event handling
    function addObserver(callback) {
        observers.push(callback);
    }
    
    function removeObserver(callback) {
        const index = observers.indexOf(callback);
        if (index > -1) observers.splice(index, 1);
    }
    
    function notifyObservers(event, data) {
        observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.warn('Polos observer error:', error);
            }
        });
    }
    
    // Loading state utilities
    function setLoading(selector, isLoading, options = {}) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (isLoading) {
                el.classList.add(config.classes.loading);
                if (options.text) {
                    el.setAttribute('data-polos-loading-text', options.text);
                }
            } else {
                el.classList.remove(config.classes.loading);
                if (options.text) {
                    el.removeAttribute('data-polos-loading-text');
                }
            }
        });
    }
    
    // Initialize ketika DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    function initialize() {
        console.log('🚀 Polos Enhanced v1.2 Loaded');
        
        // Run initial setups
        applyDisplayHelpers();
        enhanceInteractiveComponents();
        
        // Enhanced resize handler dengan throttle
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                applyDisplayHelpers();
                enhanceInteractiveComponents();
            }, 100);
        });
        
        // Mutation Observer untuk dynamically added elements
        const mutationObserver = new MutationObserver(function(mutations) {
            let shouldEnhance = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            if (node.matches && (
                                node.matches(config.selectors.boxItem) ||
                                node.matches(config.selectors.alignment) ||
                                node.matches(config.selectors.page)
                            )) {
                                shouldEnhance = true;
                            }
                            
                            // Check children
                            if (node.querySelectorAll) {
                                const items = node.querySelectorAll(
                                    `${config.selectors.boxItem}, ${config.selectors.alignment}, ${config.selectors.page}`
                                );
                                if (items.length > 0) {
                                    shouldEnhance = true;
                                }
                            }
                        }
                    });
                }
            });
            
            if (shouldEnhance) {
                enhanceInteractiveComponents();
            }
        });
        
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Notify initialization complete
        notifyObservers('initialized', { 
            version: '1.2',
            timestamp: new Date().toISOString() 
        });
    }
    
    // Enhanced Public API
    window.Polos = {
        // Core display functions
        refresh: function() {
            applyDisplayHelpers();
            enhanceInteractiveComponents();
        },
        
        getScreenSize: function() {
            return currentScreenSize;
        },
        
        show: function(selector) {
            document.querySelectorAll(selector).forEach(el => {
                const originalDisplay = el.getAttribute('data-polos-original-display') || 'block';
                el.style.display = originalDisplay;
                el.removeAttribute('data-polos-hidden');
            });
        },
        
        hide: function(selector) {
            document.querySelectorAll(selector).forEach(el => {
                if (!el.hasAttribute('data-polos-original-display')) {
                    el.setAttribute('data-polos-original-display', 
                                  el.style.display || getComputedStyle(el).display);
                }
                el.style.display = 'none';
                el.setAttribute('data-polos-hidden', 'true');
            });
        },
        
        // Enhanced responsive control
        showOn: function(selector, breakpoint) {
            if (window.matchMedia(config.breakpoints[breakpoint]).matches) {
                this.show(selector);
            }
        },
        
        hideOn: function(selector, breakpoint) {
            if (window.matchMedia(config.breakpoints[breakpoint]).matches) {
                this.hide(selector);
            }
        },
        
        // Grid management
        manageGrid: function(container, columns) {
            manageGridColumns(container, columns);
        },
        
        getGridTemplates: function() {
            return {
                autoFit: '.rw.auto-fit',
                autoFill: '.rw.auto-fill',
                standard: '.rw'
            };
        },
        
        // New utilities
        setLoading: function(selector, isLoading, options = {}) {
            setLoading(selector, isLoading, options);
        },
        
        // Event system
        on: function(event, callback) {
            addObserver(callback);
        },
        
        off: function(callback) {
            removeObserver(callback);
        },
        
        // Component utilities
        enhance: function(selector) {
            document.querySelectorAll(selector).forEach(el => {
                el.classList.add(config.classes.interactive);
            });
            enhanceInteractiveComponents();
        },
        
        // Utility functions
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        // Configuration access
        config: config,
        
        // Debug information
        debug: function() {
            return {
                screenSize: currentScreenSize,
                enhancedElements: enhancedElements.size,
                observers: observers.length,
                breakpoints: config.breakpoints
            };
        }
    };
})();
