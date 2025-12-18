/*!
 * Polos JS v1.6.1 - Production Version
 * Core: Responsive Grid, Screen Detection, Event System, Popup
 * Compatible with Polos CSS Framework
 * @copyright 2025 Polos Style - MIT License
 * @link : https://github.com/alicom13/polos
 */

class Polos {
    constructor() {
        this.version = "1.6.1";

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
                    alertBox: "pop-alert"
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

        this.init();
    }

    // ==================== CORE METHODS ====================
    detectScreenSize() {
        const prev = this.currentScreenSize;
        if (window.matchMedia(this.breakpoints.large).matches) {
            this.currentScreenSize = "large";
        } else if (window.matchMedia(this.breakpoints.medium).matches) {
            this.currentScreenSize = "medium";
        } else if (window.matchMedia(this.breakpoints.small).matches) {
            this.currentScreenSize = "small";
        }

        if (prev !== this.currentScreenSize) {
            this.triggerEvent("screenChange", {
                from: prev,
                to: this.currentScreenSize,
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

    manageGrid(gridSelector, gridConfig) {
        const grid = document.querySelector(gridSelector);
        if (!grid) return;

        grid.querySelectorAll('[class*="cl-"], [class*="cm-"], [class*="cs-"]').forEach(el => {
            el.classList.forEach(cls => {
                if (/^(cl|cm|cs)-\d+$/.test(cls)) {
                    el.classList.remove(cls);
                }
            });
        });

        const gridElementChildren = grid.querySelectorAll(':scope > *');
    
        gridConfig.forEach((item, idx) => {
            const el = gridElementChildren[idx];
            if (!el) return;

            if (item.large >= 1 && item.large <= 12) el.classList.add("cl-" + item.large);
            if (item.medium >= 1 && item.medium <= 8) el.classList.add("cm-" + item.medium);
            if (item.small >= 1 && item.small <= 4) el.classList.add("cs-" + item.small);
        });
    }

    // ==================== DOM UTILITIES ====================
    show(selector) {
        document.querySelectorAll(selector).forEach(el => {
            const originalDisplay = el.getAttribute("data-polos-original-display");
            el.style.display = originalDisplay || '';
        });
    }

    hide(selector) {
        document.querySelectorAll(selector).forEach(el => {
            if (!el.hasAttribute("data-polos-original-display")) {
                const computedStyle = window.getComputedStyle(el);
                el.setAttribute("data-polos-original-display", computedStyle.display);
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
                if (el.hasAttribute("data-polos-loading-text")) el.removeAttribute("data-polos-loading-text");
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
        const observerId = id || "obs-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
        this.observers.push({ id: observerId, fn: observer, timestamp: Date.now() });
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
                observer.fn(eventName, data);
            }
        });
    }

    // ==================== POPUP SYSTEM ====================
    _generatePopupId(prefix = "popup-") {
        return prefix + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    }

    popup(options = {}) {
        const opts = {
            title: "",
            content: "",
            size: "md",
            type: "default",
            alertType: "info",
            buttons: [{ text: "OK", class: this.classes.popup.button + "-primary", action: "close" }],
            onClose: null,
            onOpen: null,
            onConfirm: null,
            closeOnBackdrop: this.defaults.closeOnBackdrop,
            ...options
        };

        const popupId = this._generatePopupId();
        const c = this.classes.popup;
        let html = "";

        if (opts.type === "toast") {
            html = `<div class="${c.type.toast}" id="${popupId}">${opts.content}</div>`;
        } else if (opts.type === "alert") {
            html = `<div class="${c.wrapper}" id="${popupId}"><div class="${c.container} ${c.sizePrefix}sm"><div class="${c.body}"><div class="${c.type.alert} ${opts.alertType}">${opts.content}</div></div><div class="${c.footer}"><button class="${c.button}-primary" data-polos="close">OK</button></div></div></div>`;
        } else if (opts.type === "confirm") {
            html = `<div class="${c.wrapper}" id="${popupId}"><div class="${c.container} ${c.sizePrefix}sm"><div class="${c.body}"><div class="${c.type.alert} ${opts.alertType || 'info'}">${opts.content}</div></div><div class="${c.footer}"><button class="${c.button}-secondary" data-polos="close">Batal</button><button class="${c.button}-primary" data-polos="confirm">OK</button></div></div></div>`;
        } else {
            const closeBtn = opts.title ? `<button class="${c.closeButton}" data-polos="close">&times;</button>` : "";
            const header = opts.title ? `<div class="${c.header}"><h3 class="${c.title}">${opts.title}</h3>${closeBtn}</div>` : "";
            const buttonsHtml = opts.buttons.map(btn => `<button class="${btn.class}" data-polos="close">${btn.text}</button>`).join("");
            const footer = opts.buttons.length > 0 ? `<div class="${c.footer}">${buttonsHtml}</div>` : "";
            html = `<div class="${c.wrapper}" id="${popupId}"><div class="${c.container} ${c.sizePrefix}${opts.size}">${header}<div class="${c.body}">${opts.content}</div>${footer}</div></div>`;
        }

        document.body.insertAdjacentHTML("beforeend", html);
        const popupEl = document.getElementById(popupId);
        popupEl._popupOptions = opts;

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
            const duration = popup._popupOptions && popup._popupOptions.duration ? popup._popupOptions.duration : this.defaults.toastDuration;
            setTimeout(() => this.closePopup(popupId), duration);
        }

        this.triggerEvent("popupOpened", { popupId });
    }

    closePopup(popupId) {
        const popup = document.getElementById(popupId);
        if (!popup) return;

        popup.classList.remove("active");
        this.activePopups.delete(popupId);

        setTimeout(() => {
            if (popup.parentNode) popup.parentNode.removeChild(popup);
            if (this.activePopups.size === 0) document.body.style.overflow = "";
            if (popup._popupOptions && popup._popupOptions.onClose) popup._popupOptions.onClose();
        }, this.defaults.animationDuration);

        this.triggerEvent("popupClosed", { popupId });
    }

    closeAllPopups() {
        this.activePopups.forEach(popupId => this.closePopup(popupId));
    }

    alert(message, type = "info", title = "") {
        const content = title ? `<h4 style="margin-bottom:0.5rem">${title}</h4><p>${message}</p>` : `<p>${message}</p>`;
        const popupId = this.popup({ type: "alert", alertType: type, content: content });
        this.openPopup(popupId);
        return popupId;
    }

    confirm(message, onConfirm, onCancel = null) {
        const popupId = this.popup({ type: "confirm", content: message, onConfirm: onConfirm, onClose: onCancel });
        this.openPopup(popupId);
        return popupId;
    }

    toast(message, duration = 3000) {
        const popupId = this.popup({ type: "toast", content: message, duration: duration });
        this.openPopup(popupId);
        return popupId;
    }

    // ==================== DEBUG & INFO ====================
    debug() {
        return {
            version: this.version,
            screenSize: this.currentScreenSize,
            columns: this.getCurrentColumns(),
            observers: this.observers.length,
            activePopups: this.activePopups.size,
            classes: this.classes
        };
    }

    // ==================== INITIALIZATION ====================
    init() {
        this.detectScreenSize();

        let resizeTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.detectScreenSize(), 100);
        });

        this.triggerEvent("initialized", {
            version: this.version,
            timestamp: new Date().toISOString()
        });

        window.addEventListener('beforeunload', () => {
            this.closeAllPopups();
        });

        // --- NEW: Data Attribute API ---
        document.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-polos]');
            if (!trigger) return;

