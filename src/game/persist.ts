import { SAVE_KEY, SAVE_VERSION, SETTINGS_KEY } from "./config";
import type { CharId, Difficulty, GameMode, Lang, SaveSlot } from "./types";

export type Settings = {
  lang: Lang;
  master: number;
  music: number;
  sfx: number;
  shake: number;
  reduced: boolean;
  scanlines: boolean;
  debug: boolean;
  p1BindHint: boolean;
};

export const defaultSettings = (): Settings => ({
  lang: "pt",
  master: 0.85,
  music: 0.55,
  sfx: 0.8,
  shake: 1,
  reduced: false,
  scanlines: true,
  debug: false,
  p1BindHint: true,
});

export const emptySlot = (slot: number): SaveSlot => ({
  version: SAVE_VERSION,
  slot,
  empty: true,
  updatedAt: 0,
  mode: "story",
  difficulty: "normal",
  chars: ["kael"],
  coop: false,
  stageId: "rain-street",
  route: [],
  flags: {},
  upgrades: { kael: [], vyra: [], rutger: [], sien: [] },
  tokens: 0,
  lives: 3,
  continues: 3,
  score: 0,
  secrets: [],
  collectibles: [],
  endings: [],
  discoveredRoutes: [],
  bossesSeen: [],
});

export type StatsDump = {
  timePlayed: number;
  kills: number;
  bosses: number;
  maxCombo: number;
  deaths: number;
  stages: number;
  secrets: number;
  routes: number;
  endings: number;
  favChar: CharId;
  charTime: Record<CharId, number>;
  weaponUses: Record<string, number>;
  breaks: number;
  grabKills: number;
  clearedChars: CharId[];
  challenges: string[];
  bossRushClears: number;
};

export const defaultStats = (): StatsDump => ({
  timePlayed: 0,
  kills: 0,
  bosses: 0,
  maxCombo: 0,
  deaths: 0,
  stages: 0,
  secrets: 0,
  routes: 0,
  endings: 0,
  favChar: "kael",
  charTime: { kael: 0, vyra: 0, rutger: 0, sien: 0 },
  weaponUses: {},
  breaks: 0,
  grabKills: 0,
  clearedChars: [],
  challenges: [],
  bossRushClears: 0,
});

export type PersistBlob = {
  version: number;
  slots: SaveSlot[];
  settings: Settings;
  stats: StatsDump;
  unlocked: string[];
  achievements: string[];
  gallery: string[];
  arcadeScores: { name: string; score: number; char: CharId; date: number }[];
};

function defaults(): PersistBlob {
  return {
    version: SAVE_VERSION,
    slots: [emptySlot(0), emptySlot(1), emptySlot(2)],
    settings: defaultSettings(),
    stats: defaultStats(),
    unlocked: ["kael", "vyra", "rutger", "sien"],
    achievements: [],
    gallery: [],
    arcadeScores: [],
  };
}

function migrate(raw: PersistBlob): PersistBlob {
  const d = defaults();
  return {
    ...d,
    ...raw,
    version: SAVE_VERSION,
    settings: { ...d.settings, ...raw.settings },
    stats: {
      ...d.stats,
      ...(raw.stats ?? {}),
      charTime: { ...d.stats.charTime, ...(raw.stats?.charTime ?? {}) },
      weaponUses: { ...d.stats.weaponUses, ...(raw.stats?.weaponUses ?? {}) },
      clearedChars: Array.from(new Set(raw.stats?.clearedChars ?? [])),
      challenges: Array.from(new Set(raw.stats?.challenges ?? [])),
    },
    slots: (raw.slots ?? d.slots).map((s, i) => ({
      ...emptySlot(i),
      ...s,
      upgrades: { ...emptySlot(i).upgrades, ...(s.upgrades ?? {}) },
      route: [...(s.route ?? [])],
      secrets: Array.from(new Set(s.secrets ?? [])),
      collectibles: Array.from(new Set(s.collectibles ?? [])),
      endings: Array.from(new Set(s.endings ?? [])),
      discoveredRoutes: Array.from(new Set(s.discoveredRoutes ?? [])),
      bossesSeen: Array.from(new Set(s.bossesSeen ?? [])),
      flags: { ...(s.flags ?? {}) },
      version: SAVE_VERSION,
    })),
  };
}

export function loadPersist(): PersistBlob {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaults();
    return migrate(JSON.parse(raw) as PersistBlob);
  } catch {
    return defaults();
  }
}

export function savePersist(p: PersistBlob) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(p));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(p.settings));
  } catch {
    /* quota / private mode */
  }
}

export function writeSlot(p: PersistBlob, slot: SaveSlot) {
  p.slots[slot.slot] = { ...slot, empty: false, updatedAt: Date.now() };
  savePersist(p);
}

export type Session = {
  mode: GameMode;
  difficulty: Difficulty;
  chars: CharId[];
  coop: boolean;
  slot: number;
  stageId: string;
  challengeId?: string;
  trainingDummy?: "idle" | "attack" | "block";
  lives?: number;
  continues?: number;
};
