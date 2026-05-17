import { createClient } from "@/lib/supabase/server";
import TopBar from "@/components/TopBar";
import CreateRoomForm from "./CreateRoomForm";

export default async function CreateRoom() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user!.id)
    .single();

  return (
    <div className="min-h-screen">
      <TopBar username={profile?.username ?? null} />
      <main className="max-w-xl mx-auto px-6 py-10 animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
          New room
        </h1>
        <p className="text-ink-secondary mb-8">
          Pick a YouTube video to watch together.
        </p>
        <div className="glass rounded-2xl p-6">
          <CreateRoomForm />
        </div>
      </main>
    </div>
  );
}
