import { DataAdapter } from "obsidian";

export const STUDIO_DATABASE_PATH = ".obsidian/plugins/joa-frp-writer/sqlite/inventory.sqlite";
export const STUDIO_BACKUP_PATH = `${STUDIO_DATABASE_PATH}.bak`;
export const STUDIO_STAGING_PATH = `${STUDIO_DATABASE_PATH}.tmp`;
export const STUDIO_SWAP_PATH = `${STUDIO_DATABASE_PATH}.swap`;

/** Owns Vault file I/O and creates fresh storage without overwriting existing data. */
export class ObsidianStudioFileGateway {
  constructor(private readonly adapter: DataAdapter) {}

  async ensureExists(emptyDatabase: Uint8Array): Promise<void> {
    for (const path of [
      ".obsidian/plugins/joa-frp-writer",
      ".obsidian/plugins/joa-frp-writer/sqlite",
      ".obsidian/plugins/joa-frp-writer/art"
    ]) {
      if (!(await this.adapter.exists(path))) await this.adapter.mkdir(path);
    }
    if (!(await this.adapter.exists(STUDIO_DATABASE_PATH))) {
      if (await this.adapter.exists(STUDIO_SWAP_PATH)) {
        throw new Error("JOA veritabanının eski dosyası inventory.sqlite.swap konumunda bulundu. Geri yükleme yapmadan yeni veritabanı oluşturulmadı.");
      }
      if (await this.adapter.exists(STUDIO_STAGING_PATH)) {
        throw new Error("JOA veritabanının tamamlanmamış geçici kaydı var. inventory.sqlite.tmp dosyasını incele.");
      }
      if (await this.adapter.exists(STUDIO_BACKUP_PATH)) {
        throw new Error("JOA veritabanı bulunamadı fakat yedeği var. Veri kaybını önlemek için inventory.sqlite.bak dosyasını elle kontrol et.");
      }
      await this.adapter.writeBinary(STUDIO_DATABASE_PATH, this.buffer(emptyDatabase));
    }
  }

  async read(): Promise<Uint8Array> {
    return new Uint8Array(await this.adapter.readBinary(STUDIO_DATABASE_PATH));
  }

  async write(bytes: Uint8Array): Promise<void> {
    // Never overwrite an existing primary until the replacement was fully written.
    if (!(await this.adapter.exists(STUDIO_DATABASE_PATH))) {
      throw new Error("JOA veritabanı kayboldu. Üzerine boş veri yazılmadı.");
    }
    if (await this.adapter.exists(STUDIO_STAGING_PATH) || await this.adapter.exists(STUDIO_SWAP_PATH)) {
      throw new Error("JOA bekleyen veritabanı işlemi bulundu (.tmp/.swap). Kaydı korumak için dosyaları incele.");
    }
    const previous = new Uint8Array(await this.adapter.readBinary(STUDIO_DATABASE_PATH));
    try {
      await this.adapter.writeBinary(STUDIO_STAGING_PATH, this.buffer(bytes));
      const staged = new Uint8Array(await this.adapter.readBinary(STUDIO_STAGING_PATH));
      if (!this.equalBytes(bytes, staged)) throw new Error("JOA geçici veritabanı doğrulanamadı.");
      // If the backup fails, the original file is not replaced.
      await this.adapter.writeBinary(STUDIO_BACKUP_PATH, this.buffer(previous));
      const backup = new Uint8Array(await this.adapter.readBinary(STUDIO_BACKUP_PATH));
      if (!this.equalBytes(previous, backup)) throw new Error("JOA veritabanı yedeği doğrulanamadı.");
      // DataAdapter.rename cannot replace an existing destination on Windows.
      // Move the original aside only after the checked backup exists. A failure
      // can be rolled back by renaming the original, without rewriting bytes.
      await this.adapter.rename(STUDIO_DATABASE_PATH, STUDIO_SWAP_PATH);
      try {
        await this.adapter.rename(STUDIO_STAGING_PATH, STUDIO_DATABASE_PATH);
        const persisted = new Uint8Array(await this.adapter.readBinary(STUDIO_DATABASE_PATH));
        if (!this.equalBytes(bytes, persisted)) throw new Error("Yeni JOA veritabanı doğrulanamadı.");
      } catch (promotionError) {
        try {
          if (await this.adapter.exists(STUDIO_DATABASE_PATH)) await this.adapter.remove(STUDIO_DATABASE_PATH);
          await this.adapter.rename(STUDIO_SWAP_PATH, STUDIO_DATABASE_PATH);
        } catch {
          throw new Error("JOA kaydı tamamlanamadı. Orijinal inventory.sqlite.swap ve inventory.sqlite.bak dosyalarını koruyun.");
        }
        throw promotionError;
      }
      // The new primary has been verified; the .bak is kept for recovery.
      try { await this.adapter.remove(STUDIO_SWAP_PATH); }
      catch { /* Keep old file as a second recoverable copy. Next write will halt safely. */ }
    } catch (error) {
      if (await this.adapter.exists(STUDIO_STAGING_PATH)) {
        try { await this.adapter.remove(STUDIO_STAGING_PATH); } catch { /* preserve original error */ }
      }
      throw error;
    }
  }

  private equalBytes(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }

  private buffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }
}
