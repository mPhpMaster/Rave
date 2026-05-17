import { supabaseAdmin } from "./lib/supabaseAdmin.js";
import type { VideoProvider, RoomMember } from "./types/events.js";

export interface RoomState {
  roomId: string;
  hostId: string;
  videoProvider: VideoProvider;
  videoUrl: string;
  playback: {
    t: number;
    paused: boolean;
    lastUpdateTs: number; // serverTs of last applied host event
  };
  members: Map<string, RoomMember>; // userId -> member
}

const rooms = new Map<string, RoomState>();

export async function loadRoom(roomId: string): Promise<RoomState | null> {
  const existing = rooms.get(roomId);
  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("id, host_id, video_provider, video_url")
    .eq("id", roomId)
    .maybeSingle();

  if (error || !data) return null;

  const state: RoomState = {
    roomId: data.id,
    hostId: data.host_id,
    videoProvider: data.video_provider as VideoProvider,
    videoUrl: data.video_url,
    playback: { t: 0, paused: true, lastUpdateTs: Date.now() },
    members: new Map()
  };

  rooms.set(roomId, state);
  return state;
}

export function getRoom(roomId: string): RoomState | undefined {
  return rooms.get(roomId);
}

export function purgeIfEmpty(roomId: string) {
  const room = rooms.get(roomId);
  if (room && room.members.size === 0) {
    rooms.delete(roomId);
  }
}

export async function isMember(roomId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  return !error && !!data;
}

export async function fetchUsername(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  return data?.username ?? "user";
}
