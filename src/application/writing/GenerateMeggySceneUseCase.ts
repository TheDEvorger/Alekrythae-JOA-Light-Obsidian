import { RollCalloutStyleUseCase } from "../callout/RollCalloutStyleUseCase";
import { RollD240UseCase } from "../d240/RollD240UseCase";
import { SpeakerOption } from "../studio/StudioRepository";
import { SceneCalloutFormatter } from "../../domain/writing/SceneCalloutFormatter";

export interface GeneratedMeggyScene {
  markdown: string;
  /** Only Meggy's canonical speaker ID triggers dice. */
  d240Roll?: number;
  eventStyle?: string;
}

/**
 * The sole note-writing use case: lightweight speaker heading and plain text;
 * only canonical Meggy also adds a plain-text D240 event and plays its voice.
 * Previously written callouts are left intact in old notes.
 */
export class GenerateMeggySceneUseCase {
  constructor(
    private readonly formatter: SceneCalloutFormatter,
    private readonly rollD240: RollD240UseCase,
    private readonly rollEventStyle: RollCalloutStyleUseCase
  ) {}

  execute(dialogue: string, speaker?: SpeakerOption): GeneratedMeggyScene {
    // Reject blank dialogue before consuming either random draw.
    const speech = this.formatter.dialogue(speaker?.name ?? "Meggy", dialogue, speaker?.kind ?? "meggy", speaker?.id ?? "meggy");
    // Identity, not the visible name or the 'main' type, controls event rolls.
    // Omitted speaker retains the historical canonical-Meggy default.
    if (speaker && speaker.id !== "meggy") {
      return { markdown: speech };
    }
    const event = this.rollD240.execute();
    const style = this.rollEventStyle.execute();
    return {
      markdown: `${speech}\n\n${this.formatter.event(event, style)}`,
      d240Roll: event.roll,
      eventStyle: style.type
    };
  }
}
