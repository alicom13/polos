/*!
 * Polos DOM (p$) Plugin v2.0.9 - Final Production
 * Lightweight, Chainable DOM utilities with Polos integration
 * Requires Polos JS v1.6.1+
 * © 2025 Polos Style - MIT License 
 */
(function(global, factory) {
    if (typeof global.p$ === 'function' && global.p$._version === '2.0.9') return;
    
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory(global, true);
    } else {
        factory(global, false);
    }
})(typeof window !== 'undefined' ? window : this, function(window, isNodeEnv) {
    "use strict";

    // ==================== ENVIRONMENT DETECTION ====================
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    const isDev = isBrowser && window.__POLOS_DEV__ === true;
    
    const isNode = (function() {
        if (!isBrowser) return () => false;
        if (typeof Node !== 'undefined') {
            return (node) => node && node instanceof Node;
        }
        return (node) => node && typeof node.nodeType === 'number';
    })();
    
    const isElement = (el) => {
        if (!isNode(el)) return false;
        try {
            return el.nodeType === 1;
        } catch (e) {
            return false;
        }
    };

    // ==================== CORE UTILITIES ====================
    const toArray = (items) => Array.from(items || []);
    const isFunction = (fn) => typeof fn === 'function';
    const isString = (str) => typeof str === 'string';
    const isObject = (obj) => obj && typeof obj === 'object';

    // ==================== EVENT REGISTRY (OPTIMIZED) ====================
    const EVENT_REGISTRY = Symbol('polos.events');
    const REGISTERED_ELEMENTS = new WeakSet();
    
    const EventRegistry = {
        init(element) {
            if (!element[EVENT_REGISTRY]) {
                element[EVENT_REGISTRY] = {
                    handlers: new Map(),
                    onceHandlers: new WeakMap()
                };
                REGISTERED_ELEMENTS.add(element);
            }
            return element[EVENT_REGISTRY];
        },
        
        get(element) {
            return element[EVENT_REGISTRY];
        },
        
        add(element, event, originalHandler, wrapped, options = {}) {
            const registry = this.init(element);
            
            if (!registry.handlers.has(event)) {
                registry.handlers.set(event, new Map());
            }
            
            const eventHandlers = registry.handlers.get(event);
            const handlerKey = this._createHandlerKey(originalHandler, options);
            
            if (eventHandlers.has(handlerKey)) {
                return false;
            }
            
            eventHandlers.set(handlerKey, {
                original: originalHandler,
                wrapped: wrapped,
                options: options,
                isOnce: false
            });
            
            return true;
        },
        
        remove(element, event, handler, options = {}) {
            const registry = this.get(element);
            if (!registry) return false;
            
            let removed = false;
            
            const eventsToCheck = event ? [event] : Array.from(registry.handlers.keys());
            
            for (const eventName of eventsToCheck) {
                const eventHandlers = registry.handlers.get(eventName);
                if (!eventHandlers) continue;
                
                if (!handler) {
                    for (const [, data] of eventHandlers.entries()) {
                        element.removeEventListener(eventName, data.wrapped, data.options);
                    }
                    eventHandlers.clear();
                    removed = true;
                } else {
                    const targets = this._findHandlerMatches(eventHandlers, handler, options);
                    
                    for (const handlerKey of targets) {
                        const data = eventHandlers.get(handlerKey);
                        if (data) {
                            element.removeEventListener(eventName, data.wrapped, data.options);
                            eventHandlers.delete(handlerKey);
                            
                            if (data.isOnce) {
                                registry.onceHandlers.delete(data.wrapped);
                            }
                            
                            removed = true;
                        }
                    }
                }
                
                if (eventHandlers.size === 0) {
                    registry.handlers.delete(eventName);
                }
            }
            
            if (registry.handlers.size === 0) {
                registry.onceHandlers = new WeakMap();
                delete element[EVENT_REGISTRY];
                REGISTERED_ELEMENTS.delete(element);
            }
            
            return removed;
        },
        
        trackOnce(element, wrapper, original, eventName) {
            const registry = this.init(element);
            registry.onceHandlers.set(wrapper, { original, eventName });
            
            const eventHandlers = registry.handlers.get(eventName);
            if (eventHandlers) {
                for (const [key, data] of eventHandlers.entries()) {
                    if (data.original === original && data.wrapped === wrapper) {
                        data.isOnce = true;
                        break;
                    }
                }
            }
        },
        
        getHandlers(element, eventName) {
            const registry = this.get(element);
            if (!registry || !registry.handlers.has(eventName)) {
                return [];
            }
            
            const eventHandlers = registry.handlers.get(eventName);
            const handlers = [];
            
            for (const [, data] of eventHandlers.entries()) {
                const isOnce = data.isOnce || 
                              (data.wrapped && registry.onceHandlers.has(data.wrapped));
                
                handlers.push({
                    handler: data.original,
                    wrapped: data.wrapped,
                    options: data.options,
                    isOnce: isOnce
                });
            }
            
            return handlers;
        },
        
        clear(element) {
            const registry = this.get(element);
            if (!registry) return;
            
            for (const [eventName, eventHandlers] of registry.handlers.entries()) {
                for (const [, data] of eventHandlers.entries()) {
                    element.removeEventListener(eventName, data.wrapped, data.options);
                }
            }
            
            registry.handlers.clear();
            registry.onceHandlers = new WeakMap();
            delete element[EVENT_REGISTRY];
            REGISTERED_ELEMENTS.delete(element);
        },
        
        _createHandlerKey(handler, options) {
            const optionsHash = this._hashOptions(options);
            return `${handler.toString().slice(0, 50)}_${optionsHash}`;
        },
        
        _hashOptions(options) {
            if (!isObject(options) || Object.keys(options).length === 0) {
                return 'default';
            }
            
            const keys = Object.keys(options).sort();
            return keys.map(key => `${key}:${options[key]}`).join('|');
        },
        
        _findHandlerMatches(eventHandlers, handler, options) {
            const matches = [];
            const targetKey = this._createHandlerKey(handler, options);
            
            if (eventHandlers.has(targetKey)) {
                matches.push(targetKey);
                return matches;
            }
            
            for (const [key, data] of eventHandlers.entries()) {
                if (data.original === handler) {
                    matches.push(key);
                }
            }
            
            return matches;
        }
    };

    // ==================== SELECTOR CACHE ====================
    const selectorCache = new WeakMap();
    
    function generateSafeSelector(element) {
        if (!element || !isElement(element) || !element.parentElement) {
            return null;
        }
        
        if (selectorCache.has(element)) {
            return selectorCache.get(element);
        }
        
        let selector = null;
        
        // Priority 1: ID
        if (element.id && element.id.trim()) {
            try {
                selector = `#${CSS.escape(element.id)}`;
            } catch (e) {
                selector = `#${element.id.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&')}`;
            }
        }
        // Priority 2: Existing data-polos-id
        else if (element.hasAttribute('data-polos-id')) {
            const polosId = element.getAttribute('data-polos-id');
            try {
                selector = `[data-polos-id="${CSS.escape(polosId)}"]`;
            } catch (e) {
                selector = `[data-polos-id="${polosId}"]`;
            }
        }
        // Priority 3: Unique class selector
        else if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/).filter(c => c);
            if (classes.length > 0) {
                try {
                    const firstClass = CSS.escape(classes[0]);
                    const parent = element.parentElement;
                    
                    // Check uniqueness
                    if (parent) {
                        const siblingsWithClass = Array.from(parent.querySelectorAll(`.${firstClass}`));
                        if (siblingsWithClass.length === 1) {
                            selector = `.${firstClass}`;
                        } else {
                            // Not unique, fallback to tag
                            const tag = element.tagName.toLowerCase();
                            selector = `${tag}.${firstClass}`;
                        }
                    } else {
                        selector = `.${firstClass}`;
                    }
                } catch (e) {
                    selector = `.${classes[0]}`;
                }
            }
        }
        
        // Priority 4: Tag selector
        if (!selector) {
            const tag = element.tagName.toLowerCase();
            selector = tag;
        }
        
        if (selector) {
            selectorCache.set(element, selector);
        }
        
        return selector;
    }

    // ==================== MUTATION OBSERVER (OPTIMIZED) ====================
    let domObserver = null;
    
    function setupDOMMutationObserver() {
        if (!isBrowser || !window.MutationObserver) return;
        
        domObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.removedNodes) {
                        if (isElement(node)) {
                            selectorCache.delete(node);
                            if (REGISTERED_ELEMENTS.has(node)) {
                                EventRegistry.clear(node);
                            }
                        }
                    }
                }
                else if (mutation.type === 'attributes') {
                    const attrName = mutation.attributeName;
                    if (attrName === 'id' || attrName === 'class' || attrName === 'data-polos-id') {
                        selectorCache.delete(mutation.target);
                    }
                }
            }
        });
        
        domObserver.observe(document.documentElement || document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['id', 'class', 'data-polos-id']
        });
    }

    if (isBrowser) {
        setupDOMMutationObserver();
    }

    // ==================== NULL CHAIN ====================
    const nullChain = (function() {
        const methods = {
            on: () => nullChain,
            off: () => nullChain,
            one: () => nullChain,
            addClass: () => nullChain,
            removeClass: () => nullChain,
            toggleClass: () => nullChain,
            hasClass: () => false,
            attr: () => undefined,
            css: () => undefined,
            html: () => '',
            text: () => '',
            val: () => undefined,
            append: () => nullChain,
            prepend: () => nullChain,
            remove: () => nullChain,
            empty: () => nullChain,
            find: () => nullChain,
            parent: () => nullChain,
            children: () => nullChain,
            first: () => nullChain,
            last: () => nullChain,
            eq: () => nullChain,
            each: () => nullChain,
            map: () => [],
            filter: () => nullChain,
            is: () => false,
            show: () => nullChain,
            hide: () => nullChain,
            data: () => undefined,
            removeAttr: () => nullChain,
            polosShowOn: () => nullChain,
            polosHideOn: () => nullChain,
            polosSetLoading: () => nullChain,
            polosPopup: () => null
        };
        
        const chain = Object.create(methods);
        chain._el = [];
        chain._length = 0;
        return Object.freeze(chain);
    })();

    // ==================== CHAIN PROTOTYPE ====================
    const Chain = function(elements) {
        if (!isBrowser) {
            this._el = [];
            this._length = 0;
            return;
        }
        
        const seen = new WeakSet();
        const flattened = [];
        
        const process = (item) => {
            if (item instanceof Chain) {
                item._el.forEach(process);
            } else if (isNode(item) && !seen.has(item)) {
                seen.add(item);
                flattened.push(item);
            }
        };
        
        toArray(elements).forEach(process);
        
        this._el = flattened;
        this._length = flattened.length;
    };
    const forEach = (method) => function(...args) {
        const validElements = this._el.filter(el => 
            isNode(el) && (!isBrowser || document.contains(el))
        );
        
        if (validElements.length !== this._length) {
            this._el = validElements;
            this._length = validElements.length;
        }
        
        for (const el of validElements) {
            try {
                method(el, ...args);
            } catch (e) {
                if (isDev) {
                    console.warn('p$: Error in method execution:', e);
                }
            }
        }
        
        return this;
    };

    const fromFirst = (method) => function(...args) {
        const el = this._el[0];
        if (!el || !isNode(el) || (isBrowser && !document.contains(el))) {
            return undefined;
        }
        return method(el, ...args);
    };

    // ==================== EVENT HANDLING ====================
    Chain.prototype.on = function(event, handler, options = {}) {
        if (!isFunction(handler)) return this;
        
        return forEach((el, evt, hdl, opts) => {
            const wrapped = (e) => hdl.call(el, e);
            
            if (EventRegistry.add(el, evt, hdl, wrapped, opts)) {
                el.addEventListener(evt, wrapped, opts);
            }
        }).call(this, event, handler, options);
    };

    Chain.prototype.off = function(event, handler, options = {}) {
        return forEach((el, evt, hdl, opts) => {
            EventRegistry.remove(el, evt, hdl, opts);
        }).call(this, event, handler, options);
    };

    Chain.prototype.one = function(event, handler, options = {}) {
        if (!isFunction(handler)) return this;
        
        if (options.once) {
            return this.on(event, handler, { ...options, once: true });
        }
        
        return forEach((el, evt, hdl, opts) => {
            let called = false;
            
            const onceHandler = (e) => {
                if (called) return;
                called = true;
                
                try {
                    hdl.call(el, e);
                } finally {
                    EventRegistry.remove(el, evt, hdl, opts);
                }
            };
            
            EventRegistry.trackOnce(el, onceHandler, hdl, evt);
            
            if (EventRegistry.add(el, evt, hdl, onceHandler, opts)) {
                el.addEventListener(evt, onceHandler, opts);
            }
        }).call(this, event, handler, options);
    };

    // ==================== VALUE HANDLING ====================
    Chain.prototype.val = function(value) {
        if (value === undefined) {
            if (this._length === 0) return undefined;
            
            const values = [];
            const checkboxGroups = new Map();
            const radioGroups = new Map();
            
            this._el.forEach(el => {
                if (el.matches('select[multiple]')) {
                    const selected = toArray(el.selectedOptions).map(opt => opt.value);
                    values.push(...selected);
                } 
                else if (el.type === 'checkbox' || el.type === 'radio') {
                    const name = el.name;
                    const form = el.form || el.closest('form');
                    const formKey = form || document;
                    
                    if (el.type === 'radio') {
                        if (name && el.checked) {
                            const groupKey = `${formKey}_${name}`;
                            if (!radioGroups.has(groupKey)) {
                                radioGroups.set(groupKey, el.value);
                            }
                        }
                    } else {
                        if (el.checked) {
                            if (!name) {
                                values.push(el.value);
                            } else {
                                const groupKey = `${formKey}_${name}`;
                                if (!checkboxGroups.has(groupKey)) {
                                    checkboxGroups.set(groupKey, new Set());
                                }
                                checkboxGroups.get(groupKey).add(el.value);
                            }
                        }
                    }
                }
                else if ('value' in el) {
                    values.push(el.value);
                }
            });
            
            for (const radioValue of radioGroups.values()) {
                values.push(radioValue);
            }
            
            for (const checkboxSet of checkboxGroups.values()) {
                values.push(...checkboxSet);
            }
            
            if (this._length === 1) {
                return values[0] !== undefined ? values[0] : '';
            }
            
            return values;
        }
        
        return forEach((el, val) => {
            if (el.matches('select[multiple]') && Array.isArray(val)) {
                toArray(el.options).forEach(opt => {
                    opt.selected = val.includes(opt.value);
                });
                return;
            }
            
            if (el.type === 'checkbox' || el.type === 'radio') {
                if (el.type === 'checkbox' && !el.name) {
                    el.checked = !(val === false || val == null || val === '');
                } else if (Array.isArray(val)) {
                    el.checked = val.includes(el.value);
                } else if (el.type === 'radio') {
                    el.checked = (el.value === String(val));
                } else {
                    el.checked = !(val === false || val == null || val === '');
                }
                return;
            }
            
            el.value = val !== null && val !== undefined ? String(val) : '';
        }).call(this, value);
    };

    // ==================== FACTORY FUNCTION ====================
    function p$(selector) {
        if (!isBrowser) return nullChain;
        
        if (selector === undefined || selector === null) return nullChain;
        
        let elements = null;
        
        try {
            if (isString(selector)) {
                if (selector === '') return new Chain([]);
                elements = document.querySelectorAll(selector);
            } 
            else if (selector instanceof Chain) {
                return selector;
            }
            else if (selector === window || selector === document || isNode(selector)) {
                elements = [selector];
            }
            else if (selector && typeof selector === 'object' && 'length' in selector) {
                if (selector.length === 0) {
                    elements = [];
                } else if (selector[0] && isNode(selector[0])) {
                    elements = selector;
                } else {
                    return nullChain;
                }
            }
            else {
                return nullChain;
            }
        } catch (error) {
            if (isDev) console.warn('p$: Selector error:', error);
            return nullChain;
        }
        
        if (elements && elements.length) {
            const validElements = [];
            const seen = new WeakSet();
            
            toArray(elements).forEach(el => {
                if (el && isNode(el) && !seen.has(el)) {
                    seen.add(el);
                    
                    if (!document.contains(el)) {
                        EventRegistry.clear(el);
                    } else {
                        validElements.push(el);
                    }
                }
            });
            
            return validElements.length ? new Chain(validElements) : nullChain;
        }
        
        return nullChain;
    }

    // ==================== GLOBAL EXPORT ====================
    if (isBrowser) {
        window.p$ = p$;
        window.p$._version = '2.0.9';
    }
    
    // ==================== STATIC METHODS ====================
    p$.create = function(tag, attributes = {}) {
        if (!isBrowser) return nullChain;
        
        const el = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'class') {
                el.className = value;
            } else if (key === 'html') {
                el.innerHTML = value;
            } else if (key === 'text') {
                el.textContent = value;
            } else if (key.startsWith('on') && isFunction(value)) {
                const eventName = key.slice(2);
                const wrapped = (e) => value.call(el, e);
                
                EventRegistry.add(el, eventName, value, wrapped, {});
                el.addEventListener(eventName, wrapped);
            } else if (value !== null && value !== undefined) {
                el.setAttribute(key, String(value));
            }
        });
        
        return p$(el);
    };

    p$.ready = function(callback) {
        if (!isBrowser || !isFunction(callback)) return;
        
        if (document.readyState !== 'loading') {
            setTimeout(callback, 0);
            return;
        }
        
        document.addEventListener('DOMContentLoaded', callback, { once: true });
    };

    p$.hasPolos = () => isBrowser && !!window.Polos;
    
    p$.invalidateSelectorCache = function(element) {
        if (element) {
            selectorCache.delete(element);
        }
    };
    
    p$.getEventHandlers = function(element, eventName) {
        return EventRegistry.getHandlers(element, eventName);
    };
    
    p$.cleanup = function(element) {
        if (element) {
            EventRegistry.clear(element);
            selectorCache.delete(element);
        }
    };
    
    p$.teardown = function() {
        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }
        
        REGISTERED_ELEMENTS.forEach(el => {
            EventRegistry.clear(el);
        });
        
        selectorCache = new WeakMap();
    };
    p$.generateSelector = function(element) {
        return generateSafeSelector(element);
    };
    
    if (isDev) {
        p$._debug = {
            registeredElements: REGISTERED_ELEMENTS,
            eventRegistry: EventRegistry,
            selectorCache: selectorCache
        };
    }

    return p$;
});
