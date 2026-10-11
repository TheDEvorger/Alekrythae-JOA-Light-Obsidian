/** Read-only canonical Meggy portrait provider, independent of UI widgets. */
export interface MeggyPortraitSource {
  getDataUrl(): Promise<string>;
}
