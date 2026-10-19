import type { SfxName } from "./types";

let ctx: AudioContext | null = null;

const NOTES: Record<SfxName, Array<[freq: number, ms: number]>> = {
  good: [[660, 70], [990, 90]],
  bad: [[220, 120], [160, 160]],
  level: [[523, 90], [659, 90], [784, 140]],
  win: [[523, 100], [659, 100], [784, 100], [1047, 220]],
  lose: [[392, 140], [330, 140], [262, 260]],
  click: [[880, 40]],
};

/** Tiny synth beeps so games have sound without any audio files. */
export function playSfx(name: SfxName) {
  if (typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    let t = ctx.currentTime;
    for (const [freq, ms] of NOTES[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = name === "bad" || name === "lose" ? "sawtooth" : "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + ms / 1000);
      t += ms / 1000;
    }
  } catch {
    // Audio is a nice-to-have.
  }
}
