import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  RoomSnapshot
} from "../types/events.js";
import { loadRoom, isMember, fetchUsername, purgeIfEmpty, getRoom } from "../rooms.js";
import { fetchRecentMessages } from "./chat.js";

type RaveServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type RaveSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const channel = (roomId: string) => `room:${roomId}`;

export function registerPresence(io: RaveServer, socket: RaveSocket) {
  socket.on("room:join", async ({ roomId }, ack) => {
    try {
      if (!roomId || typeof roomId !== "string") {
        return ack({ error: "invalid_room_id" });
      }
      const userId = socket.data.userId;

      const member = await isMember(roomId, userId);
      if (!member) return ack({ error: "not_a_member" });

      const room = await loadRoom(roomId);
      if (!room) return ack({ error: "room_not_found" });

      const username = await fetchUsername(userId);

      room.members.set(userId, { userId, username });
      socket.data.roomId = roomId;
      await socket.join(channel(roomId));

      socket.to(channel(roomId)).emit("user:joined", { userId, username });

      const recentMessages = await fetchRecentMessages(roomId);

      const snapshot: RoomSnapshot = {
        roomId: room.roomId,
        hostId: room.hostId,
        members: Array.from(room.members.values()),
        playback: {
          t: room.playback.t,
          paused: room.playback.paused,
          serverTs: room.playback.lastUpdateTs
        },
        videoProvider: room.videoProvider,
        videoUrl: room.videoUrl,
        recentMessages
      };
      ack(snapshot);
    } catch (err) {
      console.error("[ws] room:join failed", err);
      ack({ error: "internal_error" });
    }
  });

  socket.on("room:leave", ({ roomId }) => {
    handleLeave(socket, roomId);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (roomId) handleLeave(socket, roomId);
  });
}

function handleLeave(socket: RaveSocket, roomId: string) {
  const userId = socket.data.userId;
  const room = getRoom(roomId);
  if (!room) return;
  room.members.delete(userId);
  socket.to(channel(roomId)).emit("user:left", { userId });
  socket.leave(channel(roomId));
  socket.data.roomId = undefined;
  purgeIfEmpty(roomId);
}
