/*!
 * Polos Toast v2.0 - Optimized
 * Lightweight toast notification system
 * © 2025 - Polos Style
 */
(function() {
  'use strict';

  // ==================== CSS ====================
  if (!document.getElementById('polos-toast-css')) {
    const style = document.createElement('style');
    style.id = 'polos-toast-css';
    style.textContent = `
.pt-container{position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none}
.pt{background:#fff;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,.15);padding:14px 16px;display:flex;align-items:center;gap:12px;border-left:4px solid;font-family:system-ui,sans-serif;max-width:350px;pointer-events:auto;position:relative;overflow:hidden;animation:ptIn .3s ease-out}
.pt.s{border-color:#16a34a;background:#f0fdf4}
.pt.e{border-color:#dc2626;background:#fef2f2}
.pt.i{border-color:#2563eb;background:#eff6ff}
.pt.w{border-color:#d97706;background:#fffbeb}
.pt-icon{width:20px;height:20px;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center}
.pt-icon::before{content:"";position:absolute;width:100%;height:100%;border-radius:50%}
.pt.s .pt-icon::before{border:2px solid #16a34a}
.pt.e .pt-icon::before{border:2px solid #dc2626}
.pt.i .pt-icon::before{border:2px solid #2563eb}
.pt.w .pt-icon::before{border:2px solid #d97706}
.pt.s .pt-icon::after{content:"✓";color:#16a34a;font-weight:bold;font-size:14px}
.pt.e .pt-icon::after{content:"✕";color:#dc2626;font-weight:bold;font-size:14px}
.pt.i .pt-icon::after{content:"i";color:#2563eb;font-weight:bold;font-size:12px;font-style:normal}
.pt.w .pt-icon::after{content:"!";color:#d97706;font-weight:bold;font-size:14px}
.pt-c{flex:1;font-size:14px;color:#374151;line-height:1.4}
.pt-c b{display:block;margin-bottom:2px;color:#1f2937}
.pt-x{background:none;border:none;color:#9ca3af;cursor:pointer;font-size:20px;padding:0;width:20px;height:20px;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
.pt-x:hover{background:#f3f4f6;color:#374151}
.pt-bar{position:absolute;bottom:0;left:0;height:3px;border-radius:0 0 8px 8px;animation:ptBar linear forwards;transform-origin:left}
.pt.s .pt-bar{background:#16a34a}
.pt.e .pt-bar{background:#dc2626}
.pt.i .pt-bar{background:#2563eb}
.pt.w .pt-bar{background:#d97706}
.pt.paused .pt-bar{animation-play-state:paused}
.pt.closing{animation:ptOut .3s ease-in forwards}
@keyframes ptIn{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
@keyframes ptOut{to{opacity:0;transform:translateX(100%)}}
@keyframes ptBar{to{width:0}}
@media (max-width:480px){.pt-container{left:10px;right:10px;top:10px}.pt{max-width:100%}}
    `;
    document.head.appendChild(style);
  }

  // ==================== TOAST MANAGER ====================
  const ToastManager = {
    container: null,
    toasts: new Map(),
    maxToasts: 5,

    init() {
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.className = 'pt-container';
        document.body.appendChild(this.container);

        // Event delegation for close buttons
        this.container.addEventListener('click', e => {
          if (e.target.classList.contains('pt-x')) {
            const toast = e.target.closest('.pt');
            if (toast) this.close(toast.id);
          }
        });

        // Pause on hover
        this.container.addEventListener('mouseenter', e => {
          const toast = e.target.closest('.pt');
          if (toast && this.toasts.has(toast.id)) {
            toast.classList.add('paused');
            const data = this.toasts.get(toast.id);
            if (data.timeout) {
              clearTimeout(data.timeout);
              data.pausedAt = Date.now();
            }
          }
        }, true);

        // Resume on mouse leave
        this.container.addEventListener('mouseleave', e => {
          const toast = e.target.closest('.pt');
          if (toast && this.toasts.has(toast.id)) {
            toast.classList.remove('paused');
            const data = this.toasts.get(toast.id);
            if (data.pausedAt) {
              const remaining = data.duration - (data.pausedAt - data.startTime);
              data.timeout = setTimeout(() => this.close(toast.id), remaining);
              data.startTime = Date.now() - (data.duration - remaining);
              delete data.pausedAt;
            }
          }
        }, true);
      }
      return this.container;
    },

    show(message, type = 'i', title = '', duration = 3000) {
      this.init();

      // Limit max toasts
      if (this.toasts.size >= this.maxToasts) {
        const firstToast = this.toasts.keys().next().value;
        this.close(firstToast);
      }

      const id = 'pt' + Date.now() + Math.random().toString(36).substr(2, 5);
      
      const toast = document.createElement('div');
      toast.id = id;
      toast.className = `pt ${type}`;
      toast.innerHTML = `
        <div class="pt-icon"></div>
        <div class="pt-c">${title ? `<b>${title}</b>` : ''}${message}</div>
        <button class="pt-x">×</button>
        <div class="pt-bar" style="animation-duration:${duration}ms"></div>
      `;

      this.container.appendChild(toast);

      // Store toast data
      const data = {
        element: toast,
        duration: duration,
        startTime: Date.now(),
        timeout: setTimeout(() => this.close(id), duration)
      };
      this.toasts.set(id, data);

      return id;
    },

    close(id) {
      const data = this.toasts.get(id);
      if (!data) return;

      const toast = data.element;
      if (data.timeout) clearTimeout(data.timeout);
      
      toast.classList.add('closing');
      setTimeout(() => {
        toast.remove();
        this.toasts.delete(id);
        
        // Cleanup container if empty
        if (this.toasts.size === 0 && this.container) {
          this.container.remove();
          this.container = null;
        }
      }, 300);
    },

    closeAll() {
      this.toasts.forEach((_, id) => this.close(id));
    }
  };

  // ==================== PUBLIC API ====================
  const PToast = {
    show(config) {
      const msg = typeof config === 'string' ? config : config.message || '';
      const type = config.type || 'i';
      const title = config.title || '';
      const duration = config.duration || config.timer || 3000;
      return ToastManager.show(msg, type, title, duration);
    },

    success(message, title = '') {
      return ToastManager.show(message, 's', title, 3000);
    },

    error(message, title = '') {
      return ToastManager.show(message, 'e', title, 5000);
    },

    info(message, title = '') {
      return ToastManager.show(message, 'i', title, 3000);
    },

    warning(message, title = '') {
      return ToastManager.show(message, 'w', title, 4000);
    },

    close(id) {
      ToastManager.close(id);
    },

    closeAll() {
      ToastManager.closeAll();
    },

    config(options) {
      if (options.maxToasts) ToastManager.maxToasts = options.maxToasts;
    }
  };

  // ==================== AUTO INIT ====================
  const checkDataAttribute = () => {
    const el = document.querySelector('[data-pt]');
    if (el) {
      try {
        const data = JSON.parse(el.dataset.pt);
        if (data.message || data.msg) {
          PToast.show({
            message: data.message || data.msg,
            type: data.type || 'i',
            title: data.title || '',
            duration: data.duration || data.timer || 3000
          });
          el.removeAttribute('data-pt');
        }
      } catch (e) {
        console.error('PToast: Invalid data-pt JSON');
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkDataAttribute);
  } else {
    checkDataAttribute();
  }

  // ==================== EXPORT ====================
  if (window.Polos) {
    window.Polos.Toast = PToast;
  }
  window.PToast = PToast;

})();
