import { hasStickyActivation, watchActivation } from "./activation.js";
import { gamepadBackend } from "./backends/gamepad.js";
import { iosSwitchBackend } from "./backends/iosSwitch.js";
import { simulatorBackend } from "./backends/simulator.js";
import type { Backend, BackendId } from "./backends/types.js";
import { vibrateBackend } from "./backends/vibrate.js";
import { normalizeIntensity } from "./effects.js";
import { isHapticEffect, type HapticEffect } from "./types.js";

export interface InstallOptions {
  /**
   * Allow the audio/visual stand-in when no real haptic backend is present.
   * Off by default: a page that starts clicking at the user because their
   * laptop has no motor is a worse default than doing nothing.
   */
  simulator?: boolean;
  /** Pin a backend instead of picking the first that probes true. */
  backend?: BackendId | "auto";
}

/**
 * Ordered best-first. `simulator` is never reached unless explicitly enabled.
 */
const LADDER: readonly Backend[] = [
  vibrateBackend,
  iosSwitchBackend,
  gamepadBackend,
  simulatorBackend,
];

interface State {
  installed: boolean;
  native: boolean;
  simulator: boolean;
  pinned: BackendId | "auto";
  resolved: Backend | null;
  /** Set once, so a controller plugged in later is still picked up. */
  resolvedAt: number;
}

const state: State = {
  installed: false,
  native: false,
  simulator: false,
  pinned: "auto",
  resolved: null,
  resolvedAt: 0,
};

/** Re-probing is cheap but not free; a controller can appear at any time. */
const RESOLVE_TTL_MS = 1000;

function resolveBackend(): Backend | null {
  const now = Date.now();
  if (state.resolved && now - state.resolvedAt < RESOLVE_TTL_MS) return state.resolved;

  const candidates = LADDER.filter(
    (b) => b.id !== "simulator" || state.simulator,
  );

  let picked: Backend | null = null;
  if (state.pinned !== "auto") {
    picked = candidates.find((b) => b.id === state.pinned) ?? null;
  } else {
    picked = candidates.find((b) => b.probe()) ?? null;
  }

  state.resolved = picked;
  state.resolvedAt = now;
  return picked;
}

function playHaptics(this: Navigator, effect: HapticEffect, intensity?: number): undefined {
  // The spec says nothing about throwing on a bad effect name, and throwing
  // would leak that the API is present and validating. Ignore quietly.
  if (!isHapticEffect(effect)) return undefined;
  if (!hasStickyActivation()) return undefined;

  resolveBackend()?.play(effect, normalizeIntensity(intensity));
  return undefined;
}

export function install(options: InstallOptions = {}): void {
  if (typeof navigator === "undefined") return;

  state.simulator = options.simulator ?? false;
  state.pinned = options.backend ?? "auto";
  state.resolved = null;

  if (state.installed) return;

  if (typeof navigator.playHaptics === "function") {
    // Already native. Leave it completely alone — that is the whole job.
    state.native = true;
    state.installed = true;
    return;
  }

  watchActivation();

  Object.defineProperty(Navigator.prototype, "playHaptics", {
    value: playHaptics,
    writable: true,
    configurable: true,
    enumerable: false,
  });

  state.installed = true;
}

export function uninstall(): void {
  if (!state.installed || state.native) return;
  for (const backend of LADDER) backend.dispose?.();
  delete (Navigator.prototype as Partial<Navigator>).playHaptics;
  state.installed = false;
  state.resolved = null;
}

/** Internal read-only view, surfaced only through the `/debug` entry point. */
export function readState() {
  return {
    installed: state.installed,
    native: state.native,
    simulatorEnabled: state.simulator,
    pinned: state.pinned,
    active: (resolveBackend()?.id ?? null) as BackendId | null,
    available: LADDER.filter((b) => b.probe()).map((b) => b.id),
    hasStickyActivation: hasStickyActivation(),
  };
}

export function setBackend(id: BackendId | "auto"): void {
  state.pinned = id;
  state.resolved = null;
}

export function setSimulatorEnabled(enabled: boolean): void {
  state.simulator = enabled;
  state.resolved = null;
}
