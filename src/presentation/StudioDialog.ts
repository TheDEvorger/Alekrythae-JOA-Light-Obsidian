import { NAME_SEPARATOR } from "../domain/studio/StudioModels";
import { FANTASY_EMOJI } from "../domain/shared/FantasyEmojiCatalog";

export type DialogTone = "danger" | "neutral";
export interface NameParts { firstName: string; lastName: string; title?: string; }

/** Workbench-owned styled dialogs: accessible confirmation, alerts and name editing. */
export class StudioDialog {
  constructor(private readonly host: HTMLElement) {}

  confirm(options: {
    title: string;
    message: string;
    confirmLabel: string;
    tone?: DialogTone;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      const ui = this.openFrame(options.title, options.message, options.tone ?? "neutral");
      const cancel = this.button("Vazgeç", "joa-dialog-cancel");
      const confirm = this.button(options.confirmLabel, options.tone === "danger" ? "joa-dialog-danger" : "joa-dialog-primary");
      const done = (value: boolean) => { ui.close(); resolve(value); };
      cancel.addEventListener("click", () => done(false));
      confirm.addEventListener("click", () => done(true));
      ui.backdrop.addEventListener("joa-cancel", () => done(false), { once: true });
      ui.actions.append(cancel, confirm);
      cancel.focus();
    });
  }

  editName(initial: NameParts, title = "İsmi düzenle"): Promise<NameParts | null> {
    return new Promise((resolve) => {
      const hasTitle = initial.title !== undefined;
      const ui = this.openFrame(title, hasTitle ? `Ünvan - Ad ${NAME_SEPARATOR} Soyad` : `Ad ${NAME_SEPARATOR} Soyad`, "neutral");
      const names = document.createElement("div");
      names.className = `joa-dialog-name-fields${hasTitle ? " joa-dialog-name-fields-with-title" : ""}`;
      const titleField = hasTitle ? this.nameField("Ünvan (isteğe bağlı)", initial.title ?? "") : undefined;
      const firstName = this.nameField("Ad", initial.firstName);
      const lastName = this.nameField("Soyad (isteğe bağlı)", initial.lastName);
      const separator = document.createElement("span");
      separator.className = "joa-dialog-separator";
      separator.textContent = NAME_SEPARATOR;
      if (titleField) {
        const colon = document.createElement("span");
        colon.className = "joa-dialog-separator joa-dialog-title-separator";
        colon.textContent = "-";
        names.append(titleField.wrapper, colon);
      }
      names.append(firstName.wrapper, separator, lastName.wrapper);
      ui.actions.before(names);
      const error = document.createElement("div");
      error.className = "joa-dialog-validation";
      error.setAttribute("role", "status");
      names.after(error);
      const cancel = this.button("Vazgeç", "joa-dialog-cancel");
      const save = this.button("İsmi değiştir", "joa-dialog-primary");
      const done = (value: NameParts | null) => { ui.close(); resolve(value); };
      cancel.addEventListener("click", () => done(null));
      ui.backdrop.addEventListener("joa-cancel", () => done(null), { once: true });
      const submit = () => {
        const next: NameParts = { firstName: firstName.input.value.trim(), lastName: lastName.input.value.trim() };
        if (titleField) next.title = titleField.input.value.trim();
        if (!next.firstName && !next.lastName) {
          error.textContent = "Ad veya soyaddan en az birini yaz.";
          firstName.input.focus();
          return;
        }
        done(next);
      };
      save.addEventListener("click", submit);
      for (const input of [titleField?.input, firstName.input, lastName.input].filter((field): field is HTMLInputElement => !!field)) {
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") { event.preventDefault(); submit(); }
        });
      }
      ui.actions.append(cancel, save);
      firstName.input.focus();
      firstName.input.select();
    });
  }

  alert(title: string, message: string): Promise<void> {
    return new Promise((resolve) => {
      const ui = this.openFrame(title, message, "danger");
      const ok = this.button(`${FANTASY_EMOJI.gem} Tamam`, "joa-dialog-primary");
      const done = () => { ui.close(); resolve(); };
      ok.addEventListener("click", done);
      ui.backdrop.addEventListener("joa-cancel", done, { once: true });
      ui.actions.appendChild(ok);
      ok.focus();
    });
  }

  private nameField(label: string, value: string): { wrapper: HTMLLabelElement; input: HTMLInputElement } {
    const wrapper = document.createElement("label");
    wrapper.className = "joa-dialog-name-field";
    const caption = document.createElement("span");
    caption.textContent = label;
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 80;
    input.value = value;
    wrapper.append(caption, input);
    return { wrapper, input };
  }

  private button(label: string, className: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    return button;
  }

  private openFrame(title: string, description: string, tone: DialogTone): {
    backdrop: HTMLElement;
    actions: HTMLElement;
    close: () => void;
  } {
    const backdrop = document.createElement("div");
    backdrop.className = "joa-dialog-backdrop";
    const dialog = document.createElement("section");
    dialog.className = `joa-dialog joa-dialog-${tone}`;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    const heading = document.createElement("h3");
    heading.className = "joa-dialog-heading";
    heading.textContent = title;
    dialog.setAttribute("aria-label", title);
    const body = document.createElement("p");
    body.className = "joa-dialog-description";
    body.textContent = description;
    const actions = document.createElement("div");
    actions.className = "joa-dialog-actions";
    dialog.append(heading, body, actions);
    backdrop.appendChild(dialog);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const close = () => {
      backdrop.remove();
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) backdrop.dispatchEvent(new Event("joa-cancel"));
    });
    backdrop.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        backdrop.dispatchEvent(new Event("joa-cancel"));
      }
      if (event.key === "Tab") {
        const controls = Array.from(dialog.querySelectorAll<HTMLElement>("input, button"));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    this.host.appendChild(backdrop);
    return { backdrop, actions, close };
  }
}
