export interface IdSource {
  next(prefix: string): string;
}
