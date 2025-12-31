/*!
 * Polos JS v1.6.5 - Production Version (Final)
 * Core: Responsive Grid, Screen Detection, Event System, Maximized Popup & Toast
 * Compatible with Polos CSS Framework
 * @copyright 2025 Polos Style - MIT License
 * @link : https://github.com/alicom13/polos
 */
class Polos {
    constructor() {
        this.version = "1.6.5";
        this.breakpoints = {
            small: "(max-width: 575.98px)",
            medium: "(min-width: 576px) and (max-width: 767.98px)",
            large: "(min-width: 768px)"
        };
        this.classes = {
            loading: "lmn-loading",
            interactive: "js-inpolos",
            responsive: {
                show: { small: "d-sm", medium: "d-md", large: "d-lg" },
                hide: { small: "h-sm", medium: "h-md", large: "h-lg" }
            },
            popup: {
                wrapper: "popup",
                container: "pop",
                header: "pop-hd",
                title: "pop-title",
                body: "pop-bd",
                footer: "pop-ft",
                closeButton: "pop-close",
                button: "btn",
                sizePrefix: "pop-",
                type: { 
                    toast: "popup-toast", // Legacy, for old toast type
                    alert: "pop-alert"
                }
            },
            // NEW: Toast Classes
            toast: {
                container: "polos-toast-container",
                wrapper: "toast",
                content: "pt-content",
                closeButton: "pt-close",
                progressBar: "pt-progress-bar",
                progress: "pt-progress",
                types: {
                    success: "pt-success",
                    error: "pt-error",
                    info: "pt-info",
                    warning: "pt-warning"
                }
            }
        };
        this.defaults = {
            animationDuration: 300,
            closeOnBackdrop: true,
            toastDuration: 5000
        };
        
        this.currentScreenSize = "";
        this.observers = [];
        this.activePopups = new Set();
        this.staticPopups = new Set();
        this.activeToasts = new Map(); // NEW: Track active toasts
        this.timeouts = new Map();
        this._resizeTimeout = null;
        this._isInitialized = false;

        this.init();
    }

    // ==================== SCREEN DETECTION ====================
    detectScreenSize() {
        const prev = this.currentScreenSize;
        let newSize = "";
        
        if (window.matchMedia(this.breakpoints.large).matches) {
            newSize = "large";
        } else if (window.matchMedia(this.breakpoints.medium).matches) {
            newSize = "medium";
        } else if (window.matchMedia(this.breakpoints.small).matches) {
            newSize = "small";
        }
        
        if (prev !== newSize) {
            this.currentScreenSize = newSize;
            this.triggerEvent("screenChange", {
                from: prev,
                to: newSize,
                columns: this.getCurrentColumns()
            });
        }
    }

    getCurrentColumns() {
        return this.currentScreenSize === "large" ? 12 :
               this.currentScreenSize === "medium" ? 8 : 4;
    }

    getScreenSize() { 
        return this.currentScreenSize; 
    }

    refresh() { 
        this.detectScreenSize(); 
    }

    // ==================== GRID MANAGEMENT (ENHANCED) ====================
    manageGrid(gridSelector, gridConfig) {
        const grid = document.querySelector(gridSelector);
        if (!grid) return;

        const gridItems = grid.querySelectorAll('[class*="cl-"], [class*="cm-"], [class*="cs-"]');
        gridItems.forEach(el => {
            el.classList.forEach(cls => { 
                if (/^(cl|cm|cs)-\d+$/.test(cls)) el.classList.remove(cls); 
            });
        });

        const gridChildren = Array.from(grid.children)
            .filter(child => child.nodeType === Node.ELEMENT_NODE);
        
        let processedCount = 0;
        
        gridConfig.forEach((item, idx) => {
            if (!item) return;
            
            let el = null;
            for (let i = processedCount; i < gridChildren.length; i++) {
                const child = gridChildren[i];
                if (!child.hasAttribute('data-polos-grid-processed')) {
                    el = child;
                    child.setAttribute('data-polos-grid-processed', 'true');
                    processedCount = i + 1;
                    break;
                }
            }
            
            if (!el) return;

            if (item.large >= 1 && item.large <= 12) el.classList.add("cl-" + item.large);
            if (item.medium >= 1 && item.medium <= 8) el.classList.add("cm-" + item.medium);
            if (item.small >= 1 && item.small <= 4) el.classList.add("cs-" + item.small);
        });
        
        grid.querySelectorAll('[data-polos-grid-processed]').forEach(el => {
            el.removeAttribute('data-polos-grid-processed');
        });
    }

