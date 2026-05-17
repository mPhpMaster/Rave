"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  stream: MediaStream;
  // The host's local preview is muted by default to avoid feedback.
  mutedDefault: boolean;
  label?: string;
}

export default function ScreenShareView({ stream, mutedDefault, label }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(mutedDefault);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    el.play().catch(() => {});
    return () => {
      if (el.srcObject === stream) el.srcObject = null;
    };
  }, [stream]);

  function toggleMute() {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-brand/40">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={mutedDefault}
        className="absolute inset-0 w-full h-full object-contain"
      />
      {label && (
        <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 text-xs">
          {label}
        </div>
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
}
