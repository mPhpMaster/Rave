import type { Socket } from "socket.io";
import { supabaseAdmin } from "./lib/supabaseAdmin.js";

export async function authMiddleware(socket: Socket, next: (err?: Error) => void) {
  try {
    const token = (socket.handshake.auth as { token?: string })?.token;
    if (!token) return next(new Error("auth: missing token"));

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return next(new Error("auth: invalid token"));

    socket.data.userId = data.user.id;
    socket.data.email = data.user.email ?? null;
    next();
  } catch {
    next(new Error("auth: failed"));
  }
}
