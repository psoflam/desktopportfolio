// Minimal window manager: open/focus/drag/close
export class WindowManager {
    constructor(desktopEl){
      this.desktop = desktopEl;
      this.z = [];          // z-order stack of ids (front is last)
      this.wins = new Map(); // id -> { el, state }
    }
  
    openWindow(id, { title, mount }){
      if (this.wins.has(id)){
        this.focusWindow(id);
        return;
      }
      const el = this.#createWindowEl(id, title);
      this.desktop.appendChild(el);
  
      // mount content
      const body = el.querySelector('.win__body');
      body.replaceChildren(mount());
  
      // initial position
      const offset = 40 * this.z.length;
      el.style.left = (140 + offset) + 'px';
      el.style.top  = (120 + offset) + 'px';
  
      // register + focus
      this.wins.set(id, { el, title, mount });
      this.focusWindow(id);
      this.#makeDraggable(el, id);
    }
  
    focusWindow(id){
      if (!this.wins.has(id)) return;
      // move id to end of z stack
      this.z = this.z.filter(x => x !== id).concat(id);
      // set z-index
      this.z.forEach((winId, i) => {
        const zIndex = 10 + i; // reserve 0-9
        this.wins.get(winId).el.style.zIndex = zIndex;
      });
      // set active styling
      this.wins.forEach(({el}, winId) => el.classList.toggle('is-active', winId === id));
      // focus for a11y
      this.wins.get(id).el.querySelector('.win__title').focus({ preventScroll: true });
    }
  
    closeWindow(id){
      const w = this.wins.get(id);
      if (!w) return;
      w.el.remove();
      this.wins.delete(id);
      this.z = this.z.filter(x => x !== id);
      // focus the new top-most
      const top = this.z[this.z.length - 1];
      if (top) this.focusWindow(top);
    }
  
    #createWindowEl(id, title){
      const win = document.createElement('section');
      win.className = 'win';
      win.setAttribute('role','dialog');
      win.setAttribute('aria-labelledby', `${id}-label`);
      win.id = id;
  
      win.innerHTML = `
        <div class="win__title" tabindex="0">
          <div class="ctl close" title="Close (Esc)" aria-label="Close"></div>
          <div class="ctl min" title="Minimize" aria-label="Minimize"></div>
          <div class="ctl max" title="Maximize" aria-label="Maximize"></div>
          <div class="win__label" id="${id}-label">${title}</div>
        </div>
        <div class="win__body"></div>
      `;
  
      // controls
      win.querySelector('.ctl.close').addEventListener('click', () => this.closeWindow(id));
      // For now, min/max are placeholders; we’ll wire them in M2.
  
      // bring to front when mouse down anywhere in window
      win.addEventListener('pointerdown', () => this.focusWindow(id));
      // Close on Esc when title focused
      win.querySelector('.win__title').addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeWindow(id);
      });
  
      return win;
    }
  
    #makeDraggable(win, id){
      const title = win.querySelector('.win__title');
      let drag = null;
  
      title.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        this.focusWindow(id);
        title.setPointerCapture(e.pointerId);
        const rect = win.getBoundingClientRect();
        drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
      });
  
      title.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const x = e.clientX - drag.dx;
        const y = e.clientY - drag.dy;
        // constrain to desktop bounds (keep title visible)
        const barH = 44, pad = 8, titleH = title.offsetHeight;
        const maxX = innerWidth - win.offsetWidth - pad;
        const maxY = innerHeight - barH - titleH - pad;
        win.style.left = Math.max(pad, Math.min(x, maxX)) + 'px';
        win.style.top  = Math.max(pad, Math.min(y, maxY)) + 'px';
      });
  
      title.addEventListener('pointerup', (e) => {
        if (!drag) return;
        title.releasePointerCapture(e.pointerId);
        drag = null;
      });
    }
  }
  