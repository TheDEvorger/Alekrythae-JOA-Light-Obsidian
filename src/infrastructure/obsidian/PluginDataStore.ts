import { Plugin } from "obsidian";

/** Serializes all data.json mutations shared by caret and visual preferences. */
export class PluginDataStore {
  private pending: Promise<void> = Promise.resolve();
  constructor(private readonly plugin: Plugin) {}

  async read(): Promise<Record<string, unknown>> {
    await this.pending;
    try {
      const value: unknown = await this.plugin.loadData();
      return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown> : {};
    } catch { return {}; }
  }

  update(mutate: (prior: Record<string, unknown>) => Record<string, unknown>): Promise<void> {
    this.pending = this.pending.catch(() => undefined).then(async () => {
      const previous: unknown = await this.plugin.loadData();
      const old = previous && typeof previous === "object" && !Array.isArray(previous)
        ? previous as Record<string, unknown> : {};
      await this.plugin.saveData(mutate(old));
    });
    return this.pending;
  }
}
