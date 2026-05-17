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
const userChannel = (userId: string) => `user:${userId}`;

function inRoom(socket: RaveSocket, roomId: string) {
  const room = getRoom(roomId);
  return !!room && room.members.has(socket.data.userId);
}

export function registerWebrtc(io: RaveServer, socket: RaveSocket) {
  // Each connection joins a private named room keyed by userId so peers can
  // direct-message each other (signaling) without us tracking socketIds.
  socket.join(userChannel(socket.data.userId));

  socket.on("webrtc:share-start", ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || room.hostId !== socket.data.userId) return;
    socket.to(channel(roomId)).emit("webrtc:share-start", { hostId: socket.data.userId });
  });

  socket.on("webrtc:share-stop", ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || room.hostId !== socket.data.userId) return;
    socket.to(channel(roomId)).emit("webrtc:share-stop", { hostId: socket.data.userId });
  });

  socket.on("webrtc:offer", ({ roomId, to, sdp }) => {
    if (!inRoom(socket, roomId)) return;
    // Only the host should be sending offers, but we don't strictly enforce
    // here — the receiver decides whether to accept based on share-start.
    io.to(userChannel(to)).emit("webrtc:offer", { from: socket.data.userId, sdp });
  });

  socket.on("webrtc:answer", ({ roomId, to, sdp }) => {
    if (!inRoom(socket, roomId)) return;
    io.to(userChannel(to)).emit("webrtc:answer", { from: socket.data.userId, sdp });
  });

  socket.on("webrtc:ice", ({ roomId, to, candidate }) => {
    if (!inRoom(socket, roomId)) return;
    io.to(userChannel(to)).emit("webrtc:ice", { from: socket.data.userId, candidate });
  });
}