            const action = trigger.dataset.polos;
            const targetSelector = trigger.dataset.polosTarget;
            const className = trigger.dataset.polosClass;

            switch (action) {
                case 'popup':
                    if (targetSelector) {
                        this.openPopup(targetSelector.replace('#', ''));
                    }
                    break;
                case 'close':
                    const popupToClose = trigger.closest('.' + this.classes.popup.wrapper);
                    if (popupToClose) {
                        this.closePopup(popupToClose.id);
                    }
                    break;
                case 'confirm':
                    const popupToConfirm = trigger.closest('.' + this.classes.popup.wrapper);
                    if (popupToConfirm && popupToConfirm._popupOptions.onConfirm) {
                        // Jalankan fungsi onConfirm terlebih dahulu
                        popupToConfirm._popupOptions.onConfirm();
                    }
                    // Lalu tutup popup-nya
                    if (popupToConfirm) {
                        this.closePopup(popupToConfirm.id);
                    }
                    break;
                case 'toggle-class':
                    if (targetSelector) {
                        const target = document.querySelector(targetSelector);
                        if (target && className) {
                            target.classList.toggle(className);
                        }
                    }
                    break;
            }
        });
    }
}

// ==================== GLOBAL INSTANCE ====================
const PolosInstance = new Polos();

if (typeof window !== 'undefined') {
    window.Polos = PolosInstance;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Polos;
}
