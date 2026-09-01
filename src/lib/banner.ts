/**
 * Block-figlet banners for page headings.
 *
 * The homepage wordmark cycles through three ASCII faces; the block face
 * (3×5 cells of `#`) is the one that scales down to a heading band, so the
 * inner pages reuse it for their own titles. `compose` comes from
 * ../lib/wordmark — the same composer the wordmark itself uses, so a banner
 * and the wordmark's block frame are guaranteed to line up.
 */
import { compose } from './wordmark';

/** 3×5 block face, a superset of wordmark.ts's BLOCK_GLYPHS. */
export const BLOCK_ALPHABET: Record<string, string[]> = {
  a: ['###', '# #', '###', '# #', '# #'],
  b: ['## ', '# #', '## ', '# #', '## '],
  c: ['###', '#  ', '#  ', '#  ', '###'],
  d: ['## ', '# #', '# #', '# #', '## '],
  e: ['###', '#  ', '###', '#  ', '###'],
  f: ['###', '#  ', '###', '#  ', '#  '],
  g: ['###', '#  ', '# #', '# #', '###'],
  h: ['# #', '# #', '###', '# #', '# #'],
  i: ['###', ' # ', ' # ', ' # ', '###'],
  j: ['  #', '  #', '  #', '# #', '###'],
  k: ['# #', '# #', '## ', '# #', '# #'],
  l: ['#  ', '#  ', '#  ', '#  ', '###'],
  m: ['# #', '###', '# #', '# #', '# #'],
  n: ['## ', '# #', '# #', '# #', '# #'],
  o: ['###', '# #', '# #', '# #', '###'],
  p: ['###', '# #', '###', '#  ', '#  '],
  q: ['###', '# #', '# #', '###', '  #'],
  r: ['###', '# #', '## ', '# #', '# #'],
  s: ['###', '#  ', '###', '  #', '###'],
  t: ['###', ' # ', ' # ', ' # ', ' # '],
  u: ['# #', '# #', '# #', '# #', '###'],
  v: ['# #', '# #', '# #', '# #', ' # '],
  w: ['# #', '# #', '# #', '###', '# #'],
  x: ['# #', '# #', ' # ', '# #', '# #'],
  y: ['# #', '# #', '###', '  #', '###'],
  z: ['###', '  #', ' # ', '#  ', '###'],
  '0': ['###', '# #', '# #', '# #', '###'],
  '1': [' # ', '## ', ' # ', ' # ', '###'],
  '2': ['###', '  #', '###', '#  ', '###'],
  '3': ['###', '  #', '###', '  #', '###'],
  '4': ['# #', '# #', '###', '  #', '  #'],
  '5': ['###', '#  ', '###', '  #', '###'],
  '6': ['###', '#  ', '###', '# #', '###'],
  '7': ['###', '  #', '  #', '  #', '  #'],
  '8': ['###', '# #', '###', '# #', '###'],
  '9': ['###', '# #', '###', '  #', '###'],
  '?': ['###', '  #', ' ##', '   ', ' # '],
  '!': [' # ', ' # ', ' # ', '   ', ' # '],
  '-': ['   ', '   ', '###', '   ', '   '],
  '.': ['   ', '   ', '   ', '   ', ' # '],
  '/': ['  #', '  #', ' # ', '#  ', '#  '],
  ' ': ['   ', '   ', '   ', '   ', '   ']
};

/**
 * Render `word` (lowercased) as a block banner. Unknown characters fall back
 * to a blank cell rather than throwing, so a heading can never break a build.
 */
export function banner(word: string, gap = 1): string {
  const safe = word
    .toLowerCase()
    .split('')
    .map((ch) => (BLOCK_ALPHABET[ch] ? ch : ' '))
    .join('');
  return compose(BLOCK_ALPHABET, safe, gap).join('\n');
}
