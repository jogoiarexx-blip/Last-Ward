export class Juice {
  trauma = 0;
  hitstop = 0;
  zoom = 1;
  zoomTarget = 1;
  flash = 0;
  offsetX = 0;
  offsetY = 0;
  freezeNames = new Set<number>();

  addTrauma(v: number) {
    this.trauma = Math.min(1, this.trauma + v);
  }

  stop(frames: number) {
    this.hitstop = Math.max(this.hitstop, frames);
  }

  punch(zoom = 1.06) {
    this.zoomTarget = zoom;
  }

  update(dt: number, reduced: boolean) {
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    if (this.hitstop > 0) this.hitstop -= 1;
    this.zoom += (this.zoomTarget - this.zoom) * (1 - Math.exp(-12 * dt));
    this.zoomTarget += (1 - this.zoomTarget) * (1 - Math.exp(-8 * dt));
    this.flash = Math.max(0, this.flash - dt * 6);
    const shake = reduced ? 0 : this.trauma * this.trauma;
    const t = performance.now() * 0.02;
    this.offsetX = Math.sin(t * 7.1) * shake * 6;
    this.offsetY = Math.cos(t * 9.3) * shake * 5;
  }

  frozen() {
    return this.hitstop > 0;
  }
}

export type Particle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  color: string;
  size: number;
  kind: "spark" | "dust" | "text" | "shard" | "rain" | "ring";
  text?: string;
};

export class Particles {
  list: Particle[] = [];

  spawn(p: Omit<Particle, "max"> & { max?: number }) {
    if (this.list.length > 280) this.list.shift();
    this.list.push({ ...p, max: p.max ?? p.life });
  }

  burst(x: number, y: number, z: number, color: string, n = 8, speed = 120) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      this.spawn({
        x,
        y,
        z,
        vx: Math.cos(a) * speed * (0.4 + Math.random()),
        vy: (Math.random() - 0.5) * 40,
        vz: Math.sin(a) * speed * 0.3 + 40,
        life: 0.25 + Math.random() * 0.25,
        color,
        size: 2 + Math.random() * 2,
        kind: "spark",
      });
    }
  }

  dust(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      this.spawn({
        x: x + (Math.random() - 0.5) * 12,
        y,
        z: 0,
        vx: (Math.random() - 0.5) * 30,
        vy: 0,
        vz: 20 + Math.random() * 20,
        life: 0.35,
        color: "#c8b898",
        size: 3,
        kind: "dust",
      });
    }
  }

  float(x: number, y: number, z: number, text: string, color: string) {
    this.spawn({ x, y, z: z + 40, vx: 0, vy: 0, vz: 50, life: 0.7, color, size: 10, kind: "text", text });
  }

  ring(x: number, y: number, z: number, color: string) {
    this.spawn({ x, y, z, vx: 0, vy: 0, vz: 10, life: 0.35, color, size: 18, kind: "ring" });
  }

  update(dt: number) {
    for (const p of this.list) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vz -= 420 * dt;
      p.life -= dt;
      if (p.kind === "dust") p.vx *= 0.9;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }
}
