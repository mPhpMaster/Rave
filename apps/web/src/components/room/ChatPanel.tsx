"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage, RoomMember } from "@/types/events";
import TypingIndicator from "./TypingIndicator";
import { cn } from "@/lib/cn";

// emoji-mart pulls a ~1MB Unicode dataset; lazy-load and disable SSR.
const Picker = dynamic(() => import("./EmojiPickerWrapper"), {
  ssr: false,
  loading: () => (
    <div className="text-xs text-ink-muted px-3 py-2">Loading…</div>
  )
});

interface Props {
  messages: ChatMessage[];
  typingUserIds: string[];
  members: RoomMember[];
  currentUserId: string;
  connected: boolean;
  onSend: (body: string) => void;
  onTyping: (isTyping: boolean) => void;
}

export default function ChatPanel({
  messages,
  typingUserIds,
  members,
  currentUserId,
  connected,
  onSend,
  onTyping
}: Props) {
  const [draft, setDraft] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingEmit = useRef<{ at: number; was: boolean }>({ at: 0, was: false });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, typingUserIds.length]);

  function handleDraftChange(v: string) {
    setDraft(v);
    const isTyping = v.trim().length > 0;
    const now = Date.now();
    // Throttle: only emit on transition, or once per second while typing.
    if (isTyping !== lastTypingEmit.current.was || now - lastTypingEmit.current.at > 1000) {
      onTyping(isTyping);
      lastTypingEmit.current = { at: now, was: isTyping };
    }
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || !connected) return;
    onSend(body);
    setDraft("");
    onTyping(false);
    lastTypingEmit.current = { at: Date.now(), was: false };
    setShowPicker(false);
  }

  function insertEmoji(emoji: string) {
    setDraft((d) => d + emoji);
  }

  return (
    <div className="flex flex-col h-full rounded-2xl glass-strong overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 text-sm font-semibold">
        Chat
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
        {messages.length === 0 && (
          <div className="text-xs text-ink-muted text-center py-4">
            No messages yet. Say hi.
          </div>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped = prev && prev.userId === m.userId && elapsed(prev.createdAt, m.createdAt) < 60_000;
          const mine = m.userId === currentUserId;
          return (
            <div key={m.id} className={cn("flex flex-col", grouped ? "" : "mt-2")}>
              {!grouped && (
                <div className="flex items-baseline gap-2 text-xs px-1">
                  <span className={cn("font-semibold", mine ? "text-purple" : "text-white")}>
                    {m.username}
                  </span>
                  <span className="text-ink-muted">{formatTime(m.createdAt)}</span>
                </div>
              )}
              <div className="text-sm text-white whitespace-pre-wrap break-words px-3.5 py-2 rounded-[14px] bg-white/5 self-start max-w-full mt-0.5">
                {m.body}
              </div>
            </div>
          );
        })}
      </div>

      <TypingIndicator
        typingUserIds={typingUserIds}
        members={members}
        currentUserId={currentUserId}
      />

      {showPicker && (
        <div className="border-t border-white/10">
          <Picker onSelect={insertEmoji} />
        </div>
      )}

      <form
        onSubmit={submit}
        className="border-t border-white/10 p-2.5 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setShowPicker((s) => !s)}
          className="w-9 h-9 rounded-pill bg-white/5 hover:bg-white/10 text-lg leading-none transition"
          aria-label="Insert emoji"
        >
          😀
        </button>
        <input
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onBlur={() => onTyping(false)}
          maxLength={2000}
          placeholder={connected ? "Message" : "Connecting…"}
          disabled={!connected}
          className="flex-1 px-4 py-2 rounded-pill bg-white/5 border border-white/10 focus:border-purple outline-none text-sm disabled:opacity-50 transition"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="btn-primary text-sm px-5 py-2"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function elapsed(a: string, b: string) {
  return new Date(b).getTime() - new Date(a).getTime();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
