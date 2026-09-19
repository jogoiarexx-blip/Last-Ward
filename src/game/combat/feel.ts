import type { HitDef } from "../types";
import type { Actor } from "../sim/actor";

export function bounceIfWalled(a: Actor, minX: number, maxX: number): boolean {
  if (a.state !== "hurt" && a.state !== "launch") return false;
  if (Math.abs(a.vx) < 140) return false;
  if (a.x <= minX + 4 && a.vx < 0) {
    a.x = minX + 4;
    a.vx = Math.abs(a.vx) * 0.72;
    a.vz = Math.max(a.vz, 120);
    a.facing = 1;
    return true;
  }
  if (a.x >= maxX - 4 && a.vx > 0) {
    a.x = maxX - 4;
    a.vx = -Math.abs(a.vx) * 0.72;
    a.vz = Math.max(a.vz, 120);
    a.facing = -1;
    return true;
  }
  return false;
}

export function separateCrowd(actors: Actor[]) {
  const live = actors.filter((a) => !a.dead && a.state !== "dead" && a.state !== "fallen" && a.state !== "grabbed");
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i]!;
      const b = live[j]!;
      if (a.team !== b.team) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.001 || d > 16) continue;
      const push = (16 - d) * 0.5;
      const nx = dx / d;
      const ny = dy / d;
      a.x -= nx * push * 0.5;
      b.x += nx * push * 0.5;
      a.y -= ny * push * 0.35;
      b.y += ny * push * 0.35;
    }
  }
}

export function canOtg(hit: HitDef, target: Actor) {
  if (target.state !== "fallen") return false;
  return hit.knockdown || hit.launch > 40 || !!hit.area;
}

export function isCounter(target: Actor) {
  return ["attack", "airAttack", "special", "super"].includes(target.state);
}

export function hasArmor(a: Actor) {
  if (a.state === "super") return true;
  if (a.state === "special" && (a.key === "rutger" || a.archetype === "boss" || a.archetype === "brute")) return true;
  return false;
}
