"use client";

import { forwardRef } from "react";
import YouTubePlayer from "./YouTubePlayer";
import Mp4Player from "./Mp4Player";
import { getSource } from "@/lib/sources";
import type { PlayerHandle } from "./PlayerHandle";
import type { VideoProvider } from "@/types/events";

interface Props {
  videoProvider: VideoProvider;
  videoUrl: string;
  isHost: boolean;
  startMuted: boolean;
  onReady?: () => void;
  onUserPlay?: (t: number) => void;
  onUserPause?: (t: number) => void;
}

const RoomPlayer = forwardRef<PlayerHandle, Props>(function RoomPlayer(
  { videoProvider, videoUrl, isHost, startMuted, onReady, onUserPlay, onUserPause },
  ref
) {
  if (videoProvider === "youtube") {
    return (
      <YouTubePlayer
        ref={ref}
        videoId={videoUrl}
        interactive={isHost}
        startMuted={startMuted}
        onReady={onReady}
        onUserPlay={onUserPlay}
        onUserPause={onUserPause}
      />
    );
  }
  if (videoProvider === "mp4") {
    return (
      <Mp4Player
        ref={ref}
        src={videoUrl}
        interactive={isHost}
        startMuted={startMuted}
        onReady={onReady}
        onUserPlay={onUserPlay}
        onUserPause={onUserPause}
      />
    );
  }

  // Homepage sources ("none") never reach here — RoomShell renders the screen-share
  // gate for them. This is the fallback for an unknown / unconfigured provider.
  const source = getSource(videoProvider);
  return (
    <div className="w-full aspect-video bg-black rounded-xl grid place-items-center text-center px-6">
      <div>
        <div className="text-ink-secondary">
          {source?.label ?? videoProvider} can&apos;t be played in-app yet.
        </div>
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-purple hover:underline break-all"
          >
            Open the link in a new tab ↗
          </a>
        )}
      </div>
    </div>
  );
});

export default RoomPlayer;
