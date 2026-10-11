import { LifeStatus } from "../domain/studio/StudioModels";
import { FANTASY_EMOJI } from "../domain/shared/FantasyEmojiCatalog";
import { PortraitStore } from "../application/studio/PortraitStore";
import { RosterPanelPort } from "./RosterContracts";
import { RosterAddForm } from "./RosterAddForm";
import { RosterActions } from "./RosterActions";
import { RosterRowView } from "./RosterRowView";
import { StudioDialog } from "./StudioDialog";

/** Coordinates roster view state; never mutates entities itself. */
export class RosterPanel {
  private status: LifeStatus = "living";
  private list!: HTMLElement;
  private toggle!: HTMLButtonElement;
  private count!: HTMLElement;
  private form!: HTMLElement;
  private refreshRevision = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly port: RosterPanelPort,
    private readonly dialog: StudioDialog,
    private readonly portraits: PortraitStore,
    private readonly modalHost: HTMLElement
  ) {}

  mount(): void {
    this.root.replaceChildren();
    this.root.className = "joa-panel-root joa-tab-panel joa-roster-tab";
    const header = this.element("div", "joa-section-intro");
    const copy = this.element("div", "joa-section-copy");
    for (const [tag, cls, text] of [
      ["div", "joa-kicker", "İSİM ÇAĞIRICI"],
      ["h3", "joa-section-title", "Mevcudat"],
      ["p", "joa-section-subtitle", "İsme dokunarak panoya kopyala; kişi, araç, mekan ve yaşam durumu değişiklikleri yalnız SQLite’a kaydolur."]
    ] as const) {
      const node = this.element(tag, cls);
      node.textContent = text;
      copy.appendChild(node);
    }
    const actions = this.element("div", "joa-panel-actions");
    this.count = this.element("span", "joa-soft-count");
    this.count.textContent = "0 kayıt";
    const add = document.createElement("button");
    add.type = "button";
    add.className = "joa-secondary-button joa-roster-add";
    add.textContent = `${FANTASY_EMOJI.scroll} Yeni`;
    add.title = "NPC / araç / diğer kayıt ekle";
    add.addEventListener("click", () => { this.form.hidden = !this.form.hidden; });
    this.toggle = document.createElement("button");
    this.toggle.type = "button";
    this.toggle.addEventListener("click", () => {
      this.status = this.status === "living" ? "dead" : "living";
      this.syncToggle();
      void this.refresh();
    });
    actions.append(this.count, add, this.toggle);
    header.append(copy, actions);
    const addForm = new RosterAddForm(this.port, this.dialog, () => this.status, () => this.refresh());
    this.form = addForm.render();
    this.form.hidden = true;
    this.list = this.element("div", "joa-name-list");
    this.root.append(header, this.form, this.list);
    this.syncToggle();
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    const revision = ++this.refreshRevision;
    const rootTop = this.root.scrollTop;
    const rootLeft = this.root.scrollLeft;
    const listTop = this.list?.scrollTop ?? 0;
    const listLeft = this.list?.scrollLeft ?? 0;
    try {
      const items = await this.port.listRoster(this.status);
      if (revision !== this.refreshRevision || !this.list.isConnected) return;
      this.count.textContent = `${items.length} kayıt`;
      this.list.replaceChildren();
      if (!items.length) {
        const empty = this.element("div", "joa-empty-state joa-roster-empty");
        const label = document.createElement("strong");
        label.textContent = this.status === "living" ? "Yaşayan listesi boş" : "Ölü listesi boş";
        empty.appendChild(label);
        this.list.appendChild(empty);
        this.root.scrollTop = rootTop;
        this.root.scrollLeft = rootLeft;
        this.list.scrollTop = listTop;
        this.list.scrollLeft = listLeft;
        return;
      }
      const commands = new RosterActions(this.port, this.dialog, this.portraits, this.modalHost, () => this.refresh());
      const view = new RosterRowView(this.portraits, commands);
      for (const item of items) this.list.appendChild(view.render(item, this.status));
      this.root.scrollTop = rootTop;
      this.root.scrollLeft = rootLeft;
      this.list.scrollTop = listTop;
      this.list.scrollLeft = listLeft;
    } catch (error) {
      await this.dialog.alert("İşlem tamamlanamadı", error instanceof Error ? error.message : String(error));
    }
  }

  private syncToggle(): void {
    this.toggle.className = `joa-life-toggle ${this.status === "living" ? "is-living" : "is-dead"}`;
    this.toggle.textContent = this.status === "living"
      ? `${FANTASY_EMOJI.living} Yaşayanlar` : `${FANTASY_EMOJI.dead} Ölüler`;
  }

  private element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.className = className;
    return node;
  }
}
