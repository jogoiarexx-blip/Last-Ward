import { asset } from "@/game/asset";
import { assignSlots, thinkEnemy } from "./ai";
import { tickBoss } from "./ai/boss";
import { grabCandidate, hitActive, pickMove, rankFor } from "./combat";
import {
  DEPTH_MAX,
  DEPTH_MIN,
  DIFFICULTY_MOD,
  FIXED_DT,
  GRAVITY,
  HITSTOP_HEAVY,
  MAX_FRAME,
  VIEW_H,
  VIEW_W,
} from "./config";
import { AudioEngine } from "./core/audio";
import { InputManager, type PlayerInput } from "./core/input";
import { Juice, Particles } from "./core/juice";
import { CHARACTERS } from "./data/characters";
import { ENEMIES, WEAPONS } from "./data/enemies";
import { BOSS_RUSH, STAGES } from "./data/stages";
import { CHALLENGES } from "./data/meta";
import { loadPersist, type Session } from "./persist";
import { drawBackground, drawForeground, worldToScreen, BG_URLS, themeAssetUrls } from "./render/background";
import { drawFighter, drawShadow } from "./render/actor";
import { drawSheet, preloadAll } from "./sprites";
import { nid, resetIds, type Actor, type WeaponInst } from "./sim/actor";
import type { AttackKind, CharId, HitDef, MoveDef, Rank, StageDef, StageResult } from "./types";
import { bounceIfWalled, canOtg, hasArmor, isCounter, separateCrowd } from "./combat/feel";
import { CHAR_TAUNT, SECRET_LINES, STAGE_INTRO, TUTORIAL } from "./data/story";
import { altBossFor, pickFork } from "./world/director";

function enemyTypesIn(st: StageDef): string[] {
  const ids = new Set<string>(["thug"]);
  for (const seg of st.segments) {
    if (seg.kind === "lock") {
      for (const wave of seg.waves) for (const w of wave) ids.add(w.type);
    } else if (seg.kind === "miniboss" || seg.kind === "boss") {
      ids.add(seg.enemy);
      if (seg.kind === "boss" && seg.alt) ids.add(seg.alt.enemy);
    }
  }
  return [...ids];
}

export type HudSnap = {
  p1?: Actor;
  p2?: Actor | null;
  score: number;
  combo: number;
  multiplier: number;
  lives: number;
  stageName: string;
  boss?: Actor | null;
  fork?: { a: string; b: string } | null;
  intro?: string | null;
  paused: boolean;
  debug: DebugInfo | null;
  toast: string | null;
  hint: string | null;
  lastMove: string | null;
  dialogue: string | null;
};

export type GameOverSummary = {
  time: number;
  kills: number;
  bosses: number;
  deaths: number;
  breaks: number;
  grabKills: number;
  weaponUses: Record<string, number>;
  chars: CharId[];
};

export type DebugInfo = {
  fps: number;
  enemies: number;
  cam: number;
  route: string;
  states: string[];
};

type Prop = {
  id: number;
  x: number;
  y: number;
  kind: number;
  hp: number;
  loot?: string;
  broken: boolean;
};
type Pickup = { id: number; x: number; y: number; kind: "hp" | "sp" | "life" | "weapon" | "collect" | "token"; weapon?: string; collectId?: string; z: number; t: number };
type Shot = { x: number; y: number; z: number; vx: number; team: number; dmg: number; life: number };

type Civ = { x: number; y: number; vx: number; facing: 1 | -1; flee: boolean };
type Hazard = { x: number; y: number; kind: "steam" | "oil" | "spark"; t: number };

