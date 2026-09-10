import { EFFECT_PROFILES } from "../effects.js";
import type { HapticEffect } from "../types.js";
import type { Backend } from "./types.js";

/**
 * NOT IN THE LADDER. Kept as the record of a technique that stopped working.
 *
 * iOS Safari has no Vibration API. Toggling an `<input type="checkbox" switch>`
 * produces a real system haptic tap — added in **iOS 18.0**, not 17.4 (17.4
 * shipped the `switch` attribute; the haptic came a release later), and
 * explicitly allowed on the click path by WebKit bug #271711.
 *
 * It no longer works. WebKit bug #285120 (2025-01-03) first required user
 * activation, and iOS later stopped honouring synthetic clicks altogether: as
 * of the devices we tested, only a direct finger tap on the control fires the
 * haptic. Apple documented none of this. Verified on device against four
 * separate implementations, including the upstream `web-haptics` library this
 * file was modelled on — see `docs/FINDINGS-ios-switch.md`.
 *
 * `probe()` cannot detect any of that: the API reports nothing back, so
 * "the attribute exists" is the most it can ever know. That is why this
 * backend is unlisted rather than fixed.
 *
 * The only technique that still reaches the Taptic Engine is to put a real
 * switch under the user's own finger (an invisible one overlaid on a button),
 * which cannot serve an imperative `playHaptics()` call and so has no place in
 * a polyfill for it.
 *
 * The original caveat still stands on top of all that: it is one fixed tap,
 * with no duration and no strength, so `hint`, `tick` and `align` collapse
 * into the same sensation and weight can only be faked by tapping twice.
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
