// Window manager: open/focus/drag/close + minimize + maximize/restore + resize + persist
export class WindowManager {
  STORAGE_KEY = 'cm.desktop.state.v1';

  constructor(desktopEl){
    this.desktop = desktopEl;
    this.z = [];                     // z-order stack (last = front)
    this.wins = new Map();           // id -> { el, title, mount }
    this.prevBounds = new Map();     // id -> { left, top, width, height } = last custom size
    this._savedState = this.loadState(); // { order, wins } or {}

    // constraints
    this.MIN_W = 320;
    this.MIN_H = 220;
    this.PAD   = 8;
    this.TASKBAR_H = 44;
  }

  // ---------- Public API ----------
  openWindow(id, { title, mount }){
    if (this.wins.has(id)){
      this.focusWindow(id);
      return;
    }
    const el = this.#createWindowEl(id, title);
    this.desktop.appendChild(el);

    // mount app content
    el.querySelector('.win__body').replaceChildren(mount());

    // default position (stagger)
    const offset = 40 * this.z.length;
    el.style.left = (140 + offset) + 'px';
    el.style.top  = (120 + offset) + 'px';
    el.style.width  = el.style.width  || '520px';
    el.style.height = el.style.height || '360px';

    // register
    this.wins.set(id, { el, title, mount });

    // restore saved bounds if present
    this.applySavedBounds(id);

    // focus, enable interactions, persist
    this.focusWindow(id);
    this.#makeDraggable(el, id);
    this.#makeResizable(el, id);
    this.persist();
  }

  focusWindow(id){
    if (!this.wins.has(id)) return;
    this.z = this.z.filter(x => x !== id).concat(id);
    this.z.forEach((winId, i) => {
      this.wins.get(winId).el.style.zIndex = 10 + i;
    });
    this.wins.forEach(({el}, winId) => el.classList.toggle('is-active', winId === id));
    this.wins.get(id).el.querySelector('.win__title')?.focus({ preventScroll: true });
  }

  closeWindow(id){
    const w = this.wins.get(id);
    if (!w) return;
    w.el.remove();
    this.wins.delete(id);
    this.z = this.z.filter(x => x !== id);
    this.persist();
    const top = this.z[this.z.length - 1];
    if (top) this.focusWindow(top);
  }

  // --- Minimize ---
  isOpen(id){ return this.wins.has(id); }
  isMinimized(id){ return !!this.wins.get(id)?.el.classList.contains('is-min'); }

  toggleMinimize(id){
    const w = this.wins.get(id); if (!w) return;
    const el = w.el;
    const goingMin = !el.classList.contains('is-min');
  
    if (goingMin){
      // snapshot current rect so we don't save 0x0
      const r = el.getBoundingClientRect();
      this.prevBounds.set(id, { left: r.left, top: r.top, width: r.width, height: r.height });
  
      el.classList.add('is-min');
      this.z = this.z.filter(x => x !== id);
      this.persist();
      const top = this.z[this.z.length - 1];
      if (top) this.focusWindow(top);
    } else {
      el.classList.remove('is-min');
      this.focusWindow(id);
      this.persist();
    }
  }
  

  // --- Maximize/restore (green dot + dbl-click title) ---
  toggleMaximize(id){
    const w = this.wins.get(id); if (!w) return;
    const el = w.el;

    const goingMax = !el.classList.contains('is-max');
    if (goingMax){
      // store current (custom) bounds to restore later
      const r = el.getBoundingClientRect();
      this.prevBounds.set(id, { left: r.left, top: r.top, width: r.width, height: r.height });
      el.classList.add('is-max');
    } else {
      el.classList.remove('is-max');
      // restore to last custom bounds (kept fresh after drags/resizes)
      const b = this.prevBounds.get(id);
      if (b){
        el.style.left = b.left + 'px';
        el.style.top  = b.top  + 'px';
        el.style.width  = b.width  + 'px';
        el.style.height = b.height + 'px';
      }
    }
    this.focusWindow(id);
    this.persist();
  }

