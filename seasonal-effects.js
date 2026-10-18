/* Bounded decorative simulation. Never changes the layout of page elements. */
(function () {
  'use strict';
  const modes = {
    autumn: { gravity: 54, terminal: 66, wind: 26, spin: 65, rest: 9 },
    christmas: { gravity: 14, terminal: 31, wind: 13, spin: 8, rest: 5 },
    carnival: { gravity: 80, terminal: 88, wind: 36, spin: 180, rest: 3 }
  };
  function createParticle(id, options) {
    const random = options.random || Math.random;
    const size = 6 + random() * 7;
    return {
      id, x: random() * options.width, y: random() * options.height,
      vx: (random() - 0.5) * 20, vy: 12 + random() * 25,
      size: options.mode === 'autumn' ? size * 0.82 : size,
      width: options.mode === 'autumn' ? size * 1.45 : size,
      angle: random() * 360,
      spin: (random() - 0.5) * 2, phase: random() * Math.PI * 2,
      support: null, offset: 0, resting: 0, age: 0
    };
  }
  function topAt(surface, x) {
    if (!surface.radius) return surface.top;
    const dx = x - (surface.left + surface.right) / 2;
    const r = surface.radius;
    return surface.top + r - Math.sqrt(Math.max(0, r * r - dx * dx));
  }
  function floorSurface(width, documentHeight, scrollY) {
    return { id: 'page-floor', left: 0, right: width, top: documentHeight - scrollY - 2, radius: 0 };
  }
  function recycle(p, options) {
    if (p.id < 0) { p.alive = false; return; }
    Object.assign(p, createParticle(p.id, options), {
      y: -20 - (options.random || Math.random)() * 100, ignore: 0, floor: false
    });
  }
  function storeDeposit(p, options) {
    const limit = options.maxDeposits ?? 64;
    if (limit <= 0) return;
    options.nextDepositId = (options.nextDepositId || 0) - 1;
    const deposit = { ...p, id: options.nextDepositId, alive: true };
    const empty = options.deposits.findIndex(item => item.alive === false);
    if (empty >= 0) options.deposits[empty] = deposit;
    else if (options.deposits.length < limit) options.deposits.push(deposit);
    else {
      const slot = (options.depositCursor || 0) % limit;
      options.deposits[slot] = deposit;
      options.depositCursor = slot + 1;
    }
    recycle(p, options);
  }
  function release(p, direction) {
    p.support = null;
    p.vx = direction * (24 + p.size);
    p.vy = 14;
    p.spin = direction;
    // Briefly ignore the same landing surface while sliding off its lip.
    p.ignore = 0.65;
  }
  function cursorGust(p, pointer, dt, time, mode) {
    if (!pointer || time - pointer.time > 0.18 || dt === 0) return;
    const sx = pointer.x - pointer.fromX, sy = pointer.y - pointer.fromY;
    const lengthSquared = sx * sx + sy * sy;
    const t = lengthSquared ? Math.max(0, Math.min(1,
      ((p.x - pointer.fromX) * sx + (p.y - pointer.fromY) * sy) / lengthSquared)) : 0;
    const dx = p.x - (pointer.fromX + sx * t), dy = p.y - (pointer.fromY + sy * t);
    const distance = Math.hypot(dx, dy);
    const radius = mode === 'christmas' ? 65 : 52;
    const speed = Math.min(1600, Math.hypot(pointer.vx, pointer.vy));
    if (distance >= radius || speed < 15) return;
    const strength = (1 - distance / radius) * (mode === 'christmas' ? 0.48 : 1);
    const impulse = (450 + speed * 1.8) * strength * dt;
    if (p.support !== null) release(p, pointer.vx >= 0 ? 1 : -1);
    p.vx = Math.max(-260, Math.min(260, p.vx +
      (dx / Math.max(8, distance) + pointer.vx / 1600) * impulse));
    p.vy = Math.max(-160, p.vy + (dy / Math.max(8, distance) * 0.45 - 0.6) * impulse);
    p.spin = Math.max(-3, Math.min(3, p.spin + pointer.vx / 1600 * strength));
    p.ignore = Math.max(p.ignore || 0, 0.25);
  }
  function step(particles, surfaces, delta, time, options) {
    const dt = Math.min(Math.max(delta, 0), 0.04);
    const model = modes[options.mode];
    if (!model) return;
    const all = [...particles, ...(options.deposits || [])].filter(p => p.alive !== false);
    const floor = surfaces.find(surface => surface.id === 'page-floor');
    for (const p of all) {
      p.age += dt;
      p.ignore = Math.max(0, (p.ignore || 0) - dt);
      const gust = Math.sin(time * 0.47 + p.phase) + 0.4 * Math.sin(time * 1.3);
      cursorGust(p, options.pointer, dt, time, options.mode);
      if (p.support !== null) {
        const base = typeof p.support === 'number'
          ? all.find(other => other.id === p.support && other.support !== null && other.alive !== false)
          : surfaces.find(surface => surface.id === p.support);
        p.resting -= dt;
        if (!base || p.resting <= 0) {
          release(p, Math.cos(p.phase) >= 0 ? 1 : -1);
        } else {
          const stacked = typeof p.support === 'number';
          const center = stacked ? base.x : (base.left + base.right) / 2;
          p.x = stacked ? base.x + p.offset : base.left + p.offset;
          p.y = stacked ? base.y - (base.size + p.size) * 0.42 : topAt(base, p.x) - p.size / 2;
          const unstable = stacked ? Math.abs(p.offset) > base.size * 0.3
            : base.radius ? Math.abs(p.x - center) > base.radius * 0.5
              : p.x < base.left + p.size || p.x > base.right - p.size;
          if (unstable) release(p, p.x >= center ? 1 : -1);
          else continue;
        }
      }
      const oldY = p.y;
      p.vx += (gust * model.wind - p.vx) * dt * 1.3;
      p.vy = Math.min(model.terminal * (0.8 + p.size / 35), p.vy + model.gravity * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += (p.spin * model.spin + gust * 22) * dt;
      if (p.ignore === 0 && p.vy > 0) {
        const bottom = p.y + p.size / 2;
        const previousBottom = oldY + p.size / 2;
        const candidates = surfaces.filter(s => p.x >= s.left && p.x <= s.right)
          .map(s => ({ base: s, top: topAt(s, p.x) }))
          .filter(s => previousBottom <= s.top && bottom >= s.top)
          .sort((a, b) => a.top - b.top);
        // A hit can disturb a resting leaf before a new leaf finds its balance.
        const hit = all.find(other => other !== p && other.alive !== false && other.support !== null &&
          (!other.floor || !floor || other.y > floor.top - 20) &&
          Math.abs(p.x - other.x) < (p.size + other.size) * 0.55 &&
          previousBottom <= other.y && bottom >= other.y - other.size / 2);
        if (hit) {
          const gentle = hit.floor || options.mode === 'christmas' || p.vy < 45;
          if (!gentle) release(hit, p.x >= hit.x ? -1 : 1);
          p.vx *= -0.35;
          p.vy *= 0.3;
          if (gentle) {
            p.support = hit.id; p.offset = p.x - hit.x; p.resting = model.rest;
            p.y = hit.y - (hit.size + p.size) * 0.42;
            p.floor = hit.floor;
            if (p.floor) p.resting = options.mode === 'christmas' ? 35 : 60;
          }
        } else if (candidates.length) {
          const { base, top } = candidates[0];
          p.y = top - p.size / 2;
          p.support = base.id;
          p.offset = p.x - base.left;
          p.resting = model.rest * (0.6 + (p.phase / (Math.PI * 2)) * 0.8);
          p.floor = base.id === 'page-floor';
          if (p.floor) p.resting = options.mode === 'christmas' ? 35 : 60;
          p.vy = 0;
          p.angle = Math.sin(p.phase) * 24;
        }
      }
      if (p.id >= 0 && p.floor && p.support !== null && options.deposits) {
        storeDeposit(p, options);
      }
      if (p.y > options.height + 30 || p.x < -80 || p.x > options.width + 80) {
        recycle(p, options);
      }
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createParticle, step, floorSurface };
  if (typeof document === 'undefined') return;

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const selector = '.card, .split-media, .learn-photo, .team-feature__image, .instructor-photo, .news-card, .brand-mark, .hero-logo, .club-logo-panel, .ika-badge';
  let active = null;
  let stop = () => {};
  function reconcile() {
    const layer = document.querySelector('.seasonal-layer');
    if (layer === active) return;
    stop();
    active = layer;
    if (!layer || preference.matches) return;
    const mode = Object.keys(modes).find(value => layer.classList.contains(`seasonal-layer--${value}`));
    if (!mode) return;
    const options = { width: innerWidth, height: innerHeight, mode, deposits: [] };
    const nodes = [...layer.children].filter(node => !node.classList.contains('seasonal-deposit') && getComputedStyle(node).display !== 'none');
    options.maxDeposits = Math.min(nodes.length * 2, innerWidth < 600 ? 32 : 72);
    const depositNodes = [];
    const particles = nodes.map((node, id) => createParticle(id, options));
    layer.classList.add('seasonal-layer--physics');
    let surfaces = [], measureAt = -1, last = 0, frame = 0, disposed = false;
    const elements = new Map();
    function measure() {
      options.width = innerWidth; options.height = innerHeight;
      surfaces = [...document.querySelectorAll(selector)].flatMap(element => {
        const rect = element.getBoundingClientRect();
        if (rect.width < 15 || rect.height < 15 || rect.bottom < 0 || rect.top > innerHeight) return [];
        if (!elements.has(element)) elements.set(element, `surface-${elements.size}`);
        const radius = element.matches('.hero-logo, .brand-mark') ? Math.min(rect.width, rect.height) / 2 : 0;
        return [{ id: elements.get(element), left: rect.left, right: rect.right, top: rect.top, radius }];
      });
      const documentHeight = document.scrollingElement?.scrollHeight || document.documentElement.scrollHeight;
      surfaces.push(floorSurface(innerWidth, documentHeight, scrollY));
    }
    function draw(timestamp) {
      if (disposed) return;
      const time = timestamp / 1000;
      if (time >= measureAt) { measure(); measureAt = time + 0.25; }
      step(particles, surfaces, last ? time - last : 0, time, options);
      if (options.pointer) {
        options.pointer.fromX = options.pointer.x;
        options.pointer.fromY = options.pointer.y;
      }
      last = time;
      function render(p, node) {
        node.style.display = p.alive === false ? 'none' : 'block';
        if (p.alive === false) return;
        const flutter = mode === 'christmas' || p.support !== null ? 1 : 0.45 + Math.abs(Math.cos(time * 2.2 + p.phase)) * 0.55;
        node.style.width = `${p.width}px`;
        node.style.height = `${p.size}px`;
        node.style.transform = `translate3d(${p.x - p.width / 2}px,${p.y - p.size / 2}px,0) rotate(${p.angle}deg) scaleX(${flutter})`;
        node.style.opacity = p.support !== null && p.resting < 1 ? Math.max(0, p.resting) * 0.82 : 0.82;
      }
      particles.forEach((p, index) => render(p, nodes[index]));
      options.deposits.forEach((p, index) => {
        if (!depositNodes[index]) {
          const node = document.createElement('span');
          node.className = 'seasonal-deposit';
          layer.append(node);
          depositNodes[index] = node;
        }
        render(p, depositNodes[index]);
      });
      frame = requestAnimationFrame(draw);
    }
    const clearPointer = () => { options.pointer = null; };
    const invalidate = () => { measureAt = -1; clearPointer(); };
    function pointerMove(event) {
      // Touch gestures keep their normal scrolling behaviour.
      if (event.pointerType === 'touch') return;
      const time = performance.now() / 1000;
      const previous = options.pointer;
      const recent = previous && time - previous.time < 0.18;
      const dt = recent ? Math.max(0.008, time - previous.time) : 0.016;
      options.pointer = {
        fromX: recent ? previous.fromX : event.clientX - event.movementX,
        fromY: recent ? previous.fromY : event.clientY - event.movementY,
        x: event.clientX, y: event.clientY,
        vx: Math.max(-1600, Math.min(1600, (recent ? event.clientX - previous.x : event.movementX) / dt)),
        vy: Math.max(-1600, Math.min(1600, (recent ? event.clientY - previous.y : event.movementY) / dt)),
        time
      };
    }
    const pointerOut = event => { if (!event.relatedTarget) clearPointer(); };
    function visibility() {
      cancelAnimationFrame(frame); last = 0; clearPointer();
      if (!document.hidden) frame = requestAnimationFrame(draw);
    }
    addEventListener('scroll', invalidate, { passive: true });
    addEventListener('resize', invalidate, { passive: true });
    document.addEventListener('pointermove', pointerMove, { passive: true });
    document.addEventListener('pointerout', pointerOut, { passive: true });
    document.addEventListener('pointercancel', clearPointer, { passive: true });
    addEventListener('blur', clearPointer);
    document.addEventListener('visibilitychange', visibility);
    if (!document.hidden) frame = requestAnimationFrame(draw);
    stop = () => {
      disposed = true; cancelAnimationFrame(frame);
      removeEventListener('scroll', invalidate); removeEventListener('resize', invalidate);
      document.removeEventListener('pointermove', pointerMove);
      document.removeEventListener('pointerout', pointerOut);
      document.removeEventListener('pointercancel', clearPointer);
      removeEventListener('blur', clearPointer);
      document.removeEventListener('visibilitychange', visibility);
      layer.classList.remove('seasonal-layer--physics');
      depositNodes.forEach(node => node.remove());
      nodes.forEach(node => { node.style.removeProperty('transform'); node.style.removeProperty('opacity'); });
      elements.clear();
    };
  }
  const observer = new MutationObserver(reconcile);
  observer.observe(document.body, { childList: true, subtree: true });
  preference.addEventListener('change', () => { stop(); active = null; stop = () => {}; reconcile(); });
  reconcile();
})();
