/*!
 * Polos JS v2.0.0 - Simplified UI Enhancement
 * 
 * Core: Responsive grid (4→8→12) • Popup system • Event observers
 * New: p$() selector • Enhanced safety • Box system integration
 * Updated: js-interactive → js-inpolos • CSS v2.0 compatibility
 * 
 * © 2025 Polos Style - MIT License
 * https://github.com/alicom13/polos
 */
!function() {
    "use strict";

    const config = {
        version: "2.0.0",
        breakpoints: {
            small: "(max-width: 575.98px)",
            medium: "(576px <= width <= 767.98px)",
            large: "(min-width: 768px)"
        },
        classes: {
            loading: "lmn-loading",
            interactive: "js-inpolos",
            enhanced: "data-polos-enhanced",
            responsive: {
                show: { small: "s-ss", medium: "s-sm", large: "s-sl" },
                hide: { small: "t-ts", medium: "t-tm", large: "t-tl" }
            },
            box: {
                container: "pl-box",
                header: "bx-hd",
                body: "bx-itm",
                footer: "bx-ft"
            }
        },
        defaults: {
            animationDuration: 300,
            closeOnBackdrop: true,
            escToClose: true,
            toastDuration: 5000
        }
    };

    let currentScreenSize = "";
    let observers = [];

    // Helper: Generate unique ID
    function generateId(prefix = "") {
        return prefix + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    }

    // ========== CORE SELECTOR ENGINE ==========
    function $(selector, enhance = false) {
        if (!selector || typeof selector !== 'string') {
            console.warn('Polos: Invalid selector provided');
            return null;
        }
        
        let result;
        const firstChar = selector[0];
        
        // ID Selector: #id
        if (firstChar === '#') {
            result = document.getElementById(selector.slice(1));
        }
        // Class Selector: .class
        else if (firstChar === '.') {
            result = document.getElementsByClassName(selector.slice(1));
        }
        // Tag Selector: div, span, etc
        else if (/^[a-zA-Z][\w-]*$/.test(selector)) {
            result = document.getElementsByTagName(selector);
        }
        // Complex Selector: [data-x], div.class, etc
        else {
            result = document.querySelectorAll(selector);
        }
        
        // Auto-enhance if requested
        if (enhance && result) {
            if (result.length !== undefined) {
                // NodeList or HTMLCollection
                Array.from(result).forEach(el => {
                    el.classList.add(config.classes.interactive);
                });
            } else {
                // Single element
                result.classList.add(config.classes.interactive);
            }
        }
        
        return result;
    }

    // ========== CHAINABLE METHODS ==========
    function createChainable(elements) {
        if (!elements) return null;
        
        const isCollection = elements.length !== undefined;
        const items = isCollection ? Array.from(elements) : [elements];
        
        return {
            // Original elements
            _elements: items,
            
            // Utility methods
            forEach(fn) {
                items.forEach(fn);
                return this;
            },
            
            // Show/Hide
            show() {
                items.forEach(el => {
                    el.style.display = el.getAttribute('data-polos-original-display') || 'block';
                });
                return this;
            },
            
            hide() {
                items.forEach(el => {
                    if (!el.hasAttribute('data-polos-original-display')) {
                        el.setAttribute('data-polos-original-display', el.style.display || 'block');
                    }
                    el.style.display = 'none';
                });
                return this;
            },
            
            // Class operations
            addClass(className) {
                items.forEach(el => el.classList.add(className));
                return this;
            },
            
            removeClass(className) {
                items.forEach(el => el.classList.remove(className));
                return this;
            },
            
            toggleClass(className) {
                items.forEach(el => el.classList.toggle(className));
                return this;
            },
            
            hasClass(className) {
                return items.some(el => el.classList.contains(className));
            },
            
            // Attribute operations
            attr(name, value) {
                if (value === undefined) {
                    return items[0]?.getAttribute(name);
                }
                items.forEach(el => el.setAttribute(name, value));
                return this;
            },
            
            // Event listeners
            on(event, handler) {
                items.forEach(el => el.addEventListener(event, handler));
                return this;
            },
            
            off(event, handler) {
                items.forEach(el => el.removeEventListener(event, handler));
                return this;
            },
            
            // DOM manipulation
            html(content) {
                if (content === undefined) {
                    return items[0]?.innerHTML;
                }
                items.forEach(el => el.innerHTML = content);
                return this;
            },
            
            text(content) {
                if (content === undefined) {
                    return items[0]?.textContent;
                }
                items.forEach(el => el.textContent = content);
                return this;
            },
            
            // Style manipulation
            css(property, value) {
                if (value === undefined && typeof property === 'string') {
                    return items[0]?.style[property];
                }
                
                if (typeof property === 'object') {
                    items.forEach(el => {
                        Object.entries(property).forEach(([prop, val]) => {
                            el.style[prop] = val;
                        });
                    });
                } else {
                    items.forEach(el => el.style[property] = value);
                }
                return this;
            },
            
            // Box system helpers
            makeBox(options = {}) {
                items.forEach(el => {
                    el.classList.add(config.classes.box.container);
                    
                    if (options.header) {
                        const header = document.createElement('div');
                        header.className = config.classes.box.header;
                        header.innerHTML = options.header;
                        el.prepend(header);
                    }
                    
                    if (options.footer) {
                        const footer = document.createElement('div');
                        footer.className = config.classes.box.footer;
                        footer.innerHTML = options.footer;
                        el.appendChild(footer);
                    }
                    
                    // Wrap existing content in bx-itm
                    const content = document.createElement('div');
                    content.className = config.classes.box.body;
                    while (el.firstChild) {
                        content.appendChild(el.firstChild);
                    }
                    el.appendChild(content);
                });
                return this;
            },
            
            // Get first/last element
            first() {
                return items[0] ? createChainable(items[0]) : null;
            },
            
            last() {
                return items[items.length - 1] ? createChainable(items[items.length - 1]) : null;
            },
            
            // Get by index
            eq(index) {
                return items[index] ? createChainable(items[index]) : null;
            },
            
            // Convert back to array
            toArray() {
                return [...items];
            },
            
            // Get raw DOM elements
            get(index) {
                if (index === undefined) return isCollection ? elements : items[0];
                return items[index] || null;
            }
        };
    }

    // Enhanced selector with chaining
    function p$(selector, enhance = false) {
        const elements = $(selector, enhance);
        return createChainable(elements);
    }

    // ========== EXISTING POLOS FUNCTIONS ==========
    
    // Screen detection
    function detectScreenSize() {
        const isLarge = window.matchMedia(config.breakpoints.large).matches;
        const isMedium = window.matchMedia(config.breakpoints.medium).matches;
        const isSmall = window.matchMedia(config.breakpoints.small).matches;
        
        const previousSize = currentScreenSize;
        
        if (isLarge) {
            currentScreenSize = "large";
        } else if (isMedium) {
            currentScreenSize = "medium";
        } else if (isSmall) {
            currentScreenSize = "small";
        }
        
        if (previousSize !== currentScreenSize) {
            triggerEvent("screenChange", {
                from: previousSize,
                to: currentScreenSize,
                columns: getCurrentColumns()
            });
        }
    }

    function getCurrentColumns() {
        return currentScreenSize === "large" ? 12 : 
               currentScreenSize === "medium" ? 8 : 4;
    }

    // Grid management
    function manageGrid(gridSelector, gridConfig) {
        const grid = p$(gridSelector).first().get();
        if (!grid) return;
        
        // Ensure grid has .rw class
        if (!grid.classList.contains('rw')) {
            grid.classList.add('rw');
        }
        
        // Clear existing grid classes
        p$('[class*="cl-"], [class*="cm-"], [class*="cs-"]', grid).forEach(el => {
            el.classList.forEach(cls => {
                if (cls.startsWith("cl-") || cls.startsWith("cm-") || cls.startsWith("cs-")) {
                    el.classList.remove(cls);
                }
            });
        });
        
        // Apply new grid config
        gridConfig.forEach((item, idx) => {
            const el = grid.children[idx];
            if (!el) return;
            
            if (item.large >= 1 && item.large <= 12) el.classList.add("cl-" + item.large);
            if (item.medium >= 1 && item.medium <= 8) el.classList.add("cm-" + item.medium);
            if (item.small >= 1 && item.small <= 4) el.classList.add("cs-" + item.small);
        });
    }

    // Event system
    function triggerEvent(eventName, data) {
        observers.forEach(observer => {
            try {
                observer.fn(eventName, data);
            } catch (error) {
                console.warn("Polos event error:", error);
            }
        });
    }

    // Popup System (UNCHANGED - compatible with CSS v2.0)
    const Popup = {
        create(options = {}) {
            const opts = {
                title: "",
                content: "",
                size: "md",
                type: "default",
                onClose: null,
                onOpen: null,
                closeOnBackdrop: this.config.closeOnBackdrop,
                escToClose: this.config.escToClose,
                ...options
            };
            
            const popupId = generateId("popup-");
            const isAlert = opts.type === "alert";
            const isToast = opts.type === "toast";
            
            let html = '';
            
            if (isToast) {
                html = '<div class="popup-toast" id="' + popupId + '"><div class="popup-body">' + opts.content + '</div></div>';
            } else if (isAlert) {
                html = '<div class="popup-backdrop" id="' + popupId + '"><div class="popup-container popup-sm"><div class="popup-body">' + opts.content + '</div><div class="popup-footer"><button class="btn-primary" onclick="Polos.Popup.close(\'' + popupId + '\')">OK</button></div></div></div>';
            } else {
                html = '<div class="popup-backdrop" id="' + popupId + '"><div class="popup-container popup-' + opts.size + '"><div class="popup-header"><h3>' + opts.title + '</h3><button class="popup-close" onclick="Polos.Popup.close(\'' + popupId + '\')">×</button></div><div class="popup-body">' + opts.content + '</div></div></div>';
            }
            
            document.body.insertAdjacentHTML("beforeend", html);
            
            const popup = document.getElementById(popupId);
            if (popup.classList.contains("popup-backdrop") && opts.closeOnBackdrop) {
                popup.addEventListener("click", e => {
                    if (e.target === popup) {
                        this.close(popupId);
                        if (opts.onClose) opts.onClose();
                    }
                });
            }
            
            if (opts.escToClose) {
                const escHandler = e => {
                    if (e.key === "Escape" && popup.classList.contains("active")) {
                        this.close(popupId);
                        if (opts.onClose) opts.onClose();
                        document.removeEventListener("keydown", escHandler);
                    }
                };
                document.addEventListener("keydown", escHandler);
            }
            
            if (opts.onOpen) opts.onOpen();
            return popupId;
        },
        
        open(popupId) {
            const popup = document.getElementById(popupId);
            
            if (popup) {
                popup.classList.add("active");
                document.body.style.overflow = "hidden";
                
                if (popup.classList.contains("popup-toast")) {
                    setTimeout(() => {
                        this.close(popupId);
                    }, this.config.toastDuration);
                }
                
                triggerEvent("popupOpened", { popupId });
            }
        },
        
        close(popupId) {
            const popup = document.getElementById(popupId);
            
            if (popup) {
                popup.classList.remove("active");
                
                setTimeout(() => {
                    if (popup.parentNode) popup.parentNode.removeChild(popup);
                    document.body.style.overflow = "";
                }, this.config.animationDuration);
                
                triggerEvent("popupClosed", { popupId });
            }
        },
        
        alert(message, type = "info") {
            const icon = { success: "✓", warning: "⚠️", error: "❌", info: "ℹ️" }[type] || "ℹ️";
            const popupId = this.create({
                type: "alert",
                content: '<div style="text-align:center;padding:1rem"><div style="font-size:3rem;margin-bottom:1rem">' + icon + '</div><p style="font-size:1.1rem;margin:0">' + message + '</p></div>'
            });
            this.open(popupId);
        },
        
        toast(message) {
            const popupId = this.create({
                type: "toast", 
                content: message
            });
            this.open(popupId);
        },
        
        config: config.defaults
    };

    // Initialize
    function initialize() {
        detectScreenSize();
        
        let resizeTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(detectScreenSize, 100);
        });
        
        triggerEvent("initialized", {
            version: config.version,
            timestamp: new Date().toISOString()
        });
    }

    // ========== PUBLIC API ==========
    document.readyState === "loading" 
        ? document.addEventListener("DOMContentLoaded", initialize)
        : initialize();

    const Polos = {
        // Version info
        version: config.version,
        
        // Core selector (non-chainable)
        $: $,
        
        // Main selector with chaining
        p$: p$,
        
        // Alias for p$
        select: p$,
        
        // Existing methods
        refresh: detectScreenSize,
        
        getScreenSize: () => currentScreenSize,
        
        getCurrentColumns: getCurrentColumns,
        
        show(selector) {
            p$(selector).show();
            return this;
        },
        
        hide(selector) {
            p$(selector).hide();
            return this;
        },
        
        showOn(selector, breakpoint) {
            const size = { small: "small", medium: "medium", large: "large" }[breakpoint];
            if (!size) return this;
            
            const showClass = config.classes.responsive.show[size];
            const hideClass = config.classes.responsive.hide[size];
            
            p$(selector).forEach(el => {
                el.classList.add(showClass);
                el.classList.remove(hideClass);
            });
            
            return this;
        },
        
        hideOn(selector, breakpoint) {
            const size = { small: "small", medium: "medium", large: "large" }[breakpoint];
            if (!size) return this;
            
            const showClass = config.classes.responsive.show[size];
            const hideClass = config.classes.responsive.hide[size];
            
            p$(selector).forEach(el => {
                el.classList.add(hideClass);
                el.classList.remove(showClass);
            });
            
            return this;
        },
        
        manageGrid: manageGrid,
        
        setLoading(selector, isLoading, text = "") {
            p$(selector).forEach(el => {
                if (isLoading) {
                    el.classList.add(config.classes.loading);
                    if (text) el.setAttribute("data-polos-loading-text", text);
                } else {
                    el.classList.remove(config.classes.loading);
                    if (text) el.removeAttribute("data-polos-loading-text");
                }
            });
            
            return this;
        },
        
        // Event observers
        on(observer, id = null) {
            if (typeof observer !== "function") return null;
            
            const observerId = id || generateId("obs-");
            observers.push({
                id: observerId,
                fn: observer,
                timestamp: Date.now()
            });
            
            return observerId;
        },
        
        off(identifier) {
            let index = -1;
            
            if (typeof identifier === "function") {
                index = observers.findIndex(o => o.fn === identifier);
            } else if (typeof identifier === "string") {
                index = observers.findIndex(o => o.id === identifier);
            }
            
            if (index > -1) {
                observers.splice(index, 1);
                return true;
            }
            
            return false;
        },
        
        enhance(selector) {
            p$(selector).addClass(config.classes.interactive);
            return this;
        },
        
        // Box system helper
        makeBox(selector, options = {}) {
            p$(selector).makeBox(options);
            return this;
        },
        
        config: config,
        
        debug() {
            return {
                version: config.version,
                screenSize: currentScreenSize,
                columns: getCurrentColumns(),
                observers: observers.length,
                elementsEnhanced: p$('.' + config.classes.interactive).toArray().length
            };
        },
        
        Popup: Popup,
        
        // No-conflict system
        noConflict(returnGlobal = true) {
            if (window.p$ === Polos.p$) {
                delete window.p$;
            }
            return returnGlobal ? Polos : this;
        },
        
        // Enable global shortcut (opt-in)
        enableGlobal(alias = 'p$') {
            if (window[alias] && window[alias] !== Polos.p$) {
                console.warn(`Polos: Global name "${alias}" already in use`);
                return false;
            }
            window[alias] = Polos.p$;
            return true;
        }
    };

    // ========== GLOBAL EXPORT ==========
    window.Polos = Polos;
    
    // Export global p$ (with safety check)
    if (!window.p$) {
        window.p$ = Polos.p$;
    } else {
        console.info('Polos: p$ already exists. Use Polos.p$() instead.');
    }

    // ES Module compatibility
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Polos;
    }

}();
