export interface PlayerHandle {
  play(): void;
  pause(): void;
  seekTo(t: number): void;
  getCurrentTime(): number;
  isBuffering(): boolean;
  isPaused(): boolean;
}
