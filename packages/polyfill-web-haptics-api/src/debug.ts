/**
 * Everything here is NOT part of the Web Haptics API and never will be.
 *
 * The real API tells a page nothing: `playHaptics` returns `undefined`, there
 * is no capability query, and that is a deliberate anti-fingerprinting choice.
 * A polyfill, however, knows exactly what it is doing internally, and a page
 * that wants to help the user pick a working setup needs to see it.
 *
 * It lives behind a separate import so that this knowledge can never leak into
 * code that is meant to run against the native API.
 */
export { readState as getDiagnostics, setBackend, setSimulatorEnabled } from "./install.js";
export { configureSimulator, type SimulatorOptions } from "./backends/simulator.js";
export { EFFECT_PROFILES, type EffectProfile } from "./effects.js";
export { HAPTIC_EFFECTS } from "./types.js";
export type { BackendId } from "./backends/types.js";
