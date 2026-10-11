import { DataAdapter } from "obsidian";
import { DEFAULT_BACKGROUND } from "../../domain/appearance/AppearanceSettings";

const ROOT = ".obsidian/plugins/joa-frp-writer/background-images";
const STORY_IMAGE = ".obsidian/plugins/joa-frp-writer/assets/anlati-panel.png";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export class ObsidianBackgroundImages {
  private activeUrl?: string;
  private storyUrl?: string;
  constructor(private readonly adapter: DataAdapter) {}

  async save(file: File): Promise<string> {
    if (file.size < 32 || file.size > MAX_IMAGE_BYTES) throw new Error("Arka plan 10 MB'tan küçük olmalı.");
    if (!["image/png", "image/webp", "image/jpeg"].includes(file.type)) throw new Error("Yalnız JPG, PNG veya WebP seçilebilir.");
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isPng = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const isJpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const isWebp = new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP";
    if (!isPng && !isJpg && !isWebp) throw new Error("Görselin gerçek dosya biçimi geçersiz.");
    const detectedType = isPng ? "image/png" : isJpg ? "image/jpeg" : "image/webp";
    if (file.type !== detectedType) throw new Error("Görsel uzantısı ve içerik türü uyuşmuyor.");
    const blob = new Blob([buffer], { type: isPng ? "image/png" : isJpg ? "image/jpeg" : "image/webp" });
    if (typeof createImageBitmap === "function") {
      let bitmap: ImageBitmap | undefined;
      try {
        bitmap = await createImageBitmap(blob);
        if (bitmap.width > 8192 || bitmap.height > 8192 ||
            bitmap.width * bitmap.height > 32_000_000 ||
            bitmap.width < 64 || bitmap.height < 64)
          throw new Error("Arka plan çözünürlüğü 64 ile 8192 piksel arasında olmalı.");
      } finally { bitmap?.close(); }
    }
    const ext = isPng ? "png" : isJpg ? "jpg" : "webp";
    const id = globalThis.crypto?.randomUUID?.()?.replace(/-/g, "") ?? "";
    if (!/^[a-f0-9]{32}$/.test(id)) throw new Error("Güvenli arka plan kimliği üretilemedi.");
    if (!(await this.adapter.exists(ROOT))) await this.adapter.mkdir(ROOT);
    const destination = `${ROOT}/${id}.${ext}`;
    await this.adapter.writeBinary(destination, buffer);
    return destination;
  }

  async resource(path: string): Promise<string | undefined> {
    if (!/^\.obsidian\/plugins\/joa-frp-writer\/background-images\/[a-zA-Z0-9_-]+\.(webp|png|jpg)$/.test(path)) return undefined;
    if (!(await this.adapter.exists(path))) return undefined;
    // Replacing the main backdrop must not invalidate the separate story image.
    this.releaseMain();
    const stat = await this.adapter.stat?.(path);
    if (stat && stat.size > MAX_IMAGE_BYTES) return undefined;
    const bytes = await this.adapter.readBinary(path);
    if (bytes.byteLength > MAX_IMAGE_BYTES) return undefined;
    const ext = path.split(".").pop();
    const header = new Uint8Array(bytes);
    const isPng = header.length >= 8 && [137,80,78,71,13,10,26,10].every((b,i) => header[i] === b);
    const isJpg = header.length >= 3 && header[0] === 255 && header[1] === 216 && header[2] === 255;
    const isWebp = header.length >= 12 &&
      String.fromCharCode(...header.subarray(0,4)) === "RIFF" &&
      String.fromCharCode(...header.subarray(8,12)) === "WEBP";
    if (!((ext === "png" && isPng) || (ext === "jpg" && isJpg) || (ext === "webp" && isWebp))) return undefined;
    this.activeUrl = URL.createObjectURL(new Blob([bytes], { type: ext === "png" ? "image/png" : ext === "jpg" ? "image/jpeg" : "image/webp" }));
    return this.activeUrl;
  }

  /** Resolve a single bundled, fixed-name asset through the Obsidian vault adapter.
   * A CSS-relative URL resolves against Obsidian's window URL, not the plugin directory.
   */
  async storyResource(): Promise<string | undefined> {
    if (!(await this.adapter.exists(STORY_IMAGE))) return undefined;
    const stat = await this.adapter.stat?.(STORY_IMAGE);
    if (stat && (stat.size < 32 || stat.size > MAX_IMAGE_BYTES)) return undefined;
    const data = await this.adapter.readBinary(STORY_IMAGE);
    if (data.byteLength < 32 || data.byteLength > MAX_IMAGE_BYTES) return undefined;
    const header = new Uint8Array(data, 0, 8);
    if (![137,80,78,71,13,10,26,10].every((byte, index) => header[index] === byte)) return undefined;
    const nextUrl = URL.createObjectURL(new Blob([data], { type: "image/png" }));
    if (this.storyUrl) URL.revokeObjectURL(this.storyUrl);
    this.storyUrl = nextUrl;
    return nextUrl;
  }

  private releaseMain(): void {
    if (this.activeUrl) URL.revokeObjectURL(this.activeUrl);
    this.activeUrl = undefined;
  }
  release(): void {
    this.releaseMain();
    if (this.storyUrl) URL.revokeObjectURL(this.storyUrl);
    this.storyUrl = undefined;
  }
  defaultPath(): string { return DEFAULT_BACKGROUND; }
}