    // ==================== DOM UTILITIES (ENHANCED) ====================
    show(selector) {
        document.querySelectorAll(selector).forEach(el => {
            if (el.hasAttribute("data-polos-original-display")) {
                const originalDisplay = el.getAttribute("data-polos-original-display");
                el.style.display = originalDisplay;
                if (el.getAttribute('data-polos-hidden-by') === 'polos') {
                    el.removeAttribute("data-polos-original-display");
                    el.removeAttribute('data-polos-hidden-by');
                }
            } else {
                el.style.display = '';
            }
        });
    }

    hide(selector) {
        document.querySelectorAll(selector).forEach(el => {
            if (!el.hasAttribute("data-polos-original-display")) {
                const computedStyle = window.getComputedStyle(el);
                el.setAttribute("data-polos-original-display", computedStyle.display);
                el.setAttribute('data-polos-hidden-by', 'polos');
            }
            el.style.display = "none";
        });
    }

    showOn(selector, breakpoint) {
        const size = { small: "small", medium: "medium", large: "large" }[breakpoint];
        if (!size) return;
        
        const showClass = this.classes.responsive.show[size];
        const hideClass = this.classes.responsive.hide[size];
        
        document.querySelectorAll(selector).forEach(el => { 
            el.classList.add(showClass); 
            el.classList.remove(hideClass); 
        });
    }

    hideOn(selector, breakpoint) {
        const size = { small: "small", medium: "medium", large: "large" }[breakpoint];
        if (!size) return;
        
        const showClass = this.classes.responsive.show[size];
        const hideClass = this.classes.responsive.hide[size];
        
        document.querySelectorAll(selector).forEach(el => { 
            el.classList.add(hideClass); 
            el.classList.remove(showClass); 
        });
    }

    setLoading(selector, isLoading, text = "") {
        document.querySelectorAll(selector).forEach(el => {
            if (isLoading) { 
                el.classList.add(this.classes.loading); 
                if (text) el.setAttribute("data-polos-loading-text", text); 
            } else { 
                el.classList.remove(this.classes.loading); 
                if (el.hasAttribute("data-polos-loading-text")) {
                    el.removeAttribute("data-polos-loading-text");
                } 
            }
        });
    }

    enhance(selector) {
        document.querySelectorAll(selector).forEach(el => { 
            el.classList.add(this.classes.interactive); 
        });
    }

    // ==================== EVENT SYSTEM ====================
    on(observer, id = null) {
        if (typeof observer !== "function") return null;
        
        const observerId = id || "obs-" + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
        this.observers.push({ 
            id: observerId, 
            fn: observer, 
            timestamp: Date.now() 
        });
        
        return observerId;
    }

    off(identifier) {
        let index = -1;
        
        if (typeof identifier === "function") {
            index = this.observers.findIndex(o => o.fn === identifier);
        } else if (typeof identifier === "string") {
            index = this.observers.findIndex(o => o.id === identifier);
        }
        
        if (index > -1) { 
            this.observers.splice(index, 1);
            return true; 
        }
        
        return false;
    }

