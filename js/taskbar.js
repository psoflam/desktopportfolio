export function initTaskbar({ wm, apps }){
    const bar = document.getElementById('taskbar');
    const clock = document.getElementById('clock');
    const themeToggle = document.getElementById('theme-toggle');
  
    // Launch buttons
    bar.querySelectorAll('.task-btn').forEach(btn => {
      const app = btn.dataset.app;
      btn.addEventListener('click', () => {
        const meta = apps[app];
        wm.openWindow(app, { title: meta.title, mount: meta.mount });
        // mark active visually (basic)
        bar.querySelectorAll('.task-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
      // Double-click focuses/opens, same handler is fine
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
  