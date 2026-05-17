import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TopBar from "@/components/TopBar";

export default async function Dashboard() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user!.id)
    .single();

  // Rooms the user can see (hosted or joined).
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, host_id, video_provider, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <TopBar username={profile?.username ?? null} />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Your rooms</h1>
          <Link
            href="/dashboard/create"
            className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark font-semibold"
          >
            New room
          </Link>
        </div>

        {rooms && rooms.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/room/${r.id}`}
                  className="block bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-brand transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{r.name}</div>
                    {r.host_id === user!.id && (
                      <span className="text-xs px-2 py-0.5 rounded bg-brand/20 text-brand">
                        host
                      </span>
                    )}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-neutral-500">
                    {r.video_provider}
                  </div>
                  <div className="text-xs text-neutral-500 mt-3">
                    Created {new Date(r.created_at).toLocaleString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-800 p-10 text-center text-neutral-400">
            No rooms yet. Create one to start a watch party.
          </div>
        )}
      </main>
    </div>
  );
}
