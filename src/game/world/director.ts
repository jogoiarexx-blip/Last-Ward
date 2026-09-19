import { DEPTH_MAX, VIEW_W } from "../config";
import type { StageDef, StageSegment } from "../types";
import type { Actor } from "../sim/actor";

export type LockState = {
  locked: boolean;
  lockMin: number;
  lockMax: number;
  waveQueue: { type: string; count: number; side?: string }[][];
  waveI: number;
};

export function nextLock(camX: number, seg: StageSegment): Partial<LockState> {
  if (seg.kind === "walk") return { locked: false, lockMax: seg.to };
  if (seg.kind === "lock") {
    return {
      locked: true,
      lockMin: Math.max(0, camX - 10),
      lockMax: camX + VIEW_W * 0.55,
      waveQueue: seg.waves.map((w) => w.map((x) => ({ ...x }))),
      waveI: 0,
    };
  }
  if (seg.kind === "miniboss" || seg.kind === "boss") {
    return { locked: true, lockMin: camX, lockMax: camX + (seg.kind === "boss" ? 220 : 200) };
  }
  return {};
}

export function pickFork(lead: Actor, fork: { a: string; b: string; secret?: string }, flags: Record<string, boolean | number | string>, stage: StageDef) {
  let next: string | null = null;
  if (lead.y > DEPTH_MAX * 0.62) next = fork.a;
  if (lead.y < DEPTH_MAX * 0.28) next = fork.b;
  if (fork.secret && flags["rain-wall"] && lead.x > stage.length - 400) next = fork.secret;
  // generic: any secret flag matching stage secrets unlocks the secret lane near the end
  if (fork.secret) {
    for (const s of stage.secrets) {
      if (flags[s.id] && lead.x > stage.length - 420) next = fork.secret;
    }
  }
  return next;
}

export function altBossFor(seg: StageSegment, flags: Record<string, boolean | number | string>) {
  if (seg.kind !== "boss" && seg.kind !== "miniboss") return null;
  if (seg.kind === "boss" && "alt" in seg && seg.alt && flags[seg.alt.requires]) return seg.alt.enemy;
  return null;
}
