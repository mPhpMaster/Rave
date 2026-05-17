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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Your rooms
          </h1>
          <Link href="/dashboard/create" className="btn-primary text-sm">
            New room
          </Link>
        </div>

        {rooms && rooms.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {rooms.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/room/${r.id}`}
                  className="block glass rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-glow-purple"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-white">{r.name}</div>
                    {r.host_id === user!.id && (
                      <span className="text-xs px-2 py-0.5 rounded-pill bg-purple/20 text-purple">
                        host
                      </span>
                    )}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-ink-muted">
                    {r.video_provider}
                  </div>
                  <div className="text-xs text-ink-muted mt-3">
                    Created {new Date(r.created_at).toLocaleString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-ink-secondary">
            No rooms yet. Create one to start a watch party.
          </div>
        )}
      </main>
    </div>
  );
}
