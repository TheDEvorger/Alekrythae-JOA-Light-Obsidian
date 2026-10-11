import { MainCharacterCard, NAME_SEPARATOR, displayName } from "../domain/studio/StudioModels";
import { FANTASY_EMOJI } from "../domain/shared/FantasyEmojiCatalog";
import { PortraitStore } from "../application/studio/PortraitStore";
import { StudioDialog } from "./StudioDialog";
import { PortraitCropDialog } from "./PortraitCropDialog";
import { CharacterCardAutoSave } from "./CharacterCardAutoSave";
import { CharacterCardView } from "./CharacterCardView";

export interface CharacterCardsPort {
  listMainCharacters(): Promise<MainCharacterCard[]>;
  createMainCharacter(): Promise<MainCharacterCard>;
  updateMainCharacter(id: string, patch: Partial<Pick<MainCharacterCard, "title" | "firstName" | "lastName" | "inventoryText" | "lifeStatus" | "portraitPath">>): Promise<MainCharacterCard>;
  deleteMainCharacter(id: string): Promise<void>;
}

/** Orchestrates the card collection. Rendering and debounce live elsewhere. */
export class CharacterCardsPanel {
  private readonly autosave: CharacterCardAutoSave;
  private grid!: HTMLElement;
  private count!: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly port: CharacterCardsPort,
    private readonly dialog: StudioDialog,
    private readonly portraits: PortraitStore,
    private readonly modalHost: HTMLElement
  ) {
    this.autosave = new CharacterCardAutoSave(
      (id, patch) => this.port.updateMainCharacter(id, patch),
      (id, message) => this.setSaveState(id, message),
      (error) => void this.dialog.alert("Kayıt başarısız", this.messageOf(error))
    );
  }

  mount(): void {
    this.root.replaceChildren();
    this.root.className = "joa-panel-root joa-tab-panel joa-cards-tab";
    const header = this.el("div", "joa-section-intro joa-cards-toolbar");
    const heading = this.el("h3", "joa-section-title");
    heading.textContent = "Karakter Kartları";
    const actions = this.el("div", "joa-panel-actions");
    this.count = this.el("span", "joa-soft-count");
    this.count.textContent = "0 kişi";
    const add = this.el("button", "joa-secondary-button");
    add.type = "button";
    add.textContent = `${FANTASY_EMOJI.crown} Ana karakter`;
    add.addEventListener("click", () => void this.addCharacter());
    actions.append(this.count, add);
    header.append(heading, actions);
    this.grid = this.el("div", "joa-character-card-grid");
    this.root.append(header, this.grid);
    this.root.scrollTop = this.grid.scrollTop = 0;
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    const rootTop = this.root.scrollTop;
    const rootLeft = this.root.scrollLeft;
    const gridTop = this.grid?.scrollTop ?? 0;
    const gridLeft = this.grid?.scrollLeft ?? 0;
    try {
      const cards = await this.port.listMainCharacters();
      this.count.textContent = `${cards.length} kişi`;
      this.grid.replaceChildren();
      if (!cards.length) {
        const empty = this.el("div", "joa-empty-state");
        for (const text of [NAME_SEPARATOR, "Henüz ana karakter yok", "Ana karakter ile ilk kartı aç."]) {
          const node = this.el("span", "");
          node.textContent = text;
          empty.appendChild(node);
        }
        this.grid.appendChild(empty);
        this.root.scrollTop = rootTop;
        this.root.scrollLeft = rootLeft;
        this.grid.scrollTop = gridTop;
        this.grid.scrollLeft = gridLeft;
        return;
      }
      const view = new CharacterCardView(this.autosave, {
        changePortrait: (card) => this.changePortrait(card),
        toggleLife: (card) => this.toggleLife(card),
        remove: (card) => this.deleteCharacter(card.id, displayName(card))
      }, (path) => this.portraits.getDataUrl(path));
      for (const card of cards) this.grid.appendChild(view.render(card));
      this.root.scrollTop = rootTop;
      this.root.scrollLeft = rootLeft;
      this.grid.scrollTop = gridTop;
      this.grid.scrollLeft = gridLeft;
    } catch (error) { await this.showError(error); }
  }

  private async changePortrait(card: MainCharacterCard): Promise<void> {
    try {
      await this.flushAll();
      const path = await new PortraitCropDialog(this.modalHost, this.portraits).open(card.id, card.portraitPath);
      if (!path) return;
      await this.port.updateMainCharacter(card.id, { portraitPath: path });
      await this.refresh();
    } catch (error) { await this.showError(error); }
  }

  private async toggleLife(card: MainCharacterCard): Promise<void> {
    const dying = card.lifeStatus === "living";
    const approved = await this.dialog.confirm({
      title: dying ? "Karakter ölsün mü?" : "Karakter yaşama dönsün mü?",
      message: `${displayName(card) || "Bu karakter"} ${dying ? "Ölüler" : "Yaşayanlar"} listesine taşınacak. Çanta notu korunacak.`,
      confirmLabel: dying ? "Öldür" : "Yaşat", tone: dying ? "danger" : "neutral"
    });
    if (!approved) return;
    try {
      await this.flushAll();
      await this.port.updateMainCharacter(card.id, { lifeStatus: dying ? "dead" : "living" });
      await this.refresh();
    } catch (error) { await this.showError(error); }
  }

  private async addCharacter(): Promise<void> {
    try {
      await this.flushAll();
      const created = await this.port.createMainCharacter();
      await this.refresh();
      const card = Array.from(this.grid.querySelectorAll<HTMLElement>(".joa-character-card"))
        .find((element) => element.dataset.characterId === created.id);
      card?.querySelector<HTMLInputElement>(".joa-person-name-input")?.focus({ preventScroll: true });
    } catch (error) { await this.showError(error); }
  }

  private async deleteCharacter(id: string, name: string): Promise<void> {
    const approved = await this.dialog.confirm({
      title: "Karakteri kalıcı olarak sil?",
      message: `${name || "İsimsiz karakter"} ve çanta notu SQLite veritabanından silinecek. Bu işlem geri alınamaz.`,
      confirmLabel: "Karakteri sil", tone: "danger"
    });
    if (!approved) return;
    try {
      this.autosave.discard(id);
      await this.flushAll();
      await this.port.deleteMainCharacter(id);
      await this.refresh();
    } catch (error) { await this.showError(error); }
  }

  async flushAll(): Promise<void> { await this.autosave.flushAll(); }

  private setSaveState(id: string, message: string): void {
    const card = Array.from(this.grid.querySelectorAll<HTMLElement>(".joa-character-card"))
      .find((element) => element.dataset.characterId === id);
    const state = card?.querySelector<HTMLElement>(".joa-autosave-state");
    if (state) state.textContent = message;
  }
  private async showError(error: unknown): Promise<void> {
    await this.dialog.alert("İşlem başarısız", this.messageOf(error));
  }
  private messageOf(error: unknown): string { return error instanceof Error ? error.message : String(error); }
  private el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }
}
