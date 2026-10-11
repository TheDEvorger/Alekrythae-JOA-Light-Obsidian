// Kanondaki tek ad-soyad ayıracı. Görsel bir portre/baş harf değil.
export const NAME_SEPARATOR = "⟡" as const;

export type LifeStatus = "living" | "dead";
export type EntityKind = "npc" | "vehicle" | "other" | "place";

export interface MainCharacterCard {
  id: string;
  /** Optional honorific. Older SQLite records without this field remain valid. */
  title?: string;
  firstName: string;
  lastName: string;
  inventoryText: string;
  lifeStatus: LifeStatus;
  portraitPath?: string;
}

export interface RosterEntity {
  id: string;
  kind: EntityKind;
  /** Optional role/designation of NPC, vehicle, place or other roster entries. */
  title?: string;
  firstName: string;
  lastName: string;
  lifeStatus: LifeStatus;
  portraitPath?: string;
}

export interface StudioDatabaseState {
  version: 2;
  mainCharacters: Record<string, MainCharacterCard>;
  roster: Record<string, RosterEntity>;
}

export function emptyStudioDatabaseState(): StudioDatabaseState {
  return {
    version: 2,
    mainCharacters: {},
    roster: {}
  };
}

export function displayName(value: Pick<MainCharacterCard, "firstName" | "lastName"> & { title?: string }): string {
  const first = value.firstName.trim();
  const last = value.lastName.trim();
  const name = first && last ? `${first} ${NAME_SEPARATOR} ${last}` : first || last;
  const title = value.title?.trim();
  return title ? (name ? `${title} - ${name}` : title) : name;
}
