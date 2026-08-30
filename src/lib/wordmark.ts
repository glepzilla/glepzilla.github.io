/**
 * Figlet "glepzilla" wordmark data — ported verbatim from the design file's
 * behaviour comment (design-2a-spec.html, artboard 2a). Shared between the
 * homepage's frontmatter (SSR of FRAMES[0], the wordmark <h1>'s initial
 * content) and its client script (the morph cycle), so the two copies can
 * never drift apart.
 */

// ── ASCII-начертания слова glepzilla ────────────────────────────────────────
export const STANDARD = [
  '       _                _ _ _       ',
  '  __ _| | ___ _ __  ___(_) | | __ _ ',
  " / _` | |/ _ \\ '_ \\|_  / | | |/ _` |",
  '| (_| | |  __/ |_) |/ /| | | | (_| |',
  ' \\__, |_|\\___| .__//___|_|_|_|\\__,_|',
  ' |___/       |_|                    '
];

export const BLOCK_GLYPHS: Record<string, string[]> = {
  g: ['###', '#  ', '# #', '# #', '###'],
  l: ['#  ', '#  ', '#  ', '#  ', '###'],
  e: ['###', '#  ', '###', '#  ', '###'],
  p: ['###', '# #', '###', '#  ', '#  '],
  z: ['###', '  #', ' # ', '#  ', '###'],
  i: ['###', ' # ', ' # ', ' # ', '###'],
  a: ['###', '# #', '###', '# #', '# #']
};

export const OUTLINE_GLYPHS: Record<string, string[]> = {
  g: ['.--.', '| _ ', "'--'"],
  l: ['.  ', '|  ', "'--"],
  e: ['.--', '|-.', "'--"],
  p: ['.--.', "|--'", '|   '],
  z: ['---.', " .-'", "'---"],
  i: ['.', '|', "'"],
  a: ['.--.', '|--|', "'  '"]
};

export function compose(glyphs: Record<string, string[]>, word: string, gap: number): string[] {
  const rows = glyphs[word[0]].length;
  const out = [];
  for (let r = 0; r < rows; r += 1) {
    out.push(word.split('').map((ch) => glyphs[ch][r]).join(' '.repeat(gap)));
  }
  return out;
}

export function pad(frame: string[], w: number, h: number): string[] {
  const rows = frame.map((r) => r.padEnd(w, ' '));
  const top = Math.floor((h - rows.length) / 2);
  const blank = ' '.repeat(w);
  return [
    ...Array(top).fill(blank),
    ...rows,
    ...Array(h - rows.length - top).fill(blank)
  ];
}

export const RAW = [
  STANDARD,
  compose(BLOCK_GLYPHS, 'glepzilla', 1),
  compose(OUTLINE_GLYPHS, 'glepzilla', 1)
];
export const W = Math.max(...RAW.map((f) => Math.max(...f.map((r) => r.length))));
export const H = Math.max(...RAW.map((f) => f.length));
export const FRAMES = RAW.map((f) => pad(f, W, H));
export const NOISE = '/\\|_-=+*#$%&()[]{}<>~^:;.,';
