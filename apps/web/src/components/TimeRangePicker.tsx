"use client";

import { useCallback, useId, useMemo, useState } from "react";

/**
 * TimeRangePicker
 *
 * A user-friendly, mobile-responsive dual-thumb range slider for picking a
 * start → end time within a single day. Built on two overlapping native
 * `<input type="range">` elements so it stays fully keyboard accessible and
 * works with touch out of the box.
 *
 * Times are tracked internally as "minutes since midnight" (0–1440) which
 * keeps the math simple and snaps cleanly to the chosen step.
 */

const DAY_MINUTES = 24 * 60; // 1440

export type TimeRange = {
  /** Minutes since midnight, 0–1440. */
  start: number;
  /** Minutes since midnight, 0–1440. */
  end: number;
};

type Props = {
  value?: TimeRange;
  defaultValue?: TimeRange;
  onChange?: (range: TimeRange) => void;
  /** Snap interval in minutes. Defaults to 15. */
  step?: number;
  /** Smallest allowed gap between start and end, in minutes. Defaults to `step`. */
  minGap?: number;
  /** Use 24-hour labels instead of AM/PM. Defaults to false. */
  use24Hour?: boolean;
  label?: string;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function snap(n: number, step: number) {
  return Math.round(n / step) * step;
}

/** Format minutes-since-midnight as a human label, e.g. "9:30 AM" or "21:30". */
export function formatTime(minutes: number, use24Hour = false): string {
  const m = clamp(Math.round(minutes), 0, DAY_MINUTES);
  // 1440 reads nicely as "Midnight" (end of day) rather than 0:00.
  if (m === DAY_MINUTES) return use24Hour ? "24:00" : "Midnight";
  const h = Math.floor(m / 60);
  const min = m % 60;
  const mm = String(min).padStart(2, "0");
  if (use24Hour) return `${String(h).padStart(2, "0")}:${mm}`;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${period}`;
}

/** Human-friendly duration, e.g. "2h 30m". */
function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const PRESETS: { label: string; range: TimeRange }[] = [
  { label: "Morning", range: { start: 6 * 60, end: 12 * 60 } },
  { label: "Afternoon", range: { start: 12 * 60, end: 17 * 60 } },
  { label: "Evening", range: { start: 17 * 60, end: 22 * 60 } },
  { label: "All day", range: { start: 0, end: DAY_MINUTES } }
];

export default function TimeRangePicker({
  value,
  defaultValue = { start: 9 * 60, end: 17 * 60 },
  onChange,
  step = 15,
  minGap,
  use24Hour = false,
  label = "Select a time range"
}: Props) {
  const gap = minGap ?? step;
  const uid = useId();

  // Controlled if `value` is provided, otherwise manage state internally.
  const [internal, setInternal] = useState<TimeRange>(defaultValue);
  const range = value ?? internal;

  const commit = useCallback(
    (next: TimeRange) => {
      if (value === undefined) setInternal(next);
      onChange?.(next);
    },
    [value, onChange]
  );

  const setStart = useCallback(
    (raw: number) => {
      const start = clamp(snap(raw, step), 0, range.end - gap);
      commit({ start, end: range.end });
    },
    [commit, gap, range.end, step]
  );

  const setEnd = useCallback(
    (raw: number) => {
      const end = clamp(snap(raw, step), range.start + gap, DAY_MINUTES);
      commit({ start: range.start, end });
    },
    [commit, gap, range.start, step]
  );

  const isPresetActive = useCallback(
    (r: TimeRange) => r.start === range.start && r.end === range.end,
    [range.start, range.end]
  );

  const leftPct = (range.start / DAY_MINUTES) * 100;
  const rightPct = (range.end / DAY_MINUTES) * 100;
  const duration = useMemo(() => range.end - range.start, [range.start, range.end]);

  return (
    <div className="trp glass-strong" role="group" aria-label={label}>
      <div className="trp__head">
        <span className="trp__label">{label}</span>
        <span className="trp__duration">{formatDuration(duration)}</span>
      </div>

      {/* Big, legible readout of the selected window. */}
      <div className="trp__readout">
        <div className="trp__pill">
          <span className="trp__pill-cap">From</span>
          <span className="trp__pill-time">{formatTime(range.start, use24Hour)}</span>
        </div>
        <div className="trp__arrow" aria-hidden>
          →
        </div>
        <div className="trp__pill">
          <span className="trp__pill-cap">To</span>
          <span className="trp__pill-time">{formatTime(range.end, use24Hour)}</span>
        </div>
      </div>

      {/* The dual-thumb slider. */}
      <div className="trp__slider">
        <div className="trp__rail" />
        <div
          className="trp__fill"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />

        <input
          type="range"
          className="trp__input trp__input--start"
          min={0}
          max={DAY_MINUTES}
          step={step}
          value={range.start}
          onChange={(e) => setStart(Number(e.target.value))}
          aria-label={`Start time, currently ${formatTime(range.start, use24Hour)}`}
          aria-valuetext={formatTime(range.start, use24Hour)}
          // Keep the active thumb on top when the two are close together.
          style={{ zIndex: range.start > DAY_MINUTES - gap * 2 ? 5 : 3 }}
        />
        <input
          type="range"
          className="trp__input trp__input--end"
          min={0}
          max={DAY_MINUTES}
          step={step}
          value={range.end}
          onChange={(e) => setEnd(Number(e.target.value))}
          aria-label={`End time, currently ${formatTime(range.end, use24Hour)}`}
          aria-valuetext={formatTime(range.end, use24Hour)}
        />
      </div>

      {/* Hour ticks for orientation. */}
      <div className="trp__ticks" aria-hidden>
        {[0, 6, 12, 18, 24].map((h) => (
          <span key={h}>{use24Hour ? `${h}:00` : formatTime(h * 60, false)}</span>
        ))}
      </div>

      {/* Quick presets. */}
      <div className="trp__presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={`trp__preset ${isPresetActive(p.range) ? "is-active" : ""}`}
            aria-pressed={isPresetActive(p.range)}
            onClick={() => commit(p.range)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <style jsx>{`
        .trp {
          --thumb: 26px;
          width: 100%;
          max-width: 460px;
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .trp__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .trp__label {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .trp__duration {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--purple);
          background: rgba(139, 92, 246, 0.14);
          border: 1px solid rgba(139, 92, 246, 0.3);
          padding: 3px 10px;
          border-radius: var(--radius-pill);
        }

        .trp__readout {
          display: flex;
          align-items: stretch;
          gap: 10px;
        }
        .trp__pill {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .trp__pill-cap {
          font-size: 0.68rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .trp__pill-time {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }
        .trp__arrow {
          align-self: center;
          color: var(--text-muted);
          font-size: 1.1rem;
        }

        .trp__slider {
          position: relative;
          height: var(--thumb);
          display: flex;
          align-items: center;
        }
        .trp__rail {
          position: absolute;
          left: 0;
          right: 0;
          height: 8px;
          border-radius: var(--radius-pill);
          background: rgba(255, 255, 255, 0.08);
        }
        .trp__fill {
          position: absolute;
          height: 8px;
          border-radius: var(--radius-pill);
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
          box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
        }

        /* Both range inputs share the same footprint; only the thumbs
           receive pointer events so each is independently grabbable. */
        .trp__input {
          position: absolute;
          left: 0;
          width: 100%;
          height: var(--thumb);
          margin: 0;
          background: transparent;
          pointer-events: none;
          -webkit-appearance: none;
          appearance: none;
        }
        .trp__input:focus {
          outline: none;
        }

        .trp__input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          pointer-events: auto;
          width: var(--thumb);
          height: var(--thumb);
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid var(--purple);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
          cursor: grab;
          transition: transform 0.12s ease, box-shadow 0.12s ease,
            border-color 0.12s ease;
        }
        .trp__input::-moz-range-thumb {
          pointer-events: auto;
          width: var(--thumb);
          height: var(--thumb);
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid var(--purple);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
          cursor: grab;
        }

        .trp__input:active::-webkit-slider-thumb {
          cursor: grabbing;
          transform: scale(1.12);
          border-color: var(--pink);
        }
        .trp__input:focus-visible::-webkit-slider-thumb {
          box-shadow: 0 0 0 6px rgba(139, 92, 246, 0.3);
        }
        .trp__input:active::-moz-range-thumb {
          cursor: grabbing;
          border-color: var(--pink);
        }
        .trp__input:focus-visible::-moz-range-thumb {
          box-shadow: 0 0 0 6px rgba(139, 92, 246, 0.3);
        }

        .trp__ticks {
          display: flex;
          justify-content: space-between;
          font-size: 0.68rem;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
          margin-top: -6px;
        }

        .trp__presets {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .trp__preset {
          flex: 1 1 auto;
          min-width: 72px;
          padding: 9px 12px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .trp__preset:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }
        .trp__preset.is-active {
          color: #fff;
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
          border-color: transparent;
          box-shadow: 0 0 18px rgba(139, 92, 246, 0.35);
        }

        @media (max-width: 420px) {
          .trp {
            padding: 16px;
          }
          .trp__pill-time {
            font-size: 1.05rem;
          }
        }
      `}</style>
      {/* uid kept for potential future label associations */}
      <span hidden id={uid} />
    </div>
  );
}
