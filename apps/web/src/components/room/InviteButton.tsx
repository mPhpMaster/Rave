"use client";

import { useState } from "react";

export default function InviteButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/room/join/${inviteCode}`
        : `/room/join/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for non-secure-context: select-and-prompt.
      window.prompt("Copy this invite link:", url);
    }
  }

  return (
    <button
      onClick={copy}
      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"
    >
      {copied ? "Link copied" : "Copy invite link"}
    </button>
  );
}
