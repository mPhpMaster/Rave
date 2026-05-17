import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Resolves an invite code to a room and redirects there. Uses a SECURITY DEFINER
// RPC so the caller doesn't need direct SELECT on rooms (which is membership-gated).
export default async function JoinByCode({ params }: { params: { code: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/room/join/${encodeURIComponent(params.code)}`);
  }

  const { data, error } = await supabase.rpc("join_via_invite", { p_code: params.code });

  if (error || !data) {
    redirect(`/dashboard?error=${encodeURIComponent(error?.message ?? "invalid_invite")}`);
  }

  redirect(`/room/${data}`);
}
