import { DataAdapter, Notice } from "obsidian";

/** Only canonical D240 rolls can select local bundled voice audio. */
export class MeggyAudioPlayer {
  private audio?: HTMLAudioElement;
  private resourceUrl?: string;
  private lastRoll?: number;
  constructor(private readonly adapter: DataAdapter) {}

  async playD240(roll: number): Promise<void> {
    if (!Number.isSafeInteger(roll) || roll < 1 || roll > 240) return;
    this.stop();
    this.lastRoll = roll;
    const path = `.obsidian/plugins/joa-frp-writer/audio/MV${roll}.mp3`;
    try {
      if (!(await this.adapter.exists(path))) {
        new Notice(`Meggy ses kaydı bulunamadı: MV${roll}.mp3`, 6000);
        return;
      }
      const stat = await this.adapter.stat?.(path);
      if (stat && stat.size > 3_000_000) throw new Error("Ses kaydının boyutu beklenenden büyük.");
      const buffer = await this.adapter.readBinary(path);
      if (buffer.byteLength < 128 || buffer.byteLength > 3_000_000) throw new Error("Ses kaydı boyutu geçersiz.");
      const bytes = new Uint8Array(buffer);
      const id3 = String.fromCharCode(...bytes.slice(0, 3)) === "ID3";
      const mpeg = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
      if (!id3 && !mpeg) throw new Error("Ses kaydı MP3 biçiminde değil.");
      this.resourceUrl = URL.createObjectURL(new Blob([buffer], { type: "audio/mpeg" }));
      const audio = new Audio(this.resourceUrl);
      this.audio = audio;
      audio.addEventListener("ended", () => { if (this.audio === audio) this.stop(); }, { once: true });
      await audio.play();
    } catch (error) {
      this.stop();
      new Notice(`Meggy sesi oynatılamadı: ${error instanceof Error ? error.message : String(error)}`, 6000);
    }
  }

  replayLast(): Promise<void> {
    return this.lastRoll ? this.playD240(this.lastRoll) : Promise.resolve();
  }

  stop(): void {
    this.audio?.pause(); this.audio = undefined;
    if (this.resourceUrl) URL.revokeObjectURL(this.resourceUrl);
    this.resourceUrl = undefined;
  }
}
