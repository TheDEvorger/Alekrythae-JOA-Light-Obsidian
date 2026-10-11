import { D240Entry } from "../d240/D240Table";
import { CalloutStyle } from "../callout/CalloutStyleTable";

/** Lightweight text formatting. New speech never creates a Markdown callout/card. */
export class SceneCalloutFormatter {
  dialogue(
    speaker: string,
    dialogue: string,
    _kind: "meggy" | "main" | "npc" | "vehicle" | "other" | "place" = "meggy",
    _speakerId?: string
  ): string {
    const cleanSpeaker = this.requiredSingleLine(speaker, "Konuşan karakter");
    const cleanDialogue = this.requiredText(dialogue, "Konuşma");
    return `${this.escapeInline(cleanSpeaker)}: ${cleanDialogue}`;
  }

  /** D240 continues to work without an expensive decorated callout. */
  event(entry: D240Entry, style: CalloutStyle): string {
    const roll = String(entry.roll).padStart(3, "0");
    return `**${this.escapeInline(style.label)} · D240 ${roll}:** ${this.requiredText(entry.text, "D240 metni")}`;
  }

  scene(speaker: string, dialogue: string, entry: D240Entry, style: CalloutStyle): string {
    return `${this.dialogue(speaker, dialogue)}\n\n${this.event(entry, style)}`;
  }

  private escapeInline(value: string): string {
    return value.replace(/[\\`*_{}\[\]()#+.!|<>]/g, "\\$&");
  }

  private requiredSingleLine(value: string, label: string): string {
    const clean = value.replace(/\s+/g, " ").trim();
    if (!clean) throw new Error(`${label} boş olamaz.`);
    return clean;
  }

  private requiredText(value: string, label: string): string {
    const clean = value.trim();
    if (!clean) throw new Error(`${label} boş olamaz.`);
    return clean;
  }
}
