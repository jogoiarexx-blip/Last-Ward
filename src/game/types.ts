export type Difficulty = "easy" | "normal" | "hard" | "arcade" | "nightmare";
export type GameMode = "story" | "arcade" | "bossrush" | "training" | "challenge" | "coop";
export type CharId = "kael" | "vyra" | "rutger" | "sien";
export type Lang = "pt" | "en";

export type FighterState =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "attack"
  | "airAttack"
  | "hurt"
  | "launch"
  | "fallen"
  | "getup"
  | "grab"
  | "grabbed"
  | "throw"
  | "special"
  | "super"
  | "block"
  | "dodge"
  | "dead"
  | "victory"
  | "intro"
  | "stun";

export type AttackKind = "L" | "H" | "S" | "J" | "R" | "G" | "U" | "B";

export type Box = { x: number; y: number; w: number; h: number; d: number };

export type HitDef = {
  start: number;
  end: number;
  dmg: number;
  knock: number;
  launch: number;
  hitstun: number;
  hitstop: number;
  reach: number;
  height: number;
  depth: number;
  juggle: boolean;
  knockdown: boolean;
  area?: boolean;
};

export type MoveDef = {
  id: string;
  name: string;
  seq: AttackKind[];
  frames: number;
  step: number;
  hits: HitDef[];
  spGain: number;
  secret?: boolean;
};

export type Stats = {
  hp: number;
  str: number;
  spd: number;
  def: number;
  range: number;
  mobility: number;
  jump: number;
};

export type CharacterDef = {
  id: CharId;
  name: string;
  title: string;
  blurb: string;
  color: string;
  stats: Stats;
  moves: MoveDef[];
  special: MoveDef;
  super: MoveDef;
  grabBonus: number;
  portrait: string;
  idle: string;
  walk: string;
  attack: string;
  jump?: string;
  hurt?: string;
};

export type EnemyArchetype =
  | "thug"
  | "runner"
  | "brute"
  | "fighter"
  | "grabber"
  | "armed"
  | "shooter"
  | "blocker"
  | "dodger"
  | "jumper"
  | "shield"
  | "elite"
  | "miniboss"
  | "boss";

export type EnemyDef = {
  id: string;
  name: string;
  archetype: EnemyArchetype;
  sprite: string;
  color: string;
  stats: Stats;
  score: number;
  moves: MoveDef[];
  scale?: number;
  intro?: string;
};

export type WeaponDef = {
  id: string;
  name: string;
  dmg: number;
  reach: number;
  speed: number;
  durability: number;
  throwable: boolean;
  spriteIndex: number;
};

export type PropKind = "barrel" | "crate" | "dumpster" | "phone" | "sign" | "vending" | "table" | "hydrant";

export type WaveSpawn = {
  type: string;
  count: number;
  side?: "left" | "right" | "both";
};

export type StageSegment =
  | { kind: "walk"; to: number }
  | { kind: "lock"; id: string; waves: WaveSpawn[][]; hold?: boolean }
  | {
      kind: "fork";
      id: string;
      a: { next: string; label: string; yBand: "up" | "down" };
      b: { next: string; label: string; yBand: "up" | "down" };
      secret?: { next: string; label: string; requires: string };
    }
  | { kind: "miniboss"; id: string; enemy: string }
  | { kind: "boss"; id: string; enemy: string; phases: number; alt?: { enemy: string; requires: string } }
  | { kind: "event"; id: string; flag: string };

export type StageDef = {
  id: string;
  name: string;
  chapter: number;
  length: number;
  theme: StageTheme;
  segments: StageSegment[];
  destructibles: { x: number; y: number; kind: PropKind; loot?: string }[];
  weapons: { x: number; y: number; id: string }[];
  secrets: { x: number; y: number; id: string; kind: "wall" | "door" | "npc" | "quick" }[];
  collectibles: { x: number; y: number; id: string }[];
  nextDefault?: string;
};

export type StageTheme =
  | "urban"
  | "metro"
  | "roofs"
  | "industrial"
  | "factory"
  | "docks"
  | "mall"
  | "hollow"
  | "spire"
  | "helix"
  | "secret"
  | "dojo";

export type ScreenId =
  | "boot"
  | "title"
  | "main"
  | "slots"
  | "mode"
  | "difficulty"
  | "chars"
  | "play"
  | "pause"
  | "results"
  | "hub"
  | "gameover"
  | "ending"
  | "training"
  | "challenges"
  | "bossrush"
  | "characters"
  | "upgrades"
  | "extras"
  | "achievements"
  | "stats"
  | "options"
  | "credits"
  | "routes"
  | "moves"
  | "gallery"
  | "controls"
  | "stageSelect";

export type Rank = "D" | "C" | "B" | "A" | "S" | "S+";

export type StageResult = {
  stageId: string;
  time: number;
  kills: number;
  maxCombo: number;
  damageTaken: number;
  secrets: number;
  score: number;
  rank: Rank;
  secretIds: string[];
  collectibles: string[];
  bosses: string[];
  deaths: number;
  breaks: number;
  grabKills: number;
  weaponUses: Record<string, number>;
  chars: CharId[];
  flags: Flags;
  challengeId?: string;
  challengeSuccess?: boolean;
  bossRushComplete?: boolean;
  lives: number;
  continues: number;
};

export type Flags = Record<string, boolean | number | string>;

export type SaveSlot = {
  version: number;
  slot: number;
  empty: boolean;
  updatedAt: number;
  mode: GameMode;
  difficulty: Difficulty;
  chars: CharId[];
  coop: boolean;
  stageId: string;
  route: string[];
  flags: Flags;
  upgrades: Record<CharId, string[]>;
  tokens: number;
  lives: number;
  continues: number;
  score: number;
  secrets: string[];
  collectibles: string[];
  endings: string[];
  discoveredRoutes: string[];
  bossesSeen: string[];
};