const PROP_HP = [10, 8, 16, 12, 6, 14, 8, 10];

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input = new InputManager();
  audio = new AudioEngine();
  juice = new Juice();
  fx = new Particles();
  actors: Actor[] = [];
  props: Prop[] = [];
  pickups: Pickup[] = [];
  shots: Shot[] = [];
  stage!: StageDef;
  session: Session;
  camX = 0;
  camTarget = 0;
  lockMin = 0;
  lockMax = 99999;
  locked = false;
  seg = 0;
  time = 0;
  acc = 0;
  score = 0;
  combo = 0;
  comboT = 0;
  maxCombo = 0;
  multiplier = 1;
  kills = 0;
  damageTaken = 0;
  secretsFound = 0;
  lives = 3;
  continues = 3;
  flags: Record<string, boolean | number | string> = {};
  paused = false;
  over = false;
  result: StageResult | null = null;
  fork: { a: string; b: string; secret?: string } | null = null;
  chosenNext: string | null = null;
  intro: string | null = null;
  introT = 0;
  toast: string | null = null;
  toastT = 0;
  running = false;
  raf = 0;
  last = 0;
  fps = 60;
  debug = false;
  reduced = false;
  shakeMul = 1;
  scanlines = true;
  waveQueue: { type: string; count: number; side?: string }[][] = [];
  waveI = 0;
  holdLock = false;
  rain: { x: number; y: number }[] = [];
  onHud?: (h: HudSnap) => void;
  onResult?: (r: StageResult, next: string | null) => void;
  onGameOver?: (summary: GameOverSummary) => void;
  grabbedCollect: string[] = [];
  trainingDummy: "idle" | "attack" | "block" = "idle";
  bossPhaseAnnounced = 1;
  coopComboT = 0;
  bossRushIndex = 0;
  slotRefreshT = 0;
  foundSecretIds: string[] = [];
  bossesDefeated: string[] = [];
  deaths = 0;
  breaks = 0;
  grabKills = 0;
  weaponUses: Record<string, number> = {};
  pendingKillKind = new Map<number, "grab" | "weapon" | "normal">();
  activeUpgrades: Record<CharId, Set<string>> = { kael: new Set(), vyra: new Set(), rutger: new Set(), sien: new Set() };
  challengeDone = false;
  civilians: Civ[] = [];
  hazards: Hazard[] = [];
  hint: string | null = null;
  lastMove: string | null = null;
  dialogue: string | null = null;
  dialogueT = 0;

  constructor(canvas: HTMLCanvasElement, session: Session) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.session = session;
    this.input.coop = session.coop;
    this.debug = new URLSearchParams(location.search).has("debug");
  }

  async start() {
    this.input.attach();
    resetIds();
    const save = loadPersist();
    const slot = save.slots[this.session.slot];
    if (slot) {
      for (const id of Object.keys(this.activeUpgrades) as CharId[]) this.activeUpgrades[id] = new Set(slot.upgrades?.[id] ?? []);
      if (this.session.mode === "arcade") {
        this.lives = this.session.lives ?? slot.lives ?? 3;
        this.continues = this.session.continues ?? slot.continues ?? 3;
      }
    }
    const urls = new Set<string>([
      asset("sprites/props.png"),
      asset("sprites/weapons.png"),
      asset("sprites/impact.png"),
      asset("sprites/item-apple.png"),
      asset("sprites/item-chicken.png"),
      asset("sprites/item-pizza.png"),
      asset("sprites/item-soda.png"),
    ]);
    for (const id of this.session.chars) {
      const c = CHARACTERS[id];
      if (!c) continue;
      urls.add(c.idle);
      urls.add(c.walk);
      urls.add(c.attack);
      urls.add(c.portrait);
      if (c.jump) urls.add(c.jump);
      if (c.hurt) urls.add(c.hurt);
    }
    const bootStage = STAGES[this.session.stageId] ?? STAGES["rain-street"]!;
    for (const u of themeAssetUrls(bootStage.theme)) urls.add(u);
    for (const type of enemyTypesIn(bootStage)) {
      const e = ENEMIES[type];
      if (e) urls.add(e.sprite);
    }
    await preloadAll([...urls]);
    this.setupStage(this.session.stageId);
    void preloadAll(BG_URLS.filter((u) => !urls.has(u)));
    const restChars = Object.values(CHARACTERS).flatMap((c) => [c.idle, c.walk, c.attack, c.portrait, c.jump, c.hurt].filter(Boolean) as string[]);
    const restEnemies = Object.values(ENEMIES).map((e) => e.sprite);
    void preloadAll([...restChars, ...restEnemies].filter((u) => !urls.has(u)));
    this.running = true;
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min((t - this.last) / 1000, MAX_FRAME);
      this.last = t;
      this.fps = this.fps * 0.9 + (1 / Math.max(dt, 0.001)) * 0.1;
      this.acc += dt;
      while (this.acc >= FIXED_DT) {
        this.fixed(FIXED_DT);
        this.acc -= FIXED_DT;
      }
      this.draw();
      this.emitHud();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);

    const p = this.actors.find((a) => a.isPlayer);
    const w = window as unknown as { __controlsTest: unknown; __lwInput?: InputManager };
    w.__controlsTest = {
      getYaw: () => -(p?.x ?? 0) * 0.02,
      getSpeed: () => (p ? Math.hypot(p.vx, p.vy) : 0),
      setKeys: (codes: string[]) => this.input.setKeys(codes),
    };
    w.__lwInput = this.input;
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.destroy();
    this.audio.destroy();
    const w = window as unknown as { __lwInput?: unknown };
    if (w.__lwInput === this.input) delete w.__lwInput;
  }

  setupStage(id: string) {
    const st = STAGES[id] ?? STAGES["rain-street"]!;
    this.stage = st;
    void preloadAll([...themeAssetUrls(st.theme), ...enemyTypesIn(st).map((t) => ENEMIES[t]?.sprite).filter(Boolean) as string[]]);
    this.seg = 0;
    this.camX = 0;
    this.lockMin = 0;
    this.lockMax = 220;
    this.locked = false;
    this.actors = [];
    this.props = [];
    this.pickups = [];
    this.shots = [];
    this.waveQueue = [];
    this.bossRushIndex = 0;
    this.slotRefreshT = 0;
    this.foundSecretIds = [];
    this.bossesDefeated = [];
    this.deaths = 0;
    this.breaks = 0;
    this.grabKills = 0;
    this.weaponUses = {};
    this.pendingKillKind.clear();
    this.challengeDone = false;
    this.civilians = [];
    this.hazards = [];
    this.hint = null;
    this.lastMove = null;
    this.dialogue = STAGE_INTRO[st.id] ?? null;
    this.dialogueT = 3.6;
    this.fork = null;
    this.chosenNext = null;
    this.result = null;
    this.over = false;
    this.time = 0;
    this.combo = 0;
    this.audio.theme = st.theme === "helix" ? "helix" : st.id.includes("boss") ? "boss" : "stage";
    const chars = this.session.chars;
    chars.forEach((c, i) => this.spawnPlayer(c, 80 + i * 28, 24, i));
    if (this.session.mode === "training") {
      const d = this.spawnEnemy("thug", 220, 30);
      d.ai!.dummy = this.session.trainingDummy ?? this.trainingDummy;
      d.maxHp = 9999;
      d.hp = 9999;
    }
    if (this.session.mode === "bossrush") {
      this.spawnBoss(BOSS_RUSH[0]!, 280);
    }
    for (const p of st.destructibles) {
      const kind = ["barrel", "crate", "dumpster", "phone", "sign", "vending", "table", "hydrant"].indexOf(p.kind);
      this.props.push({ id: nid(), x: p.x, y: p.y, kind: Math.max(0, kind), hp: PROP_HP[Math.max(0, kind)] ?? 8, loot: p.loot, broken: false });
    }
    for (const w of st.weapons) {
      this.pickups.push({ id: nid(), x: w.x, y: w.y, kind: "weapon", weapon: w.id, z: 0, t: 0 });
    }
    for (const c of st.collectibles) {
      this.pickups.push({ id: nid(), x: c.x, y: c.y, kind: "collect", collectId: c.id, z: 8, t: 0 });
    }
    this.seedWorldDressing(st.theme);
    this.applySegment();
  }

  seedWorldDressing(theme: StageDef["theme"]) {
    const civicThemes = ["urban", "mall", "docks", "roofs", "hollow"];
    if (civicThemes.includes(theme)) {
      for (let i = 0; i < 5; i++) {
        this.civilians.push({
          x: 140 + i * 220 + Math.random() * 40,
          y: 10 + Math.random() * 50,
          vx: 0,
          facing: Math.random() > 0.5 ? 1 : -1,
          flee: false,
        });
      }
    }
    if (theme === "factory" || theme === "industrial") {
      this.hazards.push({ x: 520, y: 28, kind: "steam", t: 0 }, { x: 1100, y: 40, kind: "spark", t: 0.6 }, { x: 1680, y: 22, kind: "steam", t: 1.1 });
    }
    if (theme === "docks") {
      this.hazards.push({ x: 700, y: 30, kind: "oil", t: 0 }, { x: 1400, y: 44, kind: "oil", t: 0 });
    }
    if (theme === "helix") {
      this.hazards.push({ x: 900, y: 32, kind: "spark", t: 0 }, { x: 1600, y: 28, kind: "spark", t: 0.8 });
    }
  }

  spawnPlayer(id: CharId, x: number, y: number, index: number) {
    const def = CHARACTERS[id]!;
    const a = this.baseActor(id, def.name, x, y, 0);
    a.isPlayer = true;
    a.playerIndex = index;
    a.team = 0;
    a.stats = { ...def.stats };
    const ups = this.activeUpgrades[id] ?? new Set<string>();
    if (ups.has("k-hp")) a.stats.hp += 12;
    if (ups.has("v-hp")) a.stats.hp += 8;
    if (ups.has("r-hp")) a.stats.hp += 18;
    if (ups.has("s-hp")) a.stats.hp += 10;
    if (ups.has("k-str")) a.stats.str *= 1.08;
    if (ups.has("v-str")) a.stats.str *= 1.06;
    if (ups.has("v-spd")) a.stats.spd *= 1.1;
    if (ups.has("r-def")) a.stats.def *= 1.1;
    if (ups.has("s-rng")) a.stats.range *= 1.12;
    if (ups.has("k-dash")) a.stats.mobility *= 1.08;
    if (ups.has("s-mob")) a.stats.mobility *= 1.12;
    a.maxHp = a.stats.hp;
    a.hp = a.maxHp;
    a.color = def.color;
    a.idle = def.idle;
    a.walk = def.walk;
    a.attack = def.attack;
    a.jump = def.jump ?? def.idle;
    a.hurt = def.hurt ?? def.idle;
    const comboUpgrade = `${id[0]}-combo`;
    a.moves = def.moves.filter((m) => !m.secret || ups.has(comboUpgrade));
    a.special = def.special;
    a.super = def.super;
    a.grabBonus = def.grabBonus * (ups.has("r-gr") ? 1.2 : 1);
    a.maxSp = ups.has("k-sp") ? 115 : 100;
    a.lives = this.session.mode === "arcade" ? this.lives : 99;
    a.scale = id === "rutger" ? 1.15 : id === "vyra" ? 0.92 : 1;
    this.actors.push(a);
    return a;
  }

  spawnEnemy(type: string, x: number, y: number) {
    const def = ENEMIES[type] ?? ENEMIES.thug!;
    const mod = DIFFICULTY_MOD[this.session.difficulty];
    const a = this.baseActor(def.id, def.name, x, y, 1);
    a.stats = { ...def.stats, spd: def.stats.spd * mod.speed };
    a.maxHp = Math.round(def.stats.hp * mod.hp);
    a.hp = a.maxHp;
    a.color = def.color;
    a.idle = def.sprite;
    a.walk = def.sprite;
    a.attack = def.sprite;
    a.jump = def.sprite;
    a.hurt = def.sprite;
    a.moves = def.moves;
    a.scale = def.scale ?? 1;
    a.archetype = def.archetype;
    a.intro = def.intro ?? null;
    a.phases = def.archetype === "boss" ? 3 : 1;
    a.ai = { role: "wait", timer: 0.4 + Math.random(), slot: false, think: 0.2 };
    this.actors.push(a);
    return a;
  }

  spawnBoss(type: string, x: number) {
    const b = this.spawnEnemy(type, x, 32);
    this.intro = b.intro;
    this.introT = 2.2;
    this.audio.theme = "boss";
    this.audio.sfx("super");
    return b;
  }

  baseActor(key: string, name: string, x: number, y: number, team: 0 | 1): Actor {
    return {
      id: nid(),
      team,
      isPlayer: false,
      playerIndex: -1,
      key,
      name,
      x,
      y,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: 1,
      hp: 40,
      maxHp: 40,
      sp: 0,
      maxSp: 100,
      state: "idle",
      stateT: 0,
      anim: "idle",
      frame: 0,
      animSpd: 8,
      invuln: 0,
      comboChain: [],
      comboAge: 0,
      move: null,
      hitOnce: new Set(),
      grabId: 0,
      weapon: null,
      flash: 0,
      scale: 1,
      color: "#888",
      idle: "",
      walk: "",
      attack: "",
      jump: "",
      hurt: "",
      stats: { hp: 40, str: 1, spd: 1, def: 1, range: 1, mobility: 1, jump: 260 },
      moves: [],
      special: null,
      super: null,
      juggle: 0,
      fallenT: 0,
      lives: 0,
      dead: false,
      ai: null,
      runT: 0,
      dodgeT: 0,
      stunned: 0,
      throwVx: 0,
      throwOwner: 0,
      damageTaken: 0,
      archetype: "thug",
      phase: 1,
      phases: 1,
      intro: null,
      grabBonus: 1,
      reviveT: 0,
      downed: false,
      hitstopOwn: 0,
      secretUnlocked: false,
      blocking: false,
      squash: 1,
      parryFlash: 0,
    };
  }

  applySegment() {
    const s = this.stage.segments[this.seg];
    if (!s) {
      this.finishStage();
      return;
    }
    if (s.kind === "walk") {
      this.locked = false;
      this.lockMax = s.to;
    } else if (s.kind === "lock") {
      this.locked = true;
      this.lockMin = Math.max(0, this.camX - 10);
      this.lockMax = this.camX + VIEW_W * 0.55;
      this.waveQueue = s.waves.map((w) => w.map((x) => ({ ...x })));
      this.waveI = 0;
      this.holdLock = true;
      this.spawnWave();
    } else if (s.kind === "fork") {
      this.locked = false;
      this.fork = { a: s.a.next, b: s.b.next, secret: s.secret?.next };
      this.toast = "↑ " + s.a.label + "   ↓ " + s.b.label;
      this.toastT = 6;
    } else if (s.kind === "miniboss") {
      this.locked = true;
      this.lockMin = this.camX;
      this.lockMax = this.camX + 200;
      this.spawnBoss(s.enemy, this.camX + 220);
    } else if (s.kind === "boss") {
      this.locked = true;
      this.lockMin = this.camX;
      this.lockMax = this.camX + 220;
      const alt = altBossFor(s, this.flags);
      this.spawnBoss(alt ?? s.enemy, this.camX + 240);
      if (alt) {
        this.toast = "CHEFE ALTERNATIVO";
        this.toastT = 2.2;
      }
    } else if (s.kind === "event") {
      this.flags[s.flag] = true;
      this.toast = s.flag;
      this.toastT = 2;
      this.seg++;
      this.applySegment();
    }
  }

  spawnWave() {
    const wave = this.waveQueue[this.waveI];
    if (!wave) return;
    const p = this.actors.find((a) => a.isPlayer);
    const px = p?.x ?? this.camX + 80;
    for (const g of wave) {
      for (let i = 0; i < g.count; i++) {
        const side = g.side === "both" ? (i % 2 === 0 ? "left" : "right") : (g.side ?? "right");
        let x = side === "left" ? this.camX - 40 - i * 18 : this.camX + VIEW_W + 30 + i * 18;
        if (Math.abs(x - px) < 50) x += side === "left" ? -60 : 60;
        const y = 12 + Math.random() * (DEPTH_MAX - 16);
        this.spawnEnemy(g.type, x, y);
      }
    }
  }

  enemiesAlive() {
    return this.actors.filter((a) => !a.isPlayer && !a.dead && a.state !== "dead");
  }

  fixed(dt: number) {
    this.input.poll(performance.now());
    if (this.input.players[0].just.pause && !this.over) this.paused = !this.paused;
    if (this.paused || this.over) return;
    this.audio.tick(dt);
    if (this.juice.frozen()) {
      this.juice.update(dt, this.reduced);
      return;
    }
    this.time += dt;
    if (this.introT > 0) this.introT -= dt;
    if (this.introT <= 0) this.intro = null;
    if (this.toastT > 0) this.toastT -= dt;
    else this.toast = null;
    if (this.dialogueT > 0) this.dialogueT -= dt;
    else this.dialogue = null;
    this.hint = null;
    if (this.stage.id === "rain-street" && this.session.mode !== "training" && this.time < 12) {
      const line = [...TUTORIAL].reverse().find((h) => this.time >= h.at);
      this.hint = line?.text ?? null;
    }
    this.comboT -= dt;
    if (this.comboT <= 0) {
      this.combo = 0;
      this.multiplier = 1;
    }

    const players = this.actors.filter((a) => a.isPlayer && !a.dead && !a.downed);
    const enemies = this.actors.filter((a) => !a.isPlayer && !a.dead);
    this.slotRefreshT -= dt;
    if (this.slotRefreshT <= 0) {
      assignSlots(enemies, players, this.session.difficulty);
      this.slotRefreshT = 0.12;
    }
    const aggro = DIFFICULTY_MOD[this.session.difficulty].aggro;

    for (const a of this.actors) {
      if (a.dead && a.state === "dead") continue;
      this.updateActor(a, dt, aggro, players);
    }
    this.resolveHits(players, enemies);
    this.updateShots(dt, players, enemies);
    this.updatePickups(dt);
    this.tickBossEvents(players);
    this.tickDressing(dt, players);
    separateCrowd(this.actors);
    this.fx.update(dt);
    this.juice.update(dt, this.reduced);

    this.actors = this.actors.filter((a) => {
      if (a.dead && !a.isPlayer) return false;
      return true;
    });

    this.progressStage();
    this.checkChallenge();
    this.camera(dt);
    this.coopRevive(dt);
    if (this.session.coop) {
      const livePlayers = this.actors.filter((a) => a.isPlayer && !a.dead);
      if (livePlayers.length > 0 && livePlayers.every((a) => a.downed)) this.fail();
    }
  }

  updateActor(a: Actor, dt: number, aggro: number, players: Actor[]) {
    a.invuln = Math.max(0, a.invuln - dt);
    a.flash = Math.max(0, a.flash - dt);
    a.parryFlash = Math.max(0, (a.parryFlash ?? 0) - dt);
    a.squash += (1 - (a.squash || 1)) * Math.min(1, dt * 12);
    a.comboAge += dt;
    if (a.comboAge > 0.32) a.comboChain = [];
    a.frame += a.animSpd * dt;
    if (a.stunned > 0) {
      a.stunned -= dt;
      a.vx *= 0.8;
      a.x += a.vx * dt;
      return;
    }

    let inp: { moveX: number; moveY: number; jump: boolean; light: boolean; heavy: boolean; special: boolean; super?: boolean; grab: boolean; run: boolean; dodge: boolean; just?: PlayerInput["just"] };
    if (a.isPlayer) {
      const p = this.input.players[a.playerIndex as 0 | 1];
      inp = p;
    } else {
      inp = thinkEnemy(a, players, dt, aggro);
    }

    const busy = ["attack", "airAttack", "hurt", "launch", "fallen", "getup", "grab", "grabbed", "throw", "special", "super", "dead", "intro", "block"].includes(a.state);

    if (a.state === "fallen") {
      a.fallenT -= dt;
      a.z = 0;
      a.vx *= 0.85;
      if (a.fallenT <= 0) {
        a.throwVx = 0;
        if (a.hp <= 0) this.ko(a);
        else this.setState(a, "getup", 0.4);
      }
      a.x += a.vx * dt;
      this.clampActor(a);
      return;
    }
    if (a.state === "getup") {
      a.stateT -= dt;
      if (a.stateT <= 0) this.setState(a, "idle", 0);
      return;
    }
    if (a.state === "hurt" || a.state === "launch") {
      a.stateT -= dt;
      a.vz -= GRAVITY * dt;
      a.z += a.vz * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.z <= 0) {
        a.z = 0;
        if (bounceIfWalled(a, this.locked ? this.lockMin : Math.max(20, this.camX - 30), this.locked ? this.lockMax + VIEW_W - 40 : this.stage.length)) {
          this.juice.addTrauma(0.28);
          this.audio.sfx("hit-heavy");
          this.fx.burst(a.x, a.y, 18, "#f0e8a0", 10, 150);
          a.squash = 1.3;
        }
        if (a.state === "launch" && a.juggle >= 2 && a.juggle < 5 && a.hp > 0) {
          a.vz = 150 - a.juggle * 18;
          a.z = 4;
          a.juggle += 1;
          this.fx.dust(a.x, a.y);
          this.audio.sfx("land");
        } else if (a.state === "launch" || Math.abs(a.vx) > 180) {
          this.setState(a, "fallen", 0);
          a.fallenT = a.hp <= 0 ? 0.6 : 0.45;
          this.audio.sfx("land");
        } else if (a.stateT <= 0) this.setState(a, "idle", 0);
      }
      this.clampActor(a);
      return;
    }
    if (a.state === "block") {
      a.blocking = true;
      a.stateT -= dt;
      a.vx *= 0.6;
      const p = a.isPlayer ? this.input.players[a.playerIndex as 0 | 1] : null;
      if (p?.dodge && Math.abs(p.moveX) + Math.abs(p.moveY) < 0.25) a.stateT = 0.12;
      if (a.stateT <= 0) {
        a.blocking = false;
        this.setState(a, "idle", 0);
      }
      this.clampActor(a);
      return;
    }
    if (a.state === "grab") {
      a.stateT -= dt;
      const vic = this.actors.find((o) => o.id === a.grabId);
      if (vic) {
        vic.x = a.x + a.facing * 18;
        vic.y = a.y;
        vic.z = 10;
        vic.state = "grabbed";
      }
      const p = a.isPlayer ? this.input.players[a.playerIndex as 0 | 1] : null;
      if (p?.just.light) this.grabHit(a, vic, 10);
      if (p?.just.heavy || (p && Math.abs(p.moveX) > 0.5 && p.just.light)) this.throwVic(a, vic, Math.sign(p.moveX || a.facing));
      if (p?.just.special) this.grabHit(a, vic, 18);
      if (a.stateT <= 0) {
        if (vic) this.setState(vic, "idle", 0);
        this.setState(a, "idle", 0);
      }
      return;
    }
    if (a.state === "throw") {
      a.stateT -= dt;
      if (a.stateT <= 0) this.setState(a, "idle", 0);
      return;
    }
    if (a.state === "dodge") {
      a.stateT -= dt;
      a.x += a.facing * -160 * dt;
      a.invuln = 0.12;
      if (a.stateT <= 0) this.setState(a, "idle", 0);
      this.clampActor(a);
      return;
    }
    if (a.state === "attack" || a.state === "airAttack" || a.state === "special" || a.state === "super") {
      a.stateT -= dt;
      const move = a.move;
      if (move) {
        const t = move.frames / 60 - a.stateT;
        const fr = t * 60;
        a.frame = Math.min(3.9, (fr / move.frames) * 4);
        a.x += a.facing * move.step * dt * 6;
      }
      if (a.state === "airAttack") {
        a.vz -= GRAVITY * dt;
        a.z += a.vz * dt;
        if (a.z < 0) a.z = 0;
      }
      if (a.isPlayer && a.hitOnce.size > 0 && (a.state === "attack" || a.state === "airAttack")) {
        const p = this.input.players[a.playerIndex as 0 | 1];
        const specialCost = a.key === "sien" && this.activeUpgrades.sien.has("s-sp") ? 22 : 28;
        if (p.just.special && a.special && a.sp >= specialCost) {
          this.startMove(a, a.special, "special");
          a.sp -= specialCost;
          this.audio.sfx("special");
          this.clampActor(a);
          return;
        }
        if (p.just.super && a.super && a.sp >= 80) {
          this.startMove(a, a.super, "super");
          a.sp = 0;
          this.juice.punch(1.16);
          this.juice.stop(HITSTOP_HEAVY);
          this.juice.flash = 0.45;
          this.juice.addTrauma(0.55);
          this.fx.ring(a.x, a.y, 20, "#f0a030");
          this.audio.sfx("super");
          this.clampActor(a);
          return;
        }
      }
      if (a.isPlayer && a.state === "attack" && a.stateT < 0.14 && a.move) {
        const p = this.input.players[a.playerIndex as 0 | 1];
        if (p.just.light || p.just.heavy) {
          const kind: AttackKind = p.just.heavy ? "H" : "L";
          a.comboChain.push(kind);
          a.comboAge = 0;
          const mv = pickMove(a.moves, a.comboChain) ?? pickMove(a.moves, [kind]);
          if (mv && mv.id !== a.move.id) {
            this.startMove(a, mv, "attack");
            this.audio.sfx("whoosh");
            this.clampActor(a);
            return;
          }
        }
      }
      if (a.stateT <= 0) {
        if (a.z > 4) this.setState(a, "jump", 0);
        else this.setState(a, "idle", 0);
        a.move = null;
      }
      this.clampActor(a);
      return;
    }

    if (a.downed) {
      a.reviveT += dt;
      return;
    }

    const justJump = a.isPlayer ? !!this.input.players[a.playerIndex as 0 | 1].just.jump : inp.jump;
    const justL = a.isPlayer ? !!this.input.players[a.playerIndex as 0 | 1].just.light : inp.light;
    const justH = a.isPlayer ? !!this.input.players[a.playerIndex as 0 | 1].just.heavy : inp.heavy;
    const justS = a.isPlayer ? !!this.input.players[a.playerIndex as 0 | 1].just.special : inp.special;
    const justU = a.isPlayer ? !!this.input.players[a.playerIndex as 0 | 1].just.super : false;
    const justG = a.isPlayer ? !!this.input.players[a.playerIndex as 0 | 1].just.grab : inp.grab;
    const justD = a.isPlayer ? !!this.input.players[a.playerIndex as 0 | 1].just.dodge : inp.dodge;

    if (!busy) {
      if (justD) {
        if (Math.abs(inp.moveX) + Math.abs(inp.moveY) < 0.28) {
          a.blocking = true;
          this.setState(a, "block", 0.35);
          this.audio.sfx("menu");
          return;
        }
        this.setState(a, "dodge", 0.22);
        this.audio.sfx("whoosh");
        this.fx.dust(a.x, a.y);
        return;
      }
      if (justH && a.weapon?.throwable && inp.moveY > 0.45) {
        this.throwWeapon(a);
        return;
      }
      if (justG) {
        const t = grabCandidate(a, this.actors);
        if (t) {
          a.grabId = t.id;
          this.setState(a, "grab", 1.4);
          t.state = "grabbed";
          this.audio.sfx("throw");
          return;
        }
      }
      if (justU && a.super && a.sp >= 80) {
        this.startMove(a, a.super, "super");
        a.sp = 0;
        this.juice.punch(1.16);
        this.juice.stop(HITSTOP_HEAVY);
        this.juice.flash = 0.45;
        this.juice.addTrauma(0.55);
        this.fx.ring(a.x, a.y, 20, "#f0a030");
        this.audio.sfx("super");
        return;
      }
      const specialCost = a.key === "sien" && this.activeUpgrades.sien.has("s-sp") ? 22 : 28;
      if (justS && a.special && a.sp >= specialCost) {
        this.startMove(a, a.special, "special");
        a.sp -= specialCost;
        this.audio.sfx("special");
        return;
      }
      if (justL || justH) {
        const kind: AttackKind = justH ? "H" : "L";
        if (a.z > 8) {
          const mv = pickMove(a.moves, ["J"]) ?? a.moves[0]!;
          this.startMove(a, mv, "airAttack");
        } else if (a.runT > 0 && Math.abs(a.vx) > 80) {
          const mv = pickMove(a.moves, ["R"]) ?? a.moves[0]!;
          this.startMove(a, mv, "attack");
        } else if (Math.abs(inp.moveX) > 0.4 && Math.sign(inp.moveX) !== a.facing) {
          const mv = pickMove(a.moves, ["B"]) ?? pickMove(a.moves, [kind]) ?? a.moves[0]!;
          a.facing = Math.sign(inp.moveX) as 1 | -1;
          this.startMove(a, mv, "attack");
        } else {
          a.comboChain.push(kind);
          a.comboAge = 0;
          const mv = pickMove(a.moves, a.comboChain) ?? pickMove(a.moves, [kind]) ?? a.moves[0]!;
          this.startMove(a, mv, "attack");
        }
        this.audio.sfx("whoosh");
        return;
      }
      if (justJump && a.z <= 0) {
        a.vz = a.stats.jump;
        a.z = 1;
        a.squash = 0.78;
        this.setState(a, "jump", 0);
        this.audio.sfx("jump");
      }
      const pIn = a.isPlayer ? this.input.players[a.playerIndex as 0 | 1] : null;
      if (pIn?.just.taunt && !busy) {
        a.sp = Math.min(a.maxSp, a.sp + 10);
        this.toast = CHAR_TAUNT[a.key as CharId] ?? "…";
        this.toastT = 1.4;
        this.audio.sfx("confirm");
      }
    }

    const spd = 95 * a.stats.spd * a.stats.mobility * (inp.run ? 1.7 : 1);
    if (inp.run) a.runT = 0.2;
    else a.runT = Math.max(0, a.runT - dt);
    a.vx = inp.moveX * spd;
    a.vy = inp.moveY * spd * 0.55;
    if (Math.abs(inp.moveX) > 0.2) a.facing = Math.sign(inp.moveX) as 1 | -1;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    if (a.z > 0 || a.state === "jump") {
      a.vz -= GRAVITY * dt;
      a.z += a.vz * dt;
      if (a.z <= 0) {
        a.z = 0;
        a.vz = 0;
        this.setState(a, "idle", 0);
        a.squash = 0.7;
        this.fx.dust(a.x, a.y);
      } else a.anim = "jump";
    } else if (Math.abs(a.vx) + Math.abs(a.vy) > 12) {
      a.anim = inp.run ? "run" : "walk";
      a.animSpd = inp.run ? 14 : 10;
    } else {
      a.anim = "idle";
      a.animSpd = 6;
    }
    this.clampActor(a);
    this.tryPickup(a);
  }

  startMove(a: Actor, move: MoveDef, state: Actor["state"]) {
    a.move = move;
    a.hitOnce = new Set();
    this.setState(a, state, move.frames / 60);
    a.anim = "attack";
    a.frame = 0;
    a.animSpd = 0;
    a.squash = 1.12;
    this.lastMove = move.name;
    if (state === "special") this.fx.ring(a.x, a.y, 12, a.color);
    if (state === "super") {
      this.intro = move.name;
      this.introT = 0.9;
    }
  }

  setState(a: Actor, s: Actor["state"], t: number) {
    a.state = s;
    a.stateT = t;
    if (s === "idle") a.anim = "idle";
    if (s === "hurt") a.anim = "hurt";
  }

  clampActor(a: Actor) {
    a.y = Math.max(DEPTH_MIN, Math.min(DEPTH_MAX, a.y));
    const minX = this.locked ? this.lockMin - 20 : Math.max(20, this.camX - 30);
    const maxX = this.locked ? this.lockMax + VIEW_W - 40 : this.stage.length;
    a.x = Math.max(minX, Math.min(maxX, a.x));
    if (a.z < 0) a.z = 0;
  }

  resolveHits(players: Actor[], enemies: Actor[]) {
    for (const a of this.actors) {
      if (!a.move || a.dead) continue;
      if (!["attack", "airAttack", "special", "super"].includes(a.state)) continue;
      const t = a.move.frames / 60 - a.stateT;
      const fr = t * 60;
      const hit = hitActive(a.move, fr);
      if (!hit) continue;
      const specialRange = a.state === "special" && a.key === "rutger" && this.activeUpgrades.rutger.has("r-sp") ? 1.18 : 1;
      const reach = (hit.reach + (a.weapon ? a.weapon.reach - 24 : 0)) * a.stats.range * specialRange;
      const targets = a.team === 0 ? enemies : players;
      for (const b of targets) {
        if (b.id === a.id || b.dead) continue;
        if (a.hitOnce.has(b.id)) continue;
        if (b.state === "fallen" && !canOtg(hit, b)) continue;
        if (b.state === "dodge" && b.invuln > 0) {
          a.hitOnce.add(b.id);
          b.sp = Math.min(b.maxSp, b.sp + 10);
          this.fx.float(b.x, b.y, b.z + 28, "PERFECT", "#3ad0c0");
          this.audio.sfx("confirm");
          continue;
        }
        if (b.invuln > 0) continue;
        if (Math.abs(a.y - b.y) > hit.depth + 6) continue;
        const dx = (b.x - a.x) * a.facing;
        if (dx < -6 || dx > reach) continue;
        if (Math.abs(a.z - b.z) > 28 && a.state !== "airAttack") continue;
        this.landHit(a, b, hit);
      }
      for (const p of this.props) {
        if (p.broken) continue;
        const propHitId = p.id + 9000;
        if (a.hitOnce.has(propHitId)) continue;
        if (Math.abs(a.y - p.y) > 16) continue;
        const dx = (p.x - a.x) * a.facing;
        if (dx < 0 || dx > reach) continue;
        p.hp -= hit.dmg;
        a.hitOnce.add(propHitId);
        this.fx.burst(p.x, p.y, 10, "#c8a060", 6, 80);
        if (p.hp <= 0) this.breakProp(p);
      }
    }
    for (const a of this.actors) {
      if (a.throwVx === 0 || a.state !== "launch") continue;
      if (Math.abs(a.vx) < 160) continue;
      for (const b of enemies) {
        if (b.id === a.id || b.dead || a.hitOnce.has(b.id)) continue;
        if (Math.abs(a.x - b.x) < 18 && Math.abs(a.y - b.y) < 12) {
          a.hitOnce.add(b.id);
          this.hurt(b, 12 * a.grabBonus, Math.sign(a.vx) * 140, 80, 0.2);
          if (b.hp <= 0 && a.throwOwner) this.pendingKillKind.set(b.id, "grab");
          a.vx *= 0.5;
        }
      }
    }
  }

  landHit(a: Actor, b: Actor, hit: HitDef) {
    a.hitOnce.add(b.id);
    const difficultyDamage = a.isPlayer ? 1 : DIFFICULTY_MOD[this.session.difficulty].dmg;
    const usedWeapon = a.weapon?.id ?? null;
    const counter = isCounter(b);
    let dmg = ((hit.dmg + (a.weapon ? a.weapon.dmg * 0.4 : 0)) * a.stats.str * difficultyDamage) / b.stats.def;
    if (counter) dmg *= 1.28;
    if (a.weapon) {
      if (a.isPlayer) this.weaponUses[a.weapon.id] = (this.weaponUses[a.weapon.id] ?? 0) + 1;
      a.weapon.durability -= 1;
      if (a.weapon.durability <= 0) a.weapon = null;
    }
    this.hurt(b, dmg, a.facing * hit.knock, hit.launch, hit.hitstun, a);
    if (!b.isPlayer && b.hp <= 0) this.pendingKillKind.set(b.id, usedWeapon ? "weapon" : "normal");
    this.juice.stop(hit.hitstop);
    this.juice.addTrauma((hit.hitstop / 12) * this.shakeMul);
    const spBoost = a.key === "vyra" && this.activeUpgrades.vyra.has("v-sp") ? 1.25 : 1;
    a.sp = Math.min(a.maxSp, a.sp + ((a.move?.spGain ?? 4) + this.combo * 0.15) * spBoost);
    if (a.isPlayer) {
      this.combo += 1;
      this.comboT = 2.2;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.multiplier = Math.min(8, 1 + Math.floor(this.combo / 8) * 0.5);
      this.score += Math.round(dmg * 10 * this.multiplier);
      this.fx.float(b.x, b.y, b.z + 30, `${Math.round(dmg)}${counter ? "!" : ""}`, this.combo >= 50 ? "#f0a030" : counter ? "#3ad0c0" : "#e8e4d8");
      if (this.combo === 10) this.audio.sfx("confirm");
      if (this.combo === 25 || this.combo === 50 || this.combo === 100) {
        this.toast = this.combo + " HITS!";
        this.toastT = 1.2;
        this.juice.punch(1.08);
        this.audio.sfx("super");
      }
    }
    this.fx.burst(b.x + a.facing * 10, b.y, 20, "#fff0c0", hit.area ? 14 : 7, 140);
    this.audio.sfx(hit.dmg > 16 ? "hit-heavy" : "hit");
    if (a.weapon) this.audio.sfx("hit-heavy");
  }

  hurt(b: Actor, dmg: number, knock: number, launch: number, stun: number, attacker?: Actor) {
    if (b.state === "block" || b.blocking || (b.ai?.role === "block" && b.archetype === "blocker")) {
      if (b.stateT > 0.2) {
        dmg = 0;
        knock *= 0.15;
        launch = 0;
        b.parryFlash = 0.25;
        b.sp = Math.min(b.maxSp, b.sp + 12);
        if (attacker) attacker.stunned = 0.4;
        this.toast = "PARRY";
        this.toastT = 0.45;
        this.audio.sfx("confirm");
        this.fx.burst(b.x, b.y, 18, "#f0e080", 8, 90);
      } else {
        dmg *= 0.28;
        knock *= 0.22;
        this.audio.sfx("menu");
        this.fx.burst(b.x, b.y, 16, "#c0d0e0", 5, 60);
      }
    }
    if (hasArmor(b) && launch < 160 && b.hp > dmg) {
      b.hp -= dmg * 0.55;
      b.flash = 0.08;
      b.squash = 1.15;
      if (b.isPlayer) this.damageTaken += dmg * 0.55;
      this.fx.float(b.x, b.y, b.z + 24, "ARMOR", "#c0c0c8");
      return;
    }
    b.hp -= dmg;
    b.flash = 0.08;
    b.squash = 1.28;
    b.vx = knock;
    b.sp = Math.min(b.maxSp, b.sp + dmg * 0.15);
    if (b.isPlayer) this.damageTaken += dmg;
    if (launch > 80) {
      b.vz = launch;
      b.z = Math.max(b.z, 8);
      this.setState(b, "launch", 0.5);
      b.juggle += 1;
      if (b.juggle > 4) b.vz *= 0.4;
    } else {
      this.setState(b, "hurt", stun);
      b.juggle = 0;
    }
    if (b.hp <= 0 && b.state !== "fallen") {
      b.hp = 0;
      this.setState(b, "launch", 0.4);
      b.vz = Math.max(b.vz, 180);
    }
    if (b.archetype === "boss" && b.hp < b.maxHp * (1 - b.phase / b.phases) && b.phase < b.phases) {
      b.phase += 1;
      this.intro = "FASE " + b.phase;
      this.introT = 1.2;
      this.juice.addTrauma(0.5);
    }
  }

  ko(a: Actor) {
    if (a.dead) return;
    a.dead = true;
    a.state = "dead";
    this.audio.sfx("ko");
    this.fx.burst(a.x, a.y, 10, a.color, 16, 160);
    if (a.archetype === "boss" || a.archetype === "miniboss") this.flags["br-" + a.key] = true;
    if (this.session.mode === "bossrush" && a.archetype === "boss") {
      const expected = BOSS_RUSH[this.bossRushIndex];
      if (a.key === expected) this.bossRushIndex += 1;
      for (const p of this.actors.filter((x) => x.isPlayer && !x.dead)) {
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.25);
        p.sp = Math.min(p.maxSp, p.sp + 20);
      }
    }
    if (a.key === "boss-helix" && this.grabbedCollect.includes("ending-key") && !this.flags.trueHelix) {
      this.flags.trueHelix = true;
      this.toast = "O SÓCIO APARECE";
      this.toastT = 2.4;
      this.spawnBoss("boss-secret", this.camX + 240);
    }
    if (!a.isPlayer) {
      this.kills += 1;
      const killKind = this.pendingKillKind.get(a.id);
      if (killKind === "grab") this.grabKills += 1;
      this.pendingKillKind.delete(a.id);
      if (a.archetype === "boss" || a.archetype === "miniboss") this.bossesDefeated.push(a.key);
      this.score += (ENEMIES[a.key]?.score ?? 100) * this.multiplier;
      if (Math.random() < 0.12 * DIFFICULTY_MOD[this.session.difficulty].loot) {
        this.pickups.push({ id: nid(), x: a.x, y: a.y, kind: Math.random() < 0.7 ? "hp" : "sp", z: 12, t: 0 });
      }
    } else {
      this.deaths += 1;
      a.lives -= 1;
      this.lives = a.lives;
      if (this.session.coop && a.lives > 0) {
        a.downed = true;
        a.dead = false;
        a.hp = 1;
        a.state = "fallen";
        a.fallenT = 99;
      } else if (a.lives <= 0) {
        const any = this.actors.some((p) => p.isPlayer && !p.dead && !p.downed);
        if (!any) this.fail();
      } else {
        a.dead = false;
        a.hp = a.maxHp;
        a.x = this.camX + 80;
        a.invuln = 2;
        this.setState(a, "idle", 0);
      }
    }
  }

  grabHit(a: Actor, vic: Actor | undefined, dmg: number) {
    if (!vic) return;
    this.hurt(vic, dmg * a.grabBonus, a.facing * 40, 20, 0.15);
    if (!vic.isPlayer && vic.hp <= 0) this.pendingKillKind.set(vic.id, "grab");
    this.score += 50;
    this.combo += 1;
  }

  throwVic(a: Actor, vic: Actor | undefined, dir: number) {
    if (!vic) return;
    vic.vx = dir * 280 * a.grabBonus;
    vic.vz = 160;
    vic.z = 20;
    vic.throwVx = vic.vx;
    vic.throwOwner = a.id;
    vic.hitOnce = new Set();
    this.setState(vic, "launch", 0.5);
    this.setState(a, "throw", 0.3);
    a.grabId = 0;
    this.audio.sfx("throw");
    this.score += 80;
  }

  throwWeapon(a: Actor) {
    const w = a.weapon;
    if (!w) return;
    this.shots.push({
      x: a.x + a.facing * 16,
      y: a.y,
      z: 18,
      vx: a.facing * 320,
      team: a.team,
      dmg: w.dmg * 1.4,
      life: 0.7,
    });
    if (a.isPlayer) this.weaponUses[w.id] = (this.weaponUses[w.id] ?? 0) + 1;
    a.weapon = null;
    this.setState(a, "throw", 0.22);
    this.audio.sfx("throw");
    this.fx.burst(a.x, a.y, 16, "#c0c0c8", 6, 90);
  }

  tickBossEvents(players: Actor[]) {
    for (const e of this.actors) {
      if (e.dead || (e.archetype !== "boss" && e.archetype !== "miniboss")) continue;
      const ev = tickBoss(e, players, FIXED_DT);
      if (!ev) continue;
      if (ev.toast) {
        this.toast = ev.toast;
        this.toastT = 1.1;
      }
      if (ev.charge) {
        const p = players[0];
        if (p) {
          e.vx = Math.sign(p.x - e.x) * 180;
          e.x += e.vx * FIXED_DT * 4;
          e.facing = (Math.sign(p.x - e.x) || e.facing) as 1 | -1;
        }
      }
      if (ev.teleport) {
        e.x = Math.max(this.lockMin + 20, Math.min(this.lockMax + VIEW_W - 40, ev.teleport.x));
        e.y = Math.max(DEPTH_MIN, Math.min(DEPTH_MAX, ev.teleport.y));
        e.invuln = 0.12;
        this.fx.burst(e.x, e.y, 20, e.color, 12, 140);
        this.audio.sfx("whoosh");
      }
      if (ev.shots) {
        for (const s of ev.shots) {
          this.shots.push({
            x: e.x + e.facing * 18,
            y: e.y + (s.vy ? s.vy * 0.04 : 0),
            z: s.z ?? 20,
            vx: s.vx,
            team: e.team,
            dmg: s.dmg * DIFFICULTY_MOD[this.session.difficulty].dmg,
            life: s.life ?? 1.5,
          });
        }
        this.audio.sfx("gun");
      }
      if (ev.summon) {
        const live = this.enemiesAlive().length;
        if (live < 7) {
          for (let i = 0; i < ev.summon.count; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            this.spawnEnemy(ev.summon.type, e.x + side * (50 + i * 18), 16 + Math.random() * 40);
          }
        }
      }
      if (ev.aoe) {
        this.fx.ring(e.x, e.y, 8, "#f0a030");
        this.juice.addTrauma(0.28);
        this.juice.stop(4);
        for (const p of players) {
          if (p.dead || p.invuln > 0) continue;
          if (Math.hypot(p.x - e.x, (p.y - e.y) * 1.4) < ev.aoe.radius) {
            this.hurt(p, ev.aoe.dmg, Math.sign(p.x - e.x || e.facing) * ev.aoe.knock, 40, 0.22);
          }
        }
      }
    }
  }

  breakProp(p: Prop) {
    p.broken = true;
    this.breaks += 1;
    this.audio.sfx("break");
    this.score += 20;
    this.fx.burst(p.x, p.y, 8, "#c09050", 12, 100);
    if (p.loot) {
      if (WEAPONS[p.loot]) this.pickups.push({ id: nid(), x: p.x, y: p.y, kind: "weapon", weapon: p.loot, z: 10, t: 0 });
      else if (p.loot === "chicken" || p.loot === "pizza" || p.loot === "apple" || p.loot === "soda")
        this.pickups.push({ id: nid(), x: p.x, y: p.y, kind: "hp", z: 10, t: 0 });
    }
    for (const s of this.stage.secrets) {
      if (Math.abs(s.x - p.x) < 40 && s.kind === "wall" && !this.flags[s.id]) {
        this.discoverSecret(s.id);
        this.toast = "Rota secreta!";
        this.toastT = 3;
      }
    }
  }

  tryPickup(a: Actor) {
    if (!a.isPlayer) {
      if (a.archetype === "armed" && !a.weapon) {
        const w = this.pickups.find((p) => p.kind === "weapon" && Math.hypot(p.x - a.x, p.y - a.y) < 20);
        if (w) this.takePickup(a, w);
      }
      return;
    }
    for (const p of this.pickups) {
      if (Math.hypot(p.x - a.x, p.y - a.y) < 16 && Math.abs(a.z) < 12) this.takePickup(a, p);
    }
  }

  takePickup(a: Actor, p: Pickup) {
    if (p.kind === "hp") {
      a.hp = Math.min(a.maxHp, a.hp + 28);
      this.audio.sfx("pickup");
    } else if (p.kind === "sp") {
      a.sp = Math.min(a.maxSp, a.sp + 30);
      this.audio.sfx("pickup");
    } else if (p.kind === "life") {
      a.lives += 1;
      this.lives = a.lives;
    } else if (p.kind === "weapon" && p.weapon) {
      const d = WEAPONS[p.weapon];
      if (d) a.weapon = { ...d, durability: d.durability } as WeaponInst;
      this.audio.sfx("pickup");
    } else if (p.kind === "collect" && p.collectId) {
      if (!this.grabbedCollect.includes(p.collectId)) this.grabbedCollect.push(p.collectId);
      this.score += 500;
      this.toast = "Colecionável";
      this.toastT = 2;
      this.audio.sfx("confirm");
    }
    this.pickups = this.pickups.filter((x) => x.id !== p.id);
  }

  updateShots(dt: number, players: Actor[], enemies: Actor[]) {
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.life -= dt;
      if (s.life <= 0) continue;
      const targets = s.team === 0 ? enemies : players;
      for (const a of targets) {
        if (a.dead || a.invuln > 0) continue;
        if (Math.abs(a.x - s.x) < 12 && Math.abs(a.y - s.y) < 12) {
          this.hurt(a, s.dmg, Math.sign(s.vx) * 80, 20, 0.15);
          s.life = 0;
          break;
        }
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);

    for (const e of enemies) {
      if (e.archetype !== "shooter" || e.dead || !e.ai) continue;
      e.ai.shotCooldown = Math.max(0, (e.ai.shotCooldown ?? 0) - dt);
      if (e.ai.role === "shoot" && e.ai.shotCooldown <= 0) {
        this.shots.push({ x: e.x, y: e.y, z: 20, vx: e.facing * 220, team: 1, dmg: 8 * DIFFICULTY_MOD[this.session.difficulty].dmg, life: 1.4 });
        e.ai.shotCooldown = 0.7 + Math.random() * 0.35;
        this.audio.sfx("gun");
      }
    }
  }
  updatePickups(dt: number) {
    for (const p of this.pickups) {
      p.t += dt;
      p.z = 6 + Math.sin(p.t * 6) * 4;
    }
  }

  progressStage() {
    if (this.session.mode === "training") return;
    if (this.session.mode === "bossrush") {
      const aliveBoss = this.actors.some((a) => a.archetype === "boss" && !a.dead);
      if (!aliveBoss && this.introT <= 0) {
        const next = BOSS_RUSH[this.bossRushIndex];
        if (next) this.spawnBoss(next, this.camX + 240);
        else this.finishStage();
      }
      return;
    }
    const s = this.stage.segments[this.seg];
    if (!s) return;
    const lead = this.actors.find((a) => a.isPlayer && !a.downed);
    if (!lead) return;
    this.checkNearbySecrets(lead);
    if (s.kind === "lock" || s.kind === "miniboss" || s.kind === "boss") {
      if (this.enemiesAlive().length === 0) {
        if (s.kind === "lock" && this.waveI + 1 < this.waveQueue.length) {
          this.waveI += 1;
          this.spawnWave();
        } else {
          this.locked = false;
          this.seg += 1;
          this.applySegment();
        }
      }
    } else if (s.kind === "walk") {
      if (lead.x > s.to - 40) {
        this.seg += 1;
        this.applySegment();
      }
    } else if (s.kind === "fork" && this.fork) {
      const chosen = pickFork(lead, this.fork, this.flags, this.stage);
      if (chosen) this.chosenNext = chosen;
      if (lead.x > this.stage.length - 80 && this.chosenNext) {
        this.seg += 1;
        this.applySegment();
      }
    }
  }

  discoverSecret(id: string) {
    if (this.flags[id]) return;
    this.flags[id] = true;
    if (!this.foundSecretIds.includes(id)) this.foundSecretIds.push(id);
    this.secretsFound += 1;
    this.toast = "Segredo encontrado!";
    this.toastT = 2.5;
    if (SECRET_LINES[id]) {
      this.dialogue = SECRET_LINES[id]!;
      this.dialogueT = 3.8;
    }
    this.audio.sfx("confirm");
  }

  checkNearbySecrets(lead: Actor) {
    for (const s of this.stage.secrets) {
      if (this.flags[s.id]) continue;
      const dx = Math.abs(lead.x - s.x);
      const dy = Math.abs(lead.y - s.y);
      const near = dx < (s.kind === "quick" ? 28 : 34) && dy < 24;
      if (!near) continue;
      if (s.kind === "door" || s.kind === "npc") {
        const p = this.input.players[lead.playerIndex as 0 | 1];
        if (p.just.grab || p.just.light || p.just.confirm) this.discoverSecret(s.id);
      } else if (s.kind === "quick") {
        if (Math.abs(lead.vx) > 120 || lead.runT > 0) this.discoverSecret(s.id);
      } else if (s.kind === "wall") {
        const p = this.input.players[lead.playerIndex as 0 | 1];
        if (p.just.heavy || p.just.light || p.just.special) this.discoverSecret(s.id);
      }
    }
  }

  challengeSucceeded() {
    const c = CHALLENGES.find((x) => x.id === this.session.challengeId);
    if (!c) return false;
    if (c.kind === "kills") return this.kills >= c.goal;
    if (c.kind === "time") return this.time >= c.goal;
    if (c.kind === "nohit") return this.damageTaken <= 0;
    if (c.kind === "grabs") return this.grabKills >= c.goal && this.kills === this.grabKills;
    if (c.kind === "combo") return this.maxCombo >= c.goal;
    if (c.kind === "speed") return this.time <= c.goal && this.stage.id === "rain-street";
    return false;
  }

  checkChallenge() {
    if (this.session.mode !== "challenge" || this.result || this.challengeDone) return;
    const c = CHALLENGES.find((x) => x.id === this.session.challengeId);
    if (!c) return;
    const immediate = c.kind === "kills" || c.kind === "time" || c.kind === "grabs" || c.kind === "combo";
    if (immediate && this.challengeSucceeded()) {
      this.challengeDone = true;
      this.toast = "DESAFIO CONCLUÍDO!";
      this.toastT = 1.2;
      this.finishStage();
    }
    if (c.kind === "nohit" && this.damageTaken > 0) {
      this.toast = "Desafio falhou: dano recebido";
      this.toastT = 2;
    }
  }

  camera(dt: number) {
    const lead = this.actors.find((a) => a.isPlayer && !a.downed) ?? this.actors.find((a) => a.isPlayer);
    if (!lead) return;
    const look = lead.facing * 40;
    this.camTarget = lead.x - VIEW_W * 0.38 + look;
    if (this.locked) this.camTarget = Math.max(this.lockMin, Math.min(this.lockMax, this.camTarget));
    this.camTarget = Math.max(0, Math.min(this.stage.length - VIEW_W, this.camTarget));
    this.camX += (this.camTarget - this.camX) * (1 - Math.exp(-6 * dt));
    if (this.intro && this.actors.some((a) => a.archetype === "boss")) {
      const b = this.actors.find((a) => a.archetype === "boss");
      if (b) this.camX += (b.x - VIEW_W * 0.5 - this.camX) * 0.08;
    }
  }

  coopRevive(dt: number) {
    if (!this.session.coop) return;
    const down = this.actors.filter((a) => a.downed);
    const up = this.actors.filter((a) => a.isPlayer && !a.downed && !a.dead);
    for (const d of down) {
      const near = up.some((u) => Math.hypot(u.x - d.x, u.y - d.y) < 28);
      if (near) {
        d.reviveT += dt;
        this.toast = "Reviver…";
        this.toastT = 0.2;
        if (d.reviveT > 1.6) {
          d.downed = false;
          d.hp = d.maxHp * 0.45;
          d.invuln = 1.5;
          this.setState(d, "idle", 0);
          d.reviveT = 0;
        }
      } else d.reviveT = Math.max(0, d.reviveT - dt * 0.5);
    }
  }

  finishStage() {
    if (this.result) return;
    const challengeSuccess = this.session.mode === "challenge" ? this.challengeSucceeded() : undefined;
    const r: StageResult = {
      stageId: this.stage.id,
      time: this.time,
      kills: this.kills,
      maxCombo: this.maxCombo,
      damageTaken: this.damageTaken,
      secrets: this.secretsFound,
      score: this.score,
      rank: rankFor(this.score, this.time, this.damageTaken, this.maxCombo, this.secretsFound) as Rank,
      secretIds: [...this.foundSecretIds],
      collectibles: [...this.grabbedCollect],
      bosses: [...this.bossesDefeated],
      deaths: this.deaths,
      breaks: this.breaks,
      grabKills: this.grabKills,
      weaponUses: { ...this.weaponUses },
      chars: [...this.session.chars],
      flags: { ...this.flags },
      challengeId: this.session.challengeId,
      challengeSuccess,
      bossRushComplete: this.session.mode === "bossrush" && this.bossRushIndex >= BOSS_RUSH.length,
      lives: Math.max(0, this.lives),
      continues: Math.max(0, this.continues),
    };
    this.result = r;
    this.over = true;
    this.onResult?.(r, this.chosenNext ?? this.stage.nextDefault ?? null);
  }

  fail() {
    if (this.over) return;
    this.over = true;
    this.onGameOver?.({
      time: this.time,
      kills: this.kills,
      bosses: this.bossesDefeated.length,
      deaths: this.deaths,
      breaks: this.breaks,
      grabKills: this.grabKills,
      weaponUses: { ...this.weaponUses },
      chars: [...this.session.chars],
    });
  }

  emitHud() {
    const p1 = this.actors.find((a) => a.playerIndex === 0);
    const p2 = this.actors.find((a) => a.playerIndex === 1) ?? null;
    const boss = this.actors.find((a) => (a.archetype === "boss" || a.archetype === "miniboss") && !a.dead) ?? null;
    this.onHud?.({
      p1,
      p2,
      score: this.score,
      combo: this.combo,
      multiplier: this.multiplier,
      lives: this.lives,
      stageName: this.stage.name,
      boss,
      fork: this.fork ? { a: STAGES[this.fork.a]?.name ?? this.fork.a, b: STAGES[this.fork.b]?.name ?? this.fork.b } : null,
      intro: this.intro,
      paused: this.paused,
      toast: this.toast,
      hint: this.hint,
      lastMove: this.lastMove,
      dialogue: this.dialogue,
      debug: this.debug
        ? {
            fps: Math.round(this.fps),
            enemies: this.enemiesAlive().length,
            cam: Math.round(this.camX),
            route: this.stage.id,
            states: this.actors.slice(0, 8).map((a) => `${a.name}:${a.state}`),
          }
        : null,
    });
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const scale = Math.min(w / VIEW_W, h / VIEW_H);
    const ox = (w - VIEW_W * scale) / 2;
    const oy = (h - VIEW_H * scale) / 2;
    ctx.fillStyle = "#05060c";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(ox + this.juice.offsetX * scale * this.shakeMul, oy + this.juice.offsetY * scale * this.shakeMul);
    ctx.scale(scale * this.juice.zoom, scale * this.juice.zoom);
    ctx.imageSmoothingEnabled = false;
    const dark = !!this.flags.smashedLights;
    const cam = Math.round(this.camX);
    drawBackground(ctx, this.stage.theme, cam, this.time, dark);

    const drawables: { y: number; z: number; draw: () => void }[] = [];
    for (const hz of this.hazards) {
      drawables.push({
        y: hz.y,
        z: 0,
        draw: () => {
          const { sx, sy } = worldToScreen(hz.x, hz.y, 0, cam);
          ctx.save();
          if (hz.kind === "steam") {
            ctx.globalAlpha = 0.25 + Math.sin(this.time * 8 + hz.x) * 0.15;
            ctx.fillStyle = "#d8e0e8";
            ctx.beginPath();
            ctx.ellipse(sx, sy - 20 - (this.time % 1) * 16, 10, 16, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (hz.kind === "oil") {
            ctx.fillStyle = "rgba(20,16,8,0.55)";
            ctx.beginPath();
            ctx.ellipse(sx, sy - 2, 18, 5, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = "#f07020";
            ctx.globalAlpha = 0.5 + Math.sin(this.time * 14) * 0.3;
            ctx.fillRect(sx - 2, sy - 18, 4, 14);
          }
          ctx.restore();
        },
      });
    }
    for (const c of this.civilians) {
      drawables.push({
        y: c.y,
        z: 0,
        draw: () => {
          const { sx, sy } = worldToScreen(c.x, c.y, 0, cam);
          drawShadow(ctx, sx, sy, 8);
          ctx.fillStyle = c.flee ? "#3a3048" : "#2a3448";
          ctx.fillRect(sx - 6, sy - 22, 12, 22);
          ctx.fillStyle = "#c8b898";
          ctx.fillRect(sx - 4, sy - 30, 8, 8);
        },
      });
    }
    for (const p of this.props) {
      if (p.broken) continue;
      drawables.push({
        y: p.y,
        z: 0,
        draw: () => {
          const { sx, sy } = worldToScreen(p.x, p.y, 0, cam);
          drawShadow(ctx, sx, sy, 16);
          drawSheet(ctx, asset("sprites/props.png"), p.kind, 4, 2, sx, sy, 40, 40, false);
        },
      });
    }
    for (const pk of this.pickups) {
      drawables.push({
        y: pk.y,
        z: pk.z,
        draw: () => {
          const { sx, sy } = worldToScreen(pk.x, pk.y, pk.z, cam);
          const itemSrc =
            pk.kind === "hp"
              ? asset("sprites/item-chicken.png")
              : pk.kind === "sp"
                ? asset("sprites/item-soda.png")
                : pk.kind === "collect"
                  ? asset("sprites/item-pizza.png")
                  : pk.kind === "weapon"
                    ? asset("sprites/weapons.png")
                    : asset("sprites/item-apple.png");
          if (pk.kind === "weapon" && pk.weapon) {
            const idx = WEAPONS[pk.weapon]?.spriteIndex ?? 0;
            drawSheet(ctx, asset("sprites/weapons.png"), idx, 4, 2, sx, sy, 22, 22, false);
          } else {
            drawSheet(ctx, itemSrc, 0, 1, 1, sx, sy, 16, 16, false);
          }
        },
      });
    }
    for (const a of this.actors) {
      if (a.state === "dead") continue;
      drawables.push({
        y: a.y,
        z: a.z,
        draw: () => drawFighter(ctx, a, cam),
      });
    }
    drawables.sort((a, b) => a.y - b.y || a.z - b.z);
    for (const d of drawables) d.draw();

    for (const s of this.shots) {
      const { sx, sy } = worldToScreen(s.x, s.y, s.z, cam);
      ctx.fillStyle = "#f0e8a0";
      ctx.fillRect(sx - 4, sy - 2, 8, 3);
    }
    for (const p of this.fx.list) {
      const { sx, sy } = worldToScreen(p.x, p.y, Math.max(0, p.z), cam);
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      if (p.kind === "text") {
        ctx.fillStyle = p.color;
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.fillText(p.text ?? "", sx - 16, sy);
      } else if (p.kind === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sx, sy, p.size * (1.2 - p.life / p.max), p.size * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(sx, sy, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    }

    if (this.fork) {
      ctx.fillStyle = "rgba(240,160,48,0.55)";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillText("↑", VIEW_W * 0.72, 70);
      ctx.fillText("↓", VIEW_W * 0.72, 200);
    }

    if (this.juice.flash > 0) {
      ctx.fillStyle = `rgba(255,240,200,${this.juice.flash * 0.35})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    if (this.debug) {
      ctx.strokeStyle = "rgba(80,200,255,0.5)";
      for (const a of this.actors) {
        const { sx, sy } = worldToScreen(a.x, a.y, a.z, cam);
        ctx.strokeRect(sx - 12, sy - 40 * a.scale, 24, 40 * a.scale);
      }
    }

    drawForeground(ctx, this.stage.theme, cam, this.time);

    if (this.scanlines) {
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      for (let y = 0; y < VIEW_H; y += 2) ctx.fillRect(0, y, VIEW_W, 1);
    }
    ctx.restore();
  }

  tickDressing(dt: number, players: Actor[]) {
    const lead = players[0];
    for (const c of this.civilians) {
      if (lead && Math.hypot(lead.x - c.x, lead.y - c.y) < 70) c.flee = true;
      if (this.locked) c.flee = true;
      if (c.flee) {
        c.vx = (c.x < (lead?.x ?? 0) ? -1 : 1) * 70;
        c.facing = Math.sign(c.vx) as 1 | -1;
      } else {
        c.vx = c.facing * 12;
      }
      c.x += c.vx * dt;
    }
    this.civilians = this.civilians.filter((c) => c.x > this.camX - 80 && c.x < this.camX + VIEW_W + 120);
    for (const hz of this.hazards) {
      hz.t += dt;
      for (const p of players) {
        if (p.dead || p.invuln > 0) continue;
        if (Math.hypot(p.x - hz.x, p.y - hz.y) > 18) continue;
        if (hz.kind === "oil") {
          p.vx *= 0.45;
          p.vy *= 0.45;
        } else if (hz.kind === "steam" && Math.sin(hz.t * 3) > 0.3) {
          this.hurt(p, 4 * DIFFICULTY_MOD[this.session.difficulty].dmg, Math.sign(p.x - hz.x || 1) * 40, 20, 0.12);
          p.invuln = 0.35;
        } else if (hz.kind === "spark" && hz.t % 1.6 < 0.2) {
          this.hurt(p, 6 * DIFFICULTY_MOD[this.session.difficulty].dmg, 30, 10, 0.1);
          p.invuln = 0.4;
        }
      }
    }
  }
}
