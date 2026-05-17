"use client";

import type { RoomMember } from "@/types/events";

interface Props {
  typingUserIds: string[];
  members: RoomMember[];
  currentUserId: string;
}

export default function TypingIndicator({ typingUserIds, members, currentUserId }: Props) {
  const others = typingUserIds.filter((id) => id !== currentUserId);
  if (others.length === 0) {
    return <div className="h-5" aria-hidden />;
  }
  const names = others
    .slice(0, 3)
    .map((id) => members.find((m) => m.userId === id)?.username ?? "someone");
  const extra = others.length - names.length;
  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing…`
      : `${names.join(", ")}${extra > 0 ? ` and ${extra} more` : ""} are typing…`;

  return <div className="h-5 text-xs text-neutral-500 px-3 truncate">{label}</div>;
}
