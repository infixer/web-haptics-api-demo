import { EFFECT_PROFILES } from "../effects.js";
import { renderPulse } from "../pwm.js";
import type { HapticEffect } from "../types.js";
import type { Backend } from "./types.js";

/** Chromium on Android. The only engine that still ships a working Vibration API. */
export const vibrateBackend: Backend = {
  id: "vibrate",

  probe() {
    return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  },

  play(effect: HapticEffect, intensity: number) {
    const profile = EFFECT_PROFILES[effect];
    const pattern = renderPulse(profile.durationMs, profile.strength * intensity);
    if (pattern.length === 0) return;
    navigator.vibrate(pattern);
  },
};
