import { GenerateMeggySceneUseCase } from "../application/writing/GenerateMeggySceneUseCase";
import { Notice } from "obsidian";
import { FANTASY_EMOJI } from "../domain/shared/FantasyEmojiCatalog";
import { SceneSpeakerPicker, SpeakerPickerActions } from "./SceneSpeakerPicker";

/** Compact story composer: portrait, speaker controls and multiline editor. */
export class ScenePanel {
  private dialogue: string;
  private readonly picker: SceneSpeakerPicker;
  private commitButton!: HTMLButtonElement;
  private saving = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly generateScene: GenerateMeggySceneUseCase,
    speakerActions: SpeakerPickerActions,
    selectedSpeakerId: string,
    initialDialogue: string,
    private readonly onDraftChange: (value: string) => void,
    private readonly onCommit: (markdown: string, d240Roll?: number) => void
  ) {
    this.dialogue = initialDialogue;
    this.picker = new SceneSpeakerPicker(speakerActions, selectedSpeakerId);
  }

  mount(): void {
    this.root.replaceChildren();
    this.root.className = "joa-panel-root joa-tab-panel joa-scene-tab";
    const row = document.createElement("div");
    row.className = "joa-scene-compact-row";
    this.picker.mount(row);
    this.commitButton = document.createElement("button");
    this.commitButton.type = "button";
    this.commitButton.className = "joa-primary-button joa-scene-confirm";
    this.commitButton.textContent = "Onayla ve nota işle";
    this.commitButton.disabled = !this.dialogue.trim();
    this.commitButton.addEventListener("click", () => this.commit());
    row.appendChild(this.commitButton);
    this.root.appendChild(row);
    const paper = document.createElement("div");
    paper.className = "joa-writing-paper";
    const topline = document.createElement("div");
    topline.className = "joa-field-topline";
    const label = document.createElement("span");
    label.className = "joa-field-label";
    label.textContent = `${FANTASY_EMOJI.speech} KONUŞMA METNİ`;
    const counter = document.createElement("span");
    counter.className = "joa-character-count";
    counter.textContent = `${this.dialogue.length} karakter`;
    topline.append(label, counter);
    const storyBackdrop = document.createElement("div");
    storyBackdrop.className = "joa-story-backdrop";
    storyBackdrop.setAttribute("aria-hidden", "true");
    const writingBody = document.createElement("div");
    writingBody.className = "joa-writing-body";
    const textarea = document.createElement("textarea");
    textarea.className = "joa-dialogue-input";
    textarea.placeholder = "Karakter ne söylüyor?";
    textarea.rows = 11;
    textarea.value = this.dialogue;
    textarea.addEventListener("input", () => {
      this.dialogue = textarea.value;
      counter.textContent = `${this.dialogue.length} karakter`;
      this.onDraftChange(this.dialogue);
      this.commitButton.disabled = !this.dialogue.trim();
    });
    textarea.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!this.commitButton.disabled) this.commit();
      }
    });
    writingBody.append(textarea);
    paper.append(storyBackdrop, topline, writingBody);
    this.root.appendChild(paper);
    window.setTimeout(() => textarea.focus(), 0);
  }

  private commit(): void {
    if (this.saving || !this.dialogue.trim()) return;
    const id = this.picker.selectedSpeakerId();
    const speaker = this.picker.selected();
    if (id !== "meggy" && speaker?.id !== id) {
      new Notice("Konuşmacı yükleniyor. Birazdan tekrar dene.", 3500);
      return;
    }
    this.saving = true;
    this.commitButton.disabled = true;
    try {
      const result = this.generateScene.execute(this.dialogue, speaker);
      this.onCommit(result.markdown, result.d240Roll);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error), 6000);
    } finally {
      this.saving = false;
      if (this.commitButton.isConnected) this.commitButton.disabled = !this.dialogue.trim();
    }
  }
}
