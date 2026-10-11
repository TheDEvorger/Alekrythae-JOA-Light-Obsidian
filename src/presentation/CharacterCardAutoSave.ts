import { MainCharacterCard } from "../domain/studio/StudioModels";

/**
 * One responsibility: serialize debounced per-character edits to the repository.
 * A rejected write keeps its unsaved patch instead of losing the user's input.
 */
export class CharacterCardAutoSave {
  private readonly pending = new Map<string, Partial<MainCharacterCard>>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly discarded = new Set<string>();

  constructor(
    private readonly save: (id: string, patch: Partial<MainCharacterCard>) => Promise<unknown>,
    private readonly status: (id: string, message: string) => void,
    private readonly onError: (error: unknown) => void,
    private readonly debounceMs = 180
  ) {}

  queue(id: string, patch: Partial<MainCharacterCard>): void {
    this.discarded.delete(id);
    this.pending.set(id, { ...this.pending.get(id), ...patch });
    this.status(id, "Kaydediliyor…");
    this.stopTimer(id);
    this.timers.set(id, setTimeout(() => void this.flush(id), this.debounceMs));
  }

  discard(id: string): void {
    this.discarded.add(id);
    this.stopTimer(id);
    this.pending.delete(id);
  }

  async flushOne(id: string): Promise<void> { await this.flush(id); }

  async flushAll(): Promise<void> {
    for (const id of this.timers.keys()) this.stopTimer(id);
    const ids = new Set([...this.pending.keys(), ...this.inFlight.keys()]);
    await Promise.all([...ids].map((id) => this.flush(id)));
  }

  private async flush(id: string): Promise<void> {
    this.stopTimer(id);
    const previous = this.inFlight.get(id) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(async () => {
      if (this.discarded.has(id)) return;
      const patch = this.pending.get(id);
      if (!patch) return;
      this.pending.delete(id);
      try {
        await this.save(id, patch);
        if (!this.pending.has(id)) this.status(id, "Kaydedildi");
      } catch (error) {
        if (!this.discarded.has(id)) {
          // Later edits always win over an older failed write.
          this.pending.set(id, { ...patch, ...this.pending.get(id) });
          this.status(id, "Kayıt başarısız, değişiklik korunuyor");
          this.onError(error);
        }
      }
    });
    this.inFlight.set(id, current);
    await current;
    if (this.inFlight.get(id) === current) this.inFlight.delete(id);
  }

  private stopTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) clearTimeout(timer);
    this.timers.delete(id);
  }
}
