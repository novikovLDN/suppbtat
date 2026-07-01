const KEY = 'atlas_sound';

export function isSoundOn(): boolean {
  return localStorage.getItem(KEY) !== 'off';
}
export function setSoundOn(on: boolean) {
  localStorage.setItem(KEY, on ? 'on' : 'off');
}

let ctx: AudioContext | null = null;

/** Short, restrained two-tone chime via WebAudio (no asset needed). */
export function playChime() {
  if (!isSoundOn()) return;
  try {
    ctx = ctx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    const notes = [880, 1174.7];
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.09;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  } catch {
    /* ignore */
  }
}
