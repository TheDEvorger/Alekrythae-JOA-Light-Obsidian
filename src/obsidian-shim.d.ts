declare module "obsidian" {
  export interface EditorPosition { line: number; ch: number; }
  export interface Editor {
    getCursor(): EditorPosition;
    replaceRange(text: string, from: EditorPosition): void;
    setCursor(position: EditorPosition): void;
    focus(): void;
    lastLine(): number;
    getLine(line: number): string;
    scrollIntoView(range: {from: EditorPosition; to: EditorPosition}, center?: boolean): void;
  }
  export class TFile {
    path: string;
    basename: string;
    extension: string;
  }
  export interface EventRef {}
  export interface CachedMetadata { frontmatter?: Record<string, unknown>; }
  export interface DataAdapter {
    exists(path: string): Promise<boolean>;
    mkdir(path: string): Promise<void>;
    readBinary(path: string): Promise<ArrayBuffer>;
    rename(path: string, newPath: string): Promise<void>;
    remove(path: string): Promise<void>;
    stat?(path: string): Promise<{size: number} | null>;
    getResourcePath?(path: string): string;
    writeBinary(path: string, data: ArrayBuffer): Promise<void>;
  }
  export interface Vault {
    adapter: DataAdapter;
    getMarkdownFiles(): TFile[];
    cachedRead(file: TFile): Promise<string>;
    process(file: TFile, fn: (data: string) => string): Promise<string>;
    on(name: "modify", callback: (file: TFile) => unknown): EventRef;
  }
  export interface MetadataCache {
    getFileCache(file: TFile): CachedMetadata | null;
  }
  export interface FileManager {
    processFrontMatter(file: TFile, fn: (frontmatter: Record<string, unknown>) => void): Promise<void>;
  }
  export interface Workspace {
    containerEl?: HTMLElement;
    onLayoutReady(callback: () => void): void;
    getActiveFile(): TFile | null;
    on(name: string, callback: (...args: any[]) => unknown): EventRef;
    getActiveViewOfType<T>(type: new (...args: any[]) => T): T | null;
  }
  export interface App {
    vault: Vault;
    metadataCache: MetadataCache;
    fileManager: FileManager;
    workspace: Workspace;
  }
  export class Plugin {
    registerMarkdownPostProcessor(processor: (el: HTMLElement) => void | Promise<void>): void;
    app: App;
    loadData(): Promise<unknown>;
    saveData(data: unknown): Promise<void>;
    addCommand(command: {
      id: string;
      name: string;
      hotkeys?: Array<{ modifiers: string[]; key: string }>;
      callback?: () => unknown;
      editorCallback?: (editor: Editor) => unknown;
    }): void;
    registerEvent(ref: EventRef): void;
    registerDomEvent<K extends keyof WindowEventMap>(
      el: Window,
      type: K,
      callback: (evt: WindowEventMap[K]) => unknown,
      options?: boolean | AddEventListenerOptions
    ): void;
  }
  export class MarkdownView {
    editor: Editor;
  }
  export class Notice {
    constructor(message: string, timeout?: number);
  }
  export class Modal {
    app: App;
    contentEl: HTMLElement;
    modalEl: HTMLElement;
    constructor(app: App);
    open(): void;
    close(): void;
    onOpen(): void | Promise<void>;
    onClose(): void | Promise<void>;
  }
}
