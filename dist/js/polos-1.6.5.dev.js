/*!
 * Polos JS v1.6.5 - Production Version (Final)
 * Core: Responsive Grid, Screen Detection, Event System, Maximized Popup & Toast
 * Compatible with Polos CSS Framework
 * @copyright 2025 Polos Style - MIT License
 * @link : https://github.com/alicom13/polos
 */
(function(global) {
    'use strict';
    
    class Polos {
        constructor() {
            this.version = "1.6.5";
            
            this.breakpoints = {
                small: "(max-width: 575.98px)",
                medium: "(min-width: 576px) and (max-width: 767.98px)",
                large: "(min-width: 768px)"
            };
            
            this.classes = {
                loading: "polos-loading",
                interactive: "js-inpolos",
                responsive: {
                    show: { 
                        small: "d-sm",
                        medium: "d-md",
                        large: "d-lg"
                    },
                    hide: { 
                        small: "h-sm",
                        medium: "h-md",
                        large: "h-lg"
                    }
                },
                grid: {
                    small: "cs-",
                    medium: "cm-", 
                    large: "cl-"
                },
                modal: {
                    wrapper: "popup",
                    container: "pop",
                    header: "pop-hd",
                    title: "pop-title",
                    body: "pop-bd",
                    footer: "pop-ft",
                    closeButton: "pop-close",
                    sizePrefix: "pop-"
                }
            };
            
            this.defaults = {
                animationDuration: 300,
                closeOnBackdrop: true,
                toastDuration: 5000,
                toastRemoveAnimation: 'toastOut 0.3s forwards',
                modalRemoveDelay: 100
            };
            
            this.currentScreen = "";
            this.activeModals = new Set();
            this.activeToasts = new Set();
            this.timeouts = new Map();
            this._eventListeners = new Map();
            this._toastData = new Map();
            this._modalObservers = new Map();
            this._responsiveElements = new Map();
            this._modalButtonListeners = new Map();
            this._resizeTimeout = null;
            this._isInitialized = false;

            this._boundMethods = new Map();
            
            this._bindMethods([
                'init', 'showModal', 'hideModal', 'toggleModal', 'closeAllModals',
                'toast', 'success', 'error', 'info', 'warning', '_removeToast', '_removeAllToasts',
                'alert', 'confirm', 'modal', 'popup', 'openPopup', 'closePopup', 'closeAllPopups',
                'show', 'hide', 'showOn', 'hideOn', 'setLoading', 'enhance',
                'manageGrid', 'detectScreen', 'getCurrentColumns', 'getScreenSize', 'refresh',
                'debug', 'destroy'
            ]);
            
            this.init();
        }

        _bindMethods(methodNames) {
            methodNames.forEach(method => {
                if (typeof this[method] === 'function') {
                    this._boundMethods.set(method, this[method].bind(this));
                    this[method] = this._boundMethods.get(method);
                }
            });
        }

        _addEventListener(element, event, handler, options = {}) {
            if (!this._eventListeners.has(event)) {
                this._eventListeners.set(event, []);
            }
            this._eventListeners.get(event).push({ element, handler, options });
            element.addEventListener(event, handler, options);
        }

        _removeAllEventListeners() {
            this._eventListeners.forEach((listeners, event) => {
                listeners.forEach(({ element, handler, options }) => {
                    element.removeEventListener(event, handler, options);
                });
            });
            this._eventListeners.clear();
        }

        init() {
            if (this._isInitialized) {
                console.warn('Polos: Already initialized');
                return false;
            }
            
            this.detectScreen();
            this._setupEventListeners();
            this._setupResizeHandler();
            
            this._isInitialized = true;
            console.log(`Polos JS v${this.version} ready`);
            
            return true;
        }

        _setupEventListeners() {
            this._addEventListener(document, "click", (e) => {
                const target = e.target;
                
                const modalToggle = target.closest('[data-polos-toggle="modal"]');
                if (modalToggle) {
                    e.preventDefault();
                    const modalId = modalToggle.dataset.polosTarget?.replace('#', '');
                    if (modalId) this.toggleModal(modalId);
                    return;
                }
                
                const modalDismiss = target.closest('[data-polos-dismiss="modal"]');
                if (modalDismiss) {
                    e.preventDefault();
                    const modal = modalDismiss.closest('.popup');
                    if (modal) this.hideModal(modal.id);
                    return;
                }
                
                const toastDismiss = target.closest('[data-polos-dismiss="toast"]');
                if (toastDismiss) {
                    e.preventDefault();
                    const toast = toastDismiss.closest('.toast');
                    if (toast) this._removeToast(toast.id);
                    return;
                }
                
                if (target.classList.contains('popup')) {
                    const modalId = target.id;
                    const modal = document.getElementById(modalId);
                    
                    if (modal && modal.dataset.polosBackdrop !== 'static' && !target.closest('.pop')) {
                        e.preventDefault();
                        this.hideModal(modalId);
                    }
                }
            });

            const handleKeydown = (e) => {
                if (e.key === "Escape" && this.activeModals.size > 0) {
                    const modals = Array.from(this.activeModals);
                    const topModalId = modals[modals.length - 1];
                    const modal = document.getElementById(topModalId);
                    
                    if (modal && modal.dataset.polosBackdrop !== 'static') {
                        this.hideModal(topModalId);
                    }
                }
            };
            this._addEventListener(document, "keydown", handleKeydown);
        }

        _setupResizeHandler() {
            const handleResize = () => {
                if (this._resizeTimeout) clearTimeout(this._resizeTimeout);
                this._resizeTimeout = setTimeout(() => {
                    const prevScreen = this.currentScreen;
                    this.detectScreen();
                    
                    if (prevScreen !== this.currentScreen) {
                        this._updateResponsiveElements();
                    }
                }, 100);
            };
            this._addEventListener(window, "resize", handleResize);
        }

        _addResponsiveElement(selector, breakpoint, action) {
            const cssBreakpoint = this._jsToCssBreakpoint(breakpoint);
            if (!cssBreakpoint) return;
            
            if (!this._responsiveElements.has(selector)) {
                this._responsiveElements.set(selector, []);
            }
            this._responsiveElements.get(selector).push({ breakpoint: cssBreakpoint, action });
            
            this._applyResponsiveClass(selector, cssBreakpoint, action);
        }

        _updateResponsiveElements() {
            this._responsiveElements.forEach((rules, selector) => {
                rules.forEach(({ breakpoint, action }) => {
                    this._applyResponsiveClass(selector, breakpoint, action);
                });
            });
        }

        _applyResponsiveClass(selector, breakpoint, action) {
            const elements = document.querySelectorAll(selector);
            if (elements.length === 0) return;
            
            const showClass = this.classes.responsive.show[breakpoint];
            const hideClass = this.classes.responsive.hide[breakpoint];
            
            if (!showClass || !hideClass) return;
            
            elements.forEach(el => {
                if (action === 'show') {
                    if (this.currentScreen === breakpoint) {
                        el.classList.add(showClass);
                        el.classList.remove(hideClass);
                    } else {
                        el.classList.add(hideClass);
                        el.classList.remove(showClass);
                    }
                } else if (action === 'hide') {
                    if (this.currentScreen === breakpoint) {
                        el.classList.add(hideClass);
                        el.classList.remove(showClass);
                    } else {
                        el.classList.add(showClass);
                        el.classList.remove(hideClass);
                    }
                }
            });
        }

        _jsToCssBreakpoint(breakpoint) {
            const mapping = {
                'xs': 'small',
                'sm': 'medium', 
                'md': 'large',
                'small': 'small',
                'medium': 'medium',
                'large': 'large'
            };
            return mapping[breakpoint] || null;
        }

        detectScreen() {
            const prev = this.currentScreen;
            let newSize = "";
            
            if (window.matchMedia(this.breakpoints.large).matches) {
                newSize = "large";
            } else if (window.matchMedia(this.breakpoints.medium).matches) {
                newSize = "medium";
            } else if (window.matchMedia(this.breakpoints.small).matches) {
                newSize = "small";
            }
            
            if (prev !== newSize) {
                this.currentScreen = newSize;
            }
        }

        getCurrentColumns() {
            switch(this.currentScreen) {
                case "large":
                    return 12;
                case "medium":
                    return 8;
                case "small":
                default:
                    return 4;
            }
        }

        getScreenSize() { 
            return this.currentScreen; 
        }

        refresh() { 
            this.detectScreen(); 
        }

        manageGrid(gridSelector, gridConfig) {
            const grid = document.querySelector(gridSelector);
            if (!grid) {
                console.warn(`Polos: Grid "${gridSelector}" not found`);
                return;
            }

            const items = grid.querySelectorAll('[class*="cs-"], [class*="cm-"], [class*="cl-"]');
            items.forEach(el => {
                el.classList.forEach(cls => { 
                    if (/^(cs|cm|cl)-\d+$/.test(cls)) el.classList.remove(cls); 
                });
            });

            const children = Array.from(grid.children)
                .filter(child => child.nodeType === Node.ELEMENT_NODE);
            
            gridConfig.forEach((item, idx) => {
                if (!item || idx >= children.length) return;
                
                const el = children[idx];
                
                const smallCols = item.small || item.xs;
                const mediumCols = item.medium || item.sm;
                const largeCols = item.large || item.md;
                
                if (largeCols >= 1 && largeCols <= 12) {
                    el.classList.add("cl-" + largeCols);
                } else if (largeCols !== undefined) {
                    console.warn(`Polos: Invalid large column value (${largeCols}) for item ${idx + 1}. Must be between 1 and 12.`);
                }
                
                if (mediumCols >= 1 && mediumCols <= 8) {
                    el.classList.add("cm-" + mediumCols);
                } else if (mediumCols !== undefined) {
                    console.warn(`Polos: Invalid medium column value (${mediumCols}) for item ${idx + 1}. Must be between 1 and 8.`);
                }
                
                if (smallCols >= 1 && smallCols <= 4) {
                    el.classList.add("cs-" + smallCols);
                } else if (smallCols !== undefined) {
                    console.warn(`Polos: Invalid small column value (${smallCols}) for item ${idx + 1}. Must be between 1 and 4.`);
                }
            });
        }

        show(selector) {
            document.querySelectorAll(selector).forEach(el => {
                const original = el.dataset.polosOriginalDisplay;
                if (original) {
                    el.style.display = original;
                    delete el.dataset.polosOriginalDisplay;
                    delete el.dataset.polosHiddenBy;
                } else {
                    el.style.display = '';
                }
            });
        }

        hide(selector) {
            document.querySelectorAll(selector).forEach(el => {
                if (!el.dataset.polosOriginalDisplay) {
                    el.dataset.polosOriginalDisplay = window.getComputedStyle(el).display;
                    el.dataset.polosHiddenBy = 'polos';
                }
                el.style.display = "none";
            });
        }

        showOn(selector, breakpoint) {
            const cssBreakpoint = this._jsToCssBreakpoint(breakpoint);
            if (!cssBreakpoint) {
                console.warn(`Polos: Invalid breakpoint "${breakpoint}". Use: small/medium/large or xs/sm/md`);
                return;
            }
            
            this._addResponsiveElement(selector, cssBreakpoint, 'show');
        }

        hideOn(selector, breakpoint) {
            const cssBreakpoint = this._jsToCssBreakpoint(breakpoint);
            if (!cssBreakpoint) {
                console.warn(`Polos: Invalid breakpoint "${breakpoint}". Use: small/medium/large or xs/sm/md`);
                return;
            }
            
            this._addResponsiveElement(selector, cssBreakpoint, 'hide');
        }

        setLoading(selector, isLoading, text = "") {
            document.querySelectorAll(selector).forEach(el => {
                if (isLoading) { 
                    el.classList.add(this.classes.loading); 
                    if (text) el.dataset.polosLoadingText = text; 
                } else { 
                    el.classList.remove(this.classes.loading); 
                    delete el.dataset.polosLoadingText;
                }
            });
        }

        enhance(selector) {
            document.querySelectorAll(selector).forEach(el => { 
                el.classList.add(this.classes.interactive); 
            });
        }

        showModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) {
                console.error(`Polos: Modal #${modalId} not found`);
                return false;
            }

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.activeModals.add(modalId);

            return true;
        }

        hideModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) {
                console.warn(`Polos: Modal #${modalId} not found during hide`);
                return false;
            }

            modal.classList.remove('active');
            this.activeModals.delete(modalId);

            if (this.activeModals.size === 0) {
                document.body.style.overflow = '';
            }

            this._cleanupModalResources(modalId);

            return true;
        }

        toggleModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) {
                console.error(`Polos: Modal #${modalId} not found for toggle`);
                return false;
            }

            if (modal.classList.contains('active')) {
                return this.hideModal(modalId);
            } else {
                return this.showModal(modalId);
            }
        }

        closeAllModals() {
            this.activeModals.forEach(modalId => this.hideModal(modalId));
        }

        toast(message, options = {}) {
            const opts = {
                duration: options.duration || this.defaults.toastDuration,
                type: options.type || 'info',
                title: options.title || '',
                position: options.position || 'top-right',
                closable: options.closable !== undefined ? options.closable : true,
                ...options
            };

            const toastId = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            const toastHTML = `
                <div class="toast ${opts.type} ${opts.position}" id="${toastId}">
                    <div class="toast-content">
                        ${opts.title ? `<strong>${opts.title}</strong><br>` : ''}
                        ${message}
                    </div>
                    ${opts.closable ? 
                        `<button type="button" class="toast-close" data-polos-dismiss="toast">&times;</button>` 
                        : ''}
                    ${opts.duration > 0 ? 
                        `<div class="toast-bar">
                            <div class="toast-progress" style="animation-duration: ${opts.duration}ms"></div>
                        </div>` 
                        : ''}
                </div>
            `;

            let container = document.querySelector('.toast-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'toast-container';
                document.body.appendChild(container);
            }

            container.insertAdjacentHTML('beforeend', toastHTML);
            const toastEl = document.getElementById(toastId);

            if (opts.duration > 0) {
                const timeout = setTimeout(() => {
                    this._removeToast(toastId);
                }, opts.duration);
                this.timeouts.set(toastId, timeout);
            }

            if (opts.duration > 0) {
                const handleMouseEnter = () => {
                    const progress = toastEl.querySelector('.toast-progress');
                    if (progress) progress.style.animationPlayState = 'paused';
                };
                
                const handleMouseLeave = () => {
                    const progress = toastEl.querySelector('.toast-progress');
                    if (progress) progress.style.animationPlayState = 'running';
                };
                
                toastEl.addEventListener('mouseenter', handleMouseEnter);
                toastEl.addEventListener('mouseleave', handleMouseLeave);
                
                this._toastData.set(toastId, {
                    element: toastEl,
                    listeners: [
                        { type: 'mouseenter', handler: handleMouseEnter },
                        { type: 'mouseleave', handler: handleMouseLeave }
                    ]
                });
            }

            this.activeToasts.add(toastId);
            return toastId;
        }

        _getAnimationDuration(animationString) {
            const match = animationString.match(/(\d+(?:\.\d+)?)s/);
            return match ? parseFloat(match[1]) * 1000 : 300;
        }

        _removeToast(toastId) {
            if (this.timeouts.has(toastId)) {
                clearTimeout(this.timeouts.get(toastId));
                this.timeouts.delete(toastId);
            }
            
            if (this._toastData.has(toastId)) {
                const toastData = this._toastData.get(toastId);
                toastData.listeners?.forEach(({ type, handler }) => {
                    if (toastData.element) {
                        toastData.element.removeEventListener(type, handler);
                    }
                });
                this._toastData.delete(toastId);
            }
            
            const toast = document.getElementById(toastId);
            if (!toast) return;

            toast.style.animation = this.defaults.toastRemoveAnimation;
            const duration = this._getAnimationDuration(this.defaults.toastRemoveAnimation);
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                this.activeToasts.delete(toastId);
            }, duration);
        }

        _removeAllToasts() {
            this.activeToasts.forEach(toastId => this._removeToast(toastId));
        }

        success(message, options = {}) {
            return this.toast(message, { ...options, type: 'success' });
        }

        error(message, options = {}) {
            return this.toast(message, { ...options, type: 'error' });
        }

        info(message, options = {}) {
            return this.toast(message, { ...options, type: 'info' });
        }

        warning(message, options = {}) {
            return this.toast(message, { ...options, type: 'warning' });
        }

        alert(message, title = "Alert", options = {}) {
            const modalId = 'alert-' + Date.now();
            const closeOnBackdrop = options.closeOnBackdrop !== undefined ? options.closeOnBackdrop : this.defaults.closeOnBackdrop;
            
            const modalHTML = `
                <div class="popup" id="${modalId}" ${!closeOnBackdrop ? 'data-polos-backdrop="static"' : ''}>
                    <div class="pop pop-sm">
                        <div class="pop-bd" style="text-align: center; padding: 2rem;">
                            <p style="margin: 0 0 1rem 0;">${message}</p>
                            <button class="btn btn-primary" data-polos-dismiss="modal" style="min-width: 80px;">OK</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this._setupModalAutoRemoval(modalId);
            this.showModal(modalId);
            return modalId;
        }

        confirm(message, onConfirm, onCancel = null, options = {}) {
            const modalId = 'confirm-' + Date.now();
            const closeOnBackdrop = options.closeOnBackdrop !== undefined ? options.closeOnBackdrop : this.defaults.closeOnBackdrop;
            
            const modalHTML = `
                <div class="popup" id="${modalId}" ${!closeOnBackdrop ? 'data-polos-backdrop="static"' : ''}>
                    <div class="pop pop-sm">
                        <div class="pop-bd" style="text-align: center; padding: 2rem;">
                            <p style="margin: 0 0 1.5rem 0;">${message}</p>
                            <div style="display: flex; gap: 0.5rem; justify-content: center;">
                                <button class="btn btn-secondary" data-polos-dismiss="modal" id="cancel-btn-${modalId}">Cancel</button>
                                <button class="btn btn-primary" id="confirm-btn-${modalId}">OK</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            const setupButtons = () => {
                const confirmBtn = document.getElementById(`confirm-btn-${modalId}`);
                const cancelBtn = document.getElementById(`cancel-btn-${modalId}`);
                
                if (confirmBtn) {
                    const confirmHandler = () => {
                        if (onConfirm) onConfirm();
                        this.hideModal(modalId);
                    };
                    confirmBtn.addEventListener('click', confirmHandler);
                    this._storeModalButtonListener(modalId, confirmBtn, 'click', confirmHandler);
                }
                
                if (cancelBtn) {
                    const cancelHandler = () => {
                        if (onCancel) onCancel();
                        this.hideModal(modalId);
                    };
                    cancelBtn.addEventListener('click', cancelHandler);
                    this._storeModalButtonListener(modalId, cancelBtn, 'click', cancelHandler);
                }
            };
            
            if (document.getElementById(modalId)) {
                setupButtons();
            } else {
                requestAnimationFrame(setupButtons);
            }
            
            this._setupModalAutoRemoval(modalId);
            this.showModal(modalId);
            return modalId;
        }

        modal(options = {}) {
            const modalId = options.id || 'modal-' + Date.now();
            const size = options.size || 'md';
            const title = options.title || '';
            const content = options.content || '';
            const footer = options.footer || '';
            const closeOnBackdrop = options.closeOnBackdrop !== undefined ? options.closeOnBackdrop : this.defaults.closeOnBackdrop;
            const staticBackdrop = options.staticBackdrop || !closeOnBackdrop;
            
            const modalHTML = `
                <div class="popup" id="${modalId}" ${staticBackdrop ? 'data-polos-backdrop="static"' : ''}>
                    <div class="pop ${this.classes.modal.sizePrefix}${size}">
                        ${title ? `
                        <div class="${this.classes.modal.header}">
                            <h5 class="${this.classes.modal.title}">${title}</h5>
                            <button class="${this.classes.modal.closeButton}" data-polos-dismiss="modal">&times;</button>
                        </div>
                        ` : ''}
                        <div class="${this.classes.modal.body}">
                            ${content}
                        </div>
                        ${footer ? `
                        <div class="${this.classes.modal.footer}">
                            ${footer}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this._setupModalAutoRemoval(modalId);
            this.showModal(modalId);
            
            return modalId;
        }

        _storeModalButtonListener(modalId, element, event, handler) {
            if (!this._modalButtonListeners.has(modalId)) {
                this._modalButtonListeners.set(modalId, []);
            }
            this._modalButtonListeners.get(modalId).push({ element, event, handler });
        }

        _cleanupModalResources(modalId) {
            if (this._modalObservers.has(modalId)) {
                this._modalObservers.get(modalId).disconnect();
                this._modalObservers.delete(modalId);
            }
            
            if (this._modalButtonListeners.has(modalId)) {
                this._modalButtonListeners.get(modalId).forEach(({ element, event, handler }) => {
                    if (element && element.removeEventListener) {
                        element.removeEventListener(event, handler);
                    }
                });
                this._modalButtonListeners.delete(modalId);
            }
        }

        _setupModalAutoRemoval(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            const observer = new MutationObserver(() => {
                if (!modal.classList.contains('active')) {
                    setTimeout(() => {
                        if (modal.parentNode) {
                            modal.parentNode.removeChild(modal);
                        }
                        this._cleanupModalResources(modalId);
                    }, this.defaults.modalRemoveDelay);
                }
            });
            
            observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
            this._modalObservers.set(modalId, observer);
        }

        popup(options = {}) {
            if (options.type === 'alert') {
                return this.alert(options.content || '', options.title || 'Alert', {
                    closeOnBackdrop: options.closeOnBackdrop
                });
            } else if (options.type === 'confirm') {
                return this.confirm(
                    options.content || '',
                    options.onConfirm,
                    options.onCancel || options.onClose,
                    { closeOnBackdrop: options.closeOnBackdrop }
                );
            } else if (options.type === 'toast') {
                return this.toast(options.content || '', { 
                    duration: options.duration,
                    type: options.toastType || 'info'
                });
            } else {
                return this.modal(options);
            }
        }

        openPopup(popupId) {
            return this.showModal(popupId);
        }

        closePopup(popupId) {
            const el = document.getElementById(popupId);
            if (el && el.classList.contains('popup')) {
                return this.hideModal(popupId);
            } else if (el && el.classList.contains('toast')) {
                return this._removeToast(popupId);
            }
            return false;
        }

        closeAllPopups() {
            this.closeAllModals();
            this._removeAllToasts();
        }

        destroy() {
            this.closeAllModals();
            this._removeAllToasts();
            
            this.timeouts.forEach(timeout => clearTimeout(timeout));
            this.timeouts.clear();
            
            this._modalButtonListeners.forEach((listeners, modalId) => {
                this._cleanupModalResources(modalId);
            });
            this._modalButtonListeners.clear();
            
            this._removeAllEventListeners();
            
            if (this._resizeTimeout) {
                clearTimeout(this._resizeTimeout);
                this._resizeTimeout = null;
            }
            
            this._toastData.clear();
            this._responsiveElements.clear();
            
            const attributes = ['data-polos-original-display', 'data-polos-hidden-by', 'data-polos-loading-text'];
            attributes.forEach(attr => {
                document.querySelectorAll(`[${attr}]`).forEach(el => {
                    el.removeAttribute(attr);
                });
            });
            
            this.activeModals.clear();
            this.activeToasts.clear();
            this._boundMethods.clear();
            
            if (global.Polos === this) {
                global.Polos = null;
            }
            
            this._isInitialized = false;
            console.log("Polos v" + this.version + ": Cleaned up successfully");
        }

        debug() {
            return {
                version: this.version,
                screen: this.currentScreen,
                columns: this.getCurrentColumns(),
                activeModals: Array.from(this.activeModals),
                activeToasts: Array.from(this.activeToasts),
                breakpoints: Object.keys(this.breakpoints),
                responsiveElements: this._responsiveElements.size,
                modalButtonListeners: this._modalButtonListeners.size,
                initialized: this._isInitialized
            };
        }
    }

    if (!global.Polos) {
        global.Polos = new Polos();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (global.Polos && !global.Polos._isInitialized) {
                global.Polos.init();
            }
        });
    } else {
        if (global.Polos && !global.Polos._isInitialized) {
            global.Polos.init();
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Polos;
    }

})(typeof window !== 'undefined' ? window : this);
