/**
 * Explicit entry point, for when the polyfill needs options or must be
 * installed at a controlled moment (SSR, tests, feature flags).
 *
 *     import { install } from "@infixer/polyfill-web-haptics-api/manual";
 *     install({ simulator: import.meta.env.DEV });
 */
export { install, uninstall, type InstallOptions } from "./install.js";
export type { BackendId } from "./backends/types.js";
export type { HapticEffect } from "./types.js";
