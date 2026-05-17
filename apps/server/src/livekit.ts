import { AccessToken } from "livekit-server-sdk";

export function isLivekitConfigured(): boolean {
  return !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
}

export async function mintLivekitToken(opts: {
  identity: string;
  name: string;
  roomName: string;
  ttl?: string;
}): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit is not configured (LIVEKIT_API_KEY / LIVEKIT_API_SECRET).");
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: opts.identity,
    name: opts.name,
    ttl: opts.ttl ?? "1h"
  });
  at.addGrant({
    roomJoin: true,
    room: opts.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  // livekit-server-sdk v2 returns a Promise; older versions return a string.
  const result = at.toJwt() as unknown;
  return typeof result === "string" ? result : await (result as Promise<string>);
}
