import type { Server, Socket } from "socket.io";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { fetchUsername, getRoom } from "../rooms.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  ChatMessage
} from "../types/events.js";

type RaveServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type RaveSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const channel = (roomId: string) => `room:${roomId}`;

const MAX_BODY = 2000;
const TYPING_RATELIMIT_MS = 1000;

// Per-socket last-emit timestamp for chat:typing (server-side floor).
const lastTypingTs = new WeakMap<RaveSocket, number>();

export function registerChat(_io: RaveServer, socket: RaveSocket) {
  socket.on("chat:message", async ({ roomId, body }) => {
    try {
      const room = getRoom(roomId);
      if (!room || !room.members.has(socket.data.userId)) {
        socket.emit("error", { code: "not_in_room", message: "Join the room first." });
        return;
      }
      const trimmed = typeof body === "string" ? body.trim() : "";
      if (!trimmed) {
        socket.emit("error", { code: "empty_message", message: "Message is empty." });
        return;
      }
      if (trimmed.length > MAX_BODY) {
        socket.emit("error", {
          code: "message_too_long",
          message: `Max ${MAX_BODY} characters.`
        });
        return;
      }

      const userId = socket.data.userId;
      const username = room.members.get(userId)?.username ?? (await fetchUsername(userId));

      const { data, error } = await supabaseAdmin
        .from("messages")
        .insert({ room_id: roomId, user_id: userId, body: trimmed })
        .select("id, body, created_at")
        .single();

      if (error || !data) {
        console.error("[ws] chat:message insert failed", error);
        socket.emit("error", { code: "persist_failed", message: "Could not save message." });
        return;
      }

      const msg: ChatMessage = {
        id: data.id,
        userId,
        username,
        body: data.body,
        createdAt: data.created_at
      };

      // Broadcast to everyone in the room (including sender — so they get the
      // canonical id + createdAt rather than a local-only echo).
      socket.nsp.to(channel(roomId)).emit("chat:message", msg);
    } catch (err) {
      console.error("[ws] chat:message failed", err);
      socket.emit("error", { code: "internal_error", message: "Chat failed." });
    }
  });

  socket.on("chat:typing", ({ roomId, isTyping }) => {
    const room = getRoom(roomId);
    if (!room || !room.members.has(socket.data.userId)) return;

    const now = Date.now();
    const last = lastTypingTs.get(socket) ?? 0;
    if (now - last < TYPING_RATELIMIT_MS) return;
    lastTypingTs.set(socket, now);

    socket.to(channel(roomId)).emit("chat:typing", {
      userId: socket.data.userId,
      isTyping: !!isTyping
    });
  });
}

export async function fetchRecentMessages(
  roomId: string,
  limit = 50
): Promise<ChatMessage[]> {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("id, user_id, body, created_at, profiles!inner(username)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Reverse to chronological order for display.
  return data.reverse().map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    username:
      (row.profiles as unknown as { username: string } | { username: string }[] | null)
        ? Array.isArray(row.profiles)
          ? row.profiles[0]?.username ?? "user"
          : (row.profiles as { username: string }).username
        : "user",
    body: row.body as string,
    createdAt: row.created_at as string
  }));
}
