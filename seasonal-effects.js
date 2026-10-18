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
  function release(p, direction) {
    p.support = null;
    p.vx = direction * (24 + p.size);
    p.vy = 14;
    p.spin = direction;
    // Briefly ignore the same landing surface while sliding off its lip.
    p.ignore = 0.65;
  }
  function step(particles, surfaces, delta, time, options) {
    const dt = Math.min(Math.max(delta, 0), 0.04);
    const model = modes[options.mode];
    if (!model) return;
    for (const p of particles) {
      p.age += dt;
      p.ignore = Math.max(0, (p.ignore || 0) - dt);
      const gust = Math.sin(time * 0.47 + p.phase) + 0.4 * Math.sin(time * 1.3);
      if (p.support !== null) {
        const base = typeof p.support === 'number'
          ? particles.find(other => other.id === p.support && other.support !== null)
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
        const hit = particles.find(other => other !== p && other.support !== null &&
          Math.abs(p.x - other.x) < (p.size + other.size) * 0.55 &&
          previousBottom <= other.y && bottom >= other.y - other.size / 2);
        if (hit) {
          const gentle = options.mode === 'christmas' || p.vy < 45;
          if (!gentle) release(hit, p.x >= hit.x ? -1 : 1);
          p.vx *= -0.35;
          p.vy *= 0.3;
          if (gentle) {
            p.support = hit.id; p.offset = p.x - hit.x; p.resting = model.rest;
            p.y = hit.y - (hit.size + p.size) * 0.42;
          }
        } else if (candidates.length) {
          const { base, top } = candidates[0];
          p.y = top - p.size / 2;
          p.support = base.id;
          p.offset = p.x - base.left;
          p.resting = model.rest * (0.6 + (p.phase / (Math.PI * 2)) * 0.8);
          p.vy = 0;
          p.angle = Math.sin(p.phase) * 24;
        }
      }
      if (p.y > options.height + 30 || p.x < -80 || p.x > options.width + 80) {
        const fresh = createParticle(p.id, options);
        Object.assign(p, fresh, { y: -20 - (options.random || Math.random)() * 100, ignore: 0 });
      }
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createParticle, step };
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
    const options = { width: innerWidth, height: innerHeight, mode };
    const nodes = [...layer.children].filter(node => getComputedStyle(node).display !== 'none');
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
    }
    function draw(timestamp) {
      if (disposed) return;
      const time = timestamp / 1000;
      if (time >= measureAt) { measure(); measureAt = time + 0.25; }
      step(particles, surfaces, last ? time - last : 0, time, options);
      last = time;
      particles.forEach((p, index) => {
        const flutter = mode === 'christmas' || p.support !== null ? 1 : 0.45 + Math.abs(Math.cos(time * 2.2 + p.phase)) * 0.55;
        nodes[index].style.width = `${p.width}px`;
        nodes[index].style.height = `${p.size}px`;
        nodes[index].style.transform = `translate3d(${p.x - p.width / 2}px,${p.y - p.size / 2}px,0) rotate(${p.angle}deg) scaleX(${flutter})`;
        nodes[index].style.opacity = p.support !== null && p.resting < 1 ? Math.max(0, p.resting) * 0.82 : 0.82;
      });
      frame = requestAnimationFrame(draw);
    }
    const invalidate = () => { measureAt = -1; };
    function visibility() {
      cancelAnimationFrame(frame); last = 0;
      if (!document.hidden) frame = requestAnimationFrame(draw);
    }
    addEventListener('scroll', invalidate, { passive: true });
    addEventListener('resize', invalidate, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    if (!document.hidden) frame = requestAnimationFrame(draw);
    stop = () => {
      disposed = true; cancelAnimationFrame(frame);
      removeEventListener('scroll', invalidate); removeEventListener('resize', invalidate);
      document.removeEventListener('visibilitychange', visibility);
      layer.classList.remove('seasonal-layer--physics');
      nodes.forEach(node => { node.style.removeProperty('transform'); node.style.removeProperty('opacity'); });
      elements.clear();
    };
  }
  const observer = new MutationObserver(reconcile);
  observer.observe(document.body, { childList: true, subtree: true });
  preference.addEventListener('change', () => { stop(); active = null; stop = () => {}; reconcile(); });
  reconcile();
})();
