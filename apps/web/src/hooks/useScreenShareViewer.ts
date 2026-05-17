"use client";

import { useEffect, useRef, useState } from "react";
import type { RaveSocket } from "./useSocket";

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

interface ViewerState {
  remoteStream: MediaStream | null;
  sharingActive: boolean;
}

export function useScreenShareViewer(
  socket: RaveSocket | null,
  roomId: string,
  hostId: string,
  isHost: boolean
): ViewerState {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [sharingActive, setSharingActive] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (isHost || !socket) return;

    const cleanupPc = () => {
      pcRef.current?.close();
      pcRef.current = null;
      setRemoteStream(null);
    };

    const onShareStart = ({ hostId: hId }: { hostId: string }) => {
      if (hId !== hostId) return;
      setSharingActive(true);
    };

    const onShareStop = ({ hostId: hId }: { hostId: string }) => {
      if (hId !== hostId) return;
      setSharingActive(false);
      cleanupPc();
    };

    const onOffer = async ({ from, sdp }: { from: string; sdp: string }) => {
      if (from !== hostId) return;
      try {
        cleanupPc();
        const pc = new RTCPeerConnection(ICE_CONFIG);
        pcRef.current = pc;

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("webrtc:ice", {
              roomId,
              to: hostId,
              candidate: JSON.stringify(e.candidate)
            });
          }
        };

        pc.ontrack = (e) => {
          // The first stream attached to the track contains all remote tracks.
          setRemoteStream(e.streams[0] ?? null);
        };

        pc.onconnectionstatechange = () => {
          if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected" ||
            pc.connectionState === "closed"
          ) {
            cleanupPc();
          }
        };

        await pc.setRemoteDescription(JSON.parse(sdp) as RTCSessionDescriptionInit);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", {
          roomId,
          to: hostId,
          sdp: JSON.stringify(answer)
        });
        setSharingActive(true);
      } catch (e) {
        console.error("[rtc-viewer] onOffer failed", e);
        cleanupPc();
      }
    };

    const onIce = async ({ from, candidate }: { from: string; candidate: string }) => {
      if (from !== hostId) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.addIceCandidate(JSON.parse(candidate) as RTCIceCandidateInit);
      } catch (e) {
        console.error("[rtc-viewer] addIceCandidate failed", e);
      }
    };

    socket.on("webrtc:share-start", onShareStart);
    socket.on("webrtc:share-stop", onShareStop);
    socket.on("webrtc:offer", onOffer);
    socket.on("webrtc:ice", onIce);
    return () => {
      socket.off("webrtc:share-start", onShareStart);
      socket.off("webrtc:share-stop", onShareStop);
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:ice", onIce);
      cleanupPc();
    };
  }, [socket, roomId, hostId, isHost]);

  return { remoteStream, sharingActive };
}
