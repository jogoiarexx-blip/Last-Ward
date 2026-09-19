import { create } from "zustand";
import { CHARACTERS } from "./data/characters";
import { ENEMIES, WEAPONS } from "./data/enemies";
import { ACHIEVEMENTS } from "./data/meta";
import { BOSS_RUSH, STAGES, STAGE_ORDER } from "./data/stages";
import {
  defaultSettings,
  emptySlot,
  loadPersist,
  savePersist,
  writeSlot,
  type PersistBlob,
  type Session,
  type Settings,
} from "./persist";
import type { CharId, Difficulty, GameMode, SaveSlot, ScreenId, StageResult } from "./types";

type Store = {
  persist: PersistBlob;
  settings: Settings;
  screen: ScreenId;
  menuIndex: number;
  session: Session | null;
  lastResult: StageResult | null;
  nextStage: string | null;
  slotPick: number;
  ending: string | null;
  setScreen: (s: ScreenId) => void;
  setMenuIndex: (i: number) => void;
  patchSettings: (p: Partial<Settings>) => void;
  startSession: (s: Partial<Session> & Pick<Session, "mode">) => void;
  saveCurrent: (extra?: Partial<SaveSlot>) => void;
  loadSlot: (i: number) => void;
  applyResult: (r: StageResult, next: string | null) => void;
  unlockAchievement: (id: string) => void;
  bumpStat: (fn: (p: PersistBlob) => void) => void;
  setEnding: (e: string | null) => void;
  consumeContinue: () => boolean;
  recordGameOver: (summary: { time: number; kills: number; bosses: number; deaths: number; breaks: number; grabKills: number; weaponUses: Record<string, number>; chars: CharId[] }) => void;
};

function persistNow(p: PersistBlob) {
  savePersist(p);
}

const TOTAL_SECRETS = Object.values(STAGES).reduce((n, s) => n + s.secrets.length, 0);
const BOSS_IDS = Array.from(
  new Set(
    Object.values(STAGES).flatMap((s) =>
      s.segments.flatMap((seg) => (seg.kind === "boss" ? [seg.enemy] : [])),
    ),
  ),
);
const CHAR_IDS: CharId[] = ["kael", "vyra", "rutger", "sien"];

function mergeSlot(base: SaveSlot, extra: Partial<SaveSlot>): SaveSlot {
  return {
    ...base,
    ...extra,
    flags: { ...base.flags, ...(extra.flags ?? {}) },
    upgrades: {
      kael: Array.from(new Set(extra.upgrades?.kael ?? base.upgrades.kael)),
      vyra: Array.from(new Set(extra.upgrades?.vyra ?? base.upgrades.vyra)),
      rutger: Array.from(new Set(extra.upgrades?.rutger ?? base.upgrades.rutger)),
      sien: Array.from(new Set(extra.upgrades?.sien ?? base.upgrades.sien)),
    },
    route: Array.from(new Set(extra.route ?? base.route)),
    secrets: Array.from(new Set([...(base.secrets ?? []), ...(extra.secrets ?? [])])),
    collectibles: Array.from(new Set([...(base.collectibles ?? []), ...(extra.collectibles ?? [])])),
    endings: Array.from(new Set([...(base.endings ?? []), ...(extra.endings ?? [])])),
    discoveredRoutes: Array.from(new Set([...(base.discoveredRoutes ?? []), ...(extra.discoveredRoutes ?? [])])),
    bossesSeen: Array.from(new Set([...(base.bossesSeen ?? []), ...(extra.bossesSeen ?? [])])),
    empty: false,
    updatedAt: Date.now(),
  };
}

