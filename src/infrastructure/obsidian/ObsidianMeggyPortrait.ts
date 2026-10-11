import { DataAdapter } from "obsidian";
import { MeggyPortraitSource } from "../../application/media/MeggyPortraitSource";
import { MEGGY_PORTRAIT_DATA_URL } from "../../assets/CanonicalMeggyPortrait";

/** User-provided canonical portrait, kept outside compiled code and private art. */
export const TAVERNER_MEGGY_PATH = ".obsidian/plugins/joa-frp-writer/Taverner Meggy.webp";
const MAX_PORTRAIT_BYTES = 8 * 1024 * 1024;

export class ObsidianMeggyPortrait implements MeggyPortraitSource {
  private cache?: Promise<string>;
  constructor(private readonly adapter: Pick<DataAdapter, "exists" | "readBinary" | "stat">) {}

  getDataUrl(): Promise<string> {
    return this.cache ??= this.read();
  }

  private async read(): Promise<string> {
    try {
      if (!(await this.adapter.exists(TAVERNER_MEGGY_PATH))) return MEGGY_PORTRAIT_DATA_URL;
      const stat = await this.adapter.stat?.(TAVERNER_MEGGY_PATH);
      if (stat && (stat.size < 12 || stat.size > MAX_PORTRAIT_BYTES)) return MEGGY_PORTRAIT_DATA_URL;
      const bytes = new Uint8Array(await this.adapter.readBinary(TAVERNER_MEGGY_PATH));
      if (bytes.byteLength < 12 || bytes.byteLength > MAX_PORTRAIT_BYTES) return MEGGY_PORTRAIT_DATA_URL;
      const four = (index: number) => String.fromCharCode(...bytes.subarray(index, index + 4));
      if (four(0) !== "RIFF" || four(8) !== "WEBP") return MEGGY_PORTRAIT_DATA_URL;
      const segments: string[] = [];
      for (let i = 0; i < bytes.length; i += 8192) {
        segments.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
      }
      return `data:image/webp;base64,${btoa(segments.join(""))}`;
    } catch {
      return MEGGY_PORTRAIT_DATA_URL;
    }
  }
}
