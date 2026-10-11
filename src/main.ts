import { MarkdownView, Notice, Plugin } from "obsidian";
import { RollCalloutStyleUseCase } from "./application/callout/RollCalloutStyleUseCase";
import { RollD240UseCase } from "./application/d240/RollD240UseCase";
import { GenerateMeggySceneUseCase } from "./application/writing/GenerateMeggySceneUseCase";
import { CalloutStyleTable } from "./domain/callout/CalloutStyleTable";
import { D240Table } from "./domain/d240/D240Table";
import { StudioStateService } from "./domain/studio/StudioStateService";
import { SceneCalloutFormatter } from "./domain/writing/SceneCalloutFormatter";
import { ObsidianSqliteStudioRepository } from "./infrastructure/obsidian/ObsidianSqliteStudioRepository";
import { WebCryptoIdSource } from "./infrastructure/random/WebCryptoIdSource";
import { WebCryptoRandomSource } from "./infrastructure/random/WebCryptoRandomSource";
import { FixedPayloadSqliteCodec } from "./infrastructure/sqlite/FixedPayloadSqliteCodec";
import { ObsidianPortraitStore } from "./infrastructure/obsidian/ObsidianPortraitStore";
import { LiveCalloutArtRenderer } from "./infrastructure/obsidian/LiveCalloutArtRenderer";
import { MeggySceneModal } from "./presentation/MeggySceneModal";
import { ObsidianCursorSession } from "./infrastructure/obsidian/ObsidianCursorSession";
import { PluginDataStore } from "./infrastructure/obsidian/PluginDataStore";
import { AppearancePreferences } from "./application/settings/AppearancePreferences";
import { StudioVisualControls } from "./presentation/appearance/StudioVisualControls";
import { ObsidianBackgroundImages } from "./infrastructure/obsidian/ObsidianBackgroundImages";
import { MeggyAudioPlayer } from "./infrastructure/obsidian/MeggyAudioPlayer";
import { ObsidianMeggyPortrait } from "./infrastructure/obsidian/ObsidianMeggyPortrait";
import { LongTextSafeReaderModal } from "./presentation/longtext/LongTextSafeReaderModal";
import { containsHugeUnbrokenRun } from "./domain/writing/LongTextPaging";
import { TFile } from "obsidian";

export default class JOAFrpWriterPlugin extends Plugin {
  private studio!: ObsidianSqliteStudioRepository;
  private portraitStore!: ObsidianPortraitStore;
  private generateMeggyScene!: GenerateMeggySceneUseCase;
  private workbench?: MeggySceneModal;
  private artRenderer?: LiveCalloutArtRenderer;
  private cursorSession?: ObsidianCursorSession;
  private sharedSettings!: PluginDataStore;
  private appearance!: AppearancePreferences;
  private meggyAudio!: MeggyAudioPlayer;
  private meggyPortrait!: ObsidianMeggyPortrait;
  private warnedHugeNotes = new Set<string>();

