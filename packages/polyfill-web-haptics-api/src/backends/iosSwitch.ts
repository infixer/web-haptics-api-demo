import { EFFECT_PROFILES } from "../effects.js";
import type { HapticEffect } from "../types.js";
import type { Backend } from "./types.js";

/**
 * iOS Safari has no Vibration API, but toggling a `<input type="checkbox" switch>`
 * produces a real system haptic tap (iOS 17.4+). Clicking a hidden one is the
 * only way to reach the Taptic Engine from the web.
 *
 * The catch: it is one fixed tap. There is no duration and no strength, so
 * `hint`, `tick` and `align` are indistinguishable here and weight can only be
 * approximated by tapping more than once.
 */
const REPEAT_GAP_MS = 22;

let host: HTMLLabelElement | null = null;

function ensureHost(): HTMLLabelElement | null {
  if (host?.isConnected) return host;
  if (typeof document === "undefined" || !document.body) return null;

  const id = `whp-switch-${Math.random().toString(36).slice(2, 10)}`;
  const label = document.createElement("label");
  label.setAttribute("for", id);
  label.setAttribute("aria-hidden", "true");
  label.style.cssText =
    "position:fixed;width:1px;height:1px;left:-9999px;top:0;pointer-events:none;opacity:0";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.id = id;
  input.tabIndex = -1;
  input.style.cssText = "all:initial;appearance:auto";

  label.appendChild(input);
  document.body.appendChild(label);
  host = label;
  return label;
}

export const iosSwitchBackend: Backend = {
  id: "ios-switch",

  probe() {
    if (typeof document === "undefined") return false;
    // `switch` is only a meaningful attribute where Safari implements the
    // switch control. Everywhere else this is a plain checkbox and clicking it
    // does nothing perceptible, so we would rather fall through to another
    // backend than mash an invisible checkbox forever.
    const probeInput = document.createElement("input");
    probeInput.type = "checkbox";
    return "switch" in probeInput;
  },

  play(effect: HapticEffect, _intensity: number) {
    const label = ensureHost();
    if (!label) return;

    const taps = EFFECT_PROFILES[effect].iosTaps;
    label.click();
    for (let i = 1; i < taps; i++) {
      setTimeout(() => label.click(), REPEAT_GAP_MS * i);
    }
  },

  dispose() {
    host?.remove();
    host = null;
  },
};
