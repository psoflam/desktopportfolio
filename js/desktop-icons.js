// js/desktop-icons.js
// Hook desktop icons to your existing window manager.
//
// Usage:
//   import { initDesktopIcons } from './js/desktop-icons.js';
//   initDesktopIcons({ openApp: (id) => wm.openApp(id) });
//
// If your WM uses a different API, adapt the openApp callback above.

export function initDesktopIcons({ openApp }) {
    const container = document.getElementById('desktop-icons');
    if (!container) return;
  
    // Single-click selects, double-click (or Enter) opens.
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.desktop-icon');
      if (!btn) return;
      // focus for a11y
      btn.focus();
    });
  
    container.addEventListener('dblclick', (e) => {
      const btn = e.target.closest('.desktop-icon');
      if (!btn) return;
      activate(btn);
    });
  
    // Keyboard open (Enter/Space)
    container.addEventListener('keydown', (e) => {
      const btn = e.target.closest('.desktop-icon');
      if (!btn) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(btn);
      }
    });
  
    // Basic touch support: double-tap within 300ms
    let lastTap = 0;
    container.addEventListener('touchend', (e) => {
      const btn = e.target.closest('.desktop-icon');
      if (!btn) return;
      const t = Date.now();
      if (t - lastTap < 300) activate(btn);
      lastTap = t;
    });
  
    function activate(btn) {
      const appId = btn.getAttribute('data-app');
      if (!appId) return;
      try {
        openApp(appId);
      } catch (err) {
        console.error('openApp failed:', err);
      }
    }
  }
  