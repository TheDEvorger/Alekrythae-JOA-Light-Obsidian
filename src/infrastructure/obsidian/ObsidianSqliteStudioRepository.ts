import { DataAdapter } from "obsidian";
import { ObsidianStudioFileGateway } from "./ObsidianStudioFileGateway";
export { STUDIO_DATABASE_PATH } from "./ObsidianStudioFileGateway";
import { RosterListItem, SpeakerOption, StudioRepository } from "../../application/studio/StudioRepository";
import { EntityKind, LifeStatus, MainCharacterCard, RosterEntity, displayName } from "../../domain/studio/StudioModels";
import { StudioStateService } from "../../domain/studio/StudioStateService";
import { IdSource } from "../../domain/shared/IdSource";
import { StudioStateCodec } from "../../application/studio/StudioStateCodec";
import { StudioDatabaseState } from "../../domain/studio/StudioModels";

export class ObsidianSqliteStudioRepository implements StudioRepository {
  private queue: Promise<unknown> = Promise.resolve();
  private readonly files: ObsidianStudioFileGateway;

  constructor(
    adapter: DataAdapter,
    private readonly codec: StudioStateCodec,
    private readonly state: StudioStateService,
    private readonly ids: IdSource,
    private readonly onChange?: () => void
  ) {
    this.files = new ObsidianStudioFileGateway(adapter);
  }

  async initialize(): Promise<void> {
    await this.files.ensureExists(this.codec.createEmptyDatabase());
    // Validate the persisted state while keeping its existing file path.
    const database = await this.files.read();
    this.codec.readState(database);
  }

  async listSpeakers(): Promise<SpeakerOption[]> {
    const state = await this.readState();
    const mains: SpeakerOption[] = Object.values(state.mainCharacters)
      .filter((c) => !!displayName(c))
      .map((c) => ({ id: c.id, kind: "main", name: displayName(c), title: c.title ?? "", firstName: c.firstName, lastName: c.lastName, portraitPath: c.portraitPath }));
    const others: SpeakerOption[] = Object.values(state.roster)
      .filter((c) => !!displayName(c))
      .map((c) => ({ id: c.id, kind: c.kind, name: displayName(c), title: c.title ?? "", firstName: c.firstName, lastName: c.lastName, portraitPath: c.portraitPath }));
    return [...mains, ...others].sort((a,b) => a.name.localeCompare(b.name, "tr"));
  }

  async listMainCharacters(): Promise<MainCharacterCard[]> {
    return this.state.listMainCharacters(await this.readState());
  }

  createMainCharacter(): Promise<MainCharacterCard> {
    return this.mutate((state) => this.state.createMainCharacter(state, this.ids.next("CHR")));
  }

  updateMainCharacter(id: string, patch: Partial<Pick<MainCharacterCard, "title" | "firstName" | "lastName" | "inventoryText" | "lifeStatus" | "portraitPath">>): Promise<MainCharacterCard> {
    return this.mutate((state) => this.state.updateMainCharacter(state, id, patch));
  }

  deleteMainCharacter(id: string): Promise<void> {
    return this.mutate((state) => this.state.deleteMainCharacter(state, id));
  }

  async listRoster(status: LifeStatus): Promise<RosterListItem[]> {
    return this.state.listRoster(await this.readState(), status);
  }

  createRosterEntity(kind: EntityKind): Promise<RosterEntity> {
    return this.mutate((state) => this.state.createRosterEntity(state, this.ids.next("ENT"), kind));
  }

  updateRosterEntity(id: string, patch: Partial<Pick<RosterEntity, "title" | "firstName" | "lastName" | "lifeStatus" | "kind" | "portraitPath">>): Promise<RosterEntity> {
    return this.mutate((state) => this.state.updateRosterEntity(state, id, patch));
  }

  deleteRosterEntity(id: string): Promise<void> {
    return this.mutate((state) => this.state.deleteRosterEntity(state, id));
  }

  private async readState(): Promise<StudioDatabaseState> {
    // Read-your-writes: a tab cannot see stale state while an edit is saving.
    await this.queue;
    return this.codec.readState(await this.files.read());
  }

  private mutate<T>(operation: (state: StudioDatabaseState) => T): Promise<T> {
    const job = this.queue.then(async () => {
      const database = await this.files.read();
      const state = this.codec.readState(database);
      const result = operation(state);
      await this.files.write(this.codec.writeState(database, state));
      this.onChange?.();
      return result;
    });
    this.queue = job.then(() => undefined, () => undefined);
    return job;
  }

}
