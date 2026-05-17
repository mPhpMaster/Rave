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
      <main className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-1">New room</h1>
        <p className="text-neutral-400 mb-8">Pick a YouTube video to watch together.</p>
        <CreateRoomForm />
      </main>
    </div>
  );
}
