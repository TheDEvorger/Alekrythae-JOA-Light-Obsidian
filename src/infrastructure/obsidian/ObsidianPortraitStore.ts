import { DataAdapter } from "obsidian";
import { PortraitStore } from "../../application/studio/PortraitStore";

const ART_DIR = ".obsidian/plugins/joa-frp-writer/art";
export class ObsidianPortraitStore implements PortraitStore {
  constructor(private readonly adapter: DataAdapter, private readonly onSave?: () => void) {}
  async save(id: string, data: ArrayBuffer): Promise<string> {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error("Portre kimliği geçersiz.");
    if (id.toLowerCase() === "meggy") throw new Error("Meggy'nin kanonik portresi değiştirilemez.");
    if (data.byteLength < 12 || data.byteLength > 1_000_000) throw new Error("Portre boyutu geçersiz.");
    const header = new Uint8Array(data, 0, 12);
    const text = (start: number) => String.fromCharCode(...header.slice(start, start + 4));
    if (text(0) !== "RIFF" || text(8) !== "WEBP") throw new Error("Portre WebP biçiminde olmalı.");
    const path = `${ART_DIR}/${id}.webp`;
    if (!(await this.adapter.exists(ART_DIR))) await this.adapter.mkdir(ART_DIR);
    await this.adapter.writeBinary(path, data);
    this.onSave?.();
    return path;
  }
  async getDataUrl(path: string): Promise<string | undefined> {
    if (!/^\.obsidian\/plugins\/joa-frp-writer\/art\/[a-zA-Z0-9_-]+\.webp$/.test(path)) return undefined;
    if (!(await this.adapter.exists(path))) return undefined;
    // Reject known oversized vault assets before loading their bytes into memory.
    const stat = await this.adapter.stat?.(path);
    if (stat && stat.size > 1_000_000) return undefined;
    const bytes = new Uint8Array(await this.adapter.readBinary(path));
    if (bytes.byteLength < 12 || bytes.byteLength > 1_000_000) return undefined;
    const code = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
    if (code(0) !== "RIFF" || code(8) !== "WEBP") return undefined;
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return `data:image/webp;base64,${btoa(binary)}`;
  }
}
