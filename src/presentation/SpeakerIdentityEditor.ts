import { Notice } from "obsidian";
import { StudioRepository } from "../application/studio/StudioRepository";
import { SpeakerOption } from "../application/studio/SpeakerDirectory";
import { displayName } from "../domain/studio/StudioModels";
import { StudioDialog } from "./StudioDialog";

/** Rename through a stable database ID, never through displayed names. */
export class SpeakerIdentityEditor {
  constructor(
    private readonly studio: StudioRepository,
    private readonly dialog: StudioDialog
  ) {}

  async edit(speaker: SpeakerOption): Promise<SpeakerOption | undefined> {
    const identity = await this.dialog.editName({
      title: speaker.title ?? "",
      firstName: speaker.firstName ?? speaker.name,
      lastName: speaker.lastName ?? ""
    }, `${speaker.name} • İsmi düzenle`);
    if (!identity) return undefined;
    try {
      const updated = speaker.kind === "main"
        ? await this.studio.updateMainCharacter(speaker.id, identity)
        : await this.studio.updateRosterEntity(speaker.id, identity);
      return { ...speaker, name: displayName(updated), title: updated.title ?? "",
        firstName: updated.firstName, lastName: updated.lastName };
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error), 6000);
      return undefined;
    }
  }
}
