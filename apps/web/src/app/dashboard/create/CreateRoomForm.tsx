"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseYouTubeId } from "@/lib/youtube";

export default function CreateRoomForm() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const videoId = parseYouTubeId(youtubeUrl);
    if (!videoId) {
      setError("That doesn't look like a YouTube URL or video ID.");
      return;
    }

    setSubmitting(true);
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setSubmitting(false);
      return;
    }

    const { data, error: insertErr } = await supabase
      .from("rooms")
      .insert({
        name: name.trim(),
        host_id: user.id,
        is_public: isPublic,
        video_provider: "youtube",
        video_url: videoId
      })
      .select("id")
      .single();

    if (insertErr || !data) {
      setError(insertErr?.message ?? "Could not create room.");
      setSubmitting(false);
      return;
    }

    router.push(`/room/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Room name">
        <input
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friday night watch party"
          className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-brand outline-none"
        />
      </Field>

      <Field label="YouTube URL or video ID">
        <input
          required
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-brand outline-none"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="accent-brand"
        />
        Public room (anyone with the link can join)
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 rounded-lg bg-brand hover:bg-brand-dark font-semibold disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create room"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm text-neutral-300 mb-1.5">{label}</div>
      {children}
    </label>
  );
}