  async onload(): Promise<void> {
    this.sharedSettings = new PluginDataStore(this);
    this.appearance = new AppearancePreferences(this.sharedSettings);
    this.meggyAudio = new MeggyAudioPlayer(this.app.vault.adapter);
    this.meggyPortrait = new ObsidianMeggyPortrait(this.app.vault.adapter);
    this.cursorSession = new ObsidianCursorSession(this, this.app, this.sharedSettings);
    await this.cursorSession.start();
    this.studio = new ObsidianSqliteStudioRepository(
      this.app.vault.adapter,
      new FixedPayloadSqliteCodec(),
      new StudioStateService(),
      new WebCryptoIdSource(),
      () => this.artRenderer?.refresh()
    );
    await this.studio.initialize();
    this.portraitStore = new ObsidianPortraitStore(this.app.vault.adapter, () => this.artRenderer?.refresh());
    this.artRenderer = new LiveCalloutArtRenderer(this.studio, this.portraitStore, this.meggyPortrait);
    // Reading mode and Live Preview both resolve current artwork, including old notes.
    this.registerMarkdownPostProcessor?.((el) => this.artRenderer?.hydrate(el));
    if (typeof document !== "undefined") {
      const root = this.app.workspace.containerEl ?? document.querySelector(".workspace") ?? document.body;
      if (root) this.artRenderer.start(root);
    }

    const random = new WebCryptoRandomSource();
    this.generateMeggyScene = new GenerateMeggySceneUseCase(
      new SceneCalloutFormatter(),
      new RollD240UseCase(new D240Table(), random),
      new RollCalloutStyleUseCase(new CalloutStyleTable(), random)
    );

    this.addCommand({
      id: "long-text-safe-reader",
      name: "JOA: Uzun Metin Güvenli Okuyucu",
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") {
          new Notice("Önce bir Markdown notu aç.", 4000);
          return;
        }
        new LongTextSafeReaderModal(this.app, file).open();
      }
    });

    // Scan only when switching files, never while typing or scrolling.
    if (typeof this.app.workspace.on === "function") {
      this.registerEvent(this.app.workspace.on("file-open", (file: TFile | null) => {
        if (file) void this.warnLongFileOnce(file);
      }));
    }
    if (typeof this.app.workspace.onLayoutReady === "function") {
      this.app.workspace.onLayoutReady(() => {
        const file = this.app.workspace.getActiveFile();
        if (file) void this.warnLongFileOnce(file);
      });
    }

    this.addCommand({
      id: "replay-last-meggy-voice",
      name: "Meggy son ses kaydını tekrar oynat",
      callback: () => void this.meggyAudio.replayLast()
    });

    this.addCommand({
      id: "open-meggy-scene-writer",
      name: "JOA Sahne Masası",
      hotkeys: [{ modifiers: [], key: "F3" }],
      callback: () => this.openWorkbench()
    });
  }

  onunload(): void {
    this.artRenderer?.dispose();
    this.meggyAudio?.stop();
    void this.cursorSession?.dispose();
  }

  private async warnLongFileOnce(file: TFile): Promise<void> {
    if (file.extension !== "md" || this.warnedHugeNotes.has(file.path)) return;
    try {
      const info = await this.app.vault.adapter.stat?.(file.path);
      if (!info || info.size < 8_192) return;
      // Don't read huge files merely to show a warning.
      if (info.size > 8_000_000) {
        this.warnedHugeNotes.add(file.path);
        new Notice("Çok büyük not: Ctrl+P → JOA: Uzun Metin Güvenli Okuyucu ile açabilirsin.", 7500);
        return;
      }
      const source = await this.app.vault.cachedRead(file);
      if (!containsHugeUnbrokenRun(source)) return;
      this.warnedHugeNotes.add(file.path);
      new Notice("Aşırı uzun boşluksuz metin algılandı. Kaybolmadıysa bile editör zorlanabilir. Ctrl+P → JOA: Uzun Metin Güvenli Okuyucu.", 8000);
    } catch {
      // Warning is optional; never interfere with note opening.
    }
  }

  private openWorkbench(): void {
    try {
      if (this.workbench) return;
      const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor ?? null;
      if (!editor) {
        new Notice("Önce yazmak istediğin Markdown notunu aç.", 5000);
        return;
      }
      const filePath = this.app.workspace.getActiveFile()?.path ?? "";
      const cursor = this.cursorSession?.beginWorkbench(editor, filePath) ?? editor.getCursor();
      const workbench = new MeggySceneModal(this.app, this.generateMeggyScene, editor, this.studio, this.portraitStore, () => {
        if (this.workbench === workbench) this.workbench = undefined;
      }, cursor, (position, closing) => {
        if (closing) this.cursorSession?.endWorkbench(editor, filePath, position);
        else this.cursorSession?.sceneInserted(filePath, position);
      }, new StudioVisualControls(this.appearance, new ObsidianBackgroundImages(this.app.vault.adapter)), this.meggyAudio, this.meggyPortrait);
      this.workbench = workbench;
      workbench.open();
    } catch (error) {
      this.workbench = undefined;
      new Notice(error instanceof Error ? error.message : String(error), 5000);
    }
  }
}
