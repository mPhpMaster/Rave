"use client";

import type { RoomMember } from "@/types/events";

interface Props {
  members: RoomMember[];
  hostId: string;
  currentUserId: string;
}

export default function MemberList({ members, hostId, currentUserId }: Props) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900">
      <div className="px-4 py-3 border-b border-neutral-800 text-sm font-semibold flex justify-between">
        <span>Watching</span>
        <span className="text-neutral-500">{members.length}</span>
      </div>
      <ul className="divide-y divide-neutral-800">
        {members.map((m) => (
          <li key={m.userId} className="px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="truncate">
              {m.username}
              {m.userId === currentUserId && (
                <span className="ml-2 text-neutral-500">(you)</span>
              )}
            </span>
            {m.userId === hostId && (
              <span className="text-xs px-2 py-0.5 rounded bg-brand/20 text-brand">
                host
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
