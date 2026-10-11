import { StudioDatabaseState } from "../../domain/studio/StudioModels";

/** Port contract: storage encoding is an implementation detail, not a repository dependency. */
export interface StudioStateCodec {
  createEmptyDatabase(): Uint8Array;
  readState(database: Uint8Array): StudioDatabaseState;
  writeState(database: Uint8Array, state: StudioDatabaseState): Uint8Array;
}
