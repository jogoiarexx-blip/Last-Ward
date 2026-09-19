import { GRAB_RANGE, MAX_ATTACKERS } from "./config";
import type { Difficulty } from "./types";
import type { Actor } from "./sim/actor";

export function assignSlots(enemies: Actor[], players: Actor[], difficulty: Difficulty) {
  const max = MAX_ATTACKERS[difficulty];
  const alive = enemies.filter((e) => !e.dead && e.state !== "dead" && e.state !== "fallen");
  const sorted = alive
    .map((e) => {
      const p = closest(e, players);
      return { e, d: p ? Math.hypot(e.x - p.x, e.y - p.y) : 9999 };
    })
    .sort((a, b) => a.d - b.d);
  sorted.forEach((s, i) => {
    s.e.ai!.slot = i < max || s.e.archetype === "boss" || s.e.archetype === "miniboss";
  });
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
  if (!ai) return { moveX: 0, moveY: 0, light: false, heavy: false, grab: false, jump: false, special: false, run: false, dodge: false };
  if (ai.dummy === "idle") return { moveX: 0, moveY: 0, light: false, heavy: false, grab: false, jump: false, special: false, run: false, dodge: false };
  if (ai.dummy === "block") return { moveX: 0, moveY: 0, light: false, heavy: false, grab: false, jump: false, special: false, run: false, dodge: false };
  if (ai.dummy === "attack") {
    ai.timer -= dt;
    return { moveX: 0, moveY: 0, light: ai.timer < 0, heavy: false, grab: false, jump: false, special: false, run: false, dodge: false };
  }

  ai.think -= dt;
  const p = closest(e, players);
  if (!p) return { moveX: 0, moveY: 0, light: false, heavy: false, grab: false, jump: false, special: false, run: false, dodge: false };

  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy);
  e.facing = dx === 0 ? e.facing : (Math.sign(dx) as 1 | -1);

  if ((ai.windup ?? 0) > 0) {
    ai.windup = (ai.windup ?? 0) - dt;
    if (ai.windup <= 0) {
      const light = !!ai.pendingLight;
      const heavy = !!ai.pendingHeavy;
      ai.pendingLight = false;
      ai.pendingHeavy = false;
      return { moveX: 0, moveY: 0, light, heavy, grab: false, jump: false, special: false, run: false, dodge: false };
    }
    return { moveX: Math.sign(dx) * 0.05, moveY: 0, light: false, heavy: false, grab: false, jump: false, special: false, run: false, dodge: false };
  }

  if (ai.think <= 0) {
    ai.think = 0.35 + Math.random() * 0.5;
    if (!ai.slot) ai.role = Math.random() < 0.4 ? "circle" : "wait";
    else if (e.archetype === "shooter" && dist > 80) ai.role = "shoot";
    else if (e.archetype === "grabber" && dist < GRAB_RANGE + 20) ai.role = "grab";
    else if (e.archetype === "blocker" && Math.random() < 0.35) ai.role = "block";
    else if (e.archetype === "dodger" && dist < 50 && Math.random() < 0.4) ai.role = "retreat";
    else if (e.archetype === "shield" && dist < 48) ai.role = "block";
    else if (e.archetype === "boss" || e.archetype === "miniboss") ai.role = dist > 60 ? "attack" : Math.random() < 0.3 ? "circle" : "attack";
    else if (dist > 70) ai.role = "attack";
    else ai.role = Math.random() < 0.7 * aggro ? "attack" : "circle";
    ai.timer = 0.4 + Math.random() * 0.6;
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

  const wantX = 34 + (e.archetype === "brute" ? 8 : 0);
  if (ai.role === "wait") {
    moveX = dist < 110 ? -Math.sign(dx) * 0.2 : Math.sign(dx) * 0.15;
    moveY = Math.sign(Math.sin(e.id + ai.timer)) * 0.2;
  } else if (ai.role === "circle") {
    moveX = dist > wantX + 20 ? Math.sign(dx) * 0.4 : dist < wantX - 10 ? -Math.sign(dx) * 0.5 : 0;
    moveY = (e.id % 2 === 0 ? 1 : -1) * 0.55;
  } else if (ai.role === "retreat") {
    moveX = -Math.sign(dx);
    dodge = e.archetype === "dodger";
  } else if (ai.role === "shoot") {
    moveX = dist < 100 ? -Math.sign(dx) * 0.3 : 0;
    light = ai.timer < 0.08;
  } else if (ai.role === "grab") {
    moveX = Math.sign(dx) * 0.8;
    moveY = Math.sign(dy) * 0.4;
    grab = dist < GRAB_RANGE + 6;
  } else if (ai.role === "block") {
    moveX = dist > 40 ? Math.sign(dx) * 0.3 : 0;
  } else {
    moveX = dist > wantX ? Math.sign(dx) * (e.archetype === "runner" ? 1 : 0.7) : dist < wantX - 8 ? -Math.sign(dx) * 0.3 : 0;
    moveY = Math.abs(dy) > 8 ? Math.sign(dy) * 0.6 : 0;
    run = e.archetype === "runner" && dist > 90;
    jump = e.archetype === "jumper" && dist > 50 && dist < 90 && Math.random() < 0.02;
    if (dist < wantX + 10 && Math.abs(dy) < 12) {
      if (e.archetype === "brute" || e.archetype === "boss" || e.archetype === "miniboss") heavy = Math.random() < 0.05 * aggro;
      else light = Math.random() < 0.07 * aggro;
      if (e.archetype === "elite" && Math.random() < 0.02) special = true;
      if ((e.archetype === "boss" || e.archetype === "miniboss") && Math.random() < 0.025 * aggro) special = true;
      if ((light || heavy) && e.archetype !== "boss") {
        ai.windup = e.archetype === "runner" ? 0.16 : 0.28;
        ai.pendingLight = light;
        ai.pendingHeavy = heavy;
        light = false;
        heavy = false;
      }
    }
  }
  return { moveX, moveY, light, heavy, grab, jump, special, run, dodge };
}
