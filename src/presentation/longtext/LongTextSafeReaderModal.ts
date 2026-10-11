import { App, Modal, Notice, TFile } from "obsidian";
import { buildPageOffsets, pageText } from "../../domain/writing/LongTextPaging";

/** Read-only, low-cost text viewer for notes containing extreme unbroken runs. */
export class LongTextSafeReaderModal extends Modal {
  private raw = "";
  private offsets: number[] = [0];
  private page = 0;
  private closed = false;
  private pageView!: HTMLPreElement;
  private pageIndicator!: HTMLSpanElement;
  private rangeIndicator!: HTMLSpanElement;
  private pageInput!: HTMLInputElement;
  private back!: HTMLButtonElement;
  private next!: HTMLButtonElement;
  private first!: HTMLButtonElement;
  private last!: HTMLButtonElement;

  constructor(app: App, private readonly file: TFile) { super(app); }

  async onOpen(): Promise<void> {
    this.modalEl.classList.add("joa-longtext-modal");
    this.contentEl.replaceChildren();
    const heading = document.createElement("h2");
    heading.textContent = "📜 Uzun Metin Güvenli Okuyucu";
    const name = document.createElement("p");
    name.className = "joa-longtext-file";
    name.textContent = this.file.path;
    const help = document.createElement("p");
    help.className = "joa-longtext-help";
    help.textContent = "Bu pencere yalnızca okur. Metni değiştirmez, satır sonu veya boşluk eklemez. Son kaydedilmiş notu gösterir.";
    const toolbar = document.createElement("div");
    toolbar.className = "joa-longtext-toolbar";
    const action = (text: string, callback: () => void): HTMLButtonElement => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      button.addEventListener("click", callback);
      toolbar.append(button);
      return button;
    };
    this.first = action("İlk", () => this.showPage(0));
    this.back = action("Önceki", () => this.showPage(this.page - 1));
    this.pageIndicator = document.createElement("span");
    this.pageIndicator.className = "joa-longtext-page-number";
    toolbar.append(this.pageIndicator);
    this.next = action("Sonraki", () => this.showPage(this.page + 1));
    this.last = action("Son", () => this.showPage(this.offsets.length - 2));
    this.pageInput = document.createElement("input");
    this.pageInput.type = "number";
    this.pageInput.min = "1";
    this.pageInput.step = "1";
    this.pageInput.setAttribute("aria-label", "Gidilecek sayfa");
    this.pageInput.className = "joa-longtext-goto";
    toolbar.append(this.pageInput);
    action("Git", () => {
      const target = Number(this.pageInput.value);
      if (Number.isInteger(target)) this.showPage(target - 1);
    });
    action("Sayfayı kopyala", () => void this.copyCurrentPage());
    this.rangeIndicator = document.createElement("div");
    this.rangeIndicator.className = "joa-longtext-range";
    this.pageView = document.createElement("pre");
    this.pageView.className = "joa-longtext-page";
    this.pageView.setAttribute("aria-label", "Kaydedilmiş notun metin içeriği");
    this.pageView.textContent = "Metin okunuyor…";
    this.contentEl.append(heading, name, help, toolbar, this.rangeIndicator, this.pageView);
    this.setControlsDisabled(true);

    try {
      // Avoid getValue()/setValue() on the stressed CodeMirror editor.
      const source = await this.app.vault.cachedRead(this.file);
      if (this.closed) return;
      this.raw = source;
      this.offsets = buildPageOffsets(source);
      this.pageInput.max = String(Math.max(1, this.offsets.length - 1));
      this.setControlsDisabled(false);
      this.showPage(0);
    } catch (err) {
      if (this.closed) return;
      this.pageView.textContent = "Not okunamadı. Dosya değiştirilmedi.";
      new Notice(err instanceof Error ? err.message : "Not okunamadı.", 5000);
    }
  }

  onClose(): void {
    this.closed = true;
    this.raw = "";
    this.offsets = [0];
    this.contentEl.replaceChildren();
  }

  private setControlsDisabled(value: boolean): void {
    for (const button of [this.first, this.back, this.next, this.last]) button.disabled = value;
    this.pageInput.disabled = value;
  }

  private showPage(index: number): void {
    const count = Math.max(1, this.offsets.length - 1);
    if (!Number.isInteger(index) || index < 0 || index >= count) return;
    this.page = index;
    // A single page (4096 UTF-16 code units) is rendered at any time.
    this.pageView.textContent = this.raw.length ? pageText(this.raw, this.offsets, index) : "(Dosya boş)";
    this.pageView.scrollTop = 0;
    this.pageIndicator.textContent = `${(index + 1).toLocaleString("tr-TR")} / ${count.toLocaleString("tr-TR")}`;
    this.rangeIndicator.textContent = `Karakter ${this.offsets[index].toLocaleString("tr-TR")}–${(this.offsets[index + 1] ?? 0).toLocaleString("tr-TR")} / ${this.raw.length.toLocaleString("tr-TR")}`;
    this.pageInput.value = String(index + 1);
    this.first.disabled = this.back.disabled = index === 0;
    this.last.disabled = this.next.disabled = index === count - 1;
  }

  private async copyCurrentPage(): Promise<void> {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Pano erişimi yok. Metni seçerek kopyalayabilirsin.");
      await navigator.clipboard.writeText(this.raw.length ? pageText(this.raw, this.offsets, this.page) : "");
      new Notice("Sayfadaki metin değiştirilmeden kopyalandı.", 2500);
    } catch (err) {
      new Notice(err instanceof Error ? err.message : "Kopyalama başarısız.", 4500);
    }
  }
}
