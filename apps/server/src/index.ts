import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { authMiddleware } from "./auth.js";
import { registerPresence } from "./handlers/presence.js";
import { registerPlayback } from "./handlers/playback.js";
import { registerChat } from "./handlers/chat.js";
import { registerWebrtc } from "./handlers/webrtc.js";
import { isLivekitConfigured, mintLivekitToken } from "./livekit.js";
import { supabaseAdmin } from "./lib/supabaseAdmin.js";
import { fetchUsername, isMember } from "./rooms.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData
} from "./types/events.js";

const PORT = Number(process.env.PORT ?? 3001);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

const app = express();
app.use(cors({ origin: WEB_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now(), livekit: isLivekitConfigured() });
});

app.post("/livekit-token", async (req, res) => {
  try {
    if (!isLivekitConfigured()) {
      return res.status(503).json({ error: "livekit_not_configured" });
    }
    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing_token" });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: "invalid_token" });

    const userId = data.user.id;
    const roomId = typeof req.body?.roomId === "string" ? req.body.roomId : null;
    if (!roomId) return res.status(400).json({ error: "missing_room_id" });

    const member = await isMember(roomId, userId);
    if (!member) return res.status(403).json({ error: "not_a_member" });

    const username = await fetchUsername(userId);
    const lkToken = await mintLivekitToken({
      identity: userId,
      name: username,
      roomName: `voice:${roomId}`
    });

    return res.json({ token: lkToken });
  } catch (err) {
    console.error("[/livekit-token]", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

const httpServer = http.createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: { origin: WEB_ORIGIN, credentials: true },
  transports: ["websocket"]
});

io.use(authMiddleware);

io.on("connection", (socket) => {
  console.log(`[ws] connected userId=${socket.data.userId} sid=${socket.id}`);

  registerPresence(io, socket);
  registerPlayback(io, socket);
  registerChat(io, socket);
  registerWebrtc(io, socket);

  socket.on("disconnect", (reason) => {
    console.log(`[ws] disconnected sid=${socket.id} reason=${reason}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] CORS origin: ${WEB_ORIGIN}`);
});
