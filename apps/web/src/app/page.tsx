import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Landing() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-purple/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full bg-pink/25 blur-3xl"
      />

      <header className="relative px-8 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold tracking-tight">
          <span className="bg-brand-gradient bg-clip-text text-transparent">
            Rave
          </span>
        </div>
        <nav className="flex gap-4">
          {user ? (
            <Link href="/dashboard" className="btn-primary text-sm">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="btn-primary text-sm">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-6 animate-fade-in">
        <h1 className="text-5xl md:text-7xl font-extrabold max-w-3xl leading-[1.05] tracking-tight">
          Watch anything,{" "}
          <span className="bg-brand-gradient bg-clip-text text-transparent">
            together
          </span>
          .
        </h1>
        <p className="mt-6 text-lg text-ink-secondary max-w-xl">
          Create a room, share a link, and stay in sync — frame for frame.
        </p>
        <Link
          href={user ? "/dashboard" : "/login"}
          className="btn-primary mt-10 text-lg px-9 py-3.5 animate-glow-pulse"
        >
          Start a watch party
        </Link>
      </section>

      <footer className="relative px-8 py-6 text-sm text-ink-muted">
        Local dev build · Checkpoint 1
      </footer>
    </main>
  );
}
