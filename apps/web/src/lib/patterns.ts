import type { HapticEffect } from "@infixer/polyfill-web-haptics-api/manual";
import { haptics } from "./haptics.svelte.js";

export interface Step {
  effect: HapticEffect;
  intensity?: number;
  /** Delay before this step, measured from the previous one. */
  after?: number;
}

export interface Pattern {
  id: string;
  label: string;
  /** Shown only after a card is revealed, or in assist mode. */
  glyph: string;
  steps: Step[];
}

/**
 * Six patterns built only from the four standard effects.
 *
 * They are separated mostly by *count and rhythm*, not by which effect is used.
 * That is deliberate: on iOS the switch backend collapses `hint`, `tick` and
 * `align` into one identical tap, so a vocabulary that leans on effect identity
 * would be unplayable there. Rhythm survives every backend.
 */
export const PATTERNS: readonly Pattern[] = [
  {
    id: "tap",
    label: "タップ",
    glyph: "•",
    steps: [{ effect: "tick", intensity: 0.7 }],
  },
  {
    id: "double",
    label: "ダブル",
    glyph: "• •",
    steps: [
      { effect: "tick", intensity: 0.7 },
      { effect: "tick", intensity: 0.7, after: 130 },
    ],
  },
  {
    id: "triple",
    label: "トリプル",
    glyph: "• • •",
    steps: [
      { effect: "tick", intensity: 0.6 },
      { effect: "tick", intensity: 0.6, after: 105 },
      { effect: "tick", intensity: 0.6, after: 105 },
    ],
  },
  {
    id: "thud",
    label: "ドン",
    glyph: "●",
    steps: [{ effect: "edge", intensity: 1 }],
  },
  {
    id: "knock",
    label: "ノック",
    glyph: "● ●",
    steps: [
      { effect: "edge", intensity: 1 },
      { effect: "edge", intensity: 1, after: 240 },
    ],
  },
  {
    id: "swell",
    label: "スウェル",
    glyph: "· • ●",
    steps: [
      { effect: "hint", intensity: 0.4 },
      { effect: "tick", intensity: 0.7, after: 95 },
      { effect: "align", intensity: 1, after: 95 },
    ],
  },
];

export function patternById(id: string): Pattern | undefined {
  return PATTERNS.find((p) => p.id === id);
}

export function patternDurationMs(pattern: Pattern): number {
  return pattern.steps.reduce((total, step) => total + (step.after ?? 0), 0);
}

/**
 * Plays a pattern, resolving when the last step has been dispatched.
 *
 * "Dispatched" is as precise as it gets: `playHaptics` returns immediately and
 * never reports when the effect finished, so the schedule is ours alone.
 */
export function playPattern(pattern: Pattern, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();

    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    const finish = () => {
      for (const t of timers) clearTimeout(t);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    signal?.addEventListener("abort", finish, { once: true });

    for (const step of pattern.steps) {
      elapsed += step.after ?? 0;
      const fire = () => haptics.play(step.effect, step.intensity ?? 1);
      if (elapsed === 0) fire();
      else timers.push(setTimeout(fire, elapsed));
    }

    timers.push(setTimeout(finish, elapsed + 60));
  });
}

/** Fisher–Yates, so the deck order is not biased. */
export function shuffle<T>(input: readonly T[]): T[] {
  const out = [...input];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
