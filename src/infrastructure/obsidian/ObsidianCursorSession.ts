import { App, Editor, MarkdownView, Plugin, TFile } from "obsidian";
import { clampCursor, CursorPosition, sameCursor, validCursor } from "../../application/editor/CursorPositions";
import { PluginDataStore } from "./PluginDataStore";

const SETTINGS_KEY = "joaCursorPositions";
const SAVE_DELAY_MS = 450;
const MAX_NOTES = 300;

/** Stores one independent caret per note, without editing Markdown or SQLite. */
export class ObsidianCursorSession {
  private positions = new Map<string, CursorPosition>();
  private timer?: ReturnType<typeof setTimeout>;
  private restoreTimer?: ReturnType<typeof setTimeout>;
  private poll?: ReturnType<typeof setInterval>;
  private pendingRestore = "";
  private paused = false;
  private disposed = false;
  private savedLast?: string;
  private saves: Promise<void> = Promise.resolve();
  private readonly recordOnMove = (): void => this.captureActive();

  constructor(private readonly plugin: Plugin, private readonly app: App, private readonly sharedData?: PluginDataStore) {}

  async start(): Promise<void> {
    const prior = await this.readSettings();
    const entries = prior[SETTINGS_KEY];
    if (entries && typeof entries === "object" && !Array.isArray(entries)) {
      for (const [path, point] of Object.entries(entries)) {
        if (path.endsWith(".md") && validCursor(point)) this.positions.set(path, point);
      }
    }
    const workspace = this.app.workspace;
    if (typeof workspace.on === "function") {
      this.plugin.registerEvent(workspace.on("file-open", (file: TFile | null) => this.queueRestore(file?.path)));
      this.plugin.registerEvent(workspace.on("editor-change", () => this.captureActive()));
    }
    if (typeof workspace.onLayoutReady === "function") {
      workspace.onLayoutReady(() => this.queueRestore(workspace.getActiveFile()?.path));
    }
    if (typeof document !== "undefined") {
      document.addEventListener("keyup", this.recordOnMove, true);
      document.addEventListener("mouseup", this.recordOnMove, true);
    }
    if (typeof window !== "undefined") this.poll = window.setInterval(() => this.captureActive(), 900);
  }

  /** Called before F3 moves focus out of the Markdown editor. */
  beginWorkbench(editor: Editor, path: string): CursorPosition {
    this.paused = true;
    if (this.restoreTimer) clearTimeout(this.restoreTimer);
    const stillPending = this.pendingRestore === path;
    this.pendingRestore = "";
    const point = stillPending ? (this.positions.get(path) ?? editor.getCursor()) : editor.getCursor();
    const position = clampCursor(point, editor.lastLine?.bind(editor), editor.getLine?.bind(editor));
    this.remember(path, position);
    return position;
  }

  /** Called on every scene insertion; next insertion and the next session advance together. */
  sceneInserted(path: string, position: CursorPosition): void {
    this.remember(path, position);
    this.persistNow();
  }

  /** Called when F3 closes, including Escape and fullscreen exits. */
  endWorkbench(editor: Editor, path: string, position: CursorPosition): void {
    this.remember(path, position);
    this.persistNow();
    this.paused = false;
    if (this.app.workspace.getActiveFile()?.path === path) editor.setCursor?.(position);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        if (this.disposed || this.app.workspace.getActiveFile()?.path !== path) return;
        editor.setCursor?.(position);
        editor.scrollIntoView?.({ from: position, to: position }, true);
        editor.focus?.();
      }, 0);
    } else {
      editor.setCursor?.(position);
      editor.focus?.();
    }
  }

  /** Position is restored per file after Obsidian has opened its editor. */
  queueRestore(path?: string): void {
    if (!path || !this.positions.has(path) || this.paused || this.disposed) return;
    if (this.restoreTimer) clearTimeout(this.restoreTimer);
    this.pendingRestore = path;
    this.restoreTimer = setTimeout(() => {
      this.restoreTimer = undefined;
      this.pendingRestore = "";
      if (this.paused || this.app.workspace.getActiveFile()?.path !== path) return;
      const editor = this.activeEditor();
      const stored = this.positions.get(path);
      if (!editor || !stored) return;
      const position = clampCursor(stored, editor.lastLine?.bind(editor), editor.getLine?.bind(editor));
      editor.setCursor?.(position);
      editor.scrollIntoView?.({ from: position, to: position }, true);
      // Don't steal keyboard focus merely because a note was opened.
    }, 140);
  }

  captureActive(): void {
    if (this.paused || this.disposed || this.pendingRestore) return;
    const path = this.app.workspace.getActiveFile()?.path;
    const editor = this.activeEditor();
    if (path && editor) this.remember(path, editor.getCursor());
  }

  async dispose(): Promise<void> {
    this.captureActive();
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.restoreTimer) clearTimeout(this.restoreTimer);
    if (this.poll) clearInterval(this.poll);
    if (typeof document !== "undefined") {
      document.removeEventListener("keyup", this.recordOnMove, true);
      document.removeEventListener("mouseup", this.recordOnMove, true);
    }
    await this.writeSnapshot();
  }

  private remember(path: string, point: CursorPosition): void {
    if (!path.endsWith(".md") || !validCursor(point)) return;
    const previous = this.positions.get(path);
    if (previous && sameCursor(previous, point)) return;
    this.positions.delete(path);
    this.positions.set(path, { line: point.line, ch: point.ch });
    while (this.positions.size > MAX_NOTES) this.positions.delete(this.positions.keys().next().value!);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; this.persistNow(); }, SAVE_DELAY_MS);
  }

  private persistNow(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    void this.writeSnapshot();
  }

  private async readSettings(): Promise<Record<string, unknown>> {
    if (this.sharedData) return this.sharedData.read();
    if (typeof this.plugin.loadData !== "function") return {};
    try {
      const data: unknown = await this.plugin.loadData();
      return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
    } catch { return {}; }
  }

  private writeSnapshot(): Promise<void> {
    if (typeof this.plugin.saveData !== "function") return this.saves;
    const positions = Object.fromEntries(this.positions);
    const serialized = JSON.stringify(positions);
    if (serialized === this.savedLast) return this.saves;
    this.saves = this.saves.then(async () => {
      // Preserve unrelated plugin settings and serialize writes.
      if (this.sharedData) {
        await this.sharedData.update((existing) => ({ ...existing, [SETTINGS_KEY]: positions }));
      } else {
        const existing = await this.readSettings();
        await this.plugin.saveData({ ...existing, [SETTINGS_KEY]: positions });
      }
      this.savedLast = serialized;
    }).catch(() => { /* Next cursor movement will retry; never interrupt writing. */ });
    return this.saves;
  }

  private activeEditor(): Editor | undefined {
    return this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
  }
}
