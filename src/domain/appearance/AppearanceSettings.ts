export type ImageFit = "cover" | "contain" | "width" | "height" | "natural";
export interface AppearanceSettings {
  themeId: string;
  imagePath: string;
  blur: number;
  storyBlur: number;
  fit: ImageFit;
  darkness: number;
}
export const DEFAULT_BACKGROUND = ".obsidian/plugins/joa-frp-writer/background-images/default.webp";
export const DEFAULT_APPEARANCE: Readonly<AppearanceSettings> = {
  themeId: "moon-citadel", imagePath: DEFAULT_BACKGROUND,
  blur: 0, storyBlur: 4, fit: "cover", darkness: 32
};
export function parseAppearance(value: unknown): AppearanceSettings {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<AppearanceSettings> : {};
  const fit: ImageFit = ["cover", "contain", "width", "height", "natural"].includes(source.fit ?? "")
    ? source.fit! : DEFAULT_APPEARANCE.fit;
  const path = typeof source.imagePath === "string" &&
    /^\.obsidian\/plugins\/joa-frp-writer\/background-images\/[a-zA-Z0-9_-]+\.(webp|jpg|png)$/.test(source.imagePath)
    ? source.imagePath : DEFAULT_BACKGROUND;
  const blur = typeof source.blur === "number" && Number.isFinite(source.blur)
    ? Math.round(Math.max(0, Math.min(24, source.blur))) : 0;
  const storyBlur = typeof source.storyBlur === "number" && Number.isFinite(source.storyBlur)
    ? Math.round(Math.max(0, Math.min(24, source.storyBlur))) : DEFAULT_APPEARANCE.storyBlur;
  const darkness = typeof source.darkness === "number" && Number.isFinite(source.darkness)
    ? Math.round(Math.max(15, Math.min(75, source.darkness))) : 32;
  return { themeId: typeof source.themeId === "string" ? source.themeId : DEFAULT_APPEARANCE.themeId,
    imagePath: path, blur, storyBlur, fit, darkness };
}
