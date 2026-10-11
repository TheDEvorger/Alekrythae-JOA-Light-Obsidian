import { CANONICAL_D240_LINES } from "./CanonicalD240Lines";

export interface D240Entry {
  readonly roll: number;
  readonly text: string;
}

/** Exact index lookup: the roll number is the canonical source key. */
export class D240Table {
  constructor(private readonly lines: readonly string[] = CANONICAL_D240_LINES) {
    if (lines.length !== 240 || lines.some((line) => !line.trim())) {
      throw new Error("D240 kanonik tablosunda tam 240 dolu cümle olmalıdır.");
    }
  }

  entryFor(roll: number): D240Entry {
    if (!Number.isInteger(roll) || roll < 1 || roll > 240) {
      throw new Error("D240 sonucu 1 ile 240 arasında tam sayı olmalıdır.");
    }
    return { roll, text: this.lines[roll - 1] };
  }

  allEntries(): D240Entry[] {
    return Array.from({ length: 240 }, (_, index) => this.entryFor(index + 1));
  }
}
