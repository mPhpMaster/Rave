"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant
} from "@livekit/components-react";
import "@livekit/components-styles";
import { createClient } from "@/lib/supabase/client";

interface Props {
  roomId: string;
  socketUrl: string;
  liveKitUrl: string;
}

export default function VoicePanel({ roomId, socketUrl, liveKitUrl }: Props) {
  const supabase = createClient();
  const [token, setToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftIntentionally, setLeftIntentionally] = useState(false);

  async function joinVoice() {
    setConnecting(true);
    setError(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Not signed in.");
        return;
      }
      const res = await fetch(`${socketUrl}/livekit-token`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ roomId })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Error ${res.status}`);
        return;
      }
      const { token } = (await res.json()) as { token: string };
      setToken(token);
      setLeftIntentionally(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join voice.");
    } finally {
      setConnecting(false);
    }
  }

  function leaveVoice() {
    setLeftIntentionally(true);
    setToken(null);
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="text-sm font-semibold mb-2">Voice</div>
        <button
          type="button"
          disabled={connecting}
          onClick={() => void joinVoice()}
          className="w-full px-3 py-2 rounded-lg bg-brand hover:bg-brand-dark font-medium text-sm disabled:opacity-50"
        >
          {connecting ? "Joining…" : leftIntentionally ? "Rejoin voice" : "Join voice"}
        </button>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={liveKitUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={() => setToken(null)}
      onError={(e) => setError(e.message)}
      data-lk-theme="default"
    >
      <RoomAudioRenderer />
      <VoiceRoomBody onLeave={leaveVoice} />
    </LiveKitRoom>
  );
}

function VoiceRoomBody({ onLeave }: { onLeave: () => void }) {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  async function toggleMute() {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">
          Voice <span className="text-neutral-500 font-normal">· {participants.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleMute()}
            className={
              "px-2.5 py-1 rounded-lg text-xs font-medium " +
              (isMicrophoneEnabled
                ? "bg-neutral-800 hover:bg-neutral-700"
                : "bg-red-500/80 hover:bg-red-500")
            }
          >
            {isMicrophoneEnabled ? "Mute" : "Unmute"}
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs"
          >
            Leave
          </button>
        </div>
      </div>
      <ul className="space-y-1">
        {participants.map((p) => (
          <ParticipantRow key={p.sid} participant={p} />
        ))}
      </ul>
    </div>
  );
}

import type { Participant } from "livekit-client";
import { useIsSpeaking } from "@livekit/components-react";

function ParticipantRow({ participant }: { participant: Participant }) {
  const isSpeaking = useIsSpeaking(participant);
  const micOn = participant.isMicrophoneEnabled;
  return (
    <li className="flex items-center justify-between text-sm px-2 py-1.5 rounded">
      <span
        className={
          "truncate " + (isSpeaking ? "text-emerald-300 font-medium" : "text-neutral-200")
        }
      >
        {participant.name || participant.identity}
      </span>
      <span className={"text-xs " + (micOn ? "text-neutral-400" : "text-red-400")}>
        {micOn ? (isSpeaking ? "speaking" : "live") : "muted"}
      </span>
    </li>
  );
}
