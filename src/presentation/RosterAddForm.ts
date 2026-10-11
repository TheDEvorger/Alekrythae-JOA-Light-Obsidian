import { EntityKind, LifeStatus } from "../domain/studio/StudioModels";
import { FANTASY_EMOJI } from "../domain/shared/FantasyEmojiCatalog";
import { RosterPanelPort } from "./RosterContracts";
import { StudioDialog } from "./StudioDialog";

/** Creates a new NPC/vehicle/other entry, without knowing list rendering. */
export class RosterAddForm {
  constructor(
    private readonly port: RosterPanelPort,
    private readonly dialog: StudioDialog,
    private readonly status: () => LifeStatus,
    private readonly afterSave: () => Promise<void>
  ) {}

  render(): HTMLElement {
    const form = document.createElement("div");
    form.className = "joa-roster-form";
    const kind = document.createElement("select");
    kind.className = "joa-compact-select";
    for (const [value, label] of [
      ["npc", `${FANTASY_EMOJI.npc} NPC`],
      ["vehicle", `${FANTASY_EMOJI.vessel} Araç`],
      ["place", `${FANTASY_EMOJI.place} Mekan`],
      ["other", `${FANTASY_EMOJI.scrying} Diğer`]
    ] as const) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      kind.appendChild(option);
    }
    const title = this.input("Ünvan (isteğe bağlı)", "joa-compact-input joa-roster-title-input");
    title.maxLength = 80;
    title.setAttribute("aria-label", "Ünvan");
    const first = this.input("Ad / araç / mekan adı");
    const last = this.input("Soyad (isteğe bağlı)");
    const save = document.createElement("button");
    save.type = "button";
    save.className = "joa-secondary-button";
    save.textContent = "Ekle";
    save.addEventListener("click", async () => {
      const firstName = first.value.trim();
      if (!firstName) {
        await this.dialog.alert("Eksik isim", "Bir ad, araç adı veya mekan adı yazmalısın.");
        return;
      }
      save.disabled = true;
      try {
        const created = await this.port.createRosterEntity(kind.value as EntityKind);
        await this.port.updateRosterEntity(created.id, {
          title: title.value.trim(), firstName, lastName: last.value.trim(), lifeStatus: this.status()
        });
        title.value = first.value = last.value = "";
        form.hidden = true;
        await this.afterSave();
      } catch (error) {
        await this.dialog.alert("İşlem tamamlanamadı", error instanceof Error ? error.message : String(error));
      } finally {
        save.disabled = false;
      }
    });
    form.append(kind, title, first, last, save);
    return form;
  }

  private input(placeholder: string, className = "joa-compact-input"): HTMLInputElement {
    const input = document.createElement("input");
    input.className = className;
    input.placeholder = placeholder;
    return input;
  }
}
