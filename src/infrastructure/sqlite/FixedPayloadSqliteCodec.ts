import { StudioStateCodec } from "../../application/studio/StudioStateCodec";
import {
  StudioDatabaseState,
  emptyStudioDatabaseState
} from "../../domain/studio/StudioModels";
import { INVENTORY_SQLITE_TEMPLATE_BASE64 } from "./EmbeddedSqliteTemplate";

const SQLITE_HEADER = "SQLite format 3\u0000";
const PAYLOAD_MARKER = "JOA_SQLITE_INVENTORY_V1\u0000";
const FIXED_BLOB_SIZE = 60000;
// The template has a fixed page layout. Do not parse arbitrary attacker-supplied
// SQLite variants as if the expected JOA BLOB were present.
const TEMPLATE_DATABASE_SIZE = 131072;
const TEMPLATE_PAYLOAD_OFFSET = 71072;

/**
 * Reads/writes JOA's durable JSON payload inside a genuine SQLite 3 container.
 * The first public version uses the version 2 Studio schema. Invalid schemas are rejected.
 */
export class FixedPayloadSqliteCodec implements StudioStateCodec {
  // Decode once; return a defensive copy so a caller cannot mutate our trust anchor.
  private readonly template = this.decodeBase64(INVENTORY_SQLITE_TEMPLATE_BASE64);

  createEmptyDatabase(): Uint8Array {
    return this.template.slice();
  }

  readState(database: Uint8Array): StudioDatabaseState {
    this.assertSqlite(database);
    const payloadStart = this.payloadStart(database);
    const marker = this.markerBytes();
    const view = new DataView(database.buffer, database.byteOffset, database.byteLength);
    const length = view.getUint32(payloadStart + marker.length, true);
    const maxLength = FIXED_BLOB_SIZE - marker.length - 4;
    const jsonStart = payloadStart + marker.length + 4;
    if (length === 0) {
      // An empty state is valid only when no hidden or half-written bytes remain.
      if (database.subarray(jsonStart).some((byte) => byte !== 0)) {
        throw new Error("JOA SQLite boş veri alanında beklenmedik içerik bulundu.");
      }
      return emptyStudioDatabaseState();
    }
    if (length > maxLength) throw new Error("JOA SQLite verisi bozuk: payload uzunluğu geçersiz.");
    // An interrupted or forged tail must not be accepted as a complete record.
    if (database.subarray(jsonStart + length).some((byte) => byte !== 0)) {
      throw new Error("JOA SQLite veri alanının sonunda beklenmedik içerik bulundu.");
    }
    const json = new TextDecoder("utf-8", { fatal: true }).decode(database.slice(jsonStart, jsonStart + length));
    const parsed: unknown = JSON.parse(json);
    return this.assertV2(parsed);
  }

  writeState(database: Uint8Array, state: StudioDatabaseState): Uint8Array {
    this.assertSqlite(database);
    // Fail before touching the staged/backup/primary files, not on the next launch.
    // The same schema checks are applied to both disk reads and attempted writes.
    this.assertV2(state);
    const output = database.slice();
    const marker = this.markerBytes();
    const payloadStart = this.payloadStart(output);
    const json = new TextEncoder().encode(JSON.stringify(state));
    const capacity = FIXED_BLOB_SIZE - marker.length - 4;
    if (json.length > capacity) {
      throw new Error(`JOA SQLite kapasitesi doldu (${json.length}/${capacity} bayt).`);
    }
    const lengthOffset = payloadStart + marker.length;
    const jsonOffset = lengthOffset + 4;
    const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
    view.setUint32(lengthOffset, json.length, true);
    output.fill(0, jsonOffset, payloadStart + FIXED_BLOB_SIZE);
    output.set(json, jsonOffset);
    return output;
  }

