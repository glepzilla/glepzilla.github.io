/** Date and plural helpers shared by the pages that print listings. */

function two(n: number): string {
  return String(n).padStart(2, '0');
}

/** `12.07` — the ls-style short date. */
export function formatDM(date: Date): string {
  return `${two(date.getUTCDate())}.${two(date.getUTCMonth() + 1)}`;
}

/** `12.07.2026`. */
export function formatDMY(date: Date): string {
  return `${formatDM(date)}.${date.getUTCFullYear()}`;
}

/** `12 июля 2026` — for article datelines. */
export function formatLong(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

/** `2026-07-12` — for `<time datetime>` and comment-style metadata. */
export function formatIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Russian plural forms: 1 запись, 2-4 записи, 0/5-20 записей. */
export function pluralizeRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
