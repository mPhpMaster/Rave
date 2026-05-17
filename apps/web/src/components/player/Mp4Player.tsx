"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { PlayerHandle } from "./PlayerHandle";

interface Props {
  src: string;
  interactive: boolean;
  startMuted: boolean;
  onReady?: () => void;
  onUserPlay?: (t: number) => void;
  onUserPause?: (t: number) => void;
}

const Mp4Player = forwardRef<PlayerHandle, Props>(function Mp4Player(
  { src, interactive, startMuted, onReady, onUserPlay, onUserPause },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const bufferingRef = useRef(false);
  const [muted, setMuted] = useState(startMuted);
  const readyFiredRef = useRef(false);

  useImperativeHandle(ref, () => ({
    play() {
      videoRef.current?.play().catch(() => {});
    },
    pause() {
      videoRef.current?.pause();
    },
    seekTo(t: number) {
      const el = videoRef.current;
      if (!el) return;
      try {
        el.currentTime = t;
      } catch {
        // Some browsers throw on seek-before-metadata-load.
      }
    },
    getCurrentTime() {
      return videoRef.current?.currentTime ?? 0;
    },
    isBuffering() {
      return bufferingRef.current;
    },
    isPaused() {
      return videoRef.current?.paused ?? true;
    }
  }));

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onLoadedMetadata = () => {
      if (readyFiredRef.current) return;
      readyFiredRef.current = true;
      onReady?.();
    };
    const onWaiting = () => {
      bufferingRef.current = true;
    };
    const onPlaying = () => {
      bufferingRef.current = false;
    };
    const onCanPlay = () => {
      bufferingRef.current = false;
    };
    const onPlay = () => {
      if (interactive) onUserPlay?.(el.currentTime);
    };
    const onPause = () => {
      if (interactive) onUserPause?.(el.currentTime);
    };

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [interactive, onReady, onUserPlay, onUserPause]);

  function toggleMute() {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        src={src}
        muted={startMuted}
        playsInline
        controls={interactive}
        className="absolute inset-0 w-full h-full"
      />
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

export default Mp4Player;
