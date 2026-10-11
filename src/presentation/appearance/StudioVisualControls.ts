import { Notice } from "obsidian";
import { AppearancePreferences } from "../../application/settings/AppearancePreferences";
import { AppearanceSettings, ImageFit } from "../../domain/appearance/AppearanceSettings";
import { FANTASY_THEMES, selectTheme } from "../../domain/appearance/ThemeCatalog";
import { BackgroundImages } from "../../application/media/BackgroundImages";
/** Presentation-only controls; image paths and preference writes belong to services. */
export class StudioVisualControls {
  private background!: HTMLDivElement;
  private surface!: HTMLElement;
  private settings?: AppearanceSettings;
  private disposed = false;
  constructor(private readonly preferences: AppearancePreferences, private readonly images: BackgroundImages) {}
  mount(shell: HTMLElement, header: HTMLElement): void {
    this.surface = shell;
    this.background = document.createElement("div");
    this.background.className = "joa-fantasy-background";
    this.background.setAttribute("aria-hidden", "true");
    shell.prepend(this.background);
    const controls = document.createElement("div");
    controls.className = "joa-visual-controls";
    const createMistSlider = (input: HTMLInputElement): HTMLSpanElement => {
      const holder = document.createElement("span");
      holder.className = "joa-mist-slider";
      const rail = document.createElement("span");
      rail.className = "joa-mist-rail";
      rail.setAttribute("aria-hidden", "true");
      const fill = document.createElement("span");
      fill.className = "joa-mist-fill";
      const jewel = document.createElement("span");
      jewel.className = "joa-mist-jewel";
      rail.append(fill, jewel);
      holder.append(rail, input);
      return holder;
    };
    const syncRangeFill = (input: HTMLInputElement): void => {
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const value = Number(input.value || min);
      const ratio = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
      const holder = input.closest(".joa-mist-slider");
      if (!holder) return;
      const pos = `calc(${ratio * 100}% + ${11 - ratio * 22}px)`;
      const rail = holder.querySelector(".joa-mist-rail");
      const jewel = rail?.querySelector<HTMLElement>(".joa-mist-jewel");
      const fill = rail?.querySelector<HTMLElement>(".joa-mist-fill");
      if (jewel) jewel.style.left = pos;
      if (fill) fill.style.width = pos;
    };
    const upload = document.createElement("input");
    upload.type = "file"; upload.accept = "image/png,image/jpeg,image/webp";
    upload.hidden = true; upload.setAttribute("aria-label", "Arka plan görseli dosyası");
    const choose = this.button("Arka Plan", () => upload.click());
    choose.title = "Yeni JPG, PNG veya WebP arka plan seç";
    upload.addEventListener("change", () => void this.upload(upload));
    const blur = document.createElement("input");
    blur.type = "range"; blur.min = "0"; blur.max = "24"; blur.step = "1";
    blur.setAttribute("aria-label", "Arka plan bulanıklığı");
    blur.title = "Arka plan bulanıklığı";
    blur.addEventListener("input", () => { syncRangeFill(blur); this.update({ blur: Number(blur.value) }, false); });
    blur.addEventListener("change", () => { syncRangeFill(blur); this.update({ blur: Number(blur.value) }, true); });
    const blurControl = document.createElement("label");
    blurControl.className = "joa-visual-blur";
    blurControl.append(document.createTextNode("Diyar Sisi"), createMistSlider(blur));
    const storyBlur = document.createElement("input");
    storyBlur.type = "range"; storyBlur.min = "0"; storyBlur.max = "24"; storyBlur.step = "1";
    storyBlur.setAttribute("aria-label", "Konuşma metni anlatı sisi");
    storyBlur.title = "Konuşma metni anlatı sisi";
    storyBlur.addEventListener("input", () => { syncRangeFill(storyBlur); this.update({ storyBlur: Number(storyBlur.value) }, false); });
    storyBlur.addEventListener("change", () => { syncRangeFill(storyBlur); this.update({ storyBlur: Number(storyBlur.value) }, true); });
    const storyBlurControl = document.createElement("label");
    storyBlurControl.className = "joa-visual-blur joa-visual-blur-story";
    storyBlurControl.append(document.createTextNode("Anlatı Sisi"), createMistSlider(storyBlur));
    const fit = document.createElement("select");
    fit.setAttribute("aria-label", "Arka plan sığdırma modu");
    fit.className = "joa-visual-fit";
    const modes: Array<[ImageFit, string]> = [
      ["cover", "Doldur / Yakınlaş"], ["contain", "Tam Sığdır"],
      ["width", "Genişliğe Eşitle"], ["height", "Yüksekliğe Eşitle"],
      ["natural", "Özgün Boyut"]
    ];
    for (const [value, label] of modes) fit.add(new Option(label, value));
    fit.addEventListener("change", () => this.update({ fit: fit.value as ImageFit }));
    const theme = document.createElement("select");
    theme.setAttribute("aria-label", "Fantastik tema seçimi");
    theme.className = "joa-visual-theme";
    for (const entry of FANTASY_THEMES) theme.add(new Option(entry.name, entry.id));
    theme.addEventListener("change", () => this.update({ themeId: theme.value }));
    const fitLabel = this.selectLabel("Sığdır", fit);
    const themeLabel = this.selectLabel("Tema · 24", theme);
    controls.append(choose, blurControl, storyBlurControl, fitLabel, themeLabel, upload);
    header.appendChild(controls);
    void this.loadStoryImage();
    void this.preferences.load().then(async (loaded) => {
      if (this.disposed) return;
      this.settings = loaded;
      blur.value = String(loaded.blur); storyBlur.value = String(loaded.storyBlur);
      syncRangeFill(blur); syncRangeFill(storyBlur);
      fit.value = loaded.fit;
      theme.value = selectTheme(loaded.themeId).id;
      await this.render();
    }).catch(() => new Notice("JOA görünüm ayarları okunamadı.", 4000));
  }
  dispose(): void { this.disposed = true; this.images.release(); }
  private async loadStoryImage(): Promise<void> {
    try {
      const url = await this.images.storyResource();
      if (this.disposed) { this.images.release(); return; }
      if (!url) {
        new Notice("Anlatı resmi bulunamadı: eklenti assets/anlati-panel.png dosyasını kontrol et.", 6500);
        return;
      }
      this.surface.style.setProperty("--joa-story-image", `url(${JSON.stringify(url)})`);
    } catch {
      if (!this.disposed) new Notice("Anlatı görseli açılamadı. assets/anlati-panel.png dosyasını kontrol et.", 6500);
    }
  }
  private button(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "joa-visual-button";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
  }
  private selectLabel(label: string, control: HTMLSelectElement): HTMLLabelElement {
    const node = document.createElement("label");
    node.className = "joa-visual-select";
    const text = document.createElement("span"); text.textContent = label;
    node.append(text, control);
    return node;
  }
  private update(patch: Partial<AppearanceSettings>, save = true): void {
    if (!this.settings) return;
    this.settings = { ...this.settings, ...patch };
    void this.render(false);
    if (save) void this.preferences.save(this.settings).catch(() => new Notice("Görünüm ayarları kaydedilemedi.", 5000));
  }
  private async upload(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0]; input.value = "";
    if (!file) return;
    try {
      const path = await this.images.save(file);
      if (!this.settings || this.disposed) return;
      this.settings = { ...this.settings, imagePath: path };
      await this.preferences.save(this.settings);
      await this.render();
    } catch (error) { new Notice(error instanceof Error ? error.message : String(error), 6000); }
  }

  private async render(reloadImage = true): Promise<void> {
    const data = this.settings;
    if (!data || this.disposed) return;
    const theme = selectTheme(data.themeId);
    const vars = this.surface.style;
    const tokens: Record<string, string> = {
      "--joa-fantasy-panel": theme.panel, "--joa-fantasy-base": theme.bg,
      "--joa-fantasy-ink": theme.ink, "--joa-fantasy-muted": theme.muted,
      "--joa-fantasy-gold": theme.gold, "--joa-fantasy-line": theme.line,
      "--joa-fantasy-glow": theme.glow, "--joa-fantasy-radius": theme.radius,
      "--joa-fantasy-blur": `${data.blur}px`, "--joa-story-blur": `${data.storyBlur}px`,
      "--joa-fantasy-filter": `${theme.surface === "wood" ? "sepia(.14) " : ""}${data.blur > 0 ? `blur(${data.blur}px)` : ""}`.trim() || "none",
      "--joa-story-filter": data.storyBlur > 0 ? `blur(${data.storyBlur}px)` : "none",
      "--joa-fantasy-darkness": `${data.darkness / 100}`
    };
    for (const [key, value] of Object.entries(tokens)) vars.setProperty(key, value);
    this.surface.dataset.joaSurface = theme.surface;
    this.surface.dataset.joaOrnament = theme.ornament;
    this.background.style.backgroundSize = data.fit === "width" ? "100% auto" :
      data.fit === "height" ? "auto 100%" : data.fit === "natural" ? "auto" : data.fit;
    if (reloadImage) {
      const url = await this.images.resource(data.imagePath);
      if (this.disposed) return;
      this.background.style.backgroundImage = url ? `url(${JSON.stringify(url)})` : "none";
    }
  }
}
