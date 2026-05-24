"use client";

// Shown in the main video area for homepage sources (Twitch, Netflix, YouTube
// homepage, X, Reddit, Drive, Pluto, Tubi) when no one is screen-sharing yet.
// These sites send X-Frame-Options / CSP frame-ancestors and refuse to load in
// an iframe, so there is no way to embed them directly. Instead the host opens
// the real site and shares that tab over WebRTC; every viewer then sees the same
// live page. This component is the call-to-action / waiting state around that.

interface Props {
  label: string;
  homepage: string;
  isHost: boolean;
  onShare: () => void;
  error: string | null;
}

export default function HomepageShareGate({
  label,
  homepage,
  isHost,
  onShare,
  error
}: Props) {
  return (
    <div className="w-full aspect-video bg-black rounded-xl grid place-items-center text-center px-6">
      <div className="max-w-md">
        {isHost ? (
          <>
            <div className="text-lg font-semibold mb-1">
              {label} can&apos;t be embedded
            </div>
            <p className="text-sm text-ink-secondary mb-4">
              {label} blocks being shown inside other sites. Open it in a tab, then
              share that tab so everyone in the room watches the same live page.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <a
                href={homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-sm"
              >
                Open {label} ↗
              </a>
              <button type="button" onClick={onShare} className="btn-primary">
                Share screen
              </button>
            </div>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <p className="mt-3 text-xs text-ink-muted">
              Tip: in the share dialog pick the {label} browser tab for the cleanest
              view (and to share its audio).
            </p>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold mb-1">Waiting for the host</div>
            <p className="text-sm text-ink-secondary">
              The host will share {label} shortly. It&apos;ll appear here
              automatically once they start.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
