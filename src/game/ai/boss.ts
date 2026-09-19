import type { Actor } from "../sim/actor";

export type BossEvent = {
  shots?: { vx: number; vy?: number; dmg: number; z?: number; life?: number }[];
  summon?: { type: string; count: number };
  teleport?: { x: number; y: number };
  aoe?: { dmg: number; knock: number; radius: number };
  charge?: boolean;
  toast?: string;
};

function closest(e: Actor, players: Actor[]) {
  let best: Actor | null = null;
  let d = Infinity;
  for (const p of players) {
    if (p.dead || p.downed) continue;
    const dd = Math.hypot(e.x - p.x, (e.y - p.y) * 1.6);
    if (dd < d) {
      d = dd;
      best = p;
    }
  }
  return best;
}

/** Unique phase scripts. Returns at most one event per think tick. */
export function tickBoss(e: Actor, players: Actor[], dt: number): BossEvent | null {
  const ai = e.ai;
  if (!ai) return null;
  if (e.archetype !== "boss" && e.archetype !== "miniboss") return null;
  if (["hurt", "launch", "fallen", "getup", "dead", "grabbed"].includes(e.state)) return null;

  ai.think -= dt;
  if (ai.think > 0) return null;

  const p = closest(e, players);
  if (!p) return null;
  const phase = Math.max(1, e.phase);
  const dist = Math.hypot(p.x - e.x, p.y - e.y);
  const face = Math.sign(p.x - e.x) || e.facing;

  switch (e.key) {
    case "boss-warden":
      ai.think = phase === 3 ? 0.9 : 1.3;
      if (phase >= 3) return { aoe: { dmg: 16, knock: 200, radius: 70 }, toast: "BATIDA DO BAIRRO" };
      if (phase === 2) return { charge: true, shots: [{ vx: face * 40, dmg: 10, z: 8, life: 0.05 }] };
      return dist < 50 ? { aoe: { dmg: 12, knock: 140, radius: 42 } } : { charge: true };

    case "boss-conductor":
      ai.think = 1.1 - phase * 0.12;
      if (phase >= 3) {
        return {
          shots: [
            { vx: face * 240, dmg: 9, z: 22 },
            { vx: face * 200, vy: 40, dmg: 8, z: 18 },
            { vx: face * 200, vy: -40, dmg: 8, z: 18 },
          ],
          toast: "TRILHO TRIPLO",
        };
      }
      if (phase === 2) return { summon: { type: "runner", count: 2 }, shots: [{ vx: face * 220, dmg: 8, z: 20 }] };
      return { shots: [{ vx: face * 260, dmg: 10, z: 22 }] };

    case "boss-cinder":
      ai.think = 1.4;
      if (phase >= 3) {
        return {
          aoe: { dmg: 20, knock: 180, radius: 80 },
          shots: [
            { vx: 180, dmg: 10, z: 16 },
            { vx: -180, dmg: 10, z: 16 },
          ],
          toast: "FORJA ABERTA",
        };
      }
      return { aoe: { dmg: 14 + phase * 3, knock: 160, radius: 56 } };

    case "boss-harbor":
      ai.think = 1.15;
      if (phase >= 3) return { charge: true, aoe: { dmg: 14, knock: 220, radius: 48 }, toast: "MARÉ NEGRA" };
      if (phase === 2) return { shots: [{ vx: face * 180, dmg: 11, z: 14, life: 1.8 }] };
      return dist < 36 ? { charge: true } : { shots: [{ vx: face * 160, dmg: 8, z: 12 }] };

    case "boss-mannequin":
      ai.think = 1.2;
      if (phase >= 2 && Math.random() < 0.45) return { summon: { type: "dodger", count: 1 }, toast: "VITRINE" };
      if (phase >= 3) return { teleport: { x: p.x + face * -80, y: p.y }, charge: true };
      return { charge: true };

    case "boss-hollow":
      ai.think = 1.25;
      if (phase >= 3) return { summon: { type: "grabber", count: 2 }, aoe: { dmg: 12, knock: 100, radius: 60 } };
      if (phase === 2) return { aoe: { dmg: 13, knock: 90, radius: 50 }, toast: "ECO OCO" };
      return dist < 40 ? { aoe: { dmg: 11, knock: 120, radius: 40 } } : { charge: true };

    case "boss-crown":
      ai.think = 1.1;
      if (phase >= 3) {
        return {
          teleport: { x: p.x, y: p.y },
          aoe: { dmg: 18, knock: 160, radius: 54 },
          toast: "QUEDA DO SPIRE",
        };
      }
      return { charge: true, shots: [{ vx: face * 210, dmg: 10, z: 24 }] };

    case "boss-helix":
      ai.think = 0.95;
      if (phase >= 3) {
        return {
          teleport: { x: p.x + (Math.random() > 0.5 ? 90 : -90), y: 20 + Math.random() * 30 },
          shots: [
            { vx: 220, dmg: 10, z: 20 },
            { vx: -220, dmg: 10, z: 20 },
            { vx: face * 260, dmg: 12, z: 28 },
          ],
          summon: { type: "elite", count: 1 },
          toast: "HÉLICE ABERTA",
        };
      }
      if (phase === 2) return { teleport: { x: p.x - face * 70, y: p.y }, shots: [{ vx: face * 240, dmg: 11, z: 22 }] };
      return { shots: [{ vx: face * 200, dmg: 10, z: 22 }], charge: true };

    case "boss-secret":
      ai.think = 0.7;
      if (Math.random() < 0.4) return { teleport: { x: p.x + face * -50, y: p.y }, charge: true };
      return { shots: [{ vx: face * 280, dmg: 12, z: 18 }], charge: true };

    case "mini-heavy":
      ai.think = 1.35;
      return { aoe: { dmg: 14, knock: 170, radius: 46 }, charge: true };

    case "mini-assassin":
      ai.think = 0.85;
      return { teleport: { x: p.x + face * -40, y: p.y }, charge: true };

    default:
      ai.think = 1.2;
      return phase >= 2 ? { charge: true } : null;
  }
}
