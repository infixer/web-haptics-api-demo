/**
 * `navigator.vibrate` has no concept of strength: the motor is either on or
 * off. Strength is faked by chopping the on-time into a fast on/off train and
 * varying the duty cycle — the same trick the `web-haptics` library uses.
 */
const FRAME_MS = 20;

/**
 * Renders `durationMs` of vibration at `strength` as an alternating
 * on/off/on/off list suitable for `navigator.vibrate`.
 *
 * Below one frame there is no room for a duty cycle — a single 12ms pulse
 * cannot be "60% strong", it can only be shorter. So short effects scale their
 * duration instead, which is what the motor's spin-up actually renders as a
 * weaker tap. Only effects long enough to hold several frames get real PWM.
 */
export function renderPulse(durationMs: number, strength: number): number[] {
  if (strength <= 0 || durationMs <= 0) return [];
  if (strength >= 1) return [Math.round(durationMs)];

  if (durationMs < FRAME_MS * 2) {
    // Scale the pulse width. Keep a floor so it never rounds away to nothing.
    return [Math.max(1, Math.round(durationMs * (0.35 + 0.65 * strength)))];
  }

  const out: number[] = [];
  let remaining = Math.round(durationMs);
  while (remaining >= FRAME_MS) {
    const on = Math.max(1, Math.round(FRAME_MS * strength));
    out.push(on, FRAME_MS - on);
    remaining -= FRAME_MS;
  }
  if (remaining > 0) {
    const on = Math.max(1, Math.round(remaining * strength));
    out.push(on);
    if (remaining - on > 0) out.push(remaining - on);
  }
  // A pattern must not end on an off-slice; it is wasted time.
  if (out.length % 2 === 0) out.pop();
  return out;
}
