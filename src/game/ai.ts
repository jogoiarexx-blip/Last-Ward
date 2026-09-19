import { GRAB_RANGE, MAX_ATTACKERS } from "./config";
import type { Difficulty } from "./types";
import type { Actor } from "./sim/actor";

const idleIntent = () => ({
  moveX: 0,
  moveY: 0,
  light: false,
  heavy: false,
  grab: false,
  jump: false,
  special: false,
  run: false,
  dodge: false,
});

export function assignSlots(enemies: Actor[], players: Actor[], difficulty: Difficulty) {
  const max = MAX_ATTACKERS[difficulty];
  const alive = enemies.filter((e) => !e.dead && e.state !== "dead" && e.state !== "fallen");

  // Distribui os atacantes entre os jogadores no coop em vez de formar uma fila única.
  const ranked = alive
    .map((e) => {
      const p = closest(e, players);
      return { e, p, d: p ? Math.hypot(e.x - p.x, (e.y - p.y) * 1.45) : 9999 };
    })
    .sort((a, b) => a.d - b.d);

  const activePerPlayer = new Map<number, number>();
  for (const item of ranked) {
    const { e, p } = item;
    if (!e.ai) continue;

    if (e.archetype === "boss" || e.archetype === "miniboss") {
      e.ai.slot = true;
      continue;
    }

    const pid = p?.id ?? -1;
    const used = activePerPlayer.get(pid) ?? 0;
    e.ai.slot = used < max;
    if (e.ai.slot) activePerPlayer.set(pid, used + 1);
  }
}

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

