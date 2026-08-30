/**
 * glepzilla design system — background engine core.
 *
 * Handles everything an effect should not have to care about:
 * canvas + DPR sizing, resize, pause when off-screen or on a hidden tab,
 * a smoothed pointer with an idle "wander" fallback for touch devices,
 * live theme changes, and `prefers-reduced-motion`.
 *
 * An effect is a plain object:
 *   { name, mode, resolution?, maxDpr?, canvasStyle?,
 *     setup(s), resize(s), frame(s, dt), palette(s), destroy(s) }
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const CANVAS_VARS = {
  base: '--ds-canvas-base',
  a: '--ds-canvas-a',
  b: '--ds-canvas-b',
  c: '--ds-canvas-c',
  ink: '--ds-canvas-ink',
};

const FALLBACK = {
  base: [11, 14, 10],
  a: [116, 150, 74],
  b: [47, 90, 70],
  c: [185, 217, 119],
  ink: [205, 210, 197],
};

/** Resolve a CSS colour token to [r, g, b, a] through a hidden probe element,
 *  so `light-dark()` and `color-mix()` are resolved by the browser, not by us. */
function resolveColor(probe, varName, fallback) {
  probe.style.color = `var(${varName}, rgb(${fallback.join(' ')}))`;
  const parts = getComputedStyle(probe).color.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return [...fallback, 1];
  return [Number(parts[0]), Number(parts[1]), Number(parts[2]), parts[3] === undefined ? 1 : Number(parts[3])];
}

