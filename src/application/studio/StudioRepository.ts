import { SpeakerDirectory } from "./SpeakerDirectory";
export type { SpeakerOption } from "./SpeakerDirectory";
import { EntityKind, LifeStatus, MainCharacterCard, RosterEntity } from "../../domain/studio/StudioModels";

export interface RosterListItem {
  id: string;
  source: "main-character" | "roster";
  kind: "main-character" | EntityKind;
  name: string;
  title?: string;
  firstName: string;
  lastName: string;
  lifeStatus: LifeStatus;
  portraitPath?: string;
}

export interface StudioRepository extends SpeakerDirectory {
  initialize(): Promise<void>;
  listMainCharacters(): Promise<MainCharacterCard[]>;
  createMainCharacter(): Promise<MainCharacterCard>;
  updateMainCharacter(id: string, patch: Partial<Pick<MainCharacterCard, "title" | "firstName" | "lastName" | "inventoryText" | "lifeStatus" | "portraitPath">>): Promise<MainCharacterCard>;
  deleteMainCharacter(id: string): Promise<void>;
  listRoster(status: LifeStatus): Promise<RosterListItem[]>;
  createRosterEntity(kind: EntityKind): Promise<RosterEntity>;
  updateRosterEntity(id: string, patch: Partial<Pick<RosterEntity, "title" | "firstName" | "lastName" | "lifeStatus" | "kind" | "portraitPath">>): Promise<RosterEntity>;
  deleteRosterEntity(id: string): Promise<void>;
}
