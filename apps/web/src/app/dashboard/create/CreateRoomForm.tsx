"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SOURCES, getSource } from "@/lib/sources";
import type { VideoProvider } from "@/types/events";

const MAX_MP4_MB = 100;

export default function CreateRoomForm() {
  const router = useRouter();
  const supabase = createClient();
  const [provider, setProvider] = useState<VideoProvider>("youtube");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const source = getSource(provider)!;

  function selectProvider(next: VideoProvider) {
    setProvider(next);
    setError(null);
    setUrl("");
    setFile(null);
  }

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
    if (source.input === "none") {
      // Homepage-embed sources: store the site homepage; the room frames it.
      video_url = source.homepage!;
    } else if (source.input === "file") {
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
    } else {
      const parsed = source.parse ? source.parse(url) : url.trim();
      if (!parsed) {
        setError(`That doesn't look like a valid ${source.label} link.`);
        return;
      }
      video_url = parsed;
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
          className="w-full px-4 py-2.5 rounded-pill bg-white/5 border border-white/10 focus:border-purple outline-none transition"
        />
      </Field>

      <Field label="Source">
        <div className="flex flex-wrap gap-2 text-sm">
          {SOURCES.map((s) => (
            <ProviderButton
              key={s.id}
              active={provider === s.id}
              onClick={() => selectProvider(s.id)}
            >
              {s.label}
            </ProviderButton>
          ))}
        </div>
      </Field>

      {source.input === "none" && (
        <Field label={`${source.label} page`}>
          <div className="px-4 py-2.5 rounded-pill bg-white/5 border border-white/10 text-sm text-ink-secondary break-all">
            {source.homepage}
          </div>
          {source.help && (
            <div className="mt-1.5 text-xs text-ink-muted">{source.help}</div>
          )}
        </Field>
      )}

      {source.input === "url" && (
        <Field label={`${source.label} link`}>
          <input
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={source.placeholder}
            className="w-full px-4 py-2.5 rounded-pill bg-white/5 border border-white/10 focus:border-purple outline-none transition"
          />
          {source.help && (
            <div className="mt-1.5 text-xs text-ink-muted">{source.help}</div>
          )}
        </Field>
      )}

      {source.input === "file" && (
        <Field label={`MP4 file (max ${MAX_MP4_MB} MB)`}>
          <input
            required
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-pill file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/20 file:transition"
          />
          {file && (
            <div className="mt-1 text-xs text-ink-muted">
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
            </div>
          )}
          {uploadPct !== null && (
            <div className="mt-2 text-xs text-ink-secondary">Uploading…</div>
          )}
        </Field>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="accent-purple"
        />
        Public room (anyone with the link can join)
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Working…" : "Create room"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm text-ink-secondary mb-1.5">{label}</div>
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
        "px-4 py-2 rounded-pill border transition " +
        (active
          ? "border-purple bg-purple/15 text-white"
          : "border-white/10 hover:border-white/20 text-ink-secondary hover:text-white")
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
