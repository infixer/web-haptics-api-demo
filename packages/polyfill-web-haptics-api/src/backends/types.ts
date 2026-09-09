import type { HapticEffect } from "../types.js";

export type BackendId = "vibrate" | "ios-switch" | "gamepad" | "simulator";

export interface Backend {
  readonly id: BackendId;
  /**
   * Whether this backend has something to drive *right now*.
   *
   * This is deliberately never surfaced through `navigator.playHaptics`. It
   * decides which backend the polyfill drives internally; it does not tell the
   * page whether the user will actually feel anything, because no web API can.
   * `navigator.vibrate` on Firefox for Android is the standing counter-example:
   * it exists, it returns `true`, and nothing moves.
   */
  probe(): boolean;
  play(effect: HapticEffect, intensity: number): void;
  dispose?(): void;
}
