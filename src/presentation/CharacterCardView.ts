import { MainCharacterCard, NAME_SEPARATOR, displayName } from "../domain/studio/StudioModels";
import { CharacterCardAutoSave } from "./CharacterCardAutoSave";

export interface CharacterCardCommands {
  changePortrait(card: MainCharacterCard): Promise<void>;
  toggleLife(card: MainCharacterCard): Promise<void>;
  remove(card: MainCharacterCard): Promise<void>;
}

/** DOM and input bindings for exactly one character card. No repository access. */
export class CharacterCardView {
  constructor(
    private readonly autosave: CharacterCardAutoSave,
    private readonly commands: CharacterCardCommands,
    private readonly loadPortrait: (path: string) => Promise<string | undefined>
  ) {}

  render(card: MainCharacterCard): HTMLElement {
    const article = this.el("article", "joa-character-card");
    article.dataset.characterId = card.id;
    const portrait = this.el("button", "joa-person-portrait-button");
    portrait.type = "button";
    portrait.title = "Portre seç ve kare kırp";
    portrait.setAttribute("aria-label", "Karakter portresini değiştir");
    portrait.textContent = "+";
    if (card.portraitPath) void this.loadPortrait(card.portraitPath).then((src) => {
      if (!src || !portrait.isConnected) return;
      const image = document.createElement("img");
      image.src = src;
      image.alt = "Karakter portresi";
      portrait.replaceChildren(image);
    });
    portrait.addEventListener("click", () => void this.commands.changePortrait(card));

    const honorific = this.input("Ünvan (isteğe bağlı)…", "Ana karakterin ünvanını düzenle", card.title ?? "");
    honorific.maxLength = 80;
    const first = this.input("Adını yaz…", "Ana karakterin adını düzenle", card.firstName);
    const last = this.input("Soyadını yaz…", "Ana karakterin soyadını düzenle", card.lastName);
    const names = this.el("div", "joa-person-title-row joa-person-title-row-with-honorific");
    const namePair = this.el("div", "joa-person-name-pair");
    const separator = this.el("span", "joa-name-separator");
    separator.textContent = NAME_SEPARATOR;
    separator.setAttribute("aria-label", "Ad ve soyad ayıracı");
    separator.title = `Kanondaki isim ayıracı: ad ${NAME_SEPARATOR} soyad`;
    namePair.append(this.nameField("AD", first), separator, this.nameField("SOYAD", last));
    names.append(this.nameField("ÜNVAN", honorific), namePair);

    const label = this.el("div", "joa-card-label-row");
    const saveState = this.el("span", "joa-autosave-state");
    saveState.textContent = "SQLite • otomatik kayıt";
    label.append(this.text("span", "joa-field-label", "ÇANTA"), saveState);
    const inventory = document.createElement("textarea");
    inventory.className = "joa-free-inventory";
    inventory.placeholder = "İstediğini yaz…\nKılıç, para, not, at, mühür, anahtar, tarif…";
    inventory.value = card.inventoryText;
    inventory.rows = 8;
    inventory.addEventListener("input", () => this.autosave.queue(card.id, { inventoryText: inventory.value }));

    const footer = this.el("div", "joa-card-footer");
    const life = this.el("button", `joa-life-chip ${card.lifeStatus === "living" ? "is-living" : "is-dead"}`);
    life.type = "button";
    life.textContent = card.lifeStatus === "living" ? "Yaşıyor" : "Ölü";
    life.addEventListener("click", () => void this.commands.toggleLife(card));
    const title = this.text("span", "joa-card-display-name", displayName(card) || "İsimsiz karakter");
    const updateTitle = () => {
      title.textContent = displayName({ title: honorific.value, firstName: first.value, lastName: last.value }) || "İsimsiz karakter";
    };
    honorific.addEventListener("input", () => { this.autosave.queue(card.id, { title: honorific.value }); updateTitle(); });
    first.addEventListener("input", () => { this.autosave.queue(card.id, { firstName: first.value }); updateTitle(); });
    last.addEventListener("input", () => { this.autosave.queue(card.id, { lastName: last.value }); updateTitle(); });
    for (const input of [honorific, first, last]) {
      input.addEventListener("blur", () => void this.autosave.flushOne(card.id));
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") { event.preventDefault(); input.blur(); }
      });
    }
    inventory.addEventListener("blur", () => void this.autosave.flushOne(card.id));
    const remove = this.el("button", "joa-danger-ghost");
    remove.type = "button";
    remove.textContent = "Sil";
    remove.addEventListener("click", () => void this.commands.remove(card));
    const actions = this.el("div", "joa-card-footer-actions");
    actions.appendChild(remove);
    footer.append(life, title, actions);
    article.append(portrait, names, label, inventory, footer);
    return article;
  }

  private input(placeholder: string, aria: string, value: string): HTMLInputElement {
    const input = this.el("input", "joa-person-name-input");
    input.placeholder = placeholder;
    input.setAttribute("aria-label", aria);
    input.autocomplete = "off";
    input.value = value;
    return input;
  }
  private nameField(label: string, input: HTMLInputElement): HTMLElement {
    const field = this.el("label", "joa-person-name-field");
    field.append(this.text("span", "joa-person-name-caption", label), input);
    return field;
  }
  private text<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text: string): HTMLElementTagNameMap[K] {
    const element = this.el(tag, className);
    element.textContent = text;
    return element;
  }
  private el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }
}
