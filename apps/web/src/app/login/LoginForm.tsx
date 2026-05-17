"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({
  next,
  initialError
}: {
  next?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);

  const redirectTo = next && next.startsWith("/") ? next : "/dashboard";

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  async function handleOAuth(provider: "google" | "discord") {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      }
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <button
          onClick={() => handleOAuth("google")}
          disabled={loading}
          className="w-full py-2.5 rounded-pill bg-white text-neutral-900 font-medium hover:bg-neutral-200 transition disabled:opacity-50"
        >
          Continue with Google
        </button>
        <button
          onClick={() => handleOAuth("discord")}
          disabled={loading}
          className="w-full py-2.5 rounded-pill bg-[#5865F2] text-white font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          Continue with Discord
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-ink-muted">
        <div className="flex-1 h-px bg-white/10" />
        or
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <form onSubmit={handleEmail} className="space-y-3">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-pill bg-white/5 border border-white/10 focus:border-purple outline-none transition"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-pill bg-white/5 border border-white/10 focus:border-purple outline-none transition"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        className="text-sm text-ink-secondary hover:text-white transition"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
