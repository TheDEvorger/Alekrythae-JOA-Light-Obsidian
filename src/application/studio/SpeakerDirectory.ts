/** Read-only port: name rendering must not depend on storage mutation capabilities. */
export interface SpeakerOption {
  id: string;
  kind: "main" | "npc" | "vehicle" | "other" | "place";
  name: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  portraitPath?: string;
}

export interface SpeakerDirectory {
  listSpeakers(): Promise<SpeakerOption[]>;
}
