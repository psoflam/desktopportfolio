export function initTaskbar({ wm, apps }){
    const bar = document.getElementById('taskbar');
    const clock = document.getElementById('clock');
    const themeToggle = document.getElementById('theme-toggle');
  
    // Launch buttons
    bar.querySelectorAll('.task-btn').forEach(btn => {
      const app = btn.dataset.app;
      btn.addEventListener('click', () => {
        const meta = apps[app];
    
        // If not open, open
        if (!wm.isOpen(app)){
          wm.openWindow(app, { title: meta.title, mount: meta.mount });
          wm.applySavedBounds(app);
          btn.classList.add('active');
          return;
        }
    
        // If open and not minimized, minimize
        if (!wm.isMinimized(app)){
          wm.toggleMinimize(app);
          btn.classList.remove('active');
          return;
        }
    
        // If minimized, restore/focus
        wm.toggleMinimize(app); // removes is-min and focuses
        btn.classList.add('active');
      });
    
      // Optional: double-click behaves the same
      btn.addEventListener('dblclick', () => btn.click());
    });
  
    // Theme toggle (we'll keep one theme for v1; icon flips just for fun)
    themeToggle.addEventListener('click', () => {
      const pressed = themeToggle.getAttribute('aria-pressed') === 'true';
      themeToggle.setAttribute('aria-pressed', String(!pressed));
      themeToggle.textContent = pressed ? '☾' : '☀';
      // (Add real theme switching in Milestone 2)
    });
  
    // Simple clock
    function tick(){
      const d = new Date();
      clock.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    tick(); setInterval(tick, 1000);
  }
  