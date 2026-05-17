"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseYouTubeId } from "@/lib/youtube";

const MAX_MP4_MB = 100;

type Provider = "youtube" | "mp4";

export default function CreateRoomForm() {
  const router = useRouter();
  const supabase = createClient();
  const [provider, setProvider] = useState<Provider>("youtube");
  const [name, setName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      return;
    }

    let video_url: string;
    if (provider === "youtube") {
      const id = parseYouTubeId(youtubeUrl);
      if (!id) {
        setError("That doesn't look like a YouTube URL or video ID.");
        return;
      }
      video_url = id;
    } else {
      if (!file) {
        setError("Pick an MP4 file to upload.");
        return;
      }
      const maxBytes = MAX_MP4_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`File is too large (max ${MAX_MP4_MB} MB).`);
        return;
      }
      const ext = guessExt(file);
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      setSubmitting(true);
      setUploadPct(0);
      const { error: upErr } = await supabase.storage
        .from("room-videos")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type || "video/mp4",
          upsert: false
        });
      setUploadPct(null);

      if (upErr) {
        setError(upErr.message);
        setSubmitting(false);
        return;
      }
      video_url = path;
    }

    setSubmitting(true);
    const { data, error: insertErr } = await supabase
      .from("rooms")
      .insert({
        name: name.trim(),
        host_id: user.id,
        is_public: isPublic,
        video_provider: provider,
        video_url
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

      <Field label="Source">
        <div className="flex gap-2 text-sm">
          <ProviderButton
            active={provider === "youtube"}
            onClick={() => setProvider("youtube")}
          >
            YouTube
          </ProviderButton>
          <ProviderButton
            active={provider === "mp4"}
            onClick={() => setProvider("mp4")}
          >
            MP4 upload
          </ProviderButton>
        </div>
      </Field>

      {provider === "youtube" && (
        <Field label="YouTube URL or video ID">
          <input
            required
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-brand outline-none"
          />
        </Field>
      )}

      {provider === "mp4" && (
        <Field label={`MP4 file (max ${MAX_MP4_MB} MB)`}>
          <input
            required
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-neutral-800 file:text-neutral-100 hover:file:bg-neutral-700"
          />
          {file && (
            <div className="mt-1 text-xs text-neutral-500">
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
            </div>
          )}
          {uploadPct !== null && (
            <div className="mt-2 text-xs text-neutral-400">Uploading…</div>
          )}
        </Field>
      )}

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
          {submitting ? "Working…" : "Create room"}
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

function ProviderButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-lg border " +
        (active
          ? "border-brand bg-brand/10 text-white"
          : "border-neutral-700 hover:border-neutral-600 text-neutral-300")
      }
    >
      {children}
    </button>
  );
}

function guessExt(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  return "mp4";
}
