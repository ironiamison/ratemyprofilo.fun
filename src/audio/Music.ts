/** Procedural sci-fi ambient loop — no external audio files. */
export class SpaceMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private pads: { osc: OscillatorNode; gain: GainNode }[] = [];
  private noise: AudioBufferSourceNode | null = null;
  private arpTimer: ReturnType<typeof setInterval> | null = null;
  private bassTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  start(ctx: AudioContext): void {
    if (this.running) return;
    this.running = true;
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.6;
    filter.connect(this.master);

    const padRoot = 110;
    const chord = [padRoot, padRoot * 1.2, padRoot * 1.5, padRoot * 2];
    for (const freq of chord) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = freq === padRoot ? "sine" : "triangle";
      osc.frequency.value = freq;
      gain.gain.value = freq === padRoot ? 0.14 : 0.07;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      this.pads.push({ osc, gain });
    }

    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
    this.noise = ctx.createBufferSource();
    this.noise.buffer = buf;
    this.noise.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.018;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 420;
    noiseFilter.Q.value = 0.8;
    this.noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(filter);
    this.noise.start();

    const arpNotes = [220, 261.63, 329.63, 392, 329.63, 261.63];
    let arpStep = 0;
    this.arpTimer = setInterval(() => {
      if (!this.running || !this.ctx || !this.master) return;
      const c = this.ctx;
      const t = c.currentTime;
      const freq = arpNotes[arpStep % arpNotes.length];
      arpStep++;

      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(g);
      g.connect(filter);
      osc.start(t);
      osc.stop(t + 0.6);
    }, 720);

    this.bassTimer = setInterval(() => {
      if (!this.running || !this.ctx || !this.master) return;
      const c = this.ctx;
      const t = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.value = 55;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc.connect(g);
      g.connect(filter);
      osc.start(t);
      osc.stop(t + 1.5);
    }, 2400);
  }

  stop(ctx: AudioContext): void {
    if (!this.running) return;
    this.running = false;

    if (this.arpTimer) clearInterval(this.arpTimer);
    if (this.bassTimer) clearInterval(this.bassTimer);
    this.arpTimer = null;
    this.bassTimer = null;

    const t = ctx.currentTime;
    if (this.master) {
      this.master.gain.linearRampToValueAtTime(0, t + 0.8);
    }

    const stopAt = t + 0.85;
    for (const p of this.pads) {
      try { p.osc.stop(stopAt); } catch { /* */ }
    }
    if (this.noise) {
      try { this.noise.stop(stopAt); } catch { /* */ }
    }

    setTimeout(() => {
      this.pads = [];
      this.noise = null;
      this.master = null;
      this.ctx = null;
    }, 900);
  }

  isRunning(): boolean {
    return this.running;
  }
}
