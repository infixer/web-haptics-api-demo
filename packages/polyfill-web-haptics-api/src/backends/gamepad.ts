import { EFFECT_PROFILES } from "../effects.js";
import type { HapticEffect } from "../types.js";
import type { Backend } from "./types.js";

/**
 * The quiet irony of web haptics: `GamepadHapticActuator.playEffect()` takes an
 * explicit duration and magnitude, so a connected controller is the only
 * standardised way to get precisely-timed haptics in a browser — including on
 * desktop, where the Vibration API does not exist at all.
 */
function firstActuator(): GamepadHapticActuator | null {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return null;
  for (const pad of navigator.getGamepads()) {
    if (pad?.connected && pad.vibrationActuator) return pad.vibrationActuator;
  }
  return null;
}

export const gamepadBackend: Backend = {
  id: "gamepad",

  probe() {
    return firstActuator() !== null;
  },

  play(effect: HapticEffect, intensity: number) {
    const actuator = firstActuator();
    if (!actuator) return;
    const profile = EFFECT_PROFILES[effect];
    void actuator
      .playEffect("dual-rumble", {
        duration: profile.durationMs,
        strongMagnitude: profile.strength * intensity,
        weakMagnitude: profile.strength * intensity * 0.4,
      })
      .catch(() => {
        /* The spec resolves this promise with "preempted" routinely. Ignore. */
      });
  },
};
