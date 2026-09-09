import { EFFECT_PROFILES } from "../effects.js";
import type { HapticEffect } from "../types.js";
import type { Backend } from "./types.js";

/**
 * Not haptics at all — a short filtered noise burst that stands in for one.
 *
 * This exists so the thing can be developed and demonstrated on a laptop, where
 * no other backend can do anything. It is opt-in: a page that silently started
 * making noise because the device has no motor would be worse than silence.
 */
export interface SimulatorOptions {
  /** Play an audible click. Default true. */
  audio?: boolean;
  /** Flash the screen edge. Default false — it gives the game away. */
  visual?: boolean;
}

let options: Required<SimulatorOptions> = { audio: true, visual: false };
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let flash: HTMLDivElement | null = null;

export function configureSimulator(next: SimulatorOptions): void {
  options = { ...options, ...next };
}

function ensureAudio(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
    const seconds = 0.05;
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      // Exponential decay gives the burst a percussive "tock" envelope.
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function ensureFlash(): HTMLDivElement | null {
  if (typeof document === "undefined" || !document.body) return null;
  if (flash?.isConnected) return flash;
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:2147483647;" +
    "box-shadow:inset 0 0 0 0 currentColor;opacity:0;transition:opacity 90ms ease-out;" +
    "background:radial-gradient(circle at 50% 50%, transparent 55%, rgba(255,255,255,.5))";
  document.body.appendChild(el);
  flash = el;
  return el;
}

export const simulatorBackend: Backend = {
  id: "simulator",

  probe() {
    return typeof AudioContext !== "undefined" || typeof document !== "undefined";
  },

  play(effect: HapticEffect, intensity: number) {
    const profile = EFFECT_PROFILES[effect];
    const level = profile.strength * intensity;

    if (options.audio) {
      const audio = ensureAudio();
      if (audio && noise) {
        const src = audio.createBufferSource();
        src.buffer = noise;

        // Heavier effects read as lower and longer; light ones as a thin tick.
        const filter = audio.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 5200 - profile.durationMs * 80;
        filter.Q.value = 6;

        const gain = audio.createGain();
        const t = audio.currentTime;
        const decay = Math.max(0.03, profile.durationMs / 1000);
        gain.gain.setValueAtTime(Math.min(1, level) * 0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

        src.connect(filter).connect(gain).connect(audio.destination);
        src.start(t);
        src.stop(t + decay);
      }
    }

    if (options.visual) {
      const el = ensureFlash();
      if (el) {
        el.style.color = `rgba(255,255,255,${level})`;
        el.style.opacity = String(Math.min(1, level));
        setTimeout(() => (el.style.opacity = "0"), 60);
      }
    }
  },

  dispose() {
    void ctx?.close();
    ctx = null;
    noise = null;
    flash?.remove();
    flash = null;
  },
};
