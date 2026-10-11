import { AppearanceSettings, DEFAULT_APPEARANCE, parseAppearance } from "../../domain/appearance/AppearanceSettings";
import { SettingsStateStore } from "./SettingsStateStore";

const KEY = "joaAppearance";
export class AppearancePreferences {
  constructor(private readonly data: SettingsStateStore) {}
  async load(): Promise<AppearanceSettings> {
    const old = await this.data.read();
    return parseAppearance(old[KEY] ?? DEFAULT_APPEARANCE);
  }
  async save(settings: AppearanceSettings): Promise<void> {
    const normalized = parseAppearance(settings);
    await this.data.update((prior) => ({ ...prior, [KEY]: normalized }));
  }
}
