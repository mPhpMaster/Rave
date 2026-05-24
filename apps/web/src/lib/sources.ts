// Single source of truth for the video sources a room can use.
//
// Each source declares how its input is collected in the create form and how the
// value persisted in rooms.video_url is produced:
//   - "url"  (YouTube): the user pastes a link that `parse` normalizes.
//   - "file" (MP4 upload): the user uploads a file; video_url is the storage path.
//   - "none" (everything else): no input. These sites refuse to be framed
//     (X-Frame-Options / CSP), so the room can't embed them. The host opens the
//     site `homepage` and screen-shares it; every viewer sees the same live page.
//
// Keep VideoProvider (apps/web/src/types/events.ts + the server mirror) and the
// rooms.video_provider DB check constraint in sync with the ids here.

import type { VideoProvider } from "@/types/events";
import { parseYouTubeId } from "./youtube";

export type SourceInputKind = "url" | "file" | "none";

export interface SourceDef {
  id: VideoProvider;
  label: string;
  /** How the create form collects this source. */
  input: SourceInputKind;
  placeholder?: string;
  /** Short hint shown under the input / source picker. */
  help?: string;
  /**
   * Normalize raw user input into the value stored in rooms.video_url.
   * Returns null when the input isn't recognizable. Only for `url` sources.
   */
  parse?: (raw: string) => string | null;
  /**
   * For `none` sources: the site homepage stored in rooms.video_url at create
   * time. The host opens it and screen-shares the page to viewers (see
   * HomepageShareGate); these sites can't be embedded in an iframe.
   */
  homepage?: string;
}

// Order shown in the create form: the sources with dedicated players first, then
// the homepage-embed sources.
export const SOURCES: SourceDef[] = [
  {
    id: "youtube",
    label: "YouTube",
    input: "url",
    placeholder: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    help: "Paste a YouTube URL or video ID.",
    parse: parseYouTubeId
  },
  {
    id: "mp4",
    label: "MP4 upload",
    input: "file"
  },
  {
    id: "twitch",
    label: "Twitch",
    input: "none",
    homepage: "https://www.twitch.tv/",
    help: "The host screen-shares the Twitch homepage so everyone watches together."
  },
  {
    id: "gdrive",
    label: "Google Drive",
    input: "none",
    homepage: "https://drive.google.com/",
    help: "The host screen-shares Google Drive so everyone watches together."
  },
  {
    id: "reddit",
    label: "Reddit",
    input: "none",
    homepage: "https://www.reddit.com/",
    help: "The host screen-shares the Reddit homepage so everyone watches together."
  },
  {
    id: "twitter",
    label: "X (Twitter)",
    input: "none",
    homepage: "https://x.com/",
    help: "The host screen-shares X so everyone watches together."
  },
  {
    id: "pluto",
    label: "Pluto TV",
    input: "none",
    homepage: "https://pluto.tv/",
    help: "The host screen-shares Pluto TV so everyone watches together."
  },
  {
    id: "tubi",
    label: "Tubi",
    input: "none",
    homepage: "https://tubitv.com/",
    help: "The host screen-shares Tubi so everyone watches together."
  },
  {
    id: "netflix",
    label: "Netflix",
    input: "none",
    homepage: "https://www.netflix.com/",
    help: "The host screen-shares Netflix so everyone watches together."
  }
];

export function getSource(id: VideoProvider): SourceDef | undefined {
  return SOURCES.find((s) => s.id === id);
}
