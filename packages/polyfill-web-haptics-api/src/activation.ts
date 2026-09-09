/**
 * The imperative API requires sticky user activation. There is no permission
 * prompt: either the user has interacted with the page at some point, or the
 * call is a no-op.
 */

let sawInteraction = false;

const ACTIVATION_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

function markInteracted() {
  sawInteraction = true;
  for (const type of ACTIVATION_EVENTS) {
    window.removeEventListener(type, markInteracted, true);
  }
}

export function watchActivation(): void {
  if (typeof window === "undefined") return;
  for (const type of ACTIVATION_EVENTS) {
    window.addEventListener(type, markInteracted, true);
  }
}

export function hasStickyActivation(): boolean {
  // Chromium exposes this directly; everywhere else we track it ourselves.
  const ua = typeof navigator !== "undefined" ? navigator.userActivation : undefined;
  if (ua && typeof ua.hasBeenActive === "boolean") return ua.hasBeenActive;
  return sawInteraction;
}
