/**
 * Vendored from glepzilla/design-system/js/backgrounds/ (a separate git
 * repository in the parent monorepo — this site cannot import across repos).
 * Re-sync from that source when it changes; do not edit these files here.
 * The registry below is trimmed to the effects this site actually uses
 * (mesh, aurora); everything else in this file is unmodified.
 */
/**
 * glepzilla design system — interactive backgrounds.
 *
 *   import { initBackgrounds } from '.../js/backgrounds/index.js';
 *   initBackgrounds();            // picks up every [data-ds-background]
 *
 * or imperatively:
 *   createBackground(el, { effect: 'aurora', strength: 0.8 });
 */
import { Surface } from './core.js';
import mesh from './mesh.js';
import aurora from './aurora.js';

export const effects = { mesh, aurora };

/** If an effect cannot start (no WebGL, no 2d context), try this one instead. */
const FALLBACKS = { aurora: 'mesh' };

const instances = new WeakMap();

function readOptions(host) {
  const d = host.dataset;
  const options = {};
  if (d.dsStrength !== undefined) options.strength = Number(d.dsStrength);
  if (d.dsSpacing !== undefined) options.spacing = Number(d.dsSpacing);
  if (d.dsReach !== undefined) options.reach = Number(d.dsReach);
  if (d.dsDensity !== undefined) options.density = Number(d.dsDensity);
  if (d.dsCell !== undefined) options.cell = Number(d.dsCell);
  return options;
}

export function createBackground(host, options = {}) {
  if (!host) return null;
  destroyBackground(host);

  const requested = options.effect || host.dataset.dsBackground || 'mesh';
  const merged = { ...readOptions(host), ...options };

  const chain = [requested, FALLBACKS[requested], 'mesh'].filter(Boolean);
  for (const name of chain) {
    const effect = effects[name];
    if (!effect) continue;
    const surface = new Surface(host, effect, merged);
    if (!surface.failed) {
      host.dataset.dsBackgroundActive = name;
      instances.set(host, surface);
      return surface;
    }
  }
  console.warn(`[ds-background] no effect could start for "${requested}"`);
  return null;
}

export function destroyBackground(host) {
  const existing = instances.get(host);
  if (!existing) return;
  existing.destroy();
  instances.delete(host);
  delete host.dataset.dsBackgroundActive;
}

export function getBackground(host) {
  return instances.get(host) || null;
}

export function initBackgrounds(root = document) {
  return Array.from(root.querySelectorAll('[data-ds-background]'))
    .map((host) => createBackground(host))
    .filter(Boolean);
}

/** Feed `--ds-px` / `--ds-py` to every `.ds-spotlight` with one shared listener. */
export function initSpotlights(root = document) {
  const onMove = (event) => {
    const target = event.target instanceof Element ? event.target.closest('.ds-spotlight') : null;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    target.style.setProperty('--ds-px', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    target.style.setProperty('--ds-py', `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };
  root.addEventListener('pointermove', onMove, { passive: true });
  return () => root.removeEventListener('pointermove', onMove);
}

export { Surface };
