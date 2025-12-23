/*!
 * Polos JS v1.6.4 - Production Version
 * Core: Responsive Grid, Screen Detection, Event System, Popup
 * Compatible with Polos CSS Framework
 * @copyright 2025 Polos Style - MIT License
 * @link : https://github.com/alicom13/polos
 */
class Polos {
    constructor() {
        this.version = "1.6.4";
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
                    toast: "popup-toast", 
                    alert: "pop-alert"
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

    // ==================== POPUP SYSTEM ====================
    _generatePopupId(prefix = "popup-") {
        return prefix + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
    }

    popup(options = {}) {
        const opts = {
            title: "",
            content: "",
            size: "md",
            type: "default",
            alertType: "info",
            buttons: [{ 
                text: "OK", 
                class: this.classes.popup.button + "-primary", 
                action: "close" 
            }],
            onClose: null,
            onOpen: null,
            onConfirm: null,
            closeOnBackdrop: this.defaults.closeOnBackdrop,
            ...options
        };
        
        const popupId = this._generatePopupId();
        const c = this.classes.popup;
        let html = "";

        const popupSize = opts.type === "alert" || opts.type === "confirm" 
            ? (opts.size || "sm")
            : opts.size;

        if (opts.type === "toast") {
            html = `<div class="${c.type.toast}" id="${popupId}">${opts.content}</div>`;
        } else if (opts.type === "alert") {
            html = `<div class="${c.wrapper}" id="${popupId}">
                      <div class="${c.container} ${c.sizePrefix}${popupSize}">
                        <div class="${c.body}">
                          <div class="${c.type.alert} ${opts.alertType}">${opts.content}</div>
                        </div>
                        <div class="${c.footer}">
                          <button class="${c.button}-primary" data-polos="close">OK</button>
                        </div>
                      </div>
                    </div>`;
        } else if (opts.type === "confirm") {
            html = `<div class="${c.wrapper}" id="${popupId}">
                      <div class="${c.container} ${c.sizePrefix}${popupSize}">
                        <div class="${c.body}">
                          <div class="${c.type.alert} ${opts.alertType || 'info'}">${opts.content}</div>
                        </div>
                        <div class="${c.footer}">
                          <button class="${c.button}-secondary" data-polos="close">Batal</button>
                          <button class="${c.button}-primary" data-polos="confirm">OK</button>
                        </div>
                      </div>
                    </div>`;
        } else {
            const closeBtn = opts.title ? 
                `<button class="${c.closeButton}" data-polos="close">&times;</button>` : "";
            const header = opts.title ? 
                `<div class="${c.header}">
                   <h3 class="${c.title}">${opts.title}</h3>${closeBtn}
                 </div>` : "";
            
            const buttonsHtml = opts.buttons.map(btn => 
                `<button class="${btn.class}" data-polos="${btn.action || 'close'}">${btn.text}</button>`
            ).join("");
            
            const footer = opts.buttons.length > 0 ? 
                `<div class="${c.footer}">${buttonsHtml}</div>` : "";
            
            html = `<div class="${c.wrapper}" id="${popupId}">
                      <div class="${c.container} ${c.sizePrefix}${opts.size}">
                        ${header}
                        <div class="${c.body}">${opts.content}</div>
                        ${footer}
                      </div>
                    </div>`;
        }

        document.body.insertAdjacentHTML("beforeend", html);
        const popupEl = document.getElementById(popupId);
        popupEl._popupOptions = opts;
        
        if (opts.closeOnBackdrop) {
            popupEl.addEventListener('click', (e) => {
                if (e.target === popupEl) {
                    this.closePopup(popupId);
                }
            });
        }

        if (opts.onOpen) opts.onOpen();
        this.activePopups.add(popupId);
        return popupId;
    }

    openPopup(popupId) {
        const popup = document.getElementById(popupId);
        if (!popup) return;
        
        popup.classList.add("active");
        document.body.style.overflow = "hidden";

        if (popup.classList.contains(this.classes.popup.type.toast)) {
            const duration = popup._popupOptions?.duration || this.defaults.toastDuration;
            
            const totalDuration = duration + this.defaults.animationDuration;
            const timeoutId = setTimeout(() => {
                if (popup.parentNode) {
                    this.closePopup(popupId);
                }
            }, totalDuration);
            
            this.timeouts.set(popupId, timeoutId);
        }

        this.triggerEvent("popupOpened", { popupId });
    }

    closePopup(popupId) {
        const popup = document.getElementById(popupId);
        if (!popup) return;
        
        if (this.timeouts.has(popupId)) { 
            clearTimeout(this.timeouts.get(popupId)); 
            this.timeouts.delete(popupId); 
        }

        popup.classList.remove("active");
        this.activePopups.delete(popupId);

        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
            
            if (this.activePopups.size === 0) {
                document.body.style.overflow = "";
            }
            
            popup._popupOptions?.onClose?.();
        }, this.defaults.animationDuration);

