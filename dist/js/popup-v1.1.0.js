/*!
 * Polos Popup v1.1.0 - Optimized
 * Lightweight popup with smooth animations
 * Compatible dengan Polos JS Framework
 * © 2025 - Polos Style
 */

(function() {
  'use strict';

  // ==================== CSS ====================
  if (!document.getElementById('polos-popup-css')) {
    const style = document.createElement('style');
    style.id = 'polos-popup-css';
    style.textContent = `
.popup{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:none;justify-content:center;align-items:center;z-index:1000;backdrop-filter:blur(4px);opacity:0;transition:opacity .3s ease}
.popup.active{display:flex;opacity:1}
.popup.closing{opacity:0}
.pop{background:#fff;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.2);max-width:90%;max-height:90%;overflow:hidden;transform:translateY(-30px) scale(.9);transition:transform .3s ease}
.popup.active .pop{transform:translateY(0) scale(1)}
.popup.closing .pop{transform:translateY(-30px) scale(.9)}
.pop-sm{width:400px}
.pop-md{width:600px}
.pop-lg{width:800px}
.pop-xl{width:1000px}
.pop-hd{padding:1.5rem;border-bottom:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center;background:#f8f9fa}
.pop-title{font-size:1.25rem;font-weight:600;margin:0;color:#1a1a1a}
.pop-close{background:none;border:none;font-size:1.5rem;cursor:pointer;color:#6b7280;padding:.25rem;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:background .2s}
.pop-close:hover{background:#e5e7eb;color:#374151}
.pop-bd{padding:1.5rem;max-height:60vh;overflow-y:auto}
.pop-ft{padding:1rem 1.5rem;border-top:1px solid #e9ecef;background:#f8f9fa;display:flex;justify-content:flex-end;gap:.75rem}
.pop-submit{background-color:#16a34a;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:500;transition:background .2s}
.pop-submit:hover{background-color:#15803d}
.pop-cancel{background-color:#dc2626;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:500;transition:background .2s}
.pop-cancel:hover{background-color:#b91c1c}
@media (max-width:768px){.pop{max-width:95%;width:auto!important}}
    `;
    document.head.appendChild(style);
  }

  // ==================== POPUP HANDLER ====================
  const PolosPopup = {
    activePopup: null,

    open(selector) {
      const popup = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!popup || !popup.classList.contains('popup')) return;
      
      this.activePopup = popup;
      popup.classList.remove('closing');
      popup.classList.add('active');
      document.body.style.overflow = 'hidden';
    },

    close(popup) {
      if (!popup) popup = this.activePopup;
      if (!popup) return;

      popup.classList.add('closing');
      setTimeout(() => {
        popup.classList.remove('active', 'closing');
        document.body.style.overflow = '';
        if (this.activePopup === popup) this.activePopup = null;
      }, 300);
    },

    closeAll() {
      document.querySelectorAll('.popup.active').forEach(p => this.close(p));
    }
  };

  // ==================== AUTO INIT ====================
  let initialized = false;

  const init = () => {
    if (initialized) return;
    initialized = true;

    // Delegate click events untuk open buttons
    document.addEventListener('click', e => {
      const btn = e.target.closest('.popup-open');
      if (btn) {
        const target = btn.dataset.popupTarget;
        if (target) PolosPopup.open(target);
      }

      // Close buttons
      const closeBtn = e.target.closest('.pop-close, .pop-cancel');
      if (closeBtn) {
        const popup = closeBtn.closest('.popup');
        if (popup) PolosPopup.close(popup);
      }

      // Backdrop click
      if (e.target.classList.contains('popup')) {
        PolosPopup.close(e.target);
      }
    });

    // ESC key - single listener
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && PolosPopup.activePopup) {
        PolosPopup.close();
      }
    });
  };

  // Auto init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export to global
  window.PolosPopup = PolosPopup;

})();
