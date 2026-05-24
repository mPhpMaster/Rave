"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents
} from "@/types/events";

export type RaveSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket(url: string, accessToken: string | null) {
  const [socket, setSocket] = useState<RaveSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    const s: RaveSocket = io(url, {
      transports: ["polling"],
      upgrade: false,
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: Infinity
    });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    setSocket(s);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [url, accessToken]);

  return { socket, connected };
}