export function thinkEnemy(e: Actor, players: Actor[], dt: number, aggro: number) {
  const ai = e.ai;
  if (!ai) return idleIntent();

  if (ai.dummy === "idle" || ai.dummy === "block") return idleIntent();
  if (ai.dummy === "attack") {
    ai.timer -= dt;
    return { ...idleIntent(), light: ai.timer < 0 };
  }

  ai.think -= dt;
  ai.shotCooldown = Math.max(0, (ai.shotCooldown ?? 0) - dt);

  const p = closest(e, players);
  if (!p) return idleIntent();

  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy);
  const depthDist = Math.abs(dy);
  const hpRatio = e.maxHp > 0 ? e.hp / e.maxHp : 1;
  const bossLike = e.archetype === "boss" || e.archetype === "miniboss";
  const targetAttacking = p.state === "attack" || p.state === "special" || p.state === "super";
  const targetVulnerable = p.state === "hurt" || p.state === "fallen" || p.state === "getup" || p.downed;

  e.facing = dx === 0 ? e.facing : (Math.sign(dx) as 1 | -1);

  // Telegraph dos ataques: o inimigo compromete a ação, evitando golpes instantâneos.
  if ((ai.windup ?? 0) > 0) {
    ai.windup = (ai.windup ?? 0) - dt;
    if (ai.windup <= 0) {
      const light = !!ai.pendingLight;
      const heavy = !!ai.pendingHeavy;
      ai.pendingLight = false;
      ai.pendingHeavy = false;
      return { ...idleIntent(), light, heavy };
    }
    return { ...idleIntent(), moveX: Math.sign(dx) * 0.05, moveY: Math.sign(dy) * 0.08 };
  }

  if (ai.think <= 0) {
    // Bosses entram em "enrage" natural quando estão com pouca vida.
    const pressure = bossLike ? aggro * (hpRatio < 0.35 ? 1.35 : hpRatio < 0.65 ? 1.15 : 1) : aggro;
    ai.think = Math.max(0.16, (0.34 + Math.random() * 0.42) / Math.max(0.7, pressure));

    if (!ai.slot) {
      // Inimigos sem slot flanqueiam e mantêm a arena viva, em vez de ficarem parados.
      ai.role = Math.random() < 0.72 ? "circle" : "wait";
    } else if (e.archetype === "shooter") {
      if (dist < 70 || targetAttacking) ai.role = "retreat";
      else ai.role = "shoot";
    } else if (e.archetype === "grabber") {
      ai.role = dist < GRAB_RANGE + 26 && depthDist < 18 ? "grab" : "attack";
    } else if (e.archetype === "blocker" || e.archetype === "shield") {
      ai.role = targetAttacking && dist < 60 ? "block" : Math.random() < 0.45 ? "attack" : "circle";
    } else if (e.archetype === "dodger") {
      ai.role = targetAttacking && dist < 58 ? "retreat" : Math.random() < 0.65 ? "attack" : "circle";
    } else if (e.archetype === "runner") {
      ai.role = dist > 52 ? "charge" : Math.random() < 0.72 ? "attack" : "circle";
    } else if (e.archetype === "brute") {
      ai.role = dist < 52 ? "attack" : Math.random() < 0.75 ? "charge" : "circle";
    } else if (bossLike) {
      if (targetAttacking && dist < 55 && Math.random() < 0.28) ai.role = "retreat";
      else ai.role = dist > 72 ? "charge" : Math.random() < 0.78 ? "attack" : "circle";
    } else if (targetVulnerable) {
      ai.role = "attack";
    } else if (dist > 76) {
      ai.role = Math.random() < 0.75 ? "attack" : "circle";
    } else {
      ai.role = Math.random() < 0.68 * pressure ? "attack" : "circle";
    }

    ai.timer = 0.32 + Math.random() * 0.52;
  }

  ai.timer -= dt;

  let moveX = 0;
  let moveY = 0;
  let light = false;
  let heavy = false;
  let grab = false;
  let jump = false;
  let special = false;
  let run = false;
  let dodge = false;

  const flankSign = e.id % 2 === 0 ? 1 : -1;
  const wantX =
    e.archetype === "shooter"
      ? 118
      : e.archetype === "armed"
        ? 46
        : e.archetype === "brute"
          ? 42
          : bossLike
            ? 46
            : 34;

  if (ai.role === "wait") {
    moveX = dist < 92 ? -Math.sign(dx) * 0.25 : Math.sign(dx) * 0.18;
    moveY = flankSign * 0.28;
  } else if (ai.role === "circle") {
    moveX = dist > wantX + 22 ? Math.sign(dx) * 0.42 : dist < wantX - 10 ? -Math.sign(dx) * 0.42 : 0;
    moveY = flankSign * (depthDist < 34 ? 0.72 : 0.32);
  } else if (ai.role === "retreat") {
    moveX = -Math.sign(dx) * (e.archetype === "shooter" ? 0.82 : 1);
    moveY = flankSign * 0.35;
    dodge = e.archetype === "dodger" || (bossLike && targetAttacking && Math.random() < 0.08);
  } else if (ai.role === "shoot") {
    moveX = dist < 104 ? -Math.sign(dx) * 0.42 : dist > 155 ? Math.sign(dx) * 0.2 : 0;
    moveY = depthDist > 10 ? Math.sign(dy) * 0.28 : 0;
    if ((ai.shotCooldown ?? 0) <= 0 && depthDist < 18 && dist > 72 && dist < 190 && ai.timer < 0.12) {
      light = true;
      ai.shotCooldown = 0.9 + Math.random() * 0.55;
    }
  } else if (ai.role === "grab") {
    moveX = Math.sign(dx) * 0.88;
    moveY = Math.sign(dy) * 0.52;
    grab = dist < GRAB_RANGE + 7 && depthDist < 12;
  } else if (ai.role === "block") {
    moveX = dist > 42 ? Math.sign(dx) * 0.24 : 0;
    moveY = depthDist > 8 ? Math.sign(dy) * 0.2 : 0;
  } else if (ai.role === "charge") {
    moveX = Math.sign(dx);
    moveY = Math.abs(dy) > 10 ? Math.sign(dy) * 0.55 : 0;
    run = e.archetype === "runner" || bossLike || e.archetype === "brute";
  } else {
    moveX = dist > wantX ? Math.sign(dx) * (e.archetype === "runner" ? 1 : 0.72) : dist < wantX - 9 ? -Math.sign(dx) * 0.28 : 0;
    moveY = depthDist > 8 ? Math.sign(dy) * 0.62 : 0;
    run = e.archetype === "runner" && dist > 82;

    if (e.archetype === "jumper" && dist > 46 && dist < 96 && depthDist < 22 && Math.random() < 0.035) jump = true;

    if (dist < wantX + 12 && depthDist < 13) {
      const lowHpBoss = bossLike && hpRatio < 0.4;
      const heavyChance = (e.archetype === "brute" || bossLike ? 0.07 : 0.025) * aggro * (lowHpBoss ? 1.35 : 1);
      const lightChance = (e.archetype === "fighter" || e.archetype === "elite" ? 0.105 : 0.08) * aggro;

      if (e.archetype === "brute" || bossLike) heavy = Math.random() < heavyChance;
      else light = Math.random() < lightChance;

      // Fighters e elites contra-atacam com mais intenção, enquanto chefes usam especiais por fase/vida.
      if ((e.archetype === "fighter" || e.archetype === "elite") && targetVulnerable && Math.random() < 0.07 * aggro) heavy = true;
      if (e.archetype === "elite" && Math.random() < 0.028 * aggro) special = true;
      if (bossLike && Math.random() < (lowHpBoss ? 0.052 : 0.032) * aggro) special = true;

      if ((light || heavy) && e.archetype !== "boss") {
        ai.windup =
          e.archetype === "runner"
            ? 0.14
            : e.archetype === "brute"
              ? 0.34
              : e.archetype === "elite"
                ? 0.2
                : 0.26;
        ai.pendingLight = light;
        ai.pendingHeavy = heavy;
        light = false;
        heavy = false;
      }
    }
  }

  return { moveX, moveY, light, heavy, grab, jump, special, run, dodge };
}
