import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Landing() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-8 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold tracking-tight">
          <span className="text-brand">Rave</span>
        </div>
        <nav className="flex gap-4">
          {user ? (
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark transition">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark transition">
              Sign in
            </Link>
          )}
        </nav>
      </header>
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-5xl md:text-6xl font-extrabold max-w-3xl leading-tight">
          Watch anything, <span className="text-brand">together</span>.
        </h1>
        <p className="mt-6 text-lg text-neutral-400 max-w-xl">
          Create a room, share a link, and stay in sync — frame for frame.
        </p>
        <Link
          href={user ? "/dashboard" : "/login"}
          className="mt-10 px-8 py-3 rounded-xl bg-brand hover:bg-brand-dark text-lg font-semibold transition"
        >
          Start a watch party
        </Link>
      </section>
      <footer className="px-8 py-6 text-sm text-neutral-500">
        Local dev build · Checkpoint 1
      </footer>
    </main>
  );
}