    triggerEvent(eventName, data) {
        this.observers.forEach(observer => {
            if (typeof observer.fn === "function") {
                try { 
                    observer.fn(eventName, data); 
                } catch (e) { 
                    console.error(`Polos: Error in observer ${observer.id}`, e); 
                }
            }
        });
    }

    // ==================== POPUP SYSTEM (ENHANCED) ====================
    _generatePopupId(prefix = "popup-") {
        return prefix + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
    }

    _getFocusableElements(container) {
        const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        return Array.from(container.querySelectorAll(focusableSelectors)).filter(el => {
            return !el.hasAttribute('disabled') && 
                   !el.getAttribute('aria-hidden') && 
                   el.offsetParent !== null;
        });
    }

    _trapFocus(popupEl) {
        const focusableElements = this._getFocusableElements(popupEl);
        if (focusableElements.length === 0) return;

        const firstFocusableEl = focusableElements[0];
        const lastFocusableEl = focusableElements[focusableElements.length - 1];

        const handleFocusTrap = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstFocusableEl) {
                        lastFocusableEl.focus();
                        e.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastFocusableEl) {
                        firstFocusableEl.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        popupEl.addEventListener('keydown', handleFocusTrap);
        popupEl._focusTrapListener = handleFocusTrap;
    }

    popup(options = {}) {
        const opts = {
            title: "", content: "", size: "md", type: "default", alertType: "info",
            buttons: [{ text: "OK", class: "pop-submit", action: "close" }],
            backdrop: true, keyboard: true, focus: true, triggerElement: null,
            onBeforeShow: null, onShown: null, onBeforeHide: null, onHidden: null,
            ...options
        };
        
        const popupId = this._generatePopupId();
        const c = this.classes.popup;
        let html = "";
        const popupSize = (opts.type === 'alert' || opts.type === 'confirm') ? (opts.size || "sm") : opts.size;
        const ariaLabelledBy = opts.title ? `id="popup-title-${popupId}"` : '';

        if (opts.type === "toast") { // Legacy support, redirects to new toast system
            return this.toast({ message: opts.content, type: opts.alertType, title: opts.title, timer: this.defaults.toastDuration });
        }

        const closeBtn = (opts.title || opts.type !== 'alert') ? 
            `<button class="${c.closeButton}" data-polos="close" aria-label="Close">&times;</button>` : "";
        const header = opts.title ? 
            `<div class="${c.header}"><h3 class="${c.title}" ${ariaLabelledBy}>${opts.title}</h3>${closeBtn}</div>` : "";
        let bodyContent = opts.content;
        if (opts.type === "alert" || opts.type === "confirm") {
            bodyContent = `<div class="${c.type.alert} ${opts.alertType}">${opts.content}</div>`;
        }
        const buttonsHtml = opts.buttons.map(btn => 
            `<button class="${btn.class}" data-polos="${btn.action || 'close'}">${btn.text}</button>`
        ).join("");
        const footer = (opts.buttons.length > 0 || opts.type === 'confirm') ? 
            `<div class="${c.footer}">${buttonsHtml}</div>` : "";
        
        html = `<div class="${c.wrapper}" id="${popupId}" role="dialog" aria-modal="true" ${ariaLabelledBy} aria-hidden="true">
                  <div class="${c.container} ${c.sizePrefix}${popupSize}">${header}<div class="${c.body}">${bodyContent}</div>${footer}</div>
                </div>`;

        document.body.insertAdjacentHTML("beforeend", html);
        const popupEl = document.getElementById(popupId);
        popupEl._popupOptions = opts;
        popupEl._triggerElement = opts.triggerElement;
        
        if (opts.backdrop === true) {
            popupEl.addEventListener('click', (e) => { if (e.target === popupEl) this.closePopup(popupId); });
        }

        if (opts.onBeforeShow) opts.onBeforeShow(popupEl);
        this.triggerEvent("popup:beforeShow", { popupId, relatedTarget: opts.triggerElement });
        this.openPopup(popupId);
        return popupId;
    }

