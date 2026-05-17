import { createClient } from "@/lib/supabase/server";
import TopBar from "@/components/TopBar";
import FriendManager from "./FriendManager";
import type { FriendshipRow, ProfileLite } from "./types";

export default async function Profile() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, created_at")
    .eq("id", user!.id)
    .single();

  const { data: friendships } = await supabase
    .from("friendships")
    .select("user_a, user_b, status, requested_by, created_at")
    .order("created_at", { ascending: false });

  const rows = (friendships ?? []) as FriendshipRow[];

  const otherIds = Array.from(
    new Set(rows.map((r) => (r.user_a === user!.id ? r.user_b : r.user_a)))
  );

  let others: ProfileLite[] = [];
  if (otherIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", otherIds);
    others = (data ?? []) as ProfileLite[];
  }

  return (
    <div className="min-h-screen">
      <TopBar username={profile?.username ?? null} />
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        <section>
          <h1 className="text-3xl font-bold mb-6">Profile</h1>
          <dl className="rounded-2xl border border-neutral-800 divide-y divide-neutral-800 bg-neutral-900">
            <Row label="Email" value={user!.email ?? "—"} />
            <Row label="Username" value={profile?.username ?? "—"} />
            <Row label="User ID" value={user!.id} mono />
            <Row
              label="Joined"
              value={
                profile?.created_at
                  ? new Date(profile.created_at).toLocaleString()
                  : "—"
              }
            />
          </dl>
        </section>

        <FriendManager
          currentUserId={user!.id}
          initialFriendships={rows}
          initialOthers={others}
        />
      </main>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-4 px-5 py-4">
      <dt className="text-neutral-400">{label}</dt>
      <dd className={`col-span-2 ${mono ? "font-mono text-sm" : ""} break-all`}>{value}</dd>
    </div>
  );
}
