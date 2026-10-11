/** Port shared by visual preferences and cursor positions; avoids infrastructure coupling. */
export interface SettingsStateStore {
  read(): Promise<Record<string, unknown>>;
  update(mutate: (prior: Record<string, unknown>) => Record<string, unknown>): Promise<void>;
}
