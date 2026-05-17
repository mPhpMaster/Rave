import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData
} from "../types/events.js";
import { getRoom } from "../rooms.js";

type RaveServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type RaveSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const channel = (roomId: string) => `room:${roomId}`;

function assertHost(socket: RaveSocket, roomId: string): boolean {
  const room = getRoom(roomId);
  if (!room) {
    socket.emit("error", { code: "room_not_loaded", message: "Join the room first." });
    return false;
  }
  if (room.hostId !== socket.data.userId) {
    socket.emit("error", { code: "not_host", message: "Only the host can control playback." });
    return false;
  }
  return true;
}

export function registerPlayback(_io: RaveServer, socket: RaveSocket) {
  socket.on("playback:play", ({ roomId, t }) => {
    if (!assertHost(socket, roomId)) return;
    const room = getRoom(roomId)!;
    const serverTs = Date.now();
    room.playback = { t, paused: false, lastUpdateTs: serverTs };
    socket.to(channel(roomId)).emit("playback:play", { t, serverTs });
  });

  socket.on("playback:pause", ({ roomId, t }) => {
    if (!assertHost(socket, roomId)) return;
    const room = getRoom(roomId)!;
    const serverTs = Date.now();
    room.playback = { t, paused: true, lastUpdateTs: serverTs };
    socket.to(channel(roomId)).emit("playback:pause", { t, serverTs });
  });

  socket.on("playback:seek", ({ roomId, t }) => {
    if (!assertHost(socket, roomId)) return;
    const room = getRoom(roomId)!;
    const serverTs = Date.now();
    room.playback = { ...room.playback, t, lastUpdateTs: serverTs };
    socket.to(channel(roomId)).emit("playback:seek", { t, serverTs });
  });

  socket.on("playback:state", ({ roomId, t, paused }) => {
    if (!assertHost(socket, roomId)) return;
    const room = getRoom(roomId)!;
    const serverTs = Date.now();
    room.playback = { t, paused, lastUpdateTs: serverTs };
    socket.to(channel(roomId)).emit("playback:state", { t, paused, serverTs });
  });
}
