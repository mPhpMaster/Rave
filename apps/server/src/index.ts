import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { authMiddleware } from "./auth.js";
import { registerPresence } from "./handlers/presence.js";
import { registerPlayback } from "./handlers/playback.js";
import { registerChat } from "./handlers/chat.js";
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
  res.json({ ok: true, ts: Date.now() });
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

  socket.on("disconnect", (reason) => {
    console.log(`[ws] disconnected sid=${socket.id} reason=${reason}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] CORS origin: ${WEB_ORIGIN}`);
});
