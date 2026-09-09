import { browser } from "$app/environment";
import type { HapticEffect } from "@infixer/polyfill-web-haptics-api/manual";
import { install } from "@infixer/polyfill-web-haptics-api/manual";
import {
  getDiagnostics,
  setBackend,
  setSimulatorEnabled,
  type BackendId,
} from "@infixer/polyfill-web-haptics-api/debug";
import { installCssHaptics } from "@infixer/polyfill-web-haptics-api/css";

export type { HapticEffect, BackendId };

/** One entry in the on-screen monitor, so an audience can see what they cannot feel. */
export interface FiredEffect {
  id: number;
  effect: HapticEffect;
  intensity: number;
  at: number;
}

/** What the user told us, because no API can tell us. */
export type Felt = "unknown" | "yes" | "faint" | "no";

const MONITOR_LENGTH = 24;

let nextId = 0;

class Haptics {
  ready = $state(false);
  /** Backend the polyfill settled on, or "native" when the browser has the API. */
  backend = $state<BackendId | "native" | null>(null);
  available = $state<BackendId[]>([]);
  native = $state(false);
  simulator = $state(false);
  cssEnabled = $state(true);
  felt = $state<Felt>("unknown");
  recent = $state<FiredEffect[]>([]);

  /** True once the user has interacted; nothing can fire before that. */
  activated = $state(false);

  start() {
    if (!browser || this.ready) return;

    install({ simulator: false });
    installCssHaptics();
    this.ready = true;
    this.refresh();

    // Re-probe after the first interaction: sticky activation flips, and a
    // gamepad only becomes visible once it has been used.
    addEventListener("pointerdown", () => this.refresh(), { once: true, passive: true });
    addEventListener("gamepadconnected", () => this.refresh());
  }

  refresh() {
    if (!this.ready) return;
    const d = getDiagnostics();
    this.native = d.native;
    this.backend = d.native ? "native" : d.active;
    this.available = d.available;
    this.activated = d.hasStickyActivation;
  }

  /**
   * The app's single entry point for haptics. It calls the standard API and
   * separately records the request for the monitor — the API itself reports
   * nothing back, so anything on screen is what we *asked for*, not what the
   * device did.
   */
  play(effect: HapticEffect, intensity = 1) {
    navigator.playHaptics?.(effect, intensity);

    const entry: FiredEffect = { id: nextId++, effect, intensity, at: performance.now() };
    const next = [entry, ...this.recent];
    this.recent = next.length > MONITOR_LENGTH ? next.slice(0, MONITOR_LENGTH) : next;
  }

  useSimulator(enabled: boolean) {
    this.simulator = enabled;
    setSimulatorEnabled(enabled);
    this.refresh();
  }

  pin(id: BackendId | "auto") {
    setBackend(id);
    this.refresh();
  }

  useCss(enabled: boolean) {
    this.cssEnabled = enabled;
  }
}

export const haptics = new Haptics();
