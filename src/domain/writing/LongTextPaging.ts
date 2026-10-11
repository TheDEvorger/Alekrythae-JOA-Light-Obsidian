/**
 * Read-only pagination of exceptionally long Markdown notes.
 * A page is a view of the original UTF-16 string: no whitespace is inserted
 * and no characters are normalized, trimmed, or saved.
 */
export const LONG_TEXT_PAGE_SIZE = 4096;
export const LONG_UNBROKEN_WARNING_LIMIT = 8192;

export function buildPageOffsets(text: string, pageSize = LONG_TEXT_PAGE_SIZE): number[] {
  if (!Number.isSafeInteger(pageSize) || pageSize < 2) throw new RangeError("Page size must be at least two characters.");
  const offsets = [0];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + pageSize, text.length);
    if (end < text.length) {
      const prev = text.charCodeAt(end - 1);
      const next = text.charCodeAt(end);
      // Keep UTF-16 surrogate pairs together at page boundaries.
      if (prev >= 0xD800 && prev <= 0xDBFF && next >= 0xDC00 && next <= 0xDFFF) end++;
    }
    offsets.push(end);
    start = end;
  }
  return offsets;
}

export function pageText(text: string, offsets: readonly number[], pageIndex: number): string {
  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= offsets.length - 1) {
    throw new RangeError("Page index is out of range.");
  }
  return text.slice(offsets[pageIndex], offsets[pageIndex + 1]);
}

export function containsHugeUnbrokenRun(text: string, limit = LONG_UNBROKEN_WARNING_LIMIT): boolean {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError("Limit must be a positive integer.");
  let run = 0;
  for (let i = 0; i < text.length; i++) {
    // All JS Unicode whitespace characters are barriers; punctuation is not.
    if (/\s/u.test(text[i])) run = 0;
    else if (++run >= limit) return true;
  }
  return false;
}
