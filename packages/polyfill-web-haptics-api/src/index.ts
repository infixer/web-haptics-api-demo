/**
 * Side-effect entry point. Importing this installs `navigator.playHaptics`
 * if — and only if — the browser does not already have it.
 *
 *     import "@infixer/polyfill-web-haptics-api";
 *     navigator.playHaptics("tick", 0.6);
 *
 * When the feature ships, deleting the import is the entire migration.
 */
import { install } from "./install.js";

install();

export type { HapticEffect } from "./types.js";
