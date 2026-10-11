import { App, Editor, EditorPosition, Modal, Notice } from "obsidian";
import { GenerateMeggySceneUseCase } from "../application/writing/GenerateMeggySceneUseCase";
import { StudioRepository } from "../application/studio/StudioRepository";
import { PortraitStore } from "../application/studio/PortraitStore";
import { CharacterCardsPanel } from "./CharacterCardsPanel";
import { RosterPanel } from "./RosterPanel";
import { ScenePanel } from "./ScenePanel";
import { StudioDialog } from "./StudioDialog";
import { StudioFullscreenSession } from "./StudioFullscreenSession";
import { StudioTabBar, StudioTabId } from "./StudioTabBar";
import { SceneEditorInsertion } from "./SceneEditorInsertion";
import { StudioVisualControls } from "./appearance/StudioVisualControls";
import { SpeakerIdentityEditor } from "./SpeakerIdentityEditor";
import { VoicePlayer } from "../application/audio/VoicePlayer";
import { PortraitCropDialog } from "./PortraitCropDialog";
import { displayName } from "../domain/studio/StudioModels";
import { SpeakerOption } from "../application/studio/SpeakerDirectory";
import { MeggyPortraitSource } from "../application/media/MeggyPortraitSource";
import { MEGGY_PORTRAIT_DATA_URL } from "../assets/CanonicalMeggyPortrait";

/** Workbench lifecycle/navigation; individual tabs own their UI. */
export class MeggySceneModal extends Modal {
  private activeTab: StudioTabId = "scene";
  private sceneDraft = "";
  private selectedSpeakerId = "meggy";
  private panelRoot!: HTMLElement;
  private readonly tabBar: StudioTabBar;
  private readonly insertion: SceneEditorInsertion;
  private characterPanel?: CharacterCardsPanel;
  private fullscreen?: StudioFullscreenSession;

  private readonly onStudioKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape" || event.key === "Esc") {
      if (this.modalEl.querySelector(".joa-dialog-backdrop")) return;
      event.preventDefault();
      event.stopPropagation();
      this.close();
    } else if (event.key === "F3") {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  constructor(
    app: App,
    private readonly generateScene: GenerateMeggySceneUseCase,
    editor: Editor,
    private readonly studio: StudioRepository,
    private readonly portraitStore: PortraitStore,
    private readonly onDismiss: () => void = () => {},
    initialCursor?: EditorPosition,
    onCursorChange: (position: EditorPosition, closing: boolean) => void = () => {},
    private readonly visualControls?: StudioVisualControls,
    private readonly meggyAudio?: VoicePlayer,
    private readonly meggyPortrait?: MeggyPortraitSource
  ) {
    super(app);
    this.tabBar = new StudioTabBar((id) => void this.switchTab(id), this.meggyPortrait);
    this.insertion = new SceneEditorInsertion(editor, initialCursor ?? editor.getCursor(), onCursorChange);
  }

  onOpen(): void {
    this.modalEl.classList.add("joa-studio-modal");
    document.addEventListener("keydown", this.onStudioKey, true);
    this.fullscreen = new StudioFullscreenSession(document, () => this.close());
    void this.fullscreen.enter();
    this.contentEl.replaceChildren();
    this.contentEl.classList.add("joa-studio-content");
    const shell = document.createElement("div");
    shell.className = "joa-studio-shell";
    const header = this.tabBar.header();
    shell.append(header, this.tabBar.navigation(this.activeTab));
    this.visualControls?.mount(shell, header);
    this.panelRoot = document.createElement("main");
    this.panelRoot.className = "joa-panel-root";
    shell.appendChild(this.panelRoot);
    this.contentEl.appendChild(shell);
    this.renderActiveTab();
  }

  onClose(): void {
    document.removeEventListener("keydown", this.onStudioKey, true);
    this.fullscreen?.exit();
    this.visualControls?.dispose();
    this.fullscreen = undefined;
    this.onDismiss();
    this.insertion.finish();
    void this.characterPanel?.flushAll();
    this.characterPanel = undefined;
    this.modalEl.classList.remove("joa-studio-modal");
    this.contentEl.classList.remove("joa-studio-content");
    this.contentEl.replaceChildren();
  }

  private async switchTab(tab: StudioTabId): Promise<void> {
    if (this.activeTab === tab) return;
    await this.characterPanel?.flushAll();
    this.characterPanel = undefined;
    this.activeTab = tab;
    this.tabBar.setActive(tab);
    this.renderActiveTab();
  }

  private async addNamedMain(): Promise<SpeakerOption | undefined> {
    const entered = await new StudioDialog(this.modalEl).editName(
      { title: "", firstName: "", lastName: "" }, "Yeni ana karakter"
    );
    if (!entered) return undefined;
    try {
      const created = await this.studio.createMainCharacter();
      const updated = await this.studio.updateMainCharacter(created.id, entered);
      return { id: updated.id, kind: "main", name: displayName(updated), portraitPath: updated.portraitPath };
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error), 6000);
      return undefined;
    }
  }

  private editSpeakerIdentity(speaker: SpeakerOption): Promise<SpeakerOption | undefined> {
    return new SpeakerIdentityEditor(this.studio, new StudioDialog(this.modalEl)).edit(speaker);
  }

  private async changeSpeakerPortrait(speaker: SpeakerOption): Promise<string | undefined> {
    try {
      const path = await new PortraitCropDialog(this.modalEl, this.portraitStore)
        .open(speaker.id, speaker.portraitPath);
      if (!path) return undefined;
      if (speaker.kind === "main") await this.studio.updateMainCharacter(speaker.id, { portraitPath: path });
      else await this.studio.updateRosterEntity(speaker.id, { portraitPath: path });
      return path;
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error), 6000);
      return undefined;
    }
  }

  private renderActiveTab(): void {
    this.panelRoot.scrollTop = this.panelRoot.scrollLeft = 0;
    this.panelRoot.replaceChildren();
    try {
      if (this.activeTab === "scene") {
        new ScenePanel(
          this.panelRoot, this.generateScene, {
            list: () => this.studio.listSpeakers(),
            portrait: (path) => this.portraitStore.getDataUrl(path),
            meggyPortrait: () => this.meggyPortrait?.getDataUrl() ?? Promise.resolve(MEGGY_PORTRAIT_DATA_URL),
            addMain: () => this.addNamedMain(),
            changePortrait: (speaker) => this.changeSpeakerPortrait(speaker),
            editIdentity: (speaker) => this.editSpeakerIdentity(speaker),
            onSelect: (id) => { this.selectedSpeakerId = id; }
          },
          this.selectedSpeakerId, this.sceneDraft,
          (value) => { this.sceneDraft = value; },
          (markdown, d240Roll) => {
            this.insertion.insert(markdown);
            this.sceneDraft = "";
            if (d240Roll !== undefined) {
              this.close(); // Restore the Markdown editor before speaking.
              void this.meggyAudio?.playD240(d240Roll);
            } else this.renderActiveTab();
          }
        ).mount();
      } else if (this.activeTab === "cards") {
        this.characterPanel = new CharacterCardsPanel(this.panelRoot, this.studio,
          new StudioDialog(this.modalEl), this.portraitStore, this.modalEl);
        this.characterPanel.mount();
      } else {
        new RosterPanel(this.panelRoot, this.studio,
          new StudioDialog(this.modalEl), this.portraitStore, this.modalEl).mount();
      }
    } catch (error) { new Notice(error instanceof Error ? error.message : String(error), 5000); }
  }
}
