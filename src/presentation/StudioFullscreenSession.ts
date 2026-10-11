/**
 * Desktop fullscreen is an OS/window concern, not a CSS layout concern.
 * Prefer Electron's window controller if exposed by the Obsidian desktop host,
 * otherwise request standards-based HTML fullscreen. The prior window mode is
 * restored when the workbench closes. Unsupported hosts keep the CSS viewport
 * fallback instead of changing system settings.
 */
interface ElectronWindow {
  isFullScreen(): boolean;
  setFullScreen(enabled: boolean): void;
  on?(event: string, callback: () => void): void;
  removeListener?(event: string, callback: () => void): void;
}

export class StudioFullscreenSession {
  private mode: "none" | "electron" | "html" = "none";
  private nativeWindow?: ElectronWindow;
  private closed = false;
  private ownsFullscreen = false;
  private readonly onHtmlChange = (): void => {
    if (!this.closed && this.ownsFullscreen && !this.document.fullscreenElement) {
      this.onUnexpectedExit();
    }
  };
  private readonly onNativeExit = (): void => {
    if (!this.closed && this.ownsFullscreen) this.onUnexpectedExit();
  };

  constructor(private readonly document: Document, private readonly onUnexpectedExit: () => void) {}

  async enter(): Promise<void> {
    if (this.closed || this.mode !== "none") return;
    // @electron/remote is optional; Obsidian does not promise it on every host.
    const hostRequire = (this.document.defaultView as (Window & { require?: (id: string) => unknown }) | null)?.require;
    if (typeof hostRequire === "function") {
      try {
        const remote = hostRequire("@electron/remote") as { getCurrentWindow?: () => ElectronWindow };
        const window = remote.getCurrentWindow?.();
        if (window && typeof window.isFullScreen === "function" && typeof window.setFullScreen === "function") {
          if (!window.isFullScreen()) {
            window.on?.("leave-full-screen", this.onNativeExit);
            try {
              window.setFullScreen(true);
              this.ownsFullscreen = true;
            } catch (error) {
              window.removeListener?.("leave-full-screen", this.onNativeExit);
              throw error;
            }
          }
          this.mode = "electron";
          this.nativeWindow = window;
          return;
        }
      } catch { /* Prefer HTML fullscreen if native host APIs are unavailable. */ }
    }

    if (this.document.fullscreenElement || typeof this.document.documentElement.requestFullscreen !== "function") return;
    try {
      // Called immediately after the F3 user gesture, before yielding.
      await this.document.documentElement.requestFullscreen();
      if (this.closed) {
        if (this.document.fullscreenElement === this.document.documentElement) {
          await this.document.exitFullscreen().catch(() => undefined);
        }
        return;
      }
      if (this.document.fullscreenElement === this.document.documentElement) {
        this.mode = "html";
        this.ownsFullscreen = true;
        this.document.addEventListener("fullscreenchange", this.onHtmlChange);
      }
    } catch { /* The fullscreen permission can be refused. Keep the full-viewport modal. */ }
  }

  exit(): void {
    if (this.closed) return;
    this.closed = true;
    this.document.removeEventListener("fullscreenchange", this.onHtmlChange);
    this.nativeWindow?.removeListener?.("leave-full-screen", this.onNativeExit);
    if (!this.ownsFullscreen) return;
    if (this.mode === "electron") {
      try { this.nativeWindow?.setFullScreen(false); } catch { /* Already closed. */ }
    } else if (this.mode === "html" && this.document.fullscreenElement === this.document.documentElement) {
      void this.document.exitFullscreen().catch(() => undefined);
    }
  }
}
