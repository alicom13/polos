/*!
 * Polos DOM (p$) Plugin v2.0.9 - Final Production
 * Lightweight, Chainable DOM utilities with Polos integration
 * Requires Polos JS v1.6.1+
 * © 2025 Polos Style - MIT License 
 */
(function(global) {
    "use strict";
    
    if (typeof global.p$ === 'function' && global.p$._version === '2.1.0') return;
    
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    const isDev = isBrowser && window.__POLOS_DEV__ === true;
    
    const createNullChain = () => {
        const baseMethods = {
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
            polosPopup: () => null,
            __isNullChain: true
        };
        
        const nullChain = Object.freeze(Object.create(baseMethods));
        nullChain._el = [];
        nullChain._length = 0;
        
        return new Proxy(nullChain, {
            get(target, prop) {
                if (prop in target) return target[prop];
                if (typeof prop === 'string') {
                    if (prop.startsWith('polos') || prop.startsWith('_')) {
                        return () => {
                            if (isDev) console.warn(`p$: Method "${prop}" not available`);
                            return target;
                        };
                    }
                    return () => target;
                }
                return target[prop];
            }
        });
    };
    
    const EVENT_REGISTRY = Symbol('polos.events');
    const eventCounter = { count: 0 };
    
    const EventRegistry = {
        init(element) {
            if (!element[EVENT_REGISTRY]) {
                element[EVENT_REGISTRY] = {
                    handlers: new Map(),
                    idCounter: 0
                };
            }
            return element[EVENT_REGISTRY];
        },
        
        _createHandlerKey(handler, options) {
            const uniqueId = `${eventCounter.count++}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const handlerId = handler.name || 'anonymous';
            const optionsHash = options ? JSON.stringify(options) : 'default';
            return `${handlerId}_${uniqueId}_${optionsHash}`.slice(0, 100);
        },
        
        add(element, event, handler, wrapper, options = {}) {
            const registry = this.init(element);
            const eventHandlers = registry.handlers.get(event) || new Map();
            const handlerKey = this._createHandlerKey(handler, options);
            
            const handlerData = {
                original: handler,
                wrapped: wrapper,
                options: options,
                key: handlerKey,
                id: handler.__p$eventId || Symbol(`event-${event}`)
            };
            
            handler.__p$eventKey = handlerKey;
            handler.__p$eventElement = element;
            
            eventHandlers.set(handlerKey, handlerData);
            registry.handlers.set(event, eventHandlers);
            
            element.addEventListener(event, wrapper, options);
            return handlerKey;
        },
        
        remove(element, event, handler, options = {}) {
            const registry = element[EVENT_REGISTRY];
            if (!registry) return false;
            
            const eventHandlers = registry.handlers.get(event);
            if (!eventHandlers) return false;
            
            let removed = false;
            
            if (!handler) {
                for (const [key, data] of eventHandlers.entries()) {
                    element.removeEventListener(event, data.wrapped, data.options);
                    eventHandlers.delete(key);
                }
                removed = true;
            } else {
                const keysToRemove = [];
                
                for (const [key, data] of eventHandlers.entries()) {
                    if (data.original === handler) {
                        keysToRemove.push(key);
                    } else if (handler.__p$eventKey && handler.__p$eventKey === key) {
                        keysToRemove.push(key);
                    } else if (options && JSON.stringify(data.options) === JSON.stringify(options)) {
                        keysToRemove.push(key);
                    }
                }
                
                for (const key of keysToRemove) {
                    const data = eventHandlers.get(key);
                    if (data) {
                        element.removeEventListener(event, data.wrapped, data.options);
                        eventHandlers.delete(key);
                        removed = true;
                    }
                }
            }
            
            if (eventHandlers.size === 0) {
                registry.handlers.delete(event);
            }
            if (registry.handlers.size === 0) {
                delete element[EVENT_REGISTRY];
            }
            
            return removed;
        },
        
        clear(element) {
            const registry = element[EVENT_REGISTRY];
            if (!registry) return;
            
            for (const [event, eventHandlers] of registry.handlers.entries()) {
                for (const [key, data] of eventHandlers.entries()) {
                    element.removeEventListener(event, data.wrapped, data.options);
                }
            }
            
            delete element[EVENT_REGISTRY];
        }
    };
    
    const toArray = (items) => Array.from(items || []);
    const isFunction = (fn) => typeof fn === 'function';
    const isString = (str) => typeof str === 'string';
    const isNode = (node) => node && typeof node.nodeType === 'number';
    
    const Chain = function(elements) {
        if (!isBrowser) {
            return createNullChain();
        }
        
        const seen = new WeakSet();
        const result = [];
        
        const process = (item) => {
            if (!item) return;
            
            if (item instanceof Chain) {
                item._el.forEach(process);
                return;
            }
            
            if (item.nodeType === 1 || item === window || item === document) {
                if (!seen.has(item)) {
                    seen.add(item);
                    result.push(item);
                }
                return;
            }
            
            if (item.length !== undefined) {
                for (let i = 0; i < item.length; i++) {
                    const el = item[i];
                    if (el && (el.nodeType === 1 || el instanceof Chain)) {
                        process(el);
                    } else if (isDev && el && !el.nodeType) {
                        console.warn('p$: Invalid element in collection at index', i, el);
                    }
                }
                return;
            }
            
            if (isDev) {
                console.warn('p$: Unsupported selector type:', typeof item, item);
            }
        };
        
        process(elements);
        this._el = result;
        this._length = result.length;
        
        if (this._length === 0) {
            return createNullChain();
        }
    };
    
    const forEach = (method) => function(...args) {
        this._el = this._el.filter(el => 
            isNode(el) && (!isBrowser || document.contains(el))
        );
        this._length = this._el.length;
        
        for (const el of this._el) {
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
        if (this._length === 0) return undefined;
        const el = this._el[0];
        if (!el || (isBrowser && !document.contains(el))) return undefined;
        return method(el, ...args);
    };
    
    Chain.prototype.on = function(event, handler, options = {}) {
        if (!isFunction(handler)) return this;
        
        return forEach((el, evt, hdl, opts) => {
            const wrapper = (e) => {
                try {
                    hdl.call(el, e);
                } catch (error) {
                    if (isDev) console.error('p$: Event handler error:', error);
                }
            };
            
            EventRegistry.add(el, evt, hdl, wrapper, opts);
        }).call(this, event, handler, options);
    };
    
    Chain.prototype.off = function(event, handler, options = {}) {
        return forEach((el, evt, hdl, opts) => {
            EventRegistry.remove(el, evt, hdl, opts);
        }).call(this, event, handler, options);
    };
    
    Chain.prototype.one = function(event, handler, options = {}) {
        if (!isFunction(handler)) return this;
        
        return forEach((el, evt, hdl, opts) => {
            const wrapper = (e) => {
                try {
                    hdl.call(el, e);
                } finally {
                    EventRegistry.remove(el, evt, hdl, opts);
                }
            };
            
            EventRegistry.add(el, evt, hdl, wrapper, { ...opts, once: true });
        }).call(this, event, handler, options);
    };
    
    Chain.prototype.val = function(value) {
        if (value === undefined) {
            if (this._length === 0) return undefined;
            
            if (this._length === 1) {
                const el = this._el[0];
                
                if (el.matches('select[multiple]')) {
                    return toArray(el.selectedOptions).map(opt => opt.value);
                }
                
                if (el.type === 'checkbox' || el.type === 'radio') {
                    return el.checked ? el.value : '';
                }
                
                return 'value' in el ? el.value : '';
            }
            
            const values = [];
            const processedGroups = new Set();
            
            this._el.forEach(el => {
                if (el.type === 'checkbox' && el.name) {
                    const groupKey = `checkbox_${el.name}`;
                    if (!processedGroups.has(groupKey) && el.checked) {
                        const groupValues = this._el
                            .filter(e => e.name === el.name && e.checked)
                            .map(e => e.value);
                        values.push(...groupValues);
                        processedGroups.add(groupKey);
                    }
                } else if (el.type === 'radio' && el.name && el.checked) {
                    const groupKey = `radio_${el.name}`;
                    if (!processedGroups.has(groupKey)) {
                        values.push(el.value);
                        processedGroups.add(groupKey);
                    }
                } else if (el.type === 'checkbox' && !el.name && el.checked) {
                    values.push(el.value);
                } else if ('value' in el && !el.name) {
                    values.push(el.value);
                }
            });
            
            return values;
        }
        
        return forEach((el, val) => {
            if (el.matches('select[multiple]')) {
                const values = Array.isArray(val) ? val : [val];
                toArray(el.options).forEach(opt => {
                    opt.selected = values.includes(opt.value);
                });
                return;
            }
            
            if (el.type === 'checkbox' || el.type === 'radio') {
                if (Array.isArray(val)) {
                    el.checked = val.includes(el.value);
                } else {
                    el.checked = (el.value === String(val) || val === true);
                }
                return;
            }
            
            if ('value' in el) {
                el.value = val !== null && val !== undefined ? String(val) : '';
            }
        }).call(this, value);
    };
    
    Chain.prototype.html = function(content) {
        if (content === undefined) {
            return fromFirst(el => el.innerHTML).call(this);
        }
        return forEach((el, html) => { el.innerHTML = html; }).call(this, content);
    };
    
    Chain.prototype.text = function(content) {
        if (content === undefined) {
            return fromFirst(el => el.textContent).call(this);
        }
        return forEach((el, text) => { el.textContent = text; }).call(this, content);
    };
    
    Chain.prototype.attr = function(name, value) {
        if (value === undefined) {
            return fromFirst(el => el.getAttribute(name)).call(this);
        }
        return forEach((el, attrName, attrValue) => {
            attrValue != null ? 
                el.setAttribute(attrName, attrValue) : 
                el.removeAttribute(attrName);
        }).call(this, name, value);
    };
    
    Chain.prototype.css = function(name, value) {
        if (value === undefined && typeof name === 'string') {
            return fromFirst(el => getComputedStyle(el)[name]).call(this);
        }
        
        return forEach((el, cssName, cssValue) => {
            if (typeof cssName === 'object') {
                Object.assign(el.style, cssName);
            } else {
                el.style[cssName] = cssValue;
            }
        }).call(this, name, value);
    };
    
    Chain.prototype.addClass = function(className) {
        return forEach((el, cls) => {
            el.classList.add(cls);
        }).call(this, className);
    };
    
    Chain.prototype.removeClass = function(className) {
        return forEach((el, cls) => {
            el.classList.remove(cls);
        }).call(this, className);
    };
    
    Chain.prototype.hasClass = function(className) {
        return fromFirst(el => el.classList.contains(className)).call(this);
    };
    
    Chain.prototype.remove = function() {
        return forEach((el) => {
            EventRegistry.clear(el);
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }).call(this);
    };
    
    Chain.prototype.append = function(content) {
        return forEach((el) => {
            if (typeof content === 'string') {
                el.insertAdjacentHTML('beforeend', content);
            } else if (content instanceof Chain) {
                content._el.forEach(child => el.appendChild(child.cloneNode(true)));
            } else if (content && content.nodeType) {
                el.appendChild(content.cloneNode(true));
            }
        }).call(this, content);
    };
    
    Chain.prototype.prepend = function(content) {
        return forEach((el) => {
            if (typeof content === 'string') {
                el.insertAdjacentHTML('afterbegin', content);
            } else if (content instanceof Chain) {
                content._el.reverse().forEach(child => el.insertBefore(child.cloneNode(true), el.firstChild));
            } else if (content && content.nodeType) {
                el.insertBefore(content.cloneNode(true), el.firstChild);
            }
        }).call(this, content);
    };
    
    Chain.prototype.empty = function() {
        return forEach((el) => {
            while (el.firstChild) {
                el.removeChild(el.firstChild);
            }
        }).call(this);
    };
    
    Chain.prototype.find = function(selector) {
        if (this._length === 0) return createNullChain();
        
        const elements = [];
        this._el.forEach(el => {
            const found = el.querySelectorAll(selector);
            elements.push(...toArray(found));
        });
        
        return new Chain(elements);
    };
    
    Chain.prototype.parent = function() {
        if (this._length === 0) return createNullChain();
        
        const parents = [];
        this._el.forEach(el => {
            if (el.parentNode) {
                parents.push(el.parentNode);
            }
        });
        
        return new Chain(parents);
    };
    
    Chain.prototype.children = function() {
        if (this._length === 0) return createNullChain();
        
        const children = [];
        this._el.forEach(el => {
            children.push(...toArray(el.children));
        });
        
        return new Chain(children);
    };
    
    Chain.prototype.first = function() {
        if (this._length === 0) return createNullChain();
        return new Chain([this._el[0]]);
    };
    
    Chain.prototype.last = function() {
        if (this._length === 0) return createNullChain();
        return new Chain([this._el[this._length - 1]]);
    };
    
    Chain.prototype.eq = function(index) {
        if (this._length === 0 || index >= this._length || index < 0) {
            return createNullChain();
        }
        return new Chain([this._el[index]]);
    };
    
    Chain.prototype.each = function(callback) {
        if (!isFunction(callback)) return this;
        
        this._el.forEach((el, index) => {
            try {
                callback.call(el, index, el);
            } catch (e) {
                if (isDev) console.warn('p$: Error in each callback:', e);
            }
        });
        
        return this;
    };
    
    Chain.prototype.map = function(callback) {
        if (!isFunction(callback)) return [];
        
        return this._el.map((el, index) => {
            try {
                return callback.call(el, index, el);
            } catch (e) {
                if (isDev) console.warn('p$: Error in map callback:', e);
                return null;
            }
        });
    };
    
    Chain.prototype.filter = function(selector) {
        if (this._length === 0) return createNullChain();
        
        const filtered = this._el.filter(el => {
            if (isFunction(selector)) {
                try {
                    return selector.call(el, el);
                } catch (e) {
                    if (isDev) console.warn('p$: Error in filter callback:', e);
                    return false;
                }
            }
            return el.matches(selector);
        });
        
        return new Chain(filtered);
    };
    
    Chain.prototype.is = function(selector) {
        if (this._length === 0) return false;
        
        const el = this._el[0];
        if (isFunction(selector)) {
            try {
                return selector.call(el, el);
            } catch (e) {
                if (isDev) console.warn('p$: Error in is callback:', e);
                return false;
            }
        }
        return el.matches(selector);
    };
    
    Chain.prototype.show = function() {
        return forEach((el) => {
            el.style.display = '';
        }).call(this);
    };
    
    Chain.prototype.hide = function() {
        return forEach((el) => {
            el.style.display = 'none';
        }).call(this);
    };
    
    Chain.prototype.data = function(key, value) {
        if (value === undefined && typeof key === 'string') {
            return fromFirst(el => el.dataset[key]).call(this);
        }
        
        if (typeof key === 'object') {
            return forEach((el, dataObj) => {
                Object.entries(dataObj).forEach(([k, v]) => {
                    el.dataset[k] = v;
                });
            }).call(this, key);
        }
        
        return forEach((el, dataKey, dataValue) => {
            if (dataValue === undefined || dataValue === null) {
                delete el.dataset[dataKey];
            } else {
                el.dataset[dataKey] = dataValue;
            }
        }).call(this, key, value);
    };
    
    Chain.prototype.removeAttr = function(name) {
        return forEach((el, attrName) => {
            el.removeAttribute(attrName);
        }).call(this, name);
    };
    
    function p$(selector) {
        if (!isBrowser) return createNullChain();
        
        if (selector === undefined || selector === null) {
            return createNullChain();
        }
        
        if (isString(selector) && selector.trim() === '') {
            return createNullChain();
        }
        
        if (isString(selector)) {
            try {
                const elements = document.querySelectorAll(selector);
                return new Chain(elements);
            } catch (error) {
                if (isDev) console.warn('p$: Invalid selector:', selector, error);
                return createNullChain();
            }
        }
        
        if (selector instanceof Chain) {
            return selector;
        }
        
        if (isNode(selector) || selector === window || selector === document) {
            return new Chain([selector]);
        }
        
        if (selector && typeof selector === 'object' && 'length' in selector) {
            const isValid = Array.from(selector).every(item => 
                isNode(item) || item === window || item === document || item instanceof Chain
            );
            
            if (isValid) {
                return new Chain(selector);
            } else if (isDev) {
                console.warn('p$: Invalid collection - contains non-DOM elements');
            }
        }
        
        if (selector && selector.jquery) {
            try {
                return new Chain(selector.toArray());
            } catch (e) {
                if (isDev) console.warn('p$: jQuery conversion failed:', e);
            }
        }
        
        return createNullChain();
    }
    
    p$.create = function(tag, attributes = {}) {
        if (!isBrowser) return createNullChain();
        
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
                el.addEventListener(eventName, value);
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
    
    p$.cleanup = function(element) {
        if (element) EventRegistry.clear(element);
    };
    
    p$.getEventHandlers = function(element, eventName) {
        if (!element || !element[EVENT_REGISTRY]) return [];
        const registry = element[EVENT_REGISTRY];
        if (!eventName) return Array.from(registry.handlers.keys());
        return Array.from(registry.handlers.get(eventName)?.keys() || []);
    };
    
    p$.noConflict = function() {
        if (global._p$legacy) {
            global.p$ = global._p$legacy;
            delete global._p$legacy;
        }
        return p$;
    };
    
    if (isBrowser) {
        if (global.p$ && global.p$._version) {
            global._p$legacy = global.p$;
        }
        
        global.p$ = p$;
        global.p$._version = '2.1.0';
        
        if (isDev) {
            p$._debug = {
                EventRegistry: EventRegistry,
                isNullChain: (obj) => obj && obj.__isNullChain === true
            };
        }
    }
    
    return p$;
    
})(typeof window !== 'undefined' ? window : this);