    openPopup(popupId) {
        const popup = document.getElementById(popupId);
        if (!popup || popup.classList.contains("active")) return;
        const opts = popup._popupOptions;
        this.activePopups.add(popupId);
        popup.classList.add("active");
        popup.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = "hidden";

        if (opts.focus) {
            const focusableElements = this._getFocusableElements(popup);
            if (focusableElements.length > 0) focusableElements[0].focus();
            else { popup.querySelector('.pop')?.setAttribute('tabindex', '-1'); popup.querySelector('.pop')?.focus(); }
        }
        this._trapFocus(popup);

        setTimeout(() => {
            if (opts.onShown) opts.onShown(popup);
            this.triggerEvent("popup:shown", { popupId, relatedTarget: popup._triggerElement });
        }, this.defaults.animationDuration);
    }

    closePopup(popupId) {
        const popup = document.getElementById(popupId);
        if (!popup || !popup.classList.contains("active")) return;
        const opts = popup._popupOptions;
        if (opts.onBeforeHide) opts.onBeforeHide(popup);
        this.triggerEvent("popup:beforeHide", { popupId });

        popup.classList.remove("active");
        popup.setAttribute('aria-hidden', 'true');
        this.activePopups.delete(popupId);
        if (popup._focusTrapListener) popup.removeEventListener('keydown', popup._focusTrapListener);
        if (opts.focus && popup._triggerElement && typeof popup._triggerElement.focus === 'function') {
            popup._triggerElement.focus();
        }

        setTimeout(() => {
            if (!this.staticPopups.has(popupId) && popup.parentNode) popup.parentNode.removeChild(popup);
            if (this.activePopups.size === 0) document.body.style.overflow = "";
            if (opts.onHidden) opts.onHidden();
            this.triggerEvent("popup:hidden", { popupId, relatedTarget: popup._triggerElement });
        }, this.defaults.animationDuration);
    }

    closeAllPopups() { 
        Array.from(this.activePopups).forEach(popupId => this.closePopup(popupId)); 
    }
    
    updatePopup(popupId, options = {}) {
        const popup = document.getElementById(popupId);
        if (!popup) return false;
        const opts = { ...popup._popupOptions, ...options };
        popup._popupOptions = opts;
        if (options.title !== undefined) {
            const titleEl = popup.querySelector(`.${this.classes.popup.title}`);
            if (titleEl) titleEl.textContent = opts.title;
        }
        if (options.content !== undefined) {
            const bodyEl = popup.querySelector(`.${this.classes.popup.body}`);
            if (bodyEl) {
                if (opts.type === "alert" || opts.type === "confirm") {
                    bodyEl.innerHTML = `<div class="${this.classes.popup.type.alert} ${opts.alertType}">${opts.content}</div>`;
                } else {
                    bodyEl.innerHTML = opts.content;
                }
            }
        }
        return true;
    }

    alert(message, type = "info", title = "", size = "sm") {
        const content = title ? `<h4 style="margin-bottom:0.5rem">${title}</h4><p>${message}</p>` : `<p>${message}</p>`;
        const popupId = this.popup({ type: "alert", alertType: type, content: content, size: size, keyboard: false });
        return popupId;
    }

    confirm(message, onConfirm, onCancel = null, size = "sm") {
        const popupId = this.popup({ type: "confirm", content: message, size: size, onBeforeHide: (popupEl) => {
            const confirmBtn = popupEl.querySelector('[data-polos="confirm"]');
            const wasConfirmed = confirmBtn && (document.activeElement === confirmBtn || confirmBtn._wasClicked);
            if (wasConfirmed && typeof onConfirm === 'function') onConfirm();
            else if (!wasConfirmed && typeof onCancel === 'function') onCancel();
        }});
        return popupId;
    }

