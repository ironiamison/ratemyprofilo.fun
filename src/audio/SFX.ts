export class SFX {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private mineNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private salvageNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private engineOsc: OscillatorNode | null = null;
  private engineBuzz: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  private ac(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.08): void {
    if (!this.enabled) return;
    const c = this.ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }

  unlock(): void {
    this.ac();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) {
      this.stopMining();
      this.stopSalvage();
      this.stopEngine();
      this.stopAmbient();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private startLoop(
    target: "mine" | "salvage",
    freqs: [number, number, number],
    types: [OscillatorType, OscillatorType, OscillatorType],
    vol: number
  ): void {
    if (!this.enabled) return;
    const store = target === "mine" ? this.mineNodes : this.salvageNodes;
    if (store.length > 0) return;
    const c = this.ac();
    for (let i = 0; i < 3; i++) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = types[i];
      osc.frequency.value = freqs[i];
      gain.gain.value = vol * (i === 0 ? 1 : 0.5);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      store.push({ osc, gain });
    }
  }

  private stopLoop(target: "mine" | "salvage"): void {
    const store = target === "mine" ? this.mineNodes : this.salvageNodes;
    const c = this.ctx;
    for (const n of store) {
      try {
        if (c) {
          n.gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
          n.osc.stop(c.currentTime + 0.06);
        } else {
          n.osc.stop();
        }
      } catch { /* already stopped */ }
    }
    store.length = 0;
  }

  startMining(): void {
    this.startLoop("mine", [90, 180, 240], ["sawtooth", "square", "sine"], 0.025);
  }

  stopMining(): void {
    this.stopLoop("mine");
  }

  startSalvage(): void {
    this.startLoop("salvage", [55, 110, 165], ["triangle", "sine", "square"], 0.02);
  }

  stopSalvage(): void {
    this.stopLoop("salvage");
  }

  setEngine(speed: number, boosting: boolean): void {
    if (!this.enabled) return;
    const c = this.ac();
    const targetVol = speed < 1 ? 0 : Math.min(0.05, 0.01 + speed * 0.0009) * (boosting ? 1.7 : 1);
    const targetFreq = 42 + Math.min(speed, 90) * 0.85;
    const buzzFreq = 120 + Math.min(speed, 90) * 1.2;

    if (!this.engineOsc) {
      this.engineOsc = c.createOscillator();
      this.engineBuzz = c.createOscillator();
      this.engineGain = c.createGain();
      this.engineOsc.type = "sawtooth";
      this.engineBuzz.type = "triangle";
      this.engineOsc.frequency.value = targetFreq;
      this.engineBuzz.frequency.value = buzzFreq;
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain);
      this.engineBuzz.connect(this.engineGain);
      this.engineGain.connect(c.destination);
      this.engineOsc.start();
      this.engineBuzz.start();
    }

    if (this.engineOsc && this.engineBuzz && this.engineGain) {
      this.engineOsc.frequency.linearRampToValueAtTime(targetFreq, c.currentTime + 0.08);
      this.engineBuzz.frequency.linearRampToValueAtTime(buzzFreq, c.currentTime + 0.08);
      this.engineGain.gain.linearRampToValueAtTime(targetVol, c.currentTime + 0.08);
    }
  }

  stopEngine(): void {
    if (this.engineOsc && this.engineGain && this.ctx) {
      try {
        this.engineGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
        this.engineOsc.stop(this.ctx.currentTime + 0.12);
        this.engineBuzz?.stop(this.ctx.currentTime + 0.12);
      } catch { /* */ }
    }
    this.engineOsc = null;
    this.engineBuzz = null;
    this.engineGain = null;
  }

  startAmbient(): void {
    if (!this.enabled || this.ambientOsc) return;
    const c = this.ac();
    this.ambientOsc = c.createOscillator();
    this.ambientGain = c.createGain();
    this.ambientOsc.type = "sine";
    this.ambientOsc.frequency.value = 38;
    this.ambientGain.gain.value = 0.012;
    this.ambientOsc.connect(this.ambientGain);
    this.ambientGain.connect(c.destination);
    this.ambientOsc.start();
  }

  stopAmbient(): void {
    if (this.ambientOsc && this.ambientGain && this.ctx) {
      try {
        this.ambientGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        this.ambientOsc.stop(this.ctx.currentTime + 0.35);
      } catch { /* */ }
    }
    this.ambientOsc = null;
    this.ambientGain = null;
  }

  scan(): void {
    this.tone(880, 0.15, "sine", 0.06);
    setTimeout(() => this.tone(1320, 0.2, "sine", 0.05), 80);
  }

  mine(): void {
    this.tone(140, 0.04, "square", 0.04);
    this.tone(280, 0.03, "sawtooth", 0.02);
  }

  dock(): void {
    this.tone(220, 0.3, "triangle", 0.1);
    setTimeout(() => this.tone(330, 0.4, "triangle", 0.08), 150);
  }

  undock(): void {
    this.tone(330, 0.15, "triangle", 0.07);
    setTimeout(() => this.tone(220, 0.25, "triangle", 0.06), 100);
  }

  salvageDone(): void {
    this.tone(523, 0.15, "sine", 0.07);
    setTimeout(() => this.tone(659, 0.15, "sine", 0.07), 100);
    setTimeout(() => this.tone(784, 0.3, "sine", 0.08), 200);
  }

  mission(): void {
    this.tone(440, 0.1, "sine", 0.08);
    setTimeout(() => this.tone(554, 0.1, "sine", 0.08), 100);
    setTimeout(() => this.tone(659, 0.25, "sine", 0.1), 200);
  }

  boost(): void {
    this.tone(80, 0.08, "sawtooth", 0.04);
  }

  warn(): void {
    this.tone(200, 0.2, "square", 0.05);
  }

  lowFuel(): void {
    this.tone(160, 0.12, "sine", 0.04);
    setTimeout(() => this.tone(120, 0.18, "sine", 0.035), 140);
  }

  trade(): void {
    this.tone(660, 0.08, "sine", 0.06);
    setTimeout(() => this.tone(880, 0.12, "sine", 0.05), 60);
  }

  fail(): void {
    this.tone(180, 0.15, "square", 0.04);
    setTimeout(() => this.tone(140, 0.2, "square", 0.03), 90);
  }

  upgrade(): void {
    this.tone(392, 0.1, "sine", 0.07);
    setTimeout(() => this.tone(523, 0.12, "sine", 0.07), 80);
    setTimeout(() => this.tone(659, 0.2, "sine", 0.08), 160);
  }

  depleted(): void {
    this.tone(95, 0.25, "triangle", 0.06);
    setTimeout(() => this.tone(70, 0.35, "sine", 0.05), 120);
  }

  hullHit(): void {
    this.tone(90, 0.08, "square", 0.05);
  }

  passBy(): void {
    this.tone(300, 0.06, "sine", 0.025);
    setTimeout(() => this.tone(450, 0.08, "sine", 0.02), 40);
  }

  uiClick(): void {
    this.tone(520, 0.04, "sine", 0.03);
  }
}

export const sfx = new SFX();
