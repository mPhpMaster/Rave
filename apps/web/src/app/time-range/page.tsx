"use client";

import { useState } from "react";
import TimeRangePicker, {
  formatTime,
  type TimeRange
} from "@/components/TimeRangePicker";

export default function TimeRangeDemoPage() {
  const [range, setRange] = useState<TimeRange>({ start: 9 * 60, end: 17 * 60 });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-8 px-4 py-12">
      <header className="text-center">
        <h1 className="bg-brand-gradient bg-clip-text text-3xl font-bold text-transparent">
          Time Range Picker
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Drag either handle, tap a preset, or use the arrow keys. Fully touch &
          keyboard friendly.
        </p>
      </header>

      <TimeRangePicker
        label="When are you free to watch?"
        value={range}
        onChange={setRange}
        step={15}
      />

      <div className="glass w-full max-w-[460px] rounded-xl p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-ink-muted">
          Selected value
        </p>
        <p className="mt-1 font-mono text-ink">
          {formatTime(range.start)} &rarr; {formatTime(range.end)}
        </p>
      </div>
    </main>
  );
}
