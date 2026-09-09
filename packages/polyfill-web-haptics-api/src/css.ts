/**
 * A declarative layer in the spirit of the proposal's `@haptic` rule.
 *
 * ## Why this is not `@haptic`
 *
 * The proposal writes haptics as an at-rule inside a style rule:
 *
 *     button:active { scale: 0.95; @haptic align 0.8; }
 *
 * That cannot be polyfilled. Unknown at-rules are dropped during parsing, so
 * `@haptic` never reaches the CSSOM and script has no way to see it. Re-fetching
 * and re-parsing every stylesheet by hand would still miss inline `<style>`
 * mutations, CSSOM edits, and anything cross-origin.
 *
 * Custom properties survive parsing and are readable via `getComputedStyle`, so
 * that is what this uses instead. The remaining problem is *when* to read them:
 * the proposal fires when a rule starts matching, and there is no general event
 * for that. Reading `--haptic` at `pointerdown` and hoping `:active` has already
 * been applied is a race.
 *
 * So the state is named in the property instead of the selector:
 *
 *     button { --haptic-active: align 0.8; --haptic-hover: hint 0.3; }
 *
 * Now the value is readable from the resting state, at any time, with no race.
 * It costs the spec's syntax and covers only the four states below — everything
 * driven by `:has()`, container queries, media queries or class mutation needs
 * the imperative call. That gap is the honest reason this feature wants a real
 * browser implementation rather than a library.
 */
import type { HapticEffect } from "./types.js";
import { isHapticEffect } from "./types.js";

const STATE_PROPS = {
  hover: "--haptic-hover",
  active: "--haptic-active",
  focus: "--haptic-focus",
  checked: "--haptic-checked",
} as const;

type StateName = keyof typeof STATE_PROPS;

let installed = false;
let controller: AbortController | null = null;

/**
 * Custom properties inherit by default, which would make every child of a
 * haptic element inherit its haptics. Registering them as non-inheriting fixes
 * that globally, without asking the author to remember `@property`.
 */
function registerProperties(): void {
  if (typeof CSS === "undefined" || typeof CSS.registerProperty !== "function") return;
  for (const name of Object.values(STATE_PROPS)) {
    try {
      CSS.registerProperty({ name, syntax: "*", inherits: false });
    } catch {
      // Already registered, or the page registered it differently. Either is fine.
    }
  }
}

interface ParsedHaptic {
  effect: HapticEffect;
  intensity: number;
}

/** Parses `"tick 0.8"` / `"align"` / `"none"`. */
function parse(value: string): ParsedHaptic | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "none") return null;

  const [effect, rawIntensity] = trimmed.split(/\s+/, 2);
  if (!isHapticEffect(effect)) return null;

  const intensity = rawIntensity === undefined ? 1 : Number(rawIntensity);
  if (!Number.isFinite(intensity)) return { effect, intensity: 1 };
  return { effect, intensity: Math.min(1, Math.max(0, intensity)) };
}

function read(el: Element, state: StateName): ParsedHaptic | null {
  const value = getComputedStyle(el).getPropertyValue(STATE_PROPS[state]);
  return value ? parse(value) : null;
}

function fire(target: EventTarget | null, state: StateName): void {
  if (!(target instanceof Element)) return;
  // Registered as non-inheriting, so this is the element's own declaration —
  // but the event target is often a child (the text inside a button), so walk up.
  for (let el: Element | null = target; el; el = el.parentElement) {
    const parsed = read(el, state);
    if (parsed) {
      navigator.playHaptics?.(parsed.effect, parsed.intensity);
      return;
    }
  }
}

export interface CssHapticsOptions {
  /** Root to listen on. Default `document`. */
  root?: Document | ShadowRoot;
}

export function installCssHaptics(options: CssHapticsOptions = {}): void {
  if (installed || typeof document === "undefined") return;
  const root = options.root ?? document;

  registerProperties();
  controller = new AbortController();
  const { signal } = controller;
  const opts = { capture: true, passive: true, signal } as const;

  root.addEventListener(
    "pointerover",
    (e) => {
      // Touch fires pointerover on tap; a "hover" buzz there is just noise.
      if ((e as PointerEvent).pointerType !== "mouse") return;
      fire(e.target, "hover");
    },
    opts,
  );

  root.addEventListener("pointerdown", (e) => fire(e.target, "active"), opts);
  root.addEventListener("focusin", (e) => fire(e.target, "focus"), opts);

  root.addEventListener(
    "change",
    (e) => {
      const el = e.target;
      // Only when entering the checked state, mirroring `:checked` starting to match.
      if (el instanceof HTMLInputElement && !el.checked) return;
      fire(el, "checked");
    },
    opts,
  );

  installed = true;
}

export function uninstallCssHaptics(): void {
  controller?.abort();
  controller = null;
  installed = false;
}

export { STATE_PROPS };
