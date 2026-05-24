export type VideoProvider =
  | "youtube"
  | "mp4"
  | "vimeo"
  | "twitch"
  | "gdrive"
  | "reddit"
  | "twitter"
  | "pluto"
  | "tubi"
  | "netflix";

export interface RoomMember {
  userId: string;
  username: string;
}

export interface PlaybackState {
  t: number;
  paused: boolean;
  serverTs: number;
}

export interface RoomSnapshot {
  roomId: string;
  hostId: string;
  members: RoomMember[];
  playback: PlaybackState;
  videoProvider: VideoProvider;
  videoUrl: string;
  recentMessages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  body: string;
  createdAt: string;
}

// Client -> Server
export interface ClientToServerEvents {
  "room:join": (data: { roomId: string }, ack: (snapshot: RoomSnapshot | { error: string }) => void) => void;
  "room:leave": (data: { roomId: string }) => void;
  "playback:play": (data: { roomId: string; t: number }) => void;
  "playback:pause": (data: { roomId: string; t: number }) => void;
  "playback:seek": (data: { roomId: string; t: number }) => void;
  "playback:state": (data: { roomId: string; t: number; paused: boolean }) => void;
  "chat:message": (data: { roomId: string; body: string }) => void;
  "chat:typing": (data: { roomId: string; isTyping: boolean }) => void;
  "webrtc:share-start": (data: { roomId: string }) => void;
  "webrtc:share-stop": (data: { roomId: string }) => void;
  "webrtc:offer": (data: { roomId: string; to: string; sdp: string }) => void;
  "webrtc:answer": (data: { roomId: string; to: string; sdp: string }) => void;
  "webrtc:ice": (data: { roomId: string; to: string; candidate: string }) => void;
}

// Server -> Client
export interface ServerToClientEvents {
  "user:joined": (data: RoomMember) => void;
  "user:left": (data: { userId: string }) => void;
  "playback:play": (data: { t: number; serverTs: number }) => void;
  "playback:pause": (data: { t: number; serverTs: number }) => void;
  "playback:seek": (data: { t: number; serverTs: number }) => void;
  "playback:state": (data: PlaybackState) => void;
  "chat:message": (data: ChatMessage) => void;
  "chat:typing": (data: { userId: string; isTyping: boolean }) => void;
  "webrtc:share-start": (data: { hostId: string }) => void;
  "webrtc:share-stop": (data: { hostId: string }) => void;
  "webrtc:offer": (data: { from: string; sdp: string }) => void;
  "webrtc:answer": (data: { from: string; sdp: string }) => void;
  "webrtc:ice": (data: { from: string; candidate: string }) => void;
  error: (data: { code: string; message: string }) => void;
}

export interface SocketData {
  userId: string;
  email: string | null;
  roomId?: string;
}
