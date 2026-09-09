/**
 * The four semantic effects defined by the Web Haptics API proposal.
 * @see https://github.com/WICG/web-haptics
 */
export type HapticEffect = "hint" | "edge" | "tick" | "align";

export const HAPTIC_EFFECTS: readonly HapticEffect[] = ["hint", "edge", "tick", "align"];

export function isHapticEffect(value: unknown): value is HapticEffect {
  return typeof value === "string" && (HAPTIC_EFFECTS as readonly string[]).includes(value);
}

declare global {
  interface Navigator {
    /**
     * Plays a semantic haptic effect. Always returns `undefined` — the API
     * deliberately reveals nothing about the device or whether the effect
     * was rendered.
     */
    playHaptics?(effect: HapticEffect, intensity?: number): undefined;
  }
}
