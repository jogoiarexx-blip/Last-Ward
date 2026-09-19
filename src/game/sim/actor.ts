import type { AttackKind, FighterState, MoveDef, Stats } from "../types";

export type WeaponInst = { id: string; durability: number; dmg: number; reach: number; speed: number; throwable: boolean; spriteIndex: number; name: string };

export type AiMem = {
  role: "wait" | "attack" | "circle" | "retreat" | "grab" | "shoot" | "block" | "pickup" | "charge";
  timer: number;
  slot: boolean;
  think: number;
  dummy?: "idle" | "attack" | "block";
  shotCooldown?: number;
  windup?: number;
  pendingLight?: boolean;
  pendingHeavy?: boolean;
};

export type Actor = {
  id: number;
  team: 0 | 1;
  isPlayer: boolean;
  playerIndex: number;
  key: string;
  name: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  state: FighterState;
  stateT: number;
  anim: string;
  frame: number;
  animSpd: number;
  invuln: number;
  comboChain: AttackKind[];
  comboAge: number;
  move: MoveDef | null;
  hitOnce: Set<number>;
  grabId: number;
  weapon: WeaponInst | null;
  flash: number;
  scale: number;
  color: string;
  idle: string;
  walk: string;
  attack: string;
  jump: string;
  hurt: string;
  stats: Stats;
  moves: MoveDef[];
  special: MoveDef | null;
  super: MoveDef | null;
  juggle: number;
  fallenT: number;
  lives: number;
  dead: boolean;
  ai: AiMem | null;
  runT: number;
  dodgeT: number;
  stunned: number;
  throwVx: number;
  throwOwner: number;
  damageTaken: number;
  archetype: string;
  phase: number;
  phases: number;
  intro: string | null;
  grabBonus: number;
  reviveT: number;
  downed: boolean;
  hitstopOwn: number;
  secretUnlocked: boolean;
  blocking: boolean;
  squash: number;
  parryFlash: number;
};

let _id = 1;
export function nid() {
  return _id++;
}

export function resetIds() {
  _id = 1;
}
