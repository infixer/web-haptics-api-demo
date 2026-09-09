import type { HapticEffect } from "./types.js";

/**
 * How each semantic effect is realised on a backend that only understands
 * "run the motor for N milliseconds at strength S".
 *
 * These numbers are the polyfill's interpretation of the effect *descriptions*
 * in the explainer, not part of the spec. A native implementation would map
 * each effect onto an OS primitive (Core Haptics, VibrationEffect, ...) and is
 * free to feel completely different — that is the point of a semantic API.
 */
export interface EffectProfile {
  /** Nominal on-time in milliseconds. */
  readonly durationMs: number;
  /** Nominal strength, 0–1, before the caller's `intensity` is applied. */
  readonly strength: number;
  /**
   * How many discrete taps the iOS switch backend should emit. iOS gives us a
   * fixed-size tick and nothing else, so weight can only be faked with count.
   */
  readonly iosTaps: number;
}

export const EFFECT_PROFILES: Readonly<Record<HapticEffect, EffectProfile>> = {
  /** "something is interactive / an action may follow" — barely there. */
  hint: { durationMs: 10, strength: 0.3, iosTaps: 1 },
  /** "a discrete change" — a clean, unmistakable single tap. */
  tick: { durationMs: 12, strength: 0.6, iosTaps: 1 },
  /** "locked into place" — short but hard. */
  align: { durationMs: 15, strength: 1.0, iosTaps: 1 },
  /** "you have hit a limit" — the heaviest of the four. */
  edge: { durationMs: 35, strength: 0.9, iosTaps: 2 },
};

/** Clamps a caller-supplied intensity to the spec's 0–1 range, defaulting to 1. */
export function normalizeIntensity(intensity: unknown): number {
  if (intensity === undefined) return 1;
  const n = Number(intensity);
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0, n));
}
