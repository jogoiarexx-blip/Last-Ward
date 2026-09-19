import { GRAB_RANGE } from "./config";
import type { AttackKind, HitDef, MoveDef } from "./types";
import type { Actor } from "./sim/actor";

export function depthOk(a: Actor, b: Actor, pad: number) {
  return Math.abs(a.y - b.y) <= pad;
}

export function inFront(a: Actor, b: Actor) {
  return (b.x - a.x) * a.facing >= -8;
}

export function pickMove(moves: MoveDef[], chain: AttackKind[]): MoveDef | null {
  let best: MoveDef | null = null;
  for (const m of moves) {
    if (m.seq.length > chain.length) continue;
    let ok = true;
    for (let i = 0; i < m.seq.length; i++) {
      if (m.seq[i] !== chain[chain.length - m.seq.length + i]) {
        ok = false;
        break;
      }
    }
    if (ok && (!best || m.seq.length > best.seq.length)) best = m;
  }
  return best;
}

export function hitActive(move: MoveDef, frame: number): HitDef | null {
  for (const h of move.hits) {
    if (frame >= h.start && frame <= h.end) return h;
  }
  return null;
}

export function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function grabCandidate(self: Actor, others: Actor[]): Actor | null {
  let best: Actor | null = null;
  let bestD = GRAB_RANGE;
  for (const o of others) {
    if (o.dead || o.team === self.team) continue;
    if (o.state === "fallen" || o.state === "dead" || o.state === "launch") continue;
    if (!depthOk(self, o, 12)) continue;
    const dx = (o.x - self.x) * self.facing;
    if (dx < 0 || dx > GRAB_RANGE + 8) continue;
    const d = Math.hypot(o.x - self.x, (o.y - self.y) * 1.4);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

export function rankFor(score: number, time: number, dmg: number, combo: number, secrets: number): "D" | "C" | "B" | "A" | "S" | "S+" {
  let p = score / 50 + combo * 20 + secrets * 400 - dmg * 2 - time * 2;
  if (p > 9000 && dmg < 40) return "S+";
  if (p > 6500) return "S";
  if (p > 4200) return "A";
  if (p > 2500) return "B";
  if (p > 1200) return "C";
  return "D";
}
