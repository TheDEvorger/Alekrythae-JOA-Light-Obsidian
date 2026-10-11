/** Contract ensures the UI cannot access audio files directly. */
export interface VoicePlayer {
  playD240(roll: number): Promise<void>;
}
