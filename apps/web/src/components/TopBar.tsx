import Link from "next/link";

export default function TopBar({ username }: { username: string | null }) {
  return (
    <header className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
      <Link href="/dashboard" className="text-xl font-bold tracking-tight">
        <span className="text-brand">Rave</span>
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <Link href="/profile" className="text-neutral-300 hover:text-white">
          {username ?? "Profile"}
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
