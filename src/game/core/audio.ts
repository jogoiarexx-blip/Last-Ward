type Bus = { master: GainNode; music: GainNode; sfx: GainNode };

export class AudioEngine {
  ctx: AudioContext | null = null;
  bus: Bus | null = null;
  muted = false;
  musicVol = 0.55;
  sfxVol = 0.8;
  masterVol = 0.85;
  musicTimer = 0;
  theme = "title";
  step = 0;
  unlocked = false;
  private visibilityHandler: (() => void) | null = null;

  unlock() {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const w = window as unknown as { __lwAudio?: AudioContext };
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = w.__lwAudio ?? new AC({ latencyHint: "interactive" });
    w.__lwAudio = this.ctx;
    const master = this.ctx.createGain();
    const music = this.ctx.createGain();
    const sfx = this.ctx.createGain();
    music.connect(master);
    sfx.connect(master);
    master.connect(this.ctx.destination);
    this.bus = { master, music, sfx };
    this.applyVolumes();
    this.unlocked = true;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.visibilityHandler = () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  destroy() {
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.bus) {
      this.bus.master.disconnect();
      this.bus.music.disconnect();
      this.bus.sfx.disconnect();
    }
    this.bus = null;
    this.unlocked = false;
  }

  applyVolumes() {
    if (!this.bus) return;
    const m = this.muted ? 0 : this.masterVol * this.masterVol;
    this.bus.master.gain.setTargetAtTime(m, this.ctx!.currentTime, 0.02);
    this.bus.music.gain.setTargetAtTime(this.musicVol * this.musicVol, this.ctx!.currentTime, 0.02);
    this.bus.sfx.gain.setTargetAtTime(this.sfxVol * this.sfxVol, this.ctx!.currentTime, 0.02);
  }

  tone(freq: number, dur: number, type: OscillatorType, gain: number, dest: GainNode, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur: number, gain: number, dest: GainNode, hp = 800) {
    if (!this.ctx) return;
    const n = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start();
  }

  sfx(kind: string) {
    if (!this.bus || !this.ctx) return;
    const s = this.bus.sfx;
    const r = 0.92 + Math.random() * 0.16;
    switch (kind) {
      case "hit":
        this.tone(180 * r, 0.07, "square", 0.12, s, -80);
        this.noise(0.06, 0.08, s, 400);
        break;
      case "hit-heavy":
        this.tone(90 * r, 0.14, "sawtooth", 0.16, s, -40);
        this.noise(0.1, 0.14, s, 200);
        break;
      case "whoosh":
        this.noise(0.08, 0.06, s, 1200);
        break;
      case "jump":
        this.tone(240, 0.1, "square", 0.07, s, 180);
        break;
      case "land":
        this.noise(0.08, 0.07, s, 200);
        break;
      case "break":
        this.noise(0.16, 0.16, s, 300);
        this.tone(70, 0.12, "triangle", 0.1, s, -30);
        break;
      case "special":
        this.tone(320, 0.18, "sawtooth", 0.1, s, 220);
        this.tone(480, 0.2, "square", 0.06, s, 100);
        break;
      case "super":
        this.tone(80, 0.4, "sawtooth", 0.18, s, 200);
        this.tone(160, 0.35, "square", 0.1, s, 400);
        break;
      case "pickup":
        this.tone(520, 0.08, "square", 0.08, s, 200);
        this.tone(780, 0.1, "square", 0.05, s, 0);
        break;
      case "ko":
        this.tone(110, 0.25, "triangle", 0.12, s, -60);
        this.noise(0.2, 0.1, s, 150);
        break;
      case "menu":
        this.tone(420, 0.05, "square", 0.06, s);
        break;
      case "confirm":
        this.tone(520, 0.06, "square", 0.07, s, 80);
        this.tone(720, 0.08, "square", 0.05, s);
        break;
      case "back":
        this.tone(240, 0.06, "square", 0.05, s, -40);
        break;
      case "error":
        this.tone(140, 0.1, "square", 0.08, s);
        break;
      case "throw":
        this.noise(0.1, 0.1, s, 600);
        this.tone(200, 0.1, "triangle", 0.08, s, -80);
        break;
      case "gun":
        this.noise(0.05, 0.12, s, 900);
        this.tone(90, 0.05, "square", 0.08, s);
        break;
      default:
        this.tone(300, 0.05, "square", 0.05, s);
    }
  }

  tick(dt: number) {
    if (!this.bus || !this.ctx || this.muted) return;
    this.musicTimer += dt;
    const bpm = this.theme === "boss" ? 140 : this.theme === "title" ? 100 : 118;
    const beat = 60 / bpm;
    if (this.musicTimer < beat * 0.25) return;
    this.musicTimer -= beat * 0.25;
    this.step = (this.step + 1) % 16;
    const m = this.bus.music;
    const n = this.step;
    if (n % 4 === 0) this.tone(70, 0.08, "sine", 0.09, m);
    if (n % 4 === 2) this.noise(0.04, 0.04, m, 2000);
    if (n === 4 || n === 12) this.noise(0.05, 0.06, m, 800);

    const scale = this.theme === "helix" ? [55, 65, 73, 82] : [65, 73, 82, 98];
    if (n % 2 === 0) {
      const note = scale[(n / 2) % scale.length]!;
      this.tone(note, 0.18, "triangle", 0.045, m);
    }
    if (this.theme === "boss" && n % 4 === 1) this.tone(220, 0.06, "square", 0.03, m, 40);
    if (this.theme === "title" && n === 0) this.tone(196, 0.25, "square", 0.04, m);
  }
}