export const useGameStore = create<Store>((set, get) => {
  const p = loadPersist();
  return {
    persist: p,
    settings: p.settings ?? defaultSettings(),
    screen: "boot",
    menuIndex: 0,
    session: null,
    lastResult: null,
    nextStage: null,
    slotPick: 0,
    ending: null,
    setScreen: (screen) => set({ screen, menuIndex: 0 }),
    setMenuIndex: (menuIndex) => set({ menuIndex }),
    patchSettings: (partial) => {
      const settings = { ...get().settings, ...partial };
      const persist = { ...get().persist, settings };
      persistNow(persist);
      set({ settings, persist });
    },
    startSession: (partial) => {
      const slotIndex = partial.slot ?? get().slotPick ?? 0;
      const persist = get().persist;
      let slot = persist.slots[slotIndex] ?? emptySlot(slotIndex);
      if (slot.empty && partial.mode !== "training") {
        slot = mergeSlot(slot, {
          mode: partial.mode,
          difficulty: partial.difficulty ?? "normal",
          chars: partial.chars ?? ["kael"],
          coop: partial.coop ?? false,
          stageId: partial.stageId ?? "rain-street",
        });
        writeSlot(persist, slot);
      }
      const session: Session = {
        mode: partial.mode,
        difficulty: partial.difficulty ?? slot.difficulty ?? "normal",
        chars: partial.chars ?? slot.chars ?? ["kael"],
        coop: partial.coop ?? slot.coop ?? false,
        slot: slotIndex,
        stageId: partial.stageId ?? slot.stageId ?? "rain-street",
        challengeId: partial.challengeId,
        trainingDummy: partial.trainingDummy,
        lives: partial.lives ?? (partial.mode === "arcade" ? slot.lives : undefined),
        continues: partial.continues ?? (partial.mode === "arcade" ? slot.continues : undefined),
      };
      set({ session, slotPick: slotIndex, screen: "play", lastResult: null, nextStage: null, persist: { ...persist } });
    },
    saveCurrent: (extra) => {
      const { persist, session, slotPick } = get();
      const idx = extra?.slot ?? session?.slot ?? slotPick;
      const current = persist.slots[idx] ?? emptySlot(idx);
      const sessionPatch: Partial<SaveSlot> = session
        ? {
            mode: session.mode,
            difficulty: session.difficulty,
            chars: session.chars,
            coop: session.coop,
            stageId: session.stageId,
            lives: session.lives ?? current.lives,
            continues: session.continues ?? current.continues,
          }
        : {};
      const slot = mergeSlot(current, { ...sessionPatch, ...(extra ?? {}) });
      writeSlot(persist, slot);
      set({ persist: { ...persist } });
    },
    loadSlot: (i) => {
      const sl = get().persist.slots[i];
      if (!sl || sl.empty) return;
      set({
        slotPick: i,
        session: {
          mode: sl.mode,
          difficulty: sl.difficulty,
          chars: sl.chars,
          coop: sl.coop,
          slot: i,
          stageId: sl.stageId,
          lives: sl.lives,
          continues: sl.continues,
        },
        screen: "play",
      });
    },
    applyResult: (r, next) => {
      const persist = get().persist;
      const sess = get().session;
      const stats = persist.stats;
      stats.kills += r.kills;
      stats.bosses += r.bosses.length;
      stats.maxCombo = Math.max(stats.maxCombo, r.maxCombo);
      stats.deaths += r.deaths;
      stats.stages += 1;
      stats.secrets += r.secretIds.length;
      stats.timePlayed += r.time;
      stats.breaks += r.breaks;
      stats.grabKills += r.grabKills;
      for (const c of r.chars) {
        stats.charTime[c] = (stats.charTime[c] ?? 0) + r.time / Math.max(1, r.chars.length);
        if (!stats.clearedChars.includes(c)) stats.clearedChars.push(c);
      }
      stats.favChar = CHAR_IDS.reduce((best, id) => (stats.charTime[id] > stats.charTime[best] ? id : best), stats.favChar);
      for (const [id, n] of Object.entries(r.weaponUses)) stats.weaponUses[id] = (stats.weaponUses[id] ?? 0) + n;
      if (r.challengeSuccess && r.challengeId && !stats.challenges.includes(r.challengeId)) stats.challenges.push(r.challengeId);
      if (r.bossRushComplete) stats.bossRushClears += 1;
      persist.gallery = Array.from(new Set([...(persist.gallery ?? []), ...r.collectibles]));

      const unlock = (id: string) => {
        if (!persist.achievements.includes(id) && ACHIEVEMENTS.some((a) => a.id === id)) persist.achievements.push(id);
      };
      unlock("first-stage");
      if (r.maxCombo >= 25) unlock("combo-25");
      if (r.maxCombo >= 50) unlock("combo-50");
      if (r.maxCombo >= 100) unlock("combo-100");
      if (stats.kills >= 100) unlock("kills-100");
      if (stats.kills >= 1000) unlock("kills-1000");
      if (r.deaths === 0) unlock("no-death");
      if (r.damageTaken <= 0) unlock("no-hit");
      if (r.rank === "S" || r.rank === "S+") unlock("s-rank");
      if (r.rank === "S+") unlock("s-plus");
      if (sess?.coop) unlock("coop-clear");
      if (r.kills >= 20 && r.grabKills === r.kills) unlock("grab-only");
      if (stats.breaks >= 100) unlock("break-100");
      if (stats.clearedChars.length >= CHAR_IDS.length) unlock("all-chars");
      if (Object.keys(WEAPONS).every((id) => (stats.weaponUses[id] ?? 0) > 0)) unlock("weapon-master");
      if (r.stageId === "hidden-yard") unlock("secret-stage");
      if (r.bossRushComplete) unlock("boss-rush");
      if (sess?.mode === "arcade" && r.stageId === "helix-nest") unlock("finish-arcade");
      if (sess?.difficulty === "nightmare" && r.stageId === "helix-nest") unlock("nightmare");

      if (sess) {
        const current = persist.slots[sess.slot] ?? emptySlot(sess.slot);
        const route = next ? [...current.route, r.stageId] : [...current.route, r.stageId];
        const discoveredRoutes = next ? [...current.discoveredRoutes, r.stageId, next] : [...current.discoveredRoutes, r.stageId];
        const updated = mergeSlot(current, {
          mode: sess.mode,
          difficulty: sess.difficulty,
          chars: sess.chars,
          coop: sess.coop,
          stageId: next ?? r.stageId,
          route,
          discoveredRoutes,
          secrets: r.secretIds,
          collectibles: r.collectibles,
          bossesSeen: r.bosses,
          flags: r.flags,
          tokens: current.tokens + (r.rank === "S+" ? 5 : r.rank === "S" ? 4 : r.rank === "A" ? 3 : 2) + (r.challengeSuccess ? 2 : 0) + (r.bossRushComplete ? 5 : 0),
          score: current.score + r.score,
          lives: sess.mode === "arcade" ? r.lives : current.lives,
          continues: sess.mode === "arcade" ? r.continues : current.continues,
        });
        persist.slots[sess.slot] = updated;
        if (updated.secrets.length >= TOTAL_SECRETS) unlock("all-secrets");
        if (STAGE_ORDER.every((id) => updated.discoveredRoutes.includes(id))) unlock("all-routes");
        if (BOSS_IDS.every((id) => updated.bossesSeen.includes(id)) && BOSS_RUSH.every((id) => updated.bossesSeen.includes(id))) unlock("alt-bosses");
        if (updated.flags.savedCourier && updated.flags.stoppedTruck && updated.flags.letEscape) unlock("save-all");
        stats.routes = Array.from(new Set(persist.slots.flatMap((x) => x.discoveredRoutes))).length;
        writeSlot(persist, updated);
      }
      persistNow(persist);
      const nextSession = sess && sess.mode === "arcade" ? { ...sess, lives: r.lives, continues: r.continues } : sess;
      set({ lastResult: r, nextStage: next, screen: "results", persist: { ...persist }, session: nextSession });
    },
    unlockAchievement: (id) => {
      const persist = get().persist;
      if (persist.achievements.includes(id)) return;
      if (!ACHIEVEMENTS.some((a) => a.id === id)) return;
      persist.achievements = [...persist.achievements, id];
      persistNow(persist);
      set({ persist: { ...persist } });
    },
    bumpStat: (fn) => {
      const persist = get().persist;
      fn(persist);
      persistNow(persist);
      set({ persist: { ...persist } });
    },
    setEnding: (ending) => {
      const persist = get().persist;
      const sess = get().session;
      if (ending && sess) {
        const slot = persist.slots[sess.slot];
        if (slot && !slot.endings.includes(ending)) slot.endings.push(ending);
        persist.stats.endings = Array.from(new Set(persist.slots.flatMap((s) => s.endings))).length;
        if (persist.stats.endings >= 4) {
          if (!persist.achievements.includes("all-endings")) persist.achievements.push("all-endings");
        }
        persistNow(persist);
      }
      set({ ending, screen: ending ? "ending" : "main", persist: { ...persist } });
    },
    recordGameOver: (summary) => {
      const persist = get().persist;
      const st = persist.stats;
      st.timePlayed += summary.time;
      st.kills += summary.kills;
      st.bosses += summary.bosses;
      st.deaths += summary.deaths;
      st.breaks += summary.breaks;
      st.grabKills += summary.grabKills;
      for (const c of summary.chars) {
        st.charTime[c] = (st.charTime[c] ?? 0) + summary.time / Math.max(1, summary.chars.length);
      }
      st.favChar = CHAR_IDS.reduce((best, id) => (st.charTime[id] > st.charTime[best] ? id : best), st.favChar);
      for (const [id, n] of Object.entries(summary.weaponUses)) st.weaponUses[id] = (st.weaponUses[id] ?? 0) + n;
      const unlock = (id: string) => {
        if (!persist.achievements.includes(id) && ACHIEVEMENTS.some((a) => a.id === id)) persist.achievements.push(id);
      };
      if (st.kills >= 100) unlock("kills-100");
      if (st.kills >= 1000) unlock("kills-1000");
      if (st.breaks >= 100) unlock("break-100");
      if (Object.keys(WEAPONS).every((id) => (st.weaponUses[id] ?? 0) > 0)) unlock("weapon-master");
      persistNow(persist);
      set({ persist: { ...persist } });
    },
    consumeContinue: () => {
      const { session, persist } = get();
      if (!session || session.mode !== "arcade") return false;
      const slot = persist.slots[session.slot] ?? emptySlot(session.slot);
      const left = session.continues ?? slot.continues;
      if (left <= 0) return false;
      const nextContinues = left - 1;
      const updated = mergeSlot(slot, { continues: nextContinues, lives: 3 });
      persist.slots[session.slot] = updated;
      writeSlot(persist, updated);
      set({ session: { ...session, lives: 3, continues: nextContinues }, persist: { ...persist } });
      return true;
    },
  };
});

export function charDef(id: CharId) {
  return CHARACTERS[id]!;
}

export function stageName(id: string) {
  return STAGES[id]?.name ?? id;
}
