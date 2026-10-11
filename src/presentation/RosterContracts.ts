import { RosterListItem } from "../application/studio/StudioRepository";
import { EntityKind, LifeStatus, MainCharacterCard, RosterEntity } from "../domain/studio/StudioModels";

/** Only the roster operations that this screen is allowed to invoke. */
export interface RosterPanelPort {
  listRoster(status: LifeStatus): Promise<RosterListItem[]>;
  createRosterEntity(kind: EntityKind): Promise<RosterEntity>;
  updateRosterEntity(id: string, patch: Partial<Pick<RosterEntity, "title" | "firstName" | "lastName" | "lifeStatus" | "kind" | "portraitPath">>): Promise<RosterEntity>;
  updateMainCharacter(id: string, patch: Partial<Pick<MainCharacterCard, "title" | "firstName" | "lastName" | "lifeStatus" | "portraitPath">>): Promise<MainCharacterCard>;
  deleteMainCharacter(id: string): Promise<void>;
  deleteRosterEntity(id: string): Promise<void>;
}