    // ==================== TOAST SYSTEM (MAXIMIZED) ====================
    _getToastContainer(position = 'top-right') {
        const containerClass = `${this.classes.toast.container} ${position}`;
        let container = document.querySelector(`.${containerClass.replace(' ', '.')}`);
        if (!container) {
            container = document.createElement('div');
            container.className = containerClass;
            const positions = { 'top-right': { top: '20px', right: '20px' }, 'top-left': { top: '20px', left: '20px' }, 'bottom-right': { bottom: '20px', right: '20px' }, 'bottom-left': { bottom: '20px', left: '20px' }, 'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' }, 'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' } };
            Object.assign(container.style, positions[position] || positions['top-right']);
            container.style.position = 'fixed'; container.style.zIndex = '9999'; container.style.display = 'flex'; container.style.flexDirection = 'column'; container.style.gap = '10px';
            document.body.appendChild(container);
        }
        return container;
    }

    toast(options = {}) {
        if (typeof options === 'string') options = { message: options };
        const opts = { message: '', type: 'info', title: '', timer: 3000, position: 'top-right', closeable: true, showProgressBar: true, icon: null, onClick: null, onClose: null, ...options };
        if (!opts.message) { console.error('Polos Toast: Message is required.'); return null; }
        
        const toastId = this._generatePopupId('toast-');
        const c = this.classes.toast;
        const typeClass = c.types[opts.type] || c.types.info;
        const iconClass = opts.icon || (opts.type === 'success' ? 'ti-circle-check' : opts.type === 'error' ? 'ti-circle-x' : opts.type === 'warning' ? 'ti-alert-triangle' : 'ti-info-circle');
        const closeButtonHtml = opts.closeable ? `<button class="${c.closeButton}" data-polos-toast-close="${toastId}">&times;</button>` : '';
        const progressBarHtml = opts.showProgressBar && opts.timer > 0 ? `<div class="${c.progressBar}"><div class="${c.progress}" style="animation-duration:${opts.timer}ms"></div></div>` : '';
        const titleHtml = opts.title ? `<b>${opts.title}</b><br>` : '';
        const html = `<div class="${c.wrapper} ${typeClass}" id="${toastId}" role="alert" aria-live="assertive"><i class="ti ${iconClass}"></i><div class="${c.content}">${titleHtml}${opts.message}</div>${closeButtonHtml}${progressBarHtml}</div>`;

        const container = this._getToastContainer(opts.position);
        container.insertAdjacentHTML('beforeend', html);
        const toastElement = document.getElementById(toastId);
        this.activeToasts.set(toastId, { element: toastElement, options: opts });

        if (opts.onClick) { toastElement.style.cursor = 'pointer'; toastElement.addEventListener('click', () => { opts.onClick(toastElement); this.closeToast(toastId); }); }
        if (opts.closeable) { toastElement.querySelector(`[data-polos-toast-close="${toastId}"]`).addEventListener('click', () => this.closeToast(toastId)); }
        if (opts.timer > 0) {
            toastElement.addEventListener('mouseenter', () => { const progressBar = toastElement.querySelector(`.${c.progress}`); if (progressBar) progressBar.style.animationPlayState = 'paused'; });
            toastElement.addEventListener('mouseleave', () => { const progressBar = toastElement.querySelector(`.${c.progress}`); if (progressBar) progressBar.style.animationPlayState = 'running'; });
        }
        
        let timeoutId = null;
        if (opts.timer > 0) timeoutId = setTimeout(() => this.closeToast(toastId), opts.timer);
        this.timeouts.set(toastId, timeoutId);
        this.triggerEvent("toast:shown", { toastId, options: opts });
        return toastId;
    }

    closeToast(toastId) {
        const toastData = this.activeToasts.get(toastId);
        if (!toastData) return;
        const { element, options } = toastData;
        if (this.timeouts.has(toastId)) { clearTimeout(this.timeouts.get(toastId)); this.timeouts.delete(toastId); }
        element.style.animation = 'ptOut 0.3s ease-out forwards';
        setTimeout(() => {
            element.remove(); this.activeToasts.delete(toastId);
            const container = element.parentElement; if (container && container.children.length === 0) container.remove();
            if (options.onClose) options.onClose(element);
            this.triggerEvent("toast:closed", { toastId, options });
        }, 300);
    }

    toastSuccess(message, title = '', timer = 3000) { return this.toast({ message, title, timer, type: 'success' }); }
    toastError(message, title = '', timer = 5000) { return this.toast({ message, title, timer, type: 'error' }); }
    toastInfo(message, title = '', timer = 3000) { return this.toast({ message, title, timer, type: 'info' }); }
    toastWarning(message, title = '', timer = 4000) { return this.toast({ message, title, timer, type: 'warning' }); }
    closeAllToasts() { this.activeToasts.forEach((_, toastId) => this.closeToast(toastId)); }

    // ==================== KEYBOARD SUPPORT (ENHANCED) ====================
    _handleKeydown(event) {
        if (event.key === "Escape" && this.activePopups.size > 0) {
            const popups = Array.from(this.activePopups);
            const topPopupId = popups[popups.length - 1];
            const topPopup = document.getElementById(topPopupId);
            if (topPopup && topPopup._popupOptions.keyboard !== false) this.closePopup(topPopupId);
        }
    }

    // ==================== CONFIRM ERROR FEEDBACK (ENHANCED) ====================
    _showConfirmErrorFeedback(popupEl, error) {
        const confirmButton = popupEl.querySelector('[data-polos="confirm"]');
        if (confirmButton) {
            const originalText = confirmButton.textContent; const originalClass = confirmButton.className;
            confirmButton.textContent = "Error!"; confirmButton.className = this.classes.popup.button + "-danger"; confirmButton.disabled = true;
            setTimeout(() => { if (confirmButton.parentNode) { confirmButton.textContent = originalText; confirmButton.className = originalClass; confirmButton.disabled = false; } }, 2000);
        }
        this.triggerEvent("confirmError", { popupId: popupEl.id, error: error.message || error });
    }

    // ==================== DEBUG & INFO ====================
    debug() {
        return {
            version: this.version, screenSize: this.currentScreenSize, columns: this.getCurrentColumns(),
            observers: this.observers.length, activePopups: Array.from(this.activePopups),
            staticPopups: Array.from(this.staticPopups), activeToasts: Array.from(this.activeToasts.keys()),
            timeouts: Array.from(this.timeouts.keys()), initialized: this._isInitialized
        };
    }

    // ==================== CLEANUP (ENHANCED) ====================
    destroy() {
        this.closeAllPopups();
        this.closeAllToasts();
        this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
        this.timeouts.clear();
        if (this._resizeTimeout) { clearTimeout(this._resizeTimeout); this._resizeTimeout = null; }
        const polosAttributes = ['data-polos-original-display', 'data-polos-hidden-by', 'data-polos-loading-text', 'data-polos-grid-processed'];
        polosAttributes.forEach(attr => { document.querySelectorAll(`[${attr}]`).forEach(el => el.removeAttribute(attr)); });
        this.observers = []; this.activePopups.clear(); this.staticPopups.clear(); this.activeToasts.clear();
        if (window.Polos === this) { window.Polos = null; }
        this._isInitialized = false;
    }

    // ==================== RE-INIT PROTECTION (ENHANCED) ====================
    reinit() {
        if (this._isInitialized) { console.warn("Polos: Already initialized. Destroying first..."); this.destroy(); }
        console.log("Polos: Re-initializing..."); this.init(); return true;
    }

    // ==================== INITIALIZATION (ENHANCED) ====================
    init() {
        if (this._isInitialized) {
            console.error("Polos: Already initialized! Use .reinit() to force re-initialization.");
            return false;
        }
        
        this.detectScreenSize();
        
        // --- INITIALIZATION FOR STATIC POPUPS ---
        document.querySelectorAll('.popup').forEach(popupEl => {
            if (!popupEl.id) { console.warn('Polos: Static popup found without an ID. Assigning a random ID.', popupEl); popupEl.id = this._generatePopupId('static-'); }
            this.staticPopups.add(popupEl.id);
            const opts = { title: "", content: "", size: "md", backdrop: true, keyboard: true, focus: true, onBeforeShow: null, onShown: null, onBeforeHide: null, onHidden: null, };
            for (const key in opts) {
                const dataAttr = `polos${key.charAt(0).toUpperCase() + key.slice(1)}`;
                if (popupEl.dataset[dataAttr] !== undefined) {
                    if (typeof opts[key] === 'boolean') opts[key] = popupEl.dataset[dataAttr] !== 'false';
                    else opts[key] = popupEl.dataset[dataAttr];
                }
            }
            popupEl._popupOptions = opts;
            const existingCloseBtn = popupEl.querySelector('.pop-close');
            if (existingCloseBtn && !existingCloseBtn.dataset.polos) existingCloseBtn.dataset.polos = 'close';
        });

        // --- EVENT LISTENERS ---
        const handleResize = () => { if (this._resizeTimeout) clearTimeout(this._resizeTimeout); this._resizeTimeout = setTimeout(() => { this.detectScreenSize(); }, 100); };
        window.addEventListener("resize", handleResize);
        const handleKeydown = (e) => this._handleKeydown(e);
        window.addEventListener("keydown", handleKeydown);
        
        const handleClick = (event) => {
            // Handle static popup trigger
            const popupTrigger = event.target.closest('[data-polos-popup]');
            if (popupTrigger) {
                const targetSelector = popupTrigger.dataset.polosPopup;
                if (targetSelector) {
                    const popupEl = document.querySelector(targetSelector);
                    if (popupEl) { popupEl._triggerElement = popupTrigger; this.openPopup(targetSelector.replace("#", "")); }
                }
                return;
            }
            // Handle toast close button
            const toastCloseBtn = event.target.closest('[data-polos-toast-close]');
            if (toastCloseBtn) {
                this.closeToast(toastCloseBtn.dataset.polosToastClose);
                return;
            }
            // Handle other data-polos actions
            const trigger = event.target.closest('[data-polos]');
            if (!trigger) return;
            const action = trigger.dataset.polos;
            try {
                switch (action) {
                    case "close": const popupToClose = trigger.closest("." + this.classes.popup.wrapper); if (popupToClose) { this.closePopup(popupToClose.id); } break;
                    case "confirm": const popupToConfirm = trigger.closest("." + this.classes.popup.wrapper); if (popupToConfirm) { trigger._wasClicked = true; this.closePopup(popupToConfirm.id); } break;
                    case "toggle-class": if (trigger.dataset.polosTarget && trigger.dataset.polosClass) { document.querySelectorAll(trigger.dataset.polosTarget).forEach(target => { target.classList.toggle(trigger.dataset.polosClass); }); } break;
                }
            } catch (error) { console.error("Polos: Error handling data attribute", error); }
        };
        document.addEventListener("click", handleClick);
        
        const handleBeforeUnload = () => { this.closeAllPopups(); this.closeAllToasts(); };
        window.addEventListener("beforeunload", handleBeforeUnload);

        this.triggerEvent("initialized", { version: this.version, timestamp: new Date().toISOString() });
        this._isInitialized = true;
        return true;
    }
}

// ==================== GLOBAL INSTANCE (ENHANCED) ====================
if (!window.Polos) {
    window.Polos = new Polos();
    console.log(`Polos JS v${window.Polos.version} (Final) initialized`);
} else {
    console.warn("Polos: Instance already exists. Using existing instance.");
    console.warn("Polos: Use window.Polos.reinit() to force re-initialization.");
}
const PolosInstance = window.Polos;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Polos;
}
