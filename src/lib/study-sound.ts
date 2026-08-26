export type SoundId = "chime" | "bell" | "digital" | "arcade" | "alarm";

export const SOUNDS: { id: SoundId; label: string }[] = [
  { id: "chime", label: "Chime" },
  { id: "bell", label: "Bell" },
  { id: "digital", label: "Digital" },
  { id: "arcade", label: "Arcade" },
  { id: "alarm", label: "Alarm" },
];

const RECIPES: Record<SoundId, { freq: number; dur: number; type: OscillatorType }[]> = {
  chime: [
    { freq: 880, dur: 0.18, type: "sine" },
    { freq: 1174, dur: 0.18, type: "sine" },
    { freq: 1568, dur: 0.4, type: "sine" },
  ],
  bell: [
    { freq: 660, dur: 0.5, type: "triangle" },
    { freq: 990, dur: 0.6, type: "sine" },
  ],
  digital: [
    { freq: 1200, dur: 0.08, type: "square" },
    { freq: 1200, dur: 0.08, type: "square" },
    { freq: 1600, dur: 0.12, type: "square" },
  ],
  arcade: [
    { freq: 523, dur: 0.09, type: "square" },
    { freq: 659, dur: 0.09, type: "square" },
    { freq: 784, dur: 0.09, type: "square" },
    { freq: 1046, dur: 0.2, type: "square" },
  ],
  alarm: [
    { freq: 740, dur: 0.15, type: "sawtooth" },
    { freq: 520, dur: 0.15, type: "sawtooth" },
    { freq: 740, dur: 0.15, type: "sawtooth" },
    { freq: 520, dur: 0.25, type: "sawtooth" },
  ],
};

let ctx: AudioContext | null = null;

export function playSound(id: SoundId, volume = 0.6) {
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = ctx ?? new AC();
    void ctx.resume();
    let t = ctx.currentTime;
    for (const step of RECIPES[id]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = step.type;
      osc.frequency.value = step.freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * 0.3), t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + step.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + step.dur + 0.02);
      t += step.dur * 0.9;
    }
  } catch {
    /* audio unavailable */
  }
}
