"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FriendshipRow, ProfileLite } from "./types";

interface Props {
  currentUserId: string;
  initialFriendships: FriendshipRow[];
  initialOthers: ProfileLite[];
}

type Tab = "friends" | "incoming" | "outgoing";

export default function FriendManager({
  currentUserId,
  initialFriendships,
  initialOthers
}: Props) {
  const supabase = createClient();
  const [friendships, setFriendships] = useState<FriendshipRow[]>(initialFriendships);
  const [profilesById, setProfilesById] = useState<Map<string, ProfileLite>>(
    () => new Map(initialOthers.map((p) => [p.id, p]))
  );
  const [tab, setTab] = useState<Tab>("friends");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const friends = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.requested_by !== currentUserId);
  const outgoing = friendships.filter((f) => f.status === "pending" && f.requested_by === currentUserId);

  const otherIdOf = (f: FriendshipRow) => (f.user_a === currentUserId ? f.user_b : f.user_a);

  function lookup(id: string): ProfileLite {
    return (
      profilesById.get(id) ?? {
        id,
        username: "user",
        avatar_url: null
      }
    );
  }

  async function refresh() {
    const { data: rows } = await supabase
      .from("friendships")
      .select("user_a, user_b, status, requested_by, created_at")
      .order("created_at", { ascending: false });
    const fresh = (rows ?? []) as FriendshipRow[];
    setFriendships(fresh);
    const missing = fresh
      .map((r) => (r.user_a === currentUserId ? r.user_b : r.user_a))
      .filter((id) => !profilesById.has(id));
    if (missing.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", missing);
      if (profs) {
        setProfilesById((prev) => {
          const next = new Map(prev);
          for (const p of profs as ProfileLite[]) next.set(p.id, p);
          return next;
        });
      }
    }
  }

  async function sendRequest(target: ProfileLite) {
    if (target.id === currentUserId) return;
    const [user_a, user_b] =
      currentUserId < target.id ? [currentUserId, target.id] : [target.id, currentUserId];
    setBusy(target.id);
    setError(null);
    const { error: insertErr } = await supabase.from("friendships").insert({
      user_a,
      user_b,
      status: "pending",
      requested_by: currentUserId
    });
    setBusy(null);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setProfilesById((prev) => {
      const next = new Map(prev);
      next.set(target.id, target);
      return next;
    });
    await refresh();
  }

  async function accept(f: FriendshipRow) {
    setBusy(otherIdOf(f));
    const { error: updErr } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("user_a", f.user_a)
      .eq("user_b", f.user_b);
    setBusy(null);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    await refresh();
  }

  async function remove(f: FriendshipRow) {
    setBusy(otherIdOf(f));
    const { error: delErr } = await supabase
      .from("friendships")
      .delete()
      .eq("user_a", f.user_a)
      .eq("user_b", f.user_b);
    setBusy(null);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    await refresh();
  }

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">Friends</h2>

      <FriendSearch
        currentUserId={currentUserId}
        existingIds={new Set(friendships.map(otherIdOf))}
        onSend={sendRequest}
        busy={busy}
      />

      <div className="flex gap-2 mt-6 border-b border-neutral-800">
        <TabButton active={tab === "friends"} onClick={() => setTab("friends")} count={friends.length}>
          Friends
        </TabButton>
        <TabButton active={tab === "incoming"} onClick={() => setTab("incoming")} count={incoming.length}>
          Incoming
        </TabButton>
        <TabButton active={tab === "outgoing"} onClick={() => setTab("outgoing")} count={outgoing.length}>
          Outgoing
        </TabButton>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <ul className="mt-4 divide-y divide-neutral-800 rounded-2xl border border-neutral-800 bg-neutral-900">
        {(tab === "friends" ? friends : tab === "incoming" ? incoming : outgoing).map((f) => {
          const other = lookup(otherIdOf(f));
          return (
            <li key={`${f.user_a}-${f.user_b}`} className="px-4 py-3 flex items-center justify-between">
              <div className="text-sm">{other.username}</div>
              <div className="flex items-center gap-2">
                {tab === "incoming" && (
                  <>
                    <button
                      onClick={() => accept(f)}
                      disabled={busy === other.id}
                      className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-dark text-sm disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => remove(f)}
                      disabled={busy === other.id}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </>
                )}
                {tab === "outgoing" && (
                  <button
                    onClick={() => remove(f)}
                    disabled={busy === other.id}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                {tab === "friends" && (
                  <button
                    onClick={() => remove(f)}
                    disabled={busy === other.id}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {tab === "friends" && friends.length === 0 && <EmptyRow>No friends yet.</EmptyRow>}
        {tab === "incoming" && incoming.length === 0 && <EmptyRow>No incoming requests.</EmptyRow>}
        {tab === "outgoing" && outgoing.length === 0 && <EmptyRow>No outgoing requests.</EmptyRow>}
      </ul>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  count,
  children
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 py-2 text-sm font-medium border-b-2 -mb-px " +
        (active ? "border-brand text-white" : "border-transparent text-neutral-400 hover:text-neutral-200")
      }
    >
      {children}
      <span className="ml-1.5 text-xs text-neutral-500">{count}</span>
    </button>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <li className="px-4 py-6 text-sm text-neutral-500 text-center">{children}</li>;
}

function FriendSearch({
  currentUserId,
  existingIds,
  onSend,
  busy
}: {
  currentUserId: string;
  existingIds: Set<string>;
  onSend: (p: ProfileLite) => void;
  busy: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${q}%`)
        .neq("id", currentUserId)
        .limit(10);
      if (cancelled) return;
      setResults((data ?? []) as ProfileLite[]);
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, currentUserId, supabase]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users by username"
        className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-brand outline-none text-sm"
      />
      {query.trim().length >= 2 && (
        <ul className="mt-2 rounded-2xl border border-neutral-800 bg-neutral-900 divide-y divide-neutral-800 max-h-56 overflow-y-auto">
          {searching && <li className="px-4 py-3 text-sm text-neutral-500">Searching…</li>}
          {!searching && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-neutral-500">No users found.</li>
          )}
          {results.map((p) => {
            const already = existingIds.has(p.id);
            return (
              <li key={p.id} className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm">{p.username}</span>
                <button
                  disabled={already || busy === p.id}
                  onClick={() => onSend(p)}
                  className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-dark text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {already ? "Pending / friend" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
