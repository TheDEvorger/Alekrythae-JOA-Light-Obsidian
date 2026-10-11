import { FANTASY_EMOJI } from "../domain/shared/FantasyEmojiCatalog";
import { MEGGY_PORTRAIT_DATA_URL } from "../assets/CanonicalMeggyPortrait";
import { MeggyPortraitSource } from "../application/media/MeggyPortraitSource";

export type StudioTabId = "scene" | "cards" | "roster";

/** Header and tab selection only; has no access to repositories or editor. */
export class StudioTabBar {
  private readonly buttons = new Map<StudioTabId, HTMLButtonElement>();

  constructor(
    private readonly select: (id: StudioTabId) => void,
    private readonly meggyPortrait?: MeggyPortraitSource
  ) {}

  header(): HTMLElement {
    const header = this.el("header", "joa-studio-header");
    const identity = this.el("div", "joa-brand-identity");
    const portrait = document.createElement("img");
    portrait.className = "joa-header-portrait";
    portrait.src = MEGGY_PORTRAIT_DATA_URL;
    portrait.alt = "Meggy";
    void this.meggyPortrait?.getDataUrl().then((src) => { portrait.src = src; });
    const copy = this.el("div", "joa-brand-copy");
    copy.append(
      this.text("div", "joa-kicker", `${FANTASY_EMOJI.castle} JOA • JOURNEY OF ADVENTURE`),
      this.text("h2", "joa-studio-title", `${FANTASY_EMOJI.npc} Kehribar Menzili Hanı ${FANTASY_EMOJI.autumnLeaf}`),
      // Empty promotional text is omitted: the writing surface has priority.
    );
    identity.append(portrait, copy);
    header.appendChild(identity);
    return header;
  }

  navigation(active: StudioTabId): HTMLElement {
    const nav = this.el("nav", "joa-studio-tabs");
    const entries: ReadonlyArray<{ id: StudioTabId; label: string; icon: string }> = [
      { id: "scene", label: "Meggy", icon: FANTASY_EMOJI.meggy },
      { id: "cards", label: "Çanta", icon: FANTASY_EMOJI.bag },
      { id: "roster", label: "Mevcudat", icon: FANTASY_EMOJI.roster }
    ];
    for (const entry of entries) {
      const button = this.el("button", "joa-tab-button");
      button.type = "button";
      const icon = document.createElement("span");
      icon.textContent = entry.icon;
      button.append(icon, document.createTextNode(entry.label));
      button.addEventListener("click", () => this.select(entry.id));
      this.buttons.set(entry.id, button);
      nav.appendChild(button);
    }
    this.setActive(active);
    return nav;
  }

  setActive(id: StudioTabId): void {
    for (const [key, button] of this.buttons) button.classList.toggle("is-active", key === id);
  }

  private text<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text: string): HTMLElementTagNameMap[K] {
    const node = this.el(tag, className);
    node.textContent = text;
    return node;
  }
  private el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.className = className;
    return node;
  }
}
