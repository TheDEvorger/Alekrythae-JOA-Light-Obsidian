export interface BackgroundImages {
  save(file: File): Promise<string>;
  resource(path: string): Promise<string | undefined>;
  storyResource(): Promise<string | undefined>;
  release(): void;
}
