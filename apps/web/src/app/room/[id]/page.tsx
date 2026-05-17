import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopBar from "@/components/TopBar";
import RoomShell from "@/components/room/RoomShell";

export default async function RoomPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/room/${params.id}`);

  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, host_id, is_public, video_provider, video_url, invite_code")
    .eq("id", params.id)
    .maybeSingle();

  if (!room) notFound();

  // Auto-join if public; otherwise require existing membership.
  let { data: membership } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    if (room.is_public) {
      const { error: joinErr } = await supabase
        .from("room_members")
        .insert({ room_id: room.id, user_id: user.id, role: "guest" });
      if (!joinErr) {
        membership = { user_id: user.id };
      }
    }
    if (!membership) {
      redirect("/dashboard?error=not_a_member");
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar username={profile?.username ?? null} />
      <RoomShell
        room={{
          id: room.id,
          name: room.name,
          hostId: room.host_id,
          videoProvider: room.video_provider as "youtube" | "mp4" | "vimeo",
          videoUrl: room.video_url,
          inviteCode: room.invite_code
        }}
        currentUserId={user.id}
        accessToken={session?.access_token ?? null}
        socketUrl={socketUrl}
        liveKitUrl={liveKitUrl}
      />
    </div>
  );
}
