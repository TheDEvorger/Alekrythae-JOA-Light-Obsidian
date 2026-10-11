import { SpeakerOption } from "../application/studio/SpeakerDirectory";
import { MEGGY_PORTRAIT_DATA_URL } from "../assets/CanonicalMeggyPortrait";

export interface SpeakerPickerActions {
  list(): Promise<SpeakerOption[]>;
  portrait(path: string): Promise<string | undefined>;
  meggyPortrait?(): Promise<string>;
  addMain(): Promise<SpeakerOption | undefined>;
  changePortrait(speaker: SpeakerOption): Promise<string | undefined>;
  editIdentity(speaker: SpeakerOption): Promise<SpeakerOption | undefined>;
  onSelect(id: string): void;
}

/** One responsibility: speaker identity, thumbnail and creation affordance. */
export class SceneSpeakerPicker {
  private speakers: SpeakerOption[] = [];
  private current: SpeakerOption | undefined;
  private select!: HTMLSelectElement;
  private imageButton!: HTMLButtonElement;
  private editButton!: HTMLButtonElement;
  private generation = 0;
  constructor(private readonly actions: SpeakerPickerActions, private selectedId: string) {}

  mount(parent: HTMLElement): void {
    const group = document.createElement("div");
    group.className = "joa-speaker-picker-group";
    this.imageButton = document.createElement("button");
    this.imageButton.type = "button";
    this.imageButton.className = "joa-scene-speaker-portrait";
    this.imageButton.title = "Konuşmacının portresi";
    this.imageButton.setAttribute("aria-label", "Konuşmacı portresini görüntüle veya değiştir");
    this.imageButton.addEventListener("click", () => void this.editPortrait());
    this.select = document.createElement("select");
    this.select.className = "joa-speaker-select";
    this.select.setAttribute("aria-label", "Konuşmacı seçimi: Meggy, ana karakter, NPC veya araç");
    this.select.addEventListener("change", () => this.choose(this.select.value));
    const add = document.createElement("button");
    add.type = "button";
    add.className = "joa-scene-add-main";
    add.textContent = "+";
    add.title = "Yeni ana karakter oluştur";
    add.setAttribute("aria-label", "Yeni ana karakter oluştur");
    add.addEventListener("click", async () => {
      if (add.disabled) return;
      add.disabled = true;
      try {
        const created = await this.actions.addMain();
        if (created) { this.selectedId = created.id; await this.reload(); }
      } finally { add.disabled = false; }
    });
    this.editButton = document.createElement("button");
    this.editButton.type = "button";
    this.editButton.className = "joa-scene-edit-identity";
    this.editButton.textContent = "Düzenle";
    this.editButton.title = "Ünvanı, adı ve soyadı düzenle";
    this.editButton.setAttribute("aria-label", "Konuşmacının ünvanını, adını ve soyadını düzenle");
    this.editButton.addEventListener("click", () => void this.editIdentity());
    group.append(this.imageButton, this.select, this.editButton, add);
    parent.appendChild(group);
    void this.reload().catch(() => {
      this.speakers = [];
      this.select.replaceChildren();
      this.option("meggy", "Meggy • Kanonik karakter");
      this.choose("meggy");
    });
  }

  selected(): SpeakerOption | undefined { return this.current; }
  selectedSpeakerId(): string { return this.selectedId; }

  private async reload(): Promise<void> {
    const token = ++this.generation;
    const speakers = await this.actions.list();
    if (token !== this.generation || !this.select.isConnected) return;
    this.speakers = speakers;
    this.select.replaceChildren();
    this.option("meggy", "Meggy • Kanonik karakter");
    for (const speaker of speakers) {
      const kind = { main: "Ana karakter", npc: "NPC", vehicle: "Araç", other: "Diğer", place: "Mekan" }[speaker.kind];
      this.option(speaker.id, `${speaker.name} • ${kind}`);
    }
    const found = this.selectedId === "meggy" || speakers.some((item) => item.id === this.selectedId);
    this.choose(found ? this.selectedId : "meggy");
  }

  private option(id: string, name: string): void {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = name;
    this.select.appendChild(option);
  }

  private choose(id: string): void {
    this.selectedId = id;
    this.select.value = id;
    this.current = this.speakers.find((speaker) => speaker.id === id);
    this.editButton.disabled = !this.current;
    this.actions.onSelect(id);
    void this.refreshPortrait().catch(() => {
      if (this.imageButton.isConnected) this.imageButton.replaceChildren(document.createTextNode("+"));
    });
  }

  private async refreshPortrait(): Promise<void> {
    const speaker = this.current;
    const token = ++this.generation;
    const src = speaker?.portraitPath ? await this.actions.portrait(speaker.portraitPath) :
      speaker ? undefined : await (this.actions.meggyPortrait?.() ?? Promise.resolve(MEGGY_PORTRAIT_DATA_URL));
    if (token !== this.generation || !this.imageButton.isConnected) return;
    this.imageButton.replaceChildren();
    if (!src) {
      this.imageButton.replaceChildren(document.createTextNode("+"));
      this.imageButton.title = "Portre ekle";
    } else {
      const img = document.createElement("img");
      img.src = src;
      img.alt = speaker ? `${speaker.name} portresi` : "Meggy kanonik portresi";
      this.imageButton.appendChild(img);
      this.imageButton.title = speaker ? "Portreyi değiştir" : "Meggy'nin kanonik portresi";
    }
    this.imageButton.disabled = !speaker;
  }

  private async editIdentity(): Promise<void> {
    const speaker = this.current;
    if (!speaker || this.editButton.disabled) return;
    this.editButton.disabled = true;
    try {
      const updated = await this.actions.editIdentity(speaker);
      if (updated) await this.reload();
    } finally {
      if (this.editButton.isConnected) this.editButton.disabled = !this.current;
    }
  }

  private async editPortrait(): Promise<void> {
    const speaker = this.current;
    if (!speaker) return;
    const path = await this.actions.changePortrait(speaker);
    if (!path) return;
    speaker.portraitPath = path;
    await this.refreshPortrait();
  }
}
