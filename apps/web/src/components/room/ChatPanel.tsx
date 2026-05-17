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
    <div className="text-xs text-neutral-500 px-3 py-2">Loading…</div>
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

  // Autoscroll to bottom when messages or typing change.
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
    <div className="flex flex-col h-full rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-800 text-sm font-semibold">
        Chat
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-xs text-neutral-500 text-center py-4">
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
                <div className="flex items-baseline gap-2 text-xs">
                  <span className={cn("font-semibold", mine ? "text-brand" : "text-neutral-200")}>
                    {m.username}
                  </span>
                  <span className="text-neutral-600">{formatTime(m.createdAt)}</span>
                </div>
              )}
              <div className="text-sm text-neutral-100 whitespace-pre-wrap break-words">
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
        <div className="border-t border-neutral-800">
          <Picker onSelect={insertEmoji} />
        </div>
      )}

      <form
        onSubmit={submit}
        className="border-t border-neutral-800 p-2 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setShowPicker((s) => !s)}
          className="w-9 h-9 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-lg leading-none"
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
          className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-brand outline-none text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="px-3 py-2 rounded-lg bg-brand hover:bg-brand-dark font-semibold text-sm disabled:opacity-50"
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