  private assertV2(raw: unknown): StudioDatabaseState {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("JOA SQLite veri şeması geçersiz.");
    }
    const state = raw as Record<string, unknown>;
    if (state.version !== 2 || !this.isRecord(state.mainCharacters) || !this.isRecord(state.roster)) {
      throw new Error("JOA SQLite veri şeması geçersiz.");
    }
    // Do not trust values read from local disk. Malformed fields must fail before
    // rendering UI or mutating the vault; never silently repair user data.
    for (const [key, value] of Object.entries(state.mainCharacters as Record<string, unknown>)) {
      this.assertEntity(key, value, "main");
    }
    for (const [key, value] of Object.entries(state.roster as Record<string, unknown>)) {
      this.assertEntity(key, value, "roster");
    }
    // Prevent special dictionary keys from being treated as entity identities.
    for (const items of [state.mainCharacters, state.roster] as Record<string, unknown>[]) {
      for (const key of Object.keys(items)) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
          throw new Error("JOA SQLite tehlikeli kayıt anahtarı reddedildi.");
        }
      }
    }
    return raw as StudioDatabaseState;
  }

  private assertEntity(id: string, value: unknown, type: "main" | "roster"): void {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !this.isRecord(value) || value.id !== id ||
        typeof value.firstName !== "string" || value.firstName.length > 80 ||
        typeof value.lastName !== "string" || value.lastName.length > 80 ||
        (value.lifeStatus !== "living" && value.lifeStatus !== "dead")) {
      throw new Error("JOA SQLite karakter verisi bozuk veya beklenmedik türde.");
    }
    if (value.title !== undefined && (typeof value.title !== "string" || value.title.length > 80)) {
      throw new Error(type === "main" ? "JOA SQLite ana karakter ünvanı geçersiz." : "JOA SQLite kayıt ünvanı geçersiz.");
    }
    if (type === "main" && (typeof value.inventoryText !== "string" || value.inventoryText.length > 24000)) {
      throw new Error("JOA SQLite çanta verisi geçersiz.");
    }
    if (type === "roster" && (value.kind !== "npc" && value.kind !== "vehicle" && value.kind !== "other" && value.kind !== "place" ||
        (value.title !== undefined && typeof value.title !== "string"))) {
      throw new Error("JOA SQLite kayıt türü geçersiz.");
    }
    if (value.portraitPath !== undefined &&
        (typeof value.portraitPath !== "string" ||
        !/^\.obsidian\/plugins\/joa-frp-writer\/art\/[a-zA-Z0-9_-]+\.webp$/.test(value.portraitPath))) {
      throw new Error("JOA SQLite portre yolu geçersiz.");
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  private assertSqlite(database: Uint8Array): void {
    if (database.byteLength !== TEMPLATE_DATABASE_SIZE) {
      throw new Error("JOA SQLite boyutu veya sayfa düzeni geçersiz.");
    }
    const header = new TextDecoder().decode(database.slice(0, SQLITE_HEADER.length));
    if (header !== SQLITE_HEADER) throw new Error("JOA veri dosyası geçerli bir SQLite 3 veritabanı değil.");
    // All bytes preceding our dedicated mutable BLOB must exactly match the
    // reviewed database template. This rejects malformed layouts and modified
    // SQL schema/pages without changing or auto-repairing the user's database.
    const reference = this.template;
    for (let i = 0; i < TEMPLATE_PAYLOAD_OFFSET; i += 1) {
      if (database[i] !== reference[i]) {
        throw new Error("JOA SQLite sabit dosya yapısı değişmiş veya bozulmuş.");
      }
    }
  }

  private payloadStart(database: Uint8Array): number {
    const marker = this.markerBytes();
    if (TEMPLATE_PAYLOAD_OFFSET + FIXED_BLOB_SIZE !== database.length ||
        !marker.every((value, index) => database[TEMPLATE_PAYLOAD_OFFSET + index] === value)) {
      throw new Error("JOA SQLite payload alanı bulunamadı veya değiştirilmiş.");
    }
    return TEMPLATE_PAYLOAD_OFFSET;
  }

  private markerBytes(): Uint8Array {
    return new TextEncoder().encode(PAYLOAD_MARKER);
  }

  private decodeBase64(value: string): Uint8Array {
    const binary = globalThis.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
}
