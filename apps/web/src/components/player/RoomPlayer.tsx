"use client";

import { forwardRef } from "react";
import YouTubePlayer, { type PlayerHandle } from "./YouTubePlayer";
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
  return (
    <div className="w-full aspect-video bg-black rounded-xl grid place-items-center text-neutral-500">
      {videoProvider} player coming in a later checkpoint.
    </div>
  );
});

export default RoomPlayer;