        this.triggerEvent("popupClosed", { popupId });
    }

    closeAllPopups() { 
        Array.from(this.activePopups).forEach(popupId => this.closePopup(popupId)); 
    }

    alert(message, type = "info", title = "", size = "sm") {
        const content = title ? 
            `<h4 style="margin-bottom:0.5rem">${title}</h4><p>${message}</p>` : 
            `<p>${message}</p>`;
        
        const popupId = this.popup({ 
            type: "alert", 
            alertType: type, 
            content: content,
            size: size
        });
        
        this.openPopup(popupId);
        return popupId;
    }

    confirm(message, onConfirm, onCancel = null, size = "sm") {
        try {
            const popupId = this.popup({ 
                type: "confirm", 
                content: message, 
                onConfirm: onConfirm, 
                onClose: onCancel,
                size: size
            });
            
            this.openPopup(popupId);
            return popupId;
        } catch (error) {
            console.error("Polos: Error creating confirm dialog", error);
            return null;
        }
    }

    toast(message, duration = 3000) {
        const popupId = this.popup({ 
            type: "toast", 
            content: message, 
            duration: duration 
        });
        
        this.openPopup(popupId);
        return popupId;
    }

    // ==================== KEYBOARD SUPPORT (ENHANCED) ====================
    _handleKeydown(event) {
        if (event.key === "Escape" && this.activePopups.size > 0) {
            const popups = Array.from(this.activePopups);
            
            let topPopupId = popups[popups.length - 1];
            
            this.closePopup(topPopupId);
        }
    }

    // ==================== CONFIRM ERROR FEEDBACK (ENHANCED) ====================
    _showConfirmErrorFeedback(popupEl, error) {
        const confirmButton = popupEl.querySelector('[data-polos="confirm"]');
        if (confirmButton) {
            const originalText = confirmButton.textContent;
            const originalClass = confirmButton.className;
            
            confirmButton.textContent = "Error!";
            confirmButton.className = this.classes.popup.button + "-danger";
            confirmButton.disabled = true;
            
            setTimeout(() => {
                if (confirmButton.parentNode) {
                    confirmButton.textContent = originalText;
                    confirmButton.className = originalClass;
                    confirmButton.disabled = false;
                }
            }, 2000);
        }
        
        this.triggerEvent("confirmError", { 
            popupId: popupEl.id, 
            error: error.message || error 
        });
    }

    // ==================== DEBUG & INFO ====================
    debug() {
        return {
            version: this.version,
            screenSize: this.currentScreenSize,
            columns: this.getCurrentColumns(),
            observers: this.observers.length,
            activePopups: Array.from(this.activePopups),
            timeouts: Array.from(this.timeouts.keys()),
            initialized: this._isInitialized
        };
    }

    // ==================== CLEANUP (ENHANCED) ====================
    destroy() {
        this.closeAllPopups();
        
        this.timeouts.forEach((timeoutId, popupId) => {
            clearTimeout(timeoutId);
        });
        this.timeouts.clear();
        
        if (this._resizeTimeout) {
            clearTimeout(this._resizeTimeout);
            this._resizeTimeout = null;
        }
        
        const polosAttributes = [
            'data-polos-original-display',
            'data-polos-hidden-by',
            'data-polos-loading-text',
            'data-polos-grid-processed'
        ];
        
        polosAttributes.forEach(attr => {
            document.querySelectorAll(`[${attr}]`).forEach(el => {
                el.removeAttribute(attr);
            });
        });
        
        this.observers = [];
        this.activePopups.clear();
        
        if (window.Polos === this) {
            window.Polos = null;
        }
        
        this._isInitialized = false;
    }

    // ==================== RE-INIT PROTECTION (ENHANCED) ====================
    reinit() {
        if (this._isInitialized) {
            console.warn("Polos: Already initialized. Destroying first...");
            this.destroy();
        }
        
        console.log("Polos: Re-initializing...");
        this.init();
        return true;
    }

    // ==================== INITIALIZATION (ENHANCED) ====================
    init() {
        if (this._isInitialized) {
            console.error("Polos: Already initialized! Use .reinit() to force re-initialization.");
            console.error("Polos: Calling init() multiple times may cause memory leaks.");
            return false;
        }
        
        this.detectScreenSize();
        
        const handleResize = () => {
            if (this._resizeTimeout) clearTimeout(this._resizeTimeout);
            this._resizeTimeout = setTimeout(() => {
                this.detectScreenSize();
            }, 100);
        };
        
        window.addEventListener("resize", handleResize);
        
        const handleKeydown = (e) => this._handleKeydown(e);
        window.addEventListener("keydown", handleKeydown);
        
        const handleClick = (event) => {
            const trigger = event.target.closest('[data-polos]');
            if (!trigger) return;
            
            const action = trigger.dataset.polos;
            const targetSelector = trigger.dataset.polosTarget;
            const className = trigger.dataset.polosClass;

            try {
                switch (action) {
                    case "popup": 
                        if (targetSelector) {
                            this.openPopup(targetSelector.replace("#", ""));
                        }
                        break;
                        
                    case "close": 
                        const popupToClose = trigger.closest("." + this.classes.popup.wrapper);
                        if (popupToClose) {
                            this.closePopup(popupToClose.id);
                        }
                        break;
                        
                    case "confirm": 
                        const popupToConfirm = trigger.closest("." + this.classes.popup.wrapper);
                        if (popupToConfirm) {
                            const isConfirmType = popupToConfirm._popupOptions?.type === "confirm";
                            if (isConfirmType && popupToConfirm._popupOptions?.onConfirm) {
                                try {
                                    popupToConfirm._popupOptions.onConfirm();
                                } catch (confirmError) {
                                    this._showConfirmErrorFeedback(popupToConfirm, confirmError);
                                    return;
                                }
                            }
                            this.closePopup(popupToConfirm.id);
                        }
                        break;
                        
                    case "toggle-class": 
                        if (targetSelector && className) { 
                            document.querySelectorAll(targetSelector).forEach(target => {
                                target.classList.toggle(className); 
                            });
                        } 
                        break;
                }
            } catch (error) {
                console.error("Polos: Error handling data attribute", error);
            }
        };
        
        document.addEventListener("click", handleClick);
        
        const handleBeforeUnload = () => { 
            this.closeAllPopups(); 
        };
        window.addEventListener("beforeunload", handleBeforeUnload);

        this.triggerEvent("initialized", {
            version: this.version,
            timestamp: new Date().toISOString()
        });
        
        this._isInitialized = true;
        return true;
    }
}

// ==================== GLOBAL INSTANCE (ENHANCED) ====================
if (!window.Polos) {
    window.Polos = new Polos();
    console.log(`Polos JS v${window.Polos.version} initialized`);
} else {
    console.warn("Polos: Instance already exists. Using existing instance.");
    console.warn("Polos: Use window.Polos.reinit() to force re-initialization.");
}
const PolosInstance = window.Polos;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Polos;
}
