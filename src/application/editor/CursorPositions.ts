/** Per-note caret bookmarks are UI preferences, not character/SQLite data. */
export interface CursorPosition { line: number; ch: number; }

export function validCursor(value: unknown): value is CursorPosition {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<CursorPosition>;
  return Number.isSafeInteger(point.line) && point.line! >= 0 &&
    Number.isSafeInteger(point.ch) && point.ch! >= 0;
}

export function sameCursor(a: CursorPosition, b: CursorPosition): boolean {
  return a.line === b.line && a.ch === b.ch;
}

export function clampCursor(
  point: CursorPosition,
  lastLine?: () => number,
  getLine?: (line: number) => string
): CursorPosition {
  const line = Math.min(point.line, Math.max(0, lastLine?.() ?? point.line));
  return { line, ch: Math.min(point.ch, getLine?.(line)?.length ?? point.ch) };
}
