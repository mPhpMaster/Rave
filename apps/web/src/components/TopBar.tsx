import Link from "next/link";

export default function TopBar({ username }: { username: string | null }) {
  return (
    <header className="sticky top-3 z-30 mx-3 lg:mx-6 mt-3 rounded-2xl glass px-5 py-3 flex items-center justify-between">
      <Link href="/dashboard" className="text-xl font-bold tracking-tight">
        <span className="bg-brand-gradient bg-clip-text text-transparent">Rave</span>
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/profile"
          className="text-ink-secondary hover:text-white transition"
        >
          {username ?? "Profile"}
        </Link>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn-ghost text-sm">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
