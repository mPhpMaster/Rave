"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useScreenShareHost } from "@/hooks/useScreenShareHost";
import { useScreenShareViewer } from "@/hooks/useScreenShareViewer";
import RoomPlayer from "@/components/player/RoomPlayer";
import type { PlayerHandle } from "@/components/player/PlayerHandle";
import { getSource } from "@/lib/sources";
import MemberList from "./MemberList";
import ChatPanel from "./ChatPanel";
import InviteButton from "./InviteButton";
import ScreenShareView from "./ScreenShareView";
import HomepageShareGate from "./HomepageShareGate";
import VoicePanel from "./VoicePanel";
import type {
  ChatMessage,
  RoomMember,
  RoomSnapshot,
  PlaybackState,
  VideoProvider
} from "@/types/events";

interface RoomProp {
  id: string;
  name: string;
  hostId: string;
  videoProvider: VideoProvider;
  videoUrl: string;
  inviteCode: string;
}

interface Props {
  room: RoomProp;
  currentUserId: string;
  accessToken: string | null;
  socketUrl: string;
  liveKitUrl: string;
}

const SYNC_INTERVAL_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 2000;
const DRIFT_THRESHOLD_S = 0.5;

export default function RoomShell({
  room,
  currentUserId,
  accessToken,
  socketUrl,
  liveKitUrl
}: Props) {
  const isHost = room.hostId === currentUserId;
  // Homepage sources (Twitch, Netflix, X, …) can't be framed; they're watched
  // via the host's screen share instead of an in-app player.
  const source = getSource(room.videoProvider);
  const isHomepageSource = source?.input === "none";
  const sourceLabel = source?.label ?? room.videoProvider;
  const { socket, connected } = useSocket(socketUrl, accessToken);
  const playerRef = useRef<PlayerHandle>(null);

  const [members, setMembers] = useState<RoomMember[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(
    // The SSR-passed value (YouTube id, Vimeo id, embed token, reference URL) is
    // usable immediately. Only MP4 needs the signed URL from the room:snapshot —
    // render nothing for it until that arrives.
    room.videoProvider === "mp4" ? null : room.videoUrl
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const typingTimersRef = useRef<Map<string, number>>(new Map());

  // Latest authoritative state from the server (used by guests for reconciliation).
  const remoteRef = useRef<PlaybackState | null>(null);
  const lastAppliedTsRef = useRef<number>(0);

  // 1. Join the room when the socket connects.
  useEffect(() => {
    if (!socket || !connected) return;
    socket.emit("room:join", { roomId: room.id }, (resp) => {
      if ("error" in resp) {
        setJoinError(resp.error);
        return;
      }
      handleSnapshot(resp);
    });
    return () => {
      socket.emit("room:leave", { roomId: room.id });
    };
  }, [socket, connected, room.id]);

  function handleSnapshot(snap: RoomSnapshot) {
    setMembers(snap.members);
    setMessages(snap.recentMessages ?? []);
    if (snap.videoUrl) setResolvedVideoUrl(snap.videoUrl);
    remoteRef.current = snap.playback;
    lastAppliedTsRef.current = snap.playback.serverTs;
    setJoined(true);
  }

  // 2. Server-broadcast playback + presence events.
  useEffect(() => {
    if (!socket) return;
    const onUserJoined = (m: RoomMember) =>
      setMembers((prev) => (prev.some((x) => x.userId === m.userId) ? prev : [...prev, m]));
    const onUserLeft = ({ userId }: { userId: string }) =>
      setMembers((prev) => prev.filter((x) => x.userId !== userId));

    const apply = (next: PlaybackState) => {
      // Coalesce stale events (out-of-order by serverTs).
      if (next.serverTs < lastAppliedTsRef.current) return;
      remoteRef.current = next;
      lastAppliedTsRef.current = next.serverTs;
    };

    const onChatMessage = (msg: ChatMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      // Sender is no longer typing once their message lands.
      setTypingUserIds((prev) => prev.filter((id) => id !== msg.userId));
      const t = typingTimersRef.current.get(msg.userId);
      if (t) {
        window.clearTimeout(t);
        typingTimersRef.current.delete(msg.userId);
      }
    };

    const onChatTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      const timers = typingTimersRef.current;
      const existing = timers.get(userId);
      if (existing) window.clearTimeout(existing);

      if (isTyping) {
        setTypingUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
        // Auto-expire after 3s without a renewal — covers dropped "stop" emits.
        const t = window.setTimeout(() => {
          setTypingUserIds((prev) => prev.filter((id) => id !== userId));
          timers.delete(userId);
        }, 3000);
        timers.set(userId, t);
      } else {
        setTypingUserIds((prev) => prev.filter((id) => id !== userId));
        timers.delete(userId);
      }
    };

    socket.on("user:joined", onUserJoined);
    socket.on("user:left", onUserLeft);
    socket.on("playback:play", ({ t, serverTs }) => apply({ t, paused: false, serverTs }));
    socket.on("playback:pause", ({ t, serverTs }) => apply({ t, paused: true, serverTs }));
    socket.on("playback:seek", ({ t, serverTs }) =>
      apply({ t, paused: remoteRef.current?.paused ?? false, serverTs })
    );
    socket.on("playback:state", apply);
    socket.on("chat:message", onChatMessage);
    socket.on("chat:typing", onChatTyping);

    return () => {
      socket.off("user:joined", onUserJoined);
      socket.off("user:left", onUserLeft);
      socket.off("playback:play");
      socket.off("playback:pause");
      socket.off("playback:seek");
      socket.off("playback:state");
      socket.off("chat:message", onChatMessage);
      socket.off("chat:typing", onChatTyping);
      typingTimersRef.current.forEach((t) => window.clearTimeout(t));
      typingTimersRef.current.clear();
    };
  }, [socket]);

  const sendMessage = useCallback(
    (body: string) => {
      socket?.emit("chat:message", { roomId: room.id, body });
    },
    [socket, room.id]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      socket?.emit("chat:typing", { roomId: room.id, isTyping });
    },
    [socket, room.id]
  );

  const shareHost = useScreenShareHost(socket, room.id, isHost, members, currentUserId);
  const shareViewer = useScreenShareViewer(socket, room.id, room.hostId, isHost);

  // What to show in the main video area: host's local preview while sharing,
  // viewer's remote stream when host is sharing, else the regular RoomPlayer.
  const showHostShareView = isHost && shareHost.sharing && shareHost.stream;
  const showViewerShareView =
    !isHost && shareViewer.sharingActive && shareViewer.remoteStream;

  // 3a. HOST: heartbeat playback state.
  useEffect(() => {
    if (!isHost || !socket || !playerReady) return;
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const t = player.getCurrentTime();
      const paused = player.isPaused();
      socket.emit("playback:state", { roomId: room.id, t, paused });
    }, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isHost, socket, room.id, playerReady]);

  // 3b. GUESTS: drift correction.
  useEffect(() => {
    if (isHost || !playerReady) return;
    const id = window.setInterval(() => {
      const remote = remoteRef.current;
      const player = playerRef.current;
      if (!remote || !player) return;
      if (player.isBuffering()) return; // skip while buffering

      const elapsed = remote.paused ? 0 : (Date.now() - remote.serverTs) / 1000;
      const expected = remote.t + elapsed;
      const local = player.getCurrentTime();
      const drift = Math.abs(local - expected);

      if (remote.paused && !player.isPaused()) player.pause();
      else if (!remote.paused && player.isPaused()) player.play();

      if (drift > DRIFT_THRESHOLD_S) player.seekTo(expected);
    }, SYNC_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isHost, playerReady]);

  // 4. Host emits explicit play/pause when YouTube player fires those state changes.
  const hostHandlers = useMemo(() => {
    if (!isHost) return {};
    return {
      onUserPlay: (t: number) => socket?.emit("playback:play", { roomId: room.id, t }),
      onUserPause: (t: number) => socket?.emit("playback:pause", { roomId: room.id, t })
    };
  }, [isHost, socket, room.id]);

  function handleSeekClick(direction: "back" | "forward") {
    const player = playerRef.current;
    if (!player) return;
    const next = Math.max(0, player.getCurrentTime() + (direction === "forward" ? 10 : -10));
    player.seekTo(next);
    socket?.emit("playback:seek", { roomId: room.id, t: next });
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:h-[calc(100vh-100px)] min-h-0">
      <section className="min-h-0">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{room.name}</h1>
          <span className={`text-xs px-2.5 py-0.5 rounded-pill ${connected ? "bg-success/15 text-success" : "bg-yellow-500/15 text-yellow-300"}`}>
            {connected ? "live" : "connecting…"}
          </span>
          <div className="ml-auto">
            <InviteButton inviteCode={room.inviteCode} />
          </div>
        </div>

        {joinError && (
          <div className="mb-4 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 text-sm">
            Failed to join room: {joinError}
          </div>
        )}

        <div className="rounded-2xl overflow-hidden shadow-elev bg-black">
          {showHostShareView ? (
            <ScreenShareView
              stream={shareHost.stream!}
              mutedDefault
              label={`Sharing screen · ${shareHost.viewerCount} viewer${shareHost.viewerCount === 1 ? "" : "s"}`}
            />
          ) : showViewerShareView ? (
            <ScreenShareView
              stream={shareViewer.remoteStream!}
              mutedDefault={false}
              label="Host is sharing their screen"
            />
          ) : isHomepageSource ? (
            <HomepageShareGate
              label={sourceLabel}
              homepage={resolvedVideoUrl ?? room.videoUrl}
              isHost={isHost}
              onShare={() => void shareHost.start()}
              error={shareHost.error}
            />
          ) : resolvedVideoUrl ? (
            <RoomPlayer
              ref={playerRef}
              videoProvider={room.videoProvider}
              videoUrl={resolvedVideoUrl}
              isHost={isHost}
              startMuted={!isHost}
              onReady={() => setPlayerReady(true)}
              onUserPlay={hostHandlers.onUserPlay}
              onUserPause={hostHandlers.onUserPause}
            />
          ) : (
            <div className="w-full aspect-video grid place-items-center text-ink-muted text-sm">
              Loading video…
            </div>
          )}
        </div>

        {isHost && (
          <div className="mt-4 flex items-center gap-2 text-sm flex-wrap">
            {!isHomepageSource && (
              <>
                <button
                  onClick={() => handleSeekClick("back")}
                  disabled={shareHost.sharing}
                  className="btn-ghost text-sm"
                >
                  − 10s
                </button>
                <button
                  onClick={() => handleSeekClick("forward")}
                  disabled={shareHost.sharing}
                  className="btn-ghost text-sm"
                >
                  + 10s
                </button>
              </>
            )}
            {shareHost.sharing ? (
              <button
                onClick={shareHost.stop}
                className="inline-flex items-center justify-center font-medium text-white px-4 py-2 rounded-pill bg-red-500/80 hover:bg-red-500 transition"
              >
                Stop sharing
              </button>
            ) : (
              <button
                onClick={() => void shareHost.start()}
                className="btn-ghost text-sm"
              >
                Share screen
              </button>
            )}
            {shareHost.error && (
              <span className="text-xs text-red-400">{shareHost.error}</span>
            )}
            <span className="ml-auto text-xs text-ink-muted">
              {shareHost.sharing
                ? "Screen sharing — guests see your screen until you stop."
                : isHomepageSource
                  ? `Share your screen to play ${sourceLabel} for everyone.`
                  : "You are the host. Play / pause / seek to control the room."}
            </span>
          </div>
        )}
        {!isHost && joined && (
          <div className="mt-3 text-xs text-ink-muted">
            {isHomepageSource
              ? `The host shares their screen for ${sourceLabel} — it appears above automatically.`
              : "Playback is controlled by the host. Your player stays in sync automatically."}
          </div>
        )}
      </section>

      <aside className="flex flex-col gap-4 min-h-0 lg:h-full">
        <MemberList members={members} hostId={room.hostId} currentUserId={currentUserId} />
        {liveKitUrl && (
          <VoicePanel roomId={room.id} socketUrl={socketUrl} liveKitUrl={liveKitUrl} />
        )}
        <div className="flex-1 min-h-[320px] lg:min-h-0">
          <ChatPanel
            messages={messages}
            typingUserIds={typingUserIds}
            members={members}
            currentUserId={currentUserId}
            connected={connected && joined}
            onSend={sendMessage}
            onTyping={sendTyping}
          />
        </div>
      </aside>
    </main>
  );
}
