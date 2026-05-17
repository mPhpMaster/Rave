// Extract the YouTube video ID from common URL forms.
//   https://www.youtube.com/watch?v=XXXX
//   https://youtu.be/XXXX
//   https://www.youtube.com/embed/XXXX
//   https://www.youtube.com/shorts/XXXX
// Returns null if not recognizable.
export function parseYouTubeId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return isValidId(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && isValidId(v)) return v;
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([A-Za-z0-9_-]{6,})/);
      if (m && isValidId(m[2])) return m[2];
    }
  } catch {
    // Not a URL — maybe a bare ID.
    if (isValidId(trimmed)) return trimmed;
  }
  return null;
}

function isValidId(id: string): boolean {
  return /^[A-Za-z0-9_-]{6,}$/.test(id);
}
