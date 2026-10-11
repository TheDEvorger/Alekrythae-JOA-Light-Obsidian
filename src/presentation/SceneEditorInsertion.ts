import { Editor, EditorPosition } from "obsidian";

/** The only presentation boundary allowed to insert generated Markdown. */
export class SceneEditorInsertion {
  private position: EditorPosition;

  constructor(
    private readonly editor: Editor,
    initial: EditorPosition,
    private readonly onPosition: (position: EditorPosition, closing: boolean) => void
  ) {
    this.position = { line: initial.line, ch: initial.ch };
  }

  insert(markdown: string): void {
    // One empty line after each insertion. Keep the original note text untouched.
    // If F3 was opened inside a paragraph, separate the speaker from existing text.
    const prefix = this.position.ch > 0 ? "\n\n" : "";
    const insertion = prefix + markdown.replace(/\n+$/u, "") + "\n\n";
    this.editor.replaceRange(insertion, this.position);
    this.position = this.advance(this.position, insertion);
    this.editor.setCursor?.(this.position);
    this.onPosition(this.position, false);
  }

  finish(): void { this.onPosition(this.position, true); }

  private advance(start: EditorPosition, markdown: string): EditorPosition {
    const lines = markdown.split("\n");
    return lines.length === 1
      ? { line: start.line, ch: start.ch + lines[0].length }
      : { line: start.line + lines.length - 1, ch: lines[lines.length - 1].length };
  }
}
