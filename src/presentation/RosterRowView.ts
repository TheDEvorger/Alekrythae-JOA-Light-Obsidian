import { RosterListItem } from "../application/studio/StudioRepository";
import { LifeStatus } from "../domain/studio/StudioModels";
import { PortraitStore } from "../application/studio/PortraitStore";
import { RosterActions } from "./RosterActions";

/** Renders one entry. Event callbacks delegate to RosterActions. */
export class RosterRowView {
  constructor(
    private readonly portraits: PortraitStore,
    private readonly actions: RosterActions
  ) {}

  render(item: RosterListItem, status: LifeStatus): HTMLElement {
    const row = document.createElement("div");
    row.className = "joa-name-row";
    const portrait = this.button("+", "joa-roster-portrait");
    portrait.title = "Portre seç / kare kırp";
    if (item.portraitPath) void this.portraits.getDataUrl(item.portraitPath)
      .then((data) => {
        if (!data || !portrait.isConnected) return;
        const image = document.createElement("img");
        image.alt = "Portre";
        image.src = data;
        portrait.replaceChildren(image);
      });
    portrait.addEventListener("click", () => void this.actions.portrait(item));
    const name = this.button(item.name, "joa-name-insert");
    name.title = `${item.name} adını panoya kopyala (Markdown’a yazılmaz)`;
    name.addEventListener("click", () => void this.actions.copyName(item.name));

    const tools = document.createElement("div");
    tools.className = "joa-name-row-actions";
    const edit = this.button("Düzenle", "joa-row-icon joa-row-edit");
    edit.addEventListener("click", () => void this.actions.rename(item));
    const life = this.button(status === "living" ? "Öldür" : "Dirilt", "joa-row-icon joa-row-life");
    life.addEventListener("click", () => void this.actions.changeLife(item, status));
    tools.append(edit, life);
    const remove = this.button("Sil", "joa-row-icon joa-row-delete");
    remove.title = `${item.name} kaydını sil`;
    remove.setAttribute("aria-label", `${item.name} kaydını sil`);
    remove.addEventListener("click", () => void this.actions.remove(item));
    tools.appendChild(remove);
    row.append(portrait, name, tools);
    return row;
  }

  private button(text: string, className: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.title = text;
    return button;
  }
}
