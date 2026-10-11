import { FANTASY_EMOJI } from "../shared/FantasyEmojiCatalog";
export interface CalloutStyle {
  roll: number;
  type: string;
  label: string;
  icon: string;
}

/**
 * D240 olayları için ayrılmış görsel callout ailesi.
 * Konuşma kutuları bu tabloyu asla kullanmaz.
 */
export const DEFAULT_CALLOUT_STYLES = [
  { type: "joa-event", label: "Olay", icon: FANTASY_EMOJI.die },
  { type: "joa-discovery", label: "Keşif", icon: FANTASY_EMOJI.compass },
  { type: "joa-encounter", label: "Karşılaşma", icon: FANTASY_EMOJI.swords },
  { type: "joa-twist", label: "Dönüm", icon: FANTASY_EMOJI.vortex },
  { type: "joa-mystery", label: "Gizem", icon: FANTASY_EMOJI.moon },
  { type: "joa-world", label: "Dünya", icon: FANTASY_EMOJI.forest },
  { type: "joa-omen", label: "İşaret", icon: FANTASY_EMOJI.fire },
  { type: "joa-trace", label: "İz", icon: "" },
  { type: "joa-whisper", label: "Fısıltı", icon: "" },
  { type: "joa-secret", label: "Sır", icon: "" },
  { type: "joa-warning", label: "Uyarı", icon: "" },
  { type: "joa-threshold", label: "Eşik", icon: "" },
  { type: "joa-loss", label: "Kayıp", icon: "" },
  { type: "joa-memory", label: "Hatıra", icon: "" },
  { type: "joa-intuition", label: "Sezgi", icon: "" },
  { type: "joa-echo", label: "Yankı", icon: "" },
  { type: "joa-threat", label: "Tehdit", icon: "" },
  { type: "joa-obstacle", label: "Engel", icon: "" },
  { type: "joa-offer", label: "Teklif", icon: "" },
  { type: "joa-quest", label: "Görev", icon: "" },
  { type: "joa-fate", label: "Kader", icon: "" },
  { type: "joa-place", label: "Mekân", icon: "" },
  { type: "joa-conflict", label: "Çatışma", icon: "" },
  { type: "joa-strangeness", label: "Tuhaflık", icon: "" }
] as const;

export class CalloutStyleTable {
  constructor(
    private readonly styles: readonly Omit<CalloutStyle, "roll">[] = DEFAULT_CALLOUT_STYLES
  ) {
    if (styles.length === 0) {
      throw new Error("En az bir olay callout stili tanımlanmalıdır.");
    }
  }

  get size(): number {
    return this.styles.length;
  }

  entryFor(roll: number): CalloutStyle {
    if (!Number.isInteger(roll) || roll < 1 || roll > this.styles.length) {
      throw new Error(`Olay kutusu zarı 1 ile ${this.styles.length} arasında olmalıdır.`);
    }

    const style = this.styles[roll - 1];
    if (!style) {
      throw new Error("Olay callout stili bulunamadı.");
    }

    return { roll, ...style };
  }

  allEntries(): CalloutStyle[] {
    return Array.from({ length: this.styles.length }, (_, index) => this.entryFor(index + 1));
  }
}