export function rgba([r, g, b], alpha = 1) {
  return `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
}

export function mixColor(x, y, t) {
  return [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
}

function luminance([r, g, b]) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Deterministic 2D value noise + fbm — no dependencies, good enough for fields. */
export function makeNoise(seed = 1337) {
  const hash = (x, y) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 69069);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  const noise2 = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = smooth(x - xi);
    const yf = smooth(y - yi);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return lerp(lerp(a, b, xf), lerp(c, d, xf), yf);
  };
  const fbm = (x, y, octaves = 3) => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    let px = x;
    let py = y;
    for (let i = 0; i < octaves; i += 1) {
      sum += noise2(px, py) * amp;
      norm += amp;
      amp *= 0.5;
      px *= 2.03;
      py *= 2.03;
    }
    return sum / norm;
  };
  return { noise2, fbm };
}

export class Surface {
  constructor(host, effect, options = {}) {
    this.host = host;
    this.effect = effect;
    this.options = options;
    this.running = false;
    this.visible = true;
    this.time = 0;
    this.lastFrame = 0;
    this.idleSince = performance.now();

    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.canvas.style, effect.canvasStyle || {});
    host.appendChild(this.canvas);

    this.probe = document.createElement('span');
    this.probe.style.display = 'none';
    host.appendChild(this.probe);

    this.pointer = {
      x: 0.5, y: 0.5,          // smoothed, normalised to the host box
      targetX: 0.5, targetY: 0.5,
      vx: 0, vy: 0,
      speed: 0,
      active: false,
      inside: false,
    };
    this.ripples = [];

    if (effect.mode === 'webgl') {
      const attrs = { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'low-power' };
      this.gl = this.canvas.getContext('webgl2', attrs) || this.canvas.getContext('webgl', attrs);
      if (!this.gl) {
        this.failed = true;
        this.canvas.remove();
        this.probe.remove();
        return;
      }
    } else {
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      if (!this.ctx) {
        this.failed = true;
        this.canvas.remove();
        this.probe.remove();
        return;
      }
    }

    this.readPalette();
    this.measure();
    try {
      effect.setup?.(this);
    } catch (error) {
      this.failed = true;
      this.canvas.remove();
      this.probe.remove();
      console.warn(`[ds-background] "${effect.name}" failed to start`, error);
      return;
    }
    effect.resize?.(this);

    this.bind();
    host.dataset.dsReady = 'true';

    if (reducedMotion.matches) this.renderOnce();
    else this.start();
  }

  /* ---- palette -------------------------------------------------------- */
  readPalette() {
    const p = {};
    for (const [key, varName] of Object.entries(CANVAS_VARS)) {
      p[key] = resolveColor(this.probe, varName, FALLBACK[key]);
    }
    p.dark = luminance(p.base) < 0.45;
    p.strength = this.options.strength ?? (p.dark ? 1 : 0.72);
    this.palette = p;
  }

  /* ---- sizing --------------------------------------------------------- */
  measure() {
    const rect = this.host.getBoundingClientRect();
    const cssW = Math.max(1, rect.width || this.host.offsetWidth || window.innerWidth);
    const cssH = Math.max(1, rect.height || this.host.offsetHeight || window.innerHeight);
    const maxDpr = this.effect.maxDpr ?? 2;
    const resolution = this.effect.resolution ?? 1;
    const dpr = clamp(window.devicePixelRatio || 1, 1, maxDpr) * resolution;

    this.cssWidth = cssW;
    this.cssHeight = cssH;
    this.dpr = dpr;
    this.width = Math.max(1, Math.round(cssW * dpr));
    this.height = Math.max(1, Math.round(cssH * dpr));

    if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      return true;
    }
    return false;
  }

  /* ---- events --------------------------------------------------------- */
  bind() {
    this.onPointerMove = (event) => {
      const rect = this.host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      this.pointer.targetX = clamp(x, -0.25, 1.25);
      this.pointer.targetY = clamp(y, -0.25, 1.25);
      this.pointer.inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      this.pointer.active = true;
      this.idleSince = performance.now();
    };

    this.onPointerDown = (event) => {
      const rect = this.host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.ripples.push({
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
        born: this.time,
      });
      if (this.ripples.length > 4) this.ripples.shift();
    };

    this.onVisibility = () => {
      if (document.hidden) this.stop();
      else if (this.visible && !reducedMotion.matches) this.start();
    };

    this.onMotionChange = () => {
      if (reducedMotion.matches) {
        this.stop();
        this.renderOnce();
      } else {
        this.start();
      }
    };

    this.onThemeChange = () => {
      this.readPalette();
      this.effect.palette?.(this);
      if (!this.running) this.renderOnce();
    };

    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);
    reducedMotion.addEventListener('change', this.onMotionChange);

    this.colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    this.colorScheme.addEventListener('change', this.onThemeChange);
    this.themeObserver = new MutationObserver(this.onThemeChange);
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });

    this.resizeObserver = new ResizeObserver(() => {
      if (this.measure()) this.effect.resize?.(this);
      if (!this.running) this.renderOnce();
    });
    this.resizeObserver.observe(this.host);

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.visible = entries.some((entry) => entry.isIntersecting);
        if (this.visible && !document.hidden && !reducedMotion.matches) this.start();
        else this.stop();
      },
      { rootMargin: '120px' },
    );
    this.intersectionObserver.observe(this.host);
  }

  /* ---- loop ----------------------------------------------------------- */
  start() {
    if (this.running || this.failed) return;
    this.running = true;
    this.lastFrame = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      const dt = clamp((now - this.lastFrame) / 1000, 0, 0.05);
      this.lastFrame = now;
      this.time += dt;
      this.updatePointer(dt, now);
      this.effect.frame?.(this, dt);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** One static frame — used for reduced-motion and for paused resizes.
   *  The clock only ever moves forward: rewinding it would give live ripples
   *  a negative age, and every effect derives radii from that age. */
  renderOnce() {
    if (this.failed) return;
    if (this.time === 0) this.time = 6;
    this.updatePointer(0.016, this.idleSince);
    this.effect.frame?.(this, 0);
  }

  /** Smooth the pointer, and let it wander on its own when nobody is moving it
   *  (touch devices, or an idle desktop) so the composition keeps breathing. */
  updatePointer(dt, now) {
    const p = this.pointer;
    if (now - this.idleSince > 2200) {
      p.active = false;
      const t = this.time * 0.12;
      p.targetX = 0.5 + Math.sin(t * 0.9) * 0.28 + Math.sin(t * 0.37) * 0.08;
      p.targetY = 0.5 + Math.cos(t * 0.63) * 0.22 + Math.cos(t * 0.29) * 0.07;
    }
    const ease = 1 - Math.pow(0.0016, dt || 0.016);
    const nx = lerp(p.x, p.targetX, ease);
    const ny = lerp(p.y, p.targetY, ease);
    p.vx = dt ? (nx - p.x) / dt : 0;
    p.vy = dt ? (ny - p.y) / dt : 0;
    p.speed = Math.hypot(p.vx, p.vy);
    p.x = nx;
    p.y = ny;
  }

  /* ---- teardown ------------------------------------------------------- */
  destroy() {
    this.stop();
    this.effect.destroy?.(this);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    document.removeEventListener('visibilitychange', this.onVisibility);
    reducedMotion.removeEventListener('change', this.onMotionChange);
    this.colorScheme?.removeEventListener('change', this.onThemeChange);
    this.themeObserver?.disconnect();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.canvas.remove();
    this.probe?.remove();
    delete this.host.dataset.dsReady;
  }
}
