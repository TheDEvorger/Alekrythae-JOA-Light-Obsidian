export interface PortraitStore {
  /** Only cropped 320x320 image/webp bytes are saved. */
  save(id: string, data: ArrayBuffer): Promise<string>;
  getDataUrl(path: string): Promise<string | undefined>;
}
