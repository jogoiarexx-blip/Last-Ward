export const VIEW_W = 480;
export const VIEW_H = 270;
export const FIXED_DT = 1 / 60;
export const MAX_FRAME = 0.1;

export const GROUND_Y = 232;
export const DEPTH_MIN = 0;
export const DEPTH_MAX = 70;
export const DEPTH_SCALE = 0.55;

export const GRAVITY = 980;
export const FRICTION = 18;

export const HITSTOP_LIGHT = 3;
export const HITSTOP_HEAVY = 6;
export const HITSTOP_SUPER = 10;

export const INPUT_BUFFER_MS = 140;
export const COMBO_WINDOW = 0.28;
export const GRAB_RANGE = 22;
export const THROW_SPEED = 280;

export const MAX_ATTACKERS = {
  easy: 1,
  normal: 2,
  hard: 2,
  arcade: 2,
  nightmare: 3,
} as const;

export const DIFFICULTY_MOD = {
  easy: { hp: 0.72, dmg: 0.7, speed: 0.9, aggro: 0.7, loot: 1.4 },
  normal: { hp: 1, dmg: 1, speed: 1, aggro: 1, loot: 1 },
  hard: { hp: 1.28, dmg: 1.22, speed: 1.08, aggro: 1.25, loot: 0.7 },
  arcade: { hp: 1.1, dmg: 1.12, speed: 1.05, aggro: 1.15, loot: 0.85 },
  nightmare: { hp: 1.55, dmg: 1.4, speed: 1.16, aggro: 1.55, loot: 0.4 },
} as const;

export const SAVE_VERSION = 1;
export const SAVE_KEY = "last-ward-save-v1";
export const SETTINGS_KEY = "last-ward-settings-v1";

export const COLORS = {
  bg: "#0a0c14",
  surface: "#141824",
  fg: "#e8e4d8",
  muted: "#8a8490",
  amber: "#f0a030",
  teal: "#3ad0c0",
  brick: "#c43c3c",
  hp: "#e05050",
  sp: "#50c8e0",
} as const;