  // Apply saved bounds for a window you've just opened
  applySavedBounds(id){
    const saved = this._savedState?.wins?.[id];
    if (!saved) return;
    const el = this.wins.get(id)?.el; if (!el) return;
  
    const w = Math.max(this.MIN_W, saved.width  || this.MIN_W);
    const h = Math.max(this.MIN_H, saved.height || this.MIN_H);
    const l = Math.max(this.PAD, saved.left  ?? 140);
    const t = Math.max(this.PAD, saved.top   ?? 120);
  
    el.style.left = l + 'px';
    el.style.top  = t + 'px';
    el.style.width  = w + 'px';
    el.style.height = h + 'px';
  
    el.classList.toggle('is-max', !!saved.isMax);
    el.classList.toggle('is-min', !!saved.isMin);
  
    if (!saved.isMax){
      this.prevBounds.set(id, { left: l, top: t, width: w, height: h });
    }
  }
  

  // ---------- Persistence ----------
  loadState(){
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }
  persist(){
    const wins = {};
    this.wins.forEach(({el}, id) => {
      const isMax = el.classList.contains('is-max');
      const isMin = el.classList.contains('is-min');
  
      // If minimized, rect would be 0x0 — use prevBounds fallback
      let r = el.getBoundingClientRect();
      if (isMin) {
        const prev = this.prevBounds.get(id);
        if (prev) r = prev;
      }
  
      wins[id] = {
        left: r.left, top: r.top, width: r.width, height: r.height,
        isMax, isMin
      };
    });
    const data = { order: this.z.slice(), wins };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  
  clearPersist(){ localStorage.removeItem(this.STORAGE_KEY); }

  // ---------- Internals ----------
  #createWindowEl(id, title){
    const win = document.createElement('section');
    win.className = 'win';
    win.setAttribute('role','dialog');
    win.setAttribute('aria-labelledby', `${id}-label`);
    win.id = id;

    // 8 resize handles
    const handles = `
      <div class="grip grip-n"  data-dir="n"></div>
      <div class="grip grip-s"  data-dir="s"></div>
      <div class="grip grip-e"  data-dir="e"></div>
      <div class="grip grip-w"  data-dir="w"></div>
      <div class="grip grip-ne" data-dir="ne"></div>
      <div class="grip grip-nw" data-dir="nw"></div>
      <div class="grip grip-se" data-dir="se"></div>
      <div class="grip grip-sw" data-dir="sw"></div>
    `;

    win.innerHTML = `
      <div class="win__title" tabindex="0">
        <div class="controls" aria-label="Window controls">
          <div class="ctl close" role="button" tabindex="0" title="Close (Esc)" aria-label="Close"></div>
          <div class="ctl min"   role="button" tabindex="0" title="Minimize"   aria-label="Minimize"></div>
          <div class="ctl max"   role="button" tabindex="0" title="Maximize"   aria-label="Maximize"></div>
        </div>
        <div class="win__label" id="${id}-label">${title}</div>
      </div>
      <div class="win__body"></div>
      ${handles}
    `;

    const titleBar = win.querySelector('.win__title');
    const closeBtn = win.querySelector('.ctl.close');
    const minBtn   = win.querySelector('.ctl.min');
    const maxBtn   = win.querySelector('.ctl.max');

    // prevent drag when interacting with controls
    [closeBtn, minBtn, maxBtn].forEach(btn => {
      ['pointerdown','mousedown','click'].forEach(ev =>
        btn.addEventListener(ev, e => e.stopPropagation())
      );
    });

    // wire controls
    closeBtn.addEventListener('click', () => this.closeWindow(id));
    closeBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.closeWindow(id); }
    });
    minBtn.addEventListener('click', () => this.toggleMinimize(id));
    maxBtn.addEventListener('click', () => this.toggleMaximize(id));
    titleBar.addEventListener('dblclick', () => this.toggleMaximize(id));

    // bring to front when pointer inside window
    win.addEventListener('pointerdown', () => this.focusWindow(id));

    // Esc closes when title focused
    titleBar.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeWindow(id);
    });

    return win;
  }

  #makeDraggable(win, id){
    const title = win.querySelector('.win__title');
    let drag = null;

    title.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.ctl') || e.target.closest('.controls')) return; // don't drag from controls
      // if maximized, un-max on drag start (Windows-like)
      if (win.classList.contains('is-max')) this.toggleMaximize(id);
      this.focusWindow(id);
      title.setPointerCapture(e.pointerId);
      const rect = win.getBoundingClientRect();
      drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    });

    title.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const x = e.clientX - drag.dx;
      const y = e.clientY - drag.dy;
      const maxX = innerWidth - win.offsetWidth - this.PAD;
      const maxY = innerHeight - this.TASKBAR_H - title.offsetHeight - this.PAD;
      win.style.left = Math.max(this.PAD, Math.min(x, maxX)) + 'px';
      win.style.top  = Math.max(this.PAD, Math.min(y, maxY)) + 'px';
    });

    title.addEventListener('pointerup', (e) => {
      if (!drag) return;
      title.releasePointerCapture(e.pointerId);
      drag = null;
      // update "custom size" reference & persist
      const r = win.getBoundingClientRect();
      this.prevBounds.set(id, { left: r.left, top: r.top, width: r.width, height: r.height });
      this.persist();
    });
    title.addEventListener('pointercancel', () => { drag = null; });
  }

  #makeResizable(win, id){
    const grips = win.querySelectorAll('.grip');
    let rs = null; // resize state

    grips.forEach(g => {
      g.addEventListener('pointerdown', (e) => {
        if (win.classList.contains('is-max')) this.toggleMaximize(id); // exit max on resize
        e.stopPropagation();
        g.setPointerCapture(e.pointerId);
        const r = win.getBoundingClientRect();
        rs = {
          dir: g.dataset.dir,
          startX: e.clientX, startY: e.clientY,
          left: r.left, top: r.top, width: r.width, height: r.height
        };
      });

      g.addEventListener('pointermove', (e) => {
        if (!rs) return;
        let { dir, startX, startY, left, top, width, height } = rs;
        let dx = e.clientX - startX;
        let dy = e.clientY - startY;

        // compute new bounds per direction
        let nLeft = left, nTop = top, nW = width, nH = height;

        const maxW = innerWidth - this.PAD - left;
        const maxH = innerHeight - this.TASKBAR_H - this.PAD - top;

        // horizontal
        if (dir.includes('e')) {
          nW = Math.max(this.MIN_W, Math.min(width + dx, maxW));
        }
        if (dir.includes('w')) {
          nW = Math.max(this.MIN_W, width - dx);
          nLeft = left + (width - nW);
          if (nLeft < this.PAD) { nLeft = this.PAD; nW = left + width - this.PAD; }
        }

        // vertical
        if (dir.includes('s')) {
          nH = Math.max(this.MIN_H, Math.min(height + dy, innerHeight - this.TASKBAR_H - this.PAD - top));
        }
        if (dir.includes('n')) {
          nH = Math.max(this.MIN_H, height - dy);
          nTop = top + (height - nH);
          if (nTop < this.PAD) { nTop = this.PAD; nH = top + height - this.PAD; }
        }

        // apply
        win.style.left = nLeft + 'px';
        win.style.top  = nTop  + 'px';
        win.style.width  = nW + 'px';
        win.style.height = nH + 'px';
      });

      const end = (e) => {
        if (!rs) return;
        g.releasePointerCapture?.(e.pointerId);
        rs = null;
        // update latest custom bounds & persist
        const r = win.getBoundingClientRect();
        this.prevBounds.set(id, { left: r.left, top: r.top, width: r.width, height: r.height });
        this.persist();
      };
      g.addEventListener('pointerup', end);
      g.addEventListener('pointercancel', () => { rs = null; });
    });
  }
}
