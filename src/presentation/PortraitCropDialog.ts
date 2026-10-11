import { PortraitStore } from "../application/studio/PortraitStore";
import { FANTASY_EMOJI } from "../domain/shared/FantasyEmojiCatalog";

/** Crops user-provided local images. No image leaves the user's vault. */
export class PortraitCropDialog {
  constructor(private readonly host: HTMLElement, private readonly store: PortraitStore) {}

  open(id: string, existingPath?: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "joa-dialog-backdrop joa-crop-backdrop";
      const panel = document.createElement("div"); panel.className = "joa-crop-panel";
      const title = document.createElement("h3"); title.textContent = `${FANTASY_EMOJI.portrait} Portre seçimi`;
      const subtitle = document.createElement("p"); subtitle.textContent = "Görseli seç, kare içindeki alanı sürükleyerek ayarla. Kaydetmeden çıkabilirsin.";
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 320; canvas.className = "joa-crop-canvas";
      const fileInput = document.createElement("input"); fileInput.type = "file"; fileInput.accept = "image/png,image/jpeg,image/webp,image/gif"; fileInput.className = "joa-crop-file";
      const selectFile = document.createElement("button"); selectFile.textContent = "Resim seç"; selectFile.type = "button"; selectFile.className = "joa-secondary-button";
      selectFile.addEventListener("click", () => fileInput.click());
      const zoomLabel = document.createElement("label"); zoomLabel.className = "joa-crop-zoom-label"; zoomLabel.textContent = "Yakınlaştır";
      const zoom = document.createElement("input"); zoom.type = "range"; zoom.min = "1"; zoom.max = "3"; zoom.step = "0.01"; zoom.value = "1";
      zoomLabel.appendChild(zoom);
      const actions = document.createElement("div"); actions.className = "joa-crop-actions";
      const cancel = document.createElement("button"); cancel.textContent = "Vazgeç"; cancel.className = "joa-secondary-button"; cancel.type = "button";
      const save = document.createElement("button"); save.textContent = "Portreyi kaydet"; save.className = "joa-primary-button"; save.type = "button"; save.disabled = true;
      const error = document.createElement("div"); error.className = "joa-crop-error"; error.setAttribute("role", "alert");
      actions.append(cancel, save);
      panel.append(title, subtitle, canvas, selectFile, fileInput, zoomLabel, error, actions);
      backdrop.appendChild(panel); this.host.appendChild(backdrop);

      const ctx = canvas.getContext("2d");
      let image: HTMLImageElement | undefined;
      let offX = 0, offY = 0, scale = 1, dragging = false;
      let px = 0, py = 0;
      let active = true;
      const done = (value?: string) => { if (!active) return; active = false; backdrop.remove(); resolve(value); };
      const paint = () => {
        if (!ctx || !image) return;
        const fit = Math.max(320 / image.naturalWidth, 320 / image.naturalHeight);
        scale = fit * Number(zoom.value);
        const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
        offX = Math.min(Math.max(offX, 320 - w), 0);
        offY = Math.min(Math.max(offY, 320 - h), 0);
        ctx.clearRect(0,0,320,320);
        ctx.drawImage(image,offX,offY,w,h);
      };
      const loadImage = (src: string) => {
        const next = new Image();
        next.onload = () => {
          if (!active) return;
          if (!next.naturalWidth || !next.naturalHeight || next.naturalWidth > 8192 || next.naturalHeight > 8192 ||
              next.naturalWidth * next.naturalHeight > 32_000_000) {
            error.textContent = "Görsel boyutları en fazla 8192 × 8192 piksel olabilir.";
            save.disabled = true;
            return;
          }
          image = next; zoom.value = "1";
          const fit = Math.max(320 / next.naturalWidth, 320 / next.naturalHeight);
          offX = (320 - next.naturalWidth * fit) / 2;
          offY = (320 - next.naturalHeight * fit) / 2;
          save.disabled = false; error.textContent = ""; paint();
        };
        next.onerror = () => { error.textContent = "Resim okunamadı. PNG, JPG veya WebP dene."; };
        next.src = src;
      };
      void (async () => { if (existingPath) { const existing = await this.store.getDataUrl(existingPath); if (existing && active) loadImage(existing); } })().catch(() => undefined);
      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0]; if (!file) return;
        save.disabled = true;
        if (file.size > 12_000_000) { error.textContent = "Görsel 12 MB'den küçük olmalı."; return; }
        if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { error.textContent = "Desteklenmeyen dosya türü."; return; }
        const reader = new FileReader();
        reader.onload = () => loadImage(String(reader.result));
        reader.onerror = () => { error.textContent = "Dosya okunamadı."; };
        reader.readAsDataURL(file);
      });
      zoom.addEventListener("input", () => {
        if (!image) return;
        // Preserve current crop centre on zoom.
        const old = scale;
        const fit = Math.max(320 / image.naturalWidth, 320 / image.naturalHeight);
        const next = fit * Number(zoom.value);
        offX = 160 - (160 - offX) * (next / old);
        offY = 160 - (160 - offY) * (next / old);
        paint();
      });
      canvas.addEventListener("pointerdown", (ev) => { dragging = true; px = ev.clientX; py = ev.clientY; canvas.setPointerCapture(ev.pointerId); });
      canvas.addEventListener("pointermove", (ev) => {
        if (!dragging) return;
        const rect = canvas.getBoundingClientRect();
        offX += (ev.clientX - px) * (320 / rect.width);
        offY += (ev.clientY - py) * (320 / rect.height);
        px = ev.clientX; py = ev.clientY; paint();
      });
      canvas.addEventListener("pointerup", () => { dragging = false; });
      canvas.addEventListener("pointercancel", () => { dragging = false; });
      save.addEventListener("click", () => {
        if (!image) return;
        save.disabled = true;
        canvas.toBlob(async (blob) => {
          if (!active) return;
          if (!blob) { error.textContent = "Portre oluşturulamadı."; save.disabled = false; return; }
          try { done(await this.store.save(id, await blob.arrayBuffer())); }
          catch(e) { error.textContent = e instanceof Error ? e.message : String(e); save.disabled = false; }
        }, "image/webp", 0.86);
      });
      cancel.addEventListener("click", () => done());
      backdrop.addEventListener("click", (ev) => { if (ev.target === backdrop) done(); });
      const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape" && active) { ev.stopImmediatePropagation(); ev.preventDefault(); done(); } };
      backdrop.addEventListener("keydown", onKey, true);
      window.setTimeout(() => selectFile.focus(), 0);
    });
  }
}
