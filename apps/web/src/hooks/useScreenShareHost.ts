"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RaveSocket } from "./useSocket";
import type { RoomMember } from "@/types/events";

const MAX_VIEWERS = 6;

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

interface HostState {
  sharing: boolean;
  stream: MediaStream | null;
  start: () => Promise<void>;
  stop: () => void;
  viewerCount: number;
  error: string | null;
}

export function useScreenShareHost(
  socket: RaveSocket | null,
  roomId: string,
  isHost: boolean,
  members: RoomMember[],
  currentUserId: string
): HostState {
  const [sharing, setSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const streamRef = useRef<MediaStream | null>(null);
  const membersRef = useRef<RoomMember[]>(members);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const closePeer = useCallback((userId: string) => {
    const pc = peersRef.current.get(userId);
    if (pc) {
      pc.close();
      peersRef.current.delete(userId);
    }
  }, []);

  const closeAllPeers = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
  }, []);

  const offerTo = useCallback(
    async (targetUserId: string) => {
      if (!socket || !streamRef.current) return;
      if (peersRef.current.size >= MAX_VIEWERS) return;
      if (peersRef.current.has(targetUserId)) return;

      const pc = new RTCPeerConnection(ICE_CONFIG);
      peersRef.current.set(targetUserId, pc);

      for (const track of streamRef.current.getTracks()) {
        pc.addTrack(track, streamRef.current);
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc:ice", {
            roomId,
            to: targetUserId,
            candidate: JSON.stringify(e.candidate)
          });
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          closePeer(targetUserId);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc:offer", { roomId, to: targetUserId, sdp: JSON.stringify(offer) });
    },
    [socket, roomId, closePeer]
  );

  const start = useCallback(async () => {
    if (!isHost || !socket) return;
    setError(null);
    try {
      const media = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true
      });
      // If the user clicks the browser's native "Stop sharing" button, the
      // track ends — propagate to our stop().
      media.getVideoTracks()[0].onended = () => stop();
      streamRef.current = media;
      setStream(media);
      setSharing(true);

      socket.emit("webrtc:share-start", { roomId });

      // Offer to every current member except self, up to the viewer cap.
      const others = membersRef.current
        .filter((m) => m.userId !== currentUserId)
        .slice(0, MAX_VIEWERS);
      for (const m of others) {
        await offerTo(m.userId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "getDisplayMedia failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, socket, roomId, currentUserId, offerTo]);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    closeAllPeers();
    setStream(null);
    setSharing(false);
    if (socket) socket.emit("webrtc:share-stop", { roomId });
  }, [socket, roomId, closeAllPeers]);

  // Signaling: answer + ICE from viewers.
  useEffect(() => {
    if (!socket || !isHost) return;

    const onAnswer = async ({ from, sdp }: { from: string; sdp: string }) => {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(JSON.parse(sdp) as RTCSessionDescriptionInit);
      } catch (e) {
        console.error("[rtc-host] setRemoteDescription failed", e);
      }
    };

    const onIce = async ({ from, candidate }: { from: string; candidate: string }) => {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      try {
        await pc.addIceCandidate(JSON.parse(candidate) as RTCIceCandidateInit);
      } catch (e) {
        console.error("[rtc-host] addIceCandidate failed", e);
      }
    };

    socket.on("webrtc:answer", onAnswer);
    socket.on("webrtc:ice", onIce);
    return () => {
      socket.off("webrtc:answer", onAnswer);
      socket.off("webrtc:ice", onIce);
    };
  }, [socket, isHost]);

  // When a new member joins mid-share, offer to them.
  useEffect(() => {
    if (!sharing) return;
    for (const m of members) {
      if (m.userId === currentUserId) continue;
      if (peersRef.current.size >= MAX_VIEWERS) break;
      if (!peersRef.current.has(m.userId)) {
        void offerTo(m.userId);
      }
    }
    // Clean up peers for members who left.
    const memberIds = new Set(members.map((m) => m.userId));
    for (const id of Array.from(peersRef.current.keys())) {
      if (!memberIds.has(id)) closePeer(id);
    }
  }, [members, sharing, currentUserId, offerTo, closePeer]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      closeAllPeers();
    };
  }, [closeAllPeers]);

  return {
    sharing,
    stream,
    start,
    stop,
    viewerCount: peersRef.current.size,
    error
  };
}
