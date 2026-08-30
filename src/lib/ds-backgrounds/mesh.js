/**
 * mesh — soft drifting colour field that leans toward the cursor.
 * The DeepSeek-style look: a handful of huge radial blobs rendered into a
 * deliberately tiny canvas, then stretched and blurred by the compositor.
 * Cost is near-zero regardless of viewport size.
 */
import { rgba, mixColor, clamp, lerp } from './core.js';

const BLOB_COUNT = 6;

export default {
  name: 'mesh',
  mode: '2d',
  resolution: 0.16,
  maxDpr: 1,
  canvasStyle: { filter: 'blur(36px)', transform: 'scale(1.12)', transformOrigin: 'center' },

  setup(s) {
    const rand = mulberry(0xa11ce);
    s.blobs = Array.from({ length: BLOB_COUNT }, (_, i) => ({
      ox: 0.5 + (rand() - 0.5) * 1.1,
      oy: 0.5 + (rand() - 0.5) * 1.1,
      ax: 0.16 + rand() * 0.22,
      ay: 0.12 + rand() * 0.2,
      fx: 0.05 + rand() * 0.09,
      fy: 0.04 + rand() * 0.08,
      phase: rand() * Math.PI * 2,
      radius: 0.42 + rand() * 0.4,
      tone: i % 3,
    }));
    // Blob 0 is the cursor light: it trails the pointer instead of drifting.
    s.cursorBlob = { x: 0.5, y: 0.5 };
  },

  frame(s) {
    const { ctx, width: w, height: h, palette: p, time: t } = s;
    const scale = Math.max(w, h);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(p.base, 1);
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = p.dark ? 'lighter' : 'multiply';

    const tones = [p.a, p.b, p.c];
    const alphaBase = (p.dark ? 0.34 : 0.3) * p.strength;

    for (const blob of s.blobs) {
      const x = (blob.ox + Math.sin(t * blob.fx + blob.phase) * blob.ax) * w;
      const y = (blob.oy + Math.cos(t * blob.fy + blob.phase * 1.7) * blob.ay) * h;
      const r = blob.radius * scale;
      const colour = tones[blob.tone];
      paintBlob(ctx, x, y, r, colour, alphaBase * (0.7 + 0.3 * Math.sin(t * 0.3 + blob.phase)), p.dark);
    }

    // Cursor light — lags behind the pointer for a liquid feel.
    s.cursorBlob.x = lerp(s.cursorBlob.x, s.pointer.x, 0.06);
    s.cursorBlob.y = lerp(s.cursorBlob.y, s.pointer.y, 0.06);
    const boost = s.pointer.active ? 1 : 0.55;
    paintBlob(
      ctx,
      s.cursorBlob.x * w,
      s.cursorBlob.y * h,
      scale * 0.36,
      mixColor(p.c, p.a, 0.35),
      alphaBase * 1.15 * boost,
      p.dark,
    );

    // Click ripples bloom and fade out.
    for (let i = s.ripples.length - 1; i >= 0; i -= 1) {
      const age = s.time - s.ripples[i].born;
      if (age < 0 || age > 2.2) { s.ripples.splice(i, 1); continue; }
      const k = age / 2.2;
      paintBlob(
        ctx,
        s.ripples[i].x * w,
        s.ripples[i].y * h,
        scale * (0.08 + k * 0.5),
        p.c,
        alphaBase * (1 - k) * 0.9,
        p.dark,
      );
    }

    ctx.globalCompositeOperation = 'source-over';
  },
};

function paintBlob(ctx, x, y, r, colour, alpha, dark) {
  const radius = Math.max(1, r);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  const a = clamp(alpha, 0, 1);
  gradient.addColorStop(0, rgba(colour, a));
  gradient.addColorStop(0.45, rgba(colour, a * 0.45));
  gradient.addColorStop(1, rgba(dark ? [0, 0, 0] : [255, 255, 255], 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
