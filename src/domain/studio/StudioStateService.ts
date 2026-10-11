import {
  EntityKind,
  LifeStatus,
  MainCharacterCard,
  RosterEntity,
  StudioDatabaseState,
  displayName
} from "./StudioModels";

export class StudioStateService {
  listMainCharacters(state: StudioDatabaseState): MainCharacterCard[] {
    return Object.values(state.mainCharacters)
      .map((item) => ({ ...item }))
      .sort((a, b) => displayName(a).localeCompare(displayName(b), "tr"));
  }

  createMainCharacter(state: StudioDatabaseState, id: string): MainCharacterCard {
    const card: MainCharacterCard = {
      id: this.requireId(id),
      title: "",
      firstName: "",
      lastName: "",
      inventoryText: "",
      lifeStatus: "living"
    };
    state.mainCharacters[card.id] = card;
    return { ...card };
  }

  updateMainCharacter(
    state: StudioDatabaseState,
    id: string,
    patch: Partial<Pick<MainCharacterCard, "title" | "firstName" | "lastName" | "inventoryText" | "lifeStatus" | "portraitPath">>
  ): MainCharacterCard {
    const current = state.mainCharacters[id];
    if (!current) throw new Error("Ana karakter bulunamadı.");
    if (patch.title !== undefined) current.title = this.cleanNamePart(patch.title);
    if (patch.firstName !== undefined) current.firstName = this.cleanNamePart(patch.firstName);
    if (patch.lastName !== undefined) current.lastName = this.cleanNamePart(patch.lastName);
    if (patch.inventoryText !== undefined) current.inventoryText = String(patch.inventoryText).slice(0, 24000);
    if (patch.lifeStatus !== undefined) current.lifeStatus = this.requireStatus(patch.lifeStatus);
    if (patch.portraitPath !== undefined) current.portraitPath = this.safePortrait(patch.portraitPath);
    return { ...current };
  }

  deleteMainCharacter(state: StudioDatabaseState, id: string): void {
    if (!state.mainCharacters[id]) throw new Error("Silinecek ana karakter bulunamadı.");
    delete state.mainCharacters[id];
  }

  listRoster(state: StudioDatabaseState, status: LifeStatus): Array<{
    id: string;
    source: "main-character" | "roster";
    kind: "main-character" | EntityKind;
    name: string;
    title?: string;
    firstName: string;
    lastName: string;
    lifeStatus: LifeStatus;
  }> {
    const mains = Object.values(state.mainCharacters).map((card) => ({
      id: card.id,
      source: "main-character" as const,
      kind: "main-character" as const,
      name: displayName(card) || "İsimsiz ana karakter",
      title: card.title ?? "",
      firstName: card.firstName,
      lastName: card.lastName,
      lifeStatus: card.lifeStatus,
      portraitPath: card.portraitPath
    }));
    const others = Object.values(state.roster).map((entity) => ({
      id: entity.id,
      source: "roster" as const,
      kind: entity.kind,
      name: displayName(entity) || "İsimsiz kayıt",
      title: entity.title ?? "",
      firstName: entity.firstName,
      lastName: entity.lastName,
      lifeStatus: entity.lifeStatus,
      portraitPath: entity.portraitPath
    }));
    return [...mains, ...others]
      .filter((entry) => entry.lifeStatus === status)
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }

  createRosterEntity(state: StudioDatabaseState, id: string, kind: EntityKind): RosterEntity {
    const entity: RosterEntity = {
      id: this.requireId(id),
      kind,
      title: "",
      firstName: kind === "vehicle" ? "Yeni Araç" : kind === "place" ? "Yeni Mekan" : "Yeni",
      lastName: kind === "vehicle" || kind === "place" ? "" : kind === "npc" ? "NPC" : "Kayıt",
      lifeStatus: "living"
    };
    state.roster[entity.id] = entity;
    return { ...entity };
  }

  updateRosterEntity(
    state: StudioDatabaseState,
    id: string,
    patch: Partial<Pick<RosterEntity, "title" | "firstName" | "lastName" | "lifeStatus" | "kind" | "portraitPath">>
  ): RosterEntity {
    const current = state.roster[id];
    if (!current) throw new Error("Kayıt bulunamadı.");
    if (patch.title !== undefined) current.title = this.cleanNamePart(patch.title);
    if (patch.firstName !== undefined) current.firstName = this.cleanNamePart(patch.firstName);
    if (patch.lastName !== undefined) current.lastName = this.cleanNamePart(patch.lastName);
    if (patch.lifeStatus !== undefined) current.lifeStatus = this.requireStatus(patch.lifeStatus);
    if (patch.portraitPath !== undefined) current.portraitPath = this.safePortrait(patch.portraitPath);
    if (patch.kind !== undefined) current.kind = patch.kind;
    return { ...current };
  }

  deleteRosterEntity(state: StudioDatabaseState, id: string): void {
    if (!state.roster[id]) throw new Error("Silinecek kayıt bulunamadı.");
    delete state.roster[id];
  }

  private safePortrait(value: string): string {
    const path = String(value);
    if (!/^\.obsidian\/plugins\/joa-frp-writer\/art\/[a-zA-Z0-9_-]+\.webp$/.test(path)) throw new Error("Portre yolu geçersiz.");
    return path;
  }

  private cleanNamePart(value: string): string {
    return String(value).replace(/\s+/gu, " ").trim().slice(0, 80);
  }

  private requireStatus(value: LifeStatus): LifeStatus {
    if (value !== "living" && value !== "dead") throw new Error("Geçersiz yaşam durumu.");
    return value;
  }

  private requireId(value: string): string {
    const clean = String(value).trim();
    if (!clean) throw new Error("Kimlik boş olamaz.");
    return clean;
  }
}
