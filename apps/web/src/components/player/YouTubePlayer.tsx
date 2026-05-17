"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import YouTube, { type YouTubeEvent, type YouTubePlayer as YT } from "react-youtube";

export interface PlayerHandle {
  play(): void;
  pause(): void;
  seekTo(t: number): void;
  getCurrentTime(): number;
  isBuffering(): boolean;
  isPaused(): boolean;
}

interface Props {
  videoId: string;
  // Called once the YT player is ready to receive imperative commands.
  onReady?: () => void;
  // Called when local user-driven state changes (host only — wired in RoomShell).
  onUserPlay?: (t: number) => void;
  onUserPause?: (t: number) => void;
  // Whether to disable host-style click-to-pause behavior (guests).
  interactive: boolean;
  // Start muted (browser autoplay requirement for guests).
  startMuted: boolean;
}

const YouTubePlayer = forwardRef<PlayerHandle, Props>(function YouTubePlayer(
  { videoId, onReady, onUserPlay, onUserPause, interactive, startMuted },
  ref
) {
  const playerRef = useRef<YT | null>(null);
  const lastStateRef = useRef<number>(-1);
  const [muted, setMuted] = useState(startMuted);

  useImperativeHandle(ref, () => ({
    play() {
      playerRef.current?.playVideo();
    },
    pause() {
      playerRef.current?.pauseVideo();
    },
    seekTo(t: number) {
      playerRef.current?.seekTo(t, true);
    },
    getCurrentTime() {
      try {
        return playerRef.current?.getCurrentTime() ?? 0;
      } catch {
        return 0;
      }
    },
    isBuffering() {
      // YT.PlayerState.BUFFERING === 3
      return lastStateRef.current === 3;
    },
    isPaused() {
      // PAUSED === 2, ENDED === 0, UNSTARTED === -1, CUED === 5
      const s = lastStateRef.current;
      return s === 2 || s === 0 || s === -1 || s === 5;
    }
  }));

  function handleReady(e: YouTubeEvent) {
    playerRef.current = e.target;
    if (startMuted) e.target.mute();
    onReady?.();
  }

  function handleStateChange(e: YouTubeEvent) {
    const s = e.data;
    lastStateRef.current = s;
    if (!interactive) return;
    // 1 = PLAYING, 2 = PAUSED
    const t = (() => {
      try {
        return e.target.getCurrentTime();
      } catch {
        return 0;
      }
    })();
    if (s === 1) onUserPlay?.(t);
    if (s === 2) onUserPause?.(t);
  }

  function toggleMute() {
    if (!playerRef.current) return;
    if (muted) {
      playerRef.current.unMute();
      setMuted(false);
    } else {
      playerRef.current.mute();
      setMuted(true);
    }
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      <YouTube
        videoId={videoId}
        className="absolute inset-0 w-full h-full"
        iframeClassName="w-full h-full"
        opts={{
          playerVars: {
            autoplay: 0,
            controls: interactive ? 1 : 0,
            disablekb: interactive ? 0 : 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            mute: startMuted ? 1 : 0
          }
        }}
        onReady={handleReady}
        onStateChange={handleStateChange}
      />
      {/* Guest click-shield: blocks clicks/keys reaching the iframe so users can't desync. */}
      {!interactive && (
        <div
          className="absolute inset-0 cursor-not-allowed"
          aria-hidden
          onClick={(e) => e.preventDefault()}
        />
      )}
      <button
        type="button"
        onClick={toggleMute}
        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-sm border border-neutral-700"
      >
        {muted ? "Unmute" : "Mute"}
      </button>
    </div>
  );
});

export default YouTubePlayer;
