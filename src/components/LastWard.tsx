import { asset } from "@/game/asset";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Game, type HudSnap } from "@/game/Game";
import { CHAR_LIST, CHARACTERS } from "@/game/data/characters";
import { ACHIEVEMENTS, CHALLENGES, COLLECTIBLE_LORE, UPGRADES } from "@/game/data/meta";
import { MAIN_ITEMS, STR } from "@/game/data/i18n";
import { BOSS_RUSH, ROUTE_GRAPH, STAGE_ORDER, STAGES } from "@/game/data/stages";
import { resolveEnding } from "@/game/endings";
import { useGameStore } from "@/game/store";
import type { Actor } from "@/game/sim/actor";
import type { CharId, Difficulty, ScreenId } from "@/game/types";

const DIFFS: Difficulty[] = ["easy", "normal", "hard", "arcade", "nightmare"];

export function LastWard() {
  const screen = useGameStore((s) => s.screen);
  const settings = useGameStore((s) => s.settings);
  const t = STR[settings.lang];

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg">
      {screen === "boot" && <Boot />}
      {screen === "title" && <Title />}
      {screen === "main" && <MainMenu />}
      {screen === "slots" && <Slots />}
      {screen === "mode" && <ModePick />}
      {screen === "difficulty" && <DifficultyPick />}
      {screen === "chars" && <CharSelect />}
      {screen === "play" && <Play />}
      {screen === "results" && <Results />}
      {screen === "hub" && <Hub />}
      {screen === "gameover" && <GameOver />}
      {screen === "ending" && <Ending />}
      {screen === "training" && <TrainingSetup />}
      {screen === "challenges" && <Challenges />}
      {screen === "bossrush" && <BossRushSetup />}
      {screen === "characters" && <CharacterBios />}
      {screen === "upgrades" && <Upgrades />}
      {screen === "extras" && <Extras />}
      {screen === "achievements" && <Achievements />}
      {screen === "stats" && <Stats />}
      {screen === "options" && <Options />}
      {screen === "credits" && <Credits />}
      {screen === "routes" && <RouteMap />}
      {screen === "gallery" && <Gallery />}
      {screen === "controls" && <ControlsHelp />}
      {screen === "stageSelect" && <StageSelect />}
      <p className="sr-only">{t.title}</p>
    </div>
  );
}

function Boot() {
  const setScreen = useGameStore((s) => s.setScreen);
  const t = STR[useGameStore((s) => s.settings.lang)];
  return (
    <button
      className="flex h-full w-full flex-col items-center justify-center gap-6 bg-bg"
      onClick={() => {
        const w = window as unknown as { __lwAudio?: AudioContext };
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!w.__lwAudio) w.__lwAudio = new AC({ latencyHint: "interactive" });
        void w.__lwAudio.resume();
        setScreen("title");
      }}
    >
      <h1 className="font-display text-5xl tracking-widest text-primary sm:text-7xl">LAST WARD</h1>
      <p className="font-pixel text-[10px] text-muted">{t.tap}</p>
    </button>
  );
}

function Title() {
  const setScreen = useGameStore((s) => s.setScreen);
  const t = STR[useGameStore((s) => s.settings.lang)];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space") setScreen("main");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setScreen]);
  return (
    <button className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-bg" onClick={() => setScreen("main")}>
      <img
        src={asset("art/title-street.jpg")}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/30" />
      <p className="relative mb-3 font-pixel text-[8px] uppercase tracking-[0.4em] text-accent">Porto Vésper · 16-BIT</p>
      <h1 className="relative font-display text-6xl text-primary drop-shadow-[0_4px_0_#5a3010] sm:text-8xl">LAST WARD</h1>
      <p className="relative mt-4 max-w-md px-6 text-center text-sm text-muted">{t.tag}</p>
      <p className="relative mt-10 animate-pulse font-pixel text-[10px] text-fg">{t.tap}</p>
    </button>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <div className="h-1 w-full bg-primary" />
      {title && (
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-lg text-primary">{title}</h2>
          <BackBtn />
        </header>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function BackBtn() {
  const setScreen = useGameStore((s) => s.setScreen);
  const t = STR[useGameStore((s) => s.settings.lang)];
  return (
    <button className="font-pixel text-[8px] text-muted hover:text-primary" onClick={() => setScreen("main")}>
      {t.back}
    </button>
  );
}

function MainMenu() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const setScreen = useGameStore((s) => s.setScreen);
  const startSession = useGameStore((s) => s.startSession);
  const idx = useGameStore((s) => s.menuIndex);
  const setIdx = useGameStore((s) => s.setMenuIndex);
  const items = MAIN_ITEMS;

  const go = useCallback(
    (key: (typeof items)[number]) => {
      const map: Record<string, ScreenId | (() => void)> = {
        newGame: "mode",
        continue: "slots",
        arcade: () => {
          useGameStore.setState({ session: { mode: "arcade", difficulty: "arcade", chars: ["kael"], coop: false, slot: 0, stageId: "rain-street" } });
          setScreen("difficulty");
        },
        story: () => {
          useGameStore.setState({ session: { mode: "story", difficulty: "normal", chars: ["kael"], coop: false, slot: 0, stageId: "rain-street" } });
          setScreen("difficulty");
        },
        stageSelect: "stageSelect",
        training: "training",
        challenges: "challenges",
        bossRush: "bossrush",
        coop: () => {
          useGameStore.setState({ session: { mode: "coop", difficulty: "normal", chars: ["kael", "vyra"], coop: true, slot: 0, stageId: "rain-street" } });
          setScreen("difficulty");
        },
        characters: "characters",
        upgrades: "upgrades",
        extras: "extras",
        achievements: "achievements",
        stats: "stats",
        options: "options",
        credits: "credits",
      };
      const v = map[key];
      if (typeof v === "function") v();
      else if (v) setScreen(v);
    },
    [setScreen],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") setIdx((idx + 1) % items.length);
      if (e.code === "ArrowUp" || e.code === "KeyW") setIdx((idx + items.length - 1) % items.length);
      if (e.code === "Enter" || e.code === "KeyJ" || e.code === "Space") go(items[idx]!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, items, setIdx, go]);

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
      <div className="relative hidden overflow-hidden md:block">
        <img src={asset("art/title-street.jpg")} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" style={{ imageRendering: "pixelated" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface" />
        <div className="relative flex h-full flex-col justify-end p-8">
          <p className="font-pixel text-[8px] text-accent">PORTO VÉSPER</p>
          <h1 className="font-display text-6xl text-primary">LAST WARD</h1>
          <p className="mt-2 max-w-sm text-sm text-muted">Quatro lutadores. Uma sindicato. Ruas que se ramificam. Nada se resolve numa única noite.</p>
        </div>
      </div>
      <nav className="flex flex-col overflow-y-auto border-l border-border bg-surface px-2 py-4">
        <p className="mb-2 px-4 font-pixel text-[8px] text-muted md:hidden">LAST WARD</p>
        {items.map((k, i) => (
          <button
            key={k}
            className={`px-4 py-2.5 text-left font-pixel text-[10px] uppercase tracking-wide ${i === idx ? "bg-primary text-shadow" : "text-fg hover:bg-surface-2"}`}
            onMouseEnter={() => setIdx(i)}
            onClick={() => go(k)}
          >
            {t[k as keyof typeof t] as string}
          </button>
        ))}
        <button className="mt-auto px-4 py-3 text-left font-pixel text-[8px] text-muted" onClick={() => startSession({ mode: "story" })}>
          {t.quit}
        </button>
      </nav>
    </div>
  );
}

function Slots() {
  const persist = useGameStore((s) => s.persist);
  const loadSlot = useGameStore((s) => s.loadSlot);
  const t = STR[useGameStore((s) => s.settings.lang)];
  return (
    <Panel title={t.continue}>
      <div className="mx-auto grid max-w-lg gap-3 p-4">
        {persist.slots.map((s, i) => (
          <button
            key={i}
            disabled={s.empty}
            onClick={() => loadSlot(i)}
            className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-4 py-4 text-left disabled:opacity-40"
          >
            <span className="font-pixel text-[10px] text-primary">
              {t.slot} {i + 1}
            </span>
            <span className="text-sm text-muted">{s.empty ? t.empty : `${STAGES[s.stageId]?.name ?? s.stageId} · ${s.chars.join(", ")}`}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function ModePick() {
  const setScreen = useGameStore((s) => s.setScreen);
  const t = STR[useGameStore((s) => s.settings.lang)];
  const pick = (mode: "story" | "arcade") => {
    useGameStore.setState({ session: { mode, difficulty: mode === "arcade" ? "arcade" : "normal", chars: ["kael"], coop: false, slot: 0, stageId: "rain-street" } });
    setScreen("difficulty");
  };
  return (
    <Panel title={t.newGame}>
      <div className="mx-auto flex max-w-md flex-col gap-3 p-6">
        <MenuCard title={t.story} desc="Campanha ramificada, checkpoints, finais." onClick={() => pick("story")} />
        <MenuCard title={t.arcade} desc="Vidas, continues, ranking." onClick={() => pick("arcade")} />
      </div>
    </Panel>
  );
}

function MenuCard({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-md border border-border bg-surface-2 px-4 py-4 text-left hover:border-primary">
      <p className="font-display text-primary">{title}</p>
      <p className="mt-1 text-sm text-muted">{desc}</p>
    </button>
  );
}

function DifficultyPick() {
  const setScreen = useGameStore((s) => s.setScreen);
  const t = STR[useGameStore((s) => s.settings.lang)];
  const labels: Record<Difficulty, string> = { easy: t.easy, normal: t.normal, hard: t.hard, arcade: t.arcadeDiff, nightmare: t.nightmare };
  return (
    <Panel title={t.difficulty}>
      <div className="mx-auto flex max-w-md flex-col gap-2 p-6">
        {DIFFS.map((d) => (
          <button
            key={d}
            className="rounded-md border border-border bg-surface-2 px-4 py-3 text-left font-pixel text-[10px] uppercase hover:border-primary"
            onClick={() => {
              const s = useGameStore.getState().session;
              useGameStore.setState({ session: { ...(s ?? { mode: "story", chars: ["kael"], coop: false, slot: 0, stageId: "rain-street" }), difficulty: d } });
              setScreen("chars");
            }}
          >
            {labels[d]}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function CharSelect() {
  const session = useGameStore((s) => s.session);
  const startSession = useGameStore((s) => s.startSession);
  const t = STR[useGameStore((s) => s.settings.lang)];
  const [p1, setP1] = useState<CharId>(session?.chars[0] ?? "kael");
  const [p2, setP2] = useState<CharId>(session?.chars[1] ?? "vyra");
  const coop = session?.coop ?? session?.mode === "coop";
  const c1 = CHARACTERS[p1]!;
  return (
    <Panel title={t.characters}>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div>
          <p className="mb-2 font-pixel text-[8px] text-accent">{t.p1}</p>
          <div className="grid grid-cols-2 gap-2">
            {CHAR_LIST.map((c) => (
              <button key={c.id} onClick={() => setP1(c.id)} className={`rounded-md border p-2 ${p1 === c.id ? "border-primary bg-surface-2" : "border-border"}`}>
                <img src={c.portrait} alt="" className="mx-auto h-20 w-20 object-contain" style={{ imageRendering: "pixelated" }} />
                <p className="mt-1 font-pixel text-[8px]">{c.name}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-md border border-border bg-surface-2 p-3">
            <p className="font-display text-primary">{c1.name}</p>
            <p className="text-xs text-accent">{c1.title}</p>
            <p className="mt-2 text-sm text-muted">{c1.blurb}</p>
            <StatBar label="HP" v={c1.stats.hp / 150} />
            <StatBar label="FOR" v={c1.stats.str / 1.5} />
            <StatBar label="VEL" v={c1.stats.spd / 1.5} />
            <StatBar label="DEF" v={c1.stats.def / 1.5} />
          </div>
        </div>
        <div>
          {coop && (
            <>
              <p className="mb-2 font-pixel text-[8px] text-accent">{t.p2}</p>
              <div className="grid grid-cols-2 gap-2">
                {CHAR_LIST.map((c) => (
                  <button key={c.id} onClick={() => setP2(c.id)} className={`rounded-md border p-2 ${p2 === c.id ? "border-accent bg-surface-2" : "border-border"}`}>
                    <img src={c.portrait} alt="" className="mx-auto h-16 w-16 object-contain" style={{ imageRendering: "pixelated" }} />
                    <p className="font-pixel text-[8px]">{c.name}</p>
                  </button>
                ))}
              </div>
            </>
          )}
          <button
            className="mt-6 w-full rounded-md bg-primary py-3 font-display text-shadow"
            onClick={() =>
              startSession({
                mode: session?.mode ?? "story",
                difficulty: session?.difficulty ?? "normal",
                chars: coop ? [p1, p2] : [p1],
                coop: !!coop,
                slot: session?.slot ?? 0,
                stageId: session?.stageId ?? "rain-street",
                trainingDummy: session?.trainingDummy,
                challengeId: session?.challengeId,
              })
            }
          >
            {t.start}
          </button>
          <p className="mt-3 text-xs text-muted">P1: WASD + J K L · Pulo Espaço · Super I · Agarrão U · Corrida Shift</p>
        </div>
      </div>
    </Panel>
  );
}

function StatBar({ label, v }: { label: string; v: number }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="w-8 font-pixel text-[8px] text-muted">{label}</span>
      <div className="h-2 flex-1 bg-bg">
        <div className="h-full bg-primary" style={{ width: `${Math.min(100, v * 100)}%` }} />
      </div>
    </div>
  );
}

function Play() {
  const session = useGameStore((s) => s.session)!;
  const settings = useGameStore((s) => s.settings);
  const applyResult = useGameStore((s) => s.applyResult);
  const setScreen = useGameStore((s) => s.setScreen);
  const recordGameOver = useGameStore((s) => s.recordGameOver);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudSnap | null>(null);
  const [pause, setPause] = useState(false);
  const [moves, setMoves] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setLoading(true);
    setLoadError(null);
    const g = new Game(canvas, session);
    g.reduced = settings.reduced;
    g.shakeMul = settings.shake;
    g.scanlines = settings.scanlines;
    g.debug = settings.debug || new URLSearchParams(location.search).has("debug");
    g.audio.masterVol = settings.master;
    g.audio.musicVol = settings.music;
    g.audio.sfxVol = settings.sfx;
    g.audio.unlock();
    g.onHud = setHud;
    g.onResult = (r, n) => applyResult(r, n);
    g.onGameOver = (summary) => {
      recordGameOver(summary);
      setScreen("gameover");
    };
    gameRef.current = g;

    const fit = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const dprCap = coarse ? 1.5 : 2;
      const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
      const nextW = Math.max(1, Math.floor(r.width * dpr));
      const nextH = Math.max(1, Math.floor(r.height * dpr));
      if (canvas.width !== nextW) canvas.width = nextW;
      if (canvas.height !== nextH) canvas.height = nextH;
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const onHidden = () => {
      if (document.hidden && !g.over) g.paused = true;
    };
    document.addEventListener("visibilitychange", onHidden);

    void g.start().then(() => setLoading(false)).catch((err: unknown) => {
      console.error(err);
      setLoadError("Não foi possível carregar os arquivos desta fase.");
      setLoading(false);
    });
    return () => {
      ro.disconnect();
      document.removeEventListener("visibilitychange", onHidden);
      g.destroy();
      if (gameRef.current === g) gameRef.current = null;
    };
  }, [session, settings.reduced, settings.shake, settings.scanlines, settings.debug, settings.master, settings.music, settings.sfx, applyResult, recordGameOver, setScreen]);

  useEffect(() => {
    if (hud?.paused !== undefined) setPause(!!hud.paused);
  }, [hud?.paused]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await canvasRef.current?.parentElement?.requestFullscreen();
    } catch {
      // Alguns navegadores móveis não expõem Fullscreen API.
    }
  };

  return (
    <div className="relative h-full w-full bg-shadow">
      <canvas ref={canvasRef} className="h-full w-full touch-none" aria-label="Área do jogo Last Ward" />
      {hud && <Hud hud={hud} />}
      <TouchPad />
      <RotateNotice />
      <button
        className="pointer-events-auto absolute right-2 top-2 z-20 rounded border border-border bg-surface/75 px-2 py-1 font-pixel text-[8px] text-fg hover:border-primary"
        onClick={() => void toggleFullscreen()}
        aria-label={fullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
      >
        {fullscreen ? "SAIR ⛶" : "TELA ⛶"}
      </button>
      {loading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-bg/95">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="font-pixel text-[9px] text-primary">CARREGANDO FASE…</p>
          <p className="text-xs text-muted">Preparando sprites e cenário</p>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/95 p-6">
          <div className="max-w-sm rounded border border-danger bg-surface p-5 text-center">
            <p className="font-display text-xl text-danger">ERRO AO CARREGAR</p>
            <p className="mt-2 text-sm text-muted">{loadError}</p>
            <button className="mt-4 rounded bg-primary px-4 py-2 font-pixel text-[8px] text-shadow" onClick={() => setScreen("main")}>VOLTAR AO MENU</button>
          </div>
        </div>
      )}
      {pause && !loading && (
        <PauseMenu
          onResume={() => {
            if (gameRef.current) gameRef.current.paused = false;
            setPause(false);
          }}
          onMoves={() => setMoves(true)}
          onMenu={() => setScreen("main")}
        />
      )}
      {moves && <MovesOverlay onClose={() => setMoves(false)} char={session.chars[0]!} />}
    </div>
  );
}

function Hud({ hud }: { hud: HudSnap }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 sm:p-3">
      <div className="flex items-start justify-between gap-2">
        {hud.p1 && <FighterHud a={hud.p1} align="left" />}
        <div className="text-right">
          <p className="font-pixel text-[8px] text-primary">{String(hud.score).padStart(8, "0")}</p>
          <p className="font-pixel text-[8px] text-muted">{hud.stageName}</p>
        </div>
        {hud.p2 && <FighterHud a={hud.p2} align="right" />}
      </div>
      {hud.boss && (
        <div className="mx-auto w-2/3 max-w-md">
          <p className="mb-1 text-center font-pixel text-[8px] text-primary">
            {hud.boss.name}
            <span className="ml-2 text-accent">F{hud.boss.phase}/{hud.boss.phases}</span>
          </p>
          <div className="flex gap-1">
            {Array.from({ length: hud.boss.phases }).map((_, i) => (
              <div key={i} className="h-2 flex-1 bg-bg">
                <div
                  className="h-full bg-danger"
                  style={{
                    width:
                      i + 1 < hud.boss!.phase
                        ? "0%"
                        : i + 1 > hud.boss!.phase
                          ? "100%"
                          : `${(hud.boss!.hp / hud.boss!.maxHp) * 100}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-end justify-between">
        <p className="font-pixel text-[8px] text-muted">×{hud.lives}</p>
        {hud.combo >= 3 && (
          <p className="font-pixel text-xs text-primary">
            {hud.combo} HIT COMBO ×{hud.multiplier.toFixed(1)}
          </p>
        )}
        {hud.p1 && hud.p1.sp >= 80 && <p className="font-pixel text-[8px] text-accent">SUPER PRONTO</p>}
      </div>
      {hud.lastMove && (
        <p className="absolute left-2 top-16 font-pixel text-[8px] text-muted">{hud.lastMove}</p>
      )}
      {hud.hint && (
        <div className="absolute bottom-28 left-1/2 z-10 w-[92%] max-w-lg -translate-x-1/2 rounded border border-border bg-surface/85 px-3 py-2 text-center font-pixel text-[8px] leading-4 text-fg">
          {hud.hint}
        </div>
      )}
      {hud.dialogue && (
        <div className="absolute bottom-20 left-1/2 z-10 w-[94%] max-w-xl -translate-x-1/2 border-l-4 border-primary bg-surface/90 px-3 py-2 font-sans text-sm text-fg">
          {hud.dialogue}
        </div>
      )}
      {hud.intro && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="font-display text-3xl text-primary drop-shadow-[0_3px_0_#000]">{hud.intro}</p>
        </div>
      )}
      {hud.fork && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded bg-surface/80 px-3 py-1 font-pixel text-[8px] text-primary">
          ↑ {hud.fork.a} · ↓ {hud.fork.b}
        </div>
      )}
      {hud.toast && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded bg-surface/80 px-3 py-1 font-pixel text-[8px] text-fg">{hud.toast}</div>
      )}
      {hud.debug && (
        <pre className="absolute right-2 top-16 font-pixel text-[8px] text-accent">
          {hud.debug.fps}fps e:{hud.debug.enemies} cam:{hud.debug.cam}
          {"\n"}
          {hud.debug.states.join("\n")}
        </pre>
      )}
    </div>
  );
}

function FighterHud({ a, align }: { a: Actor; align: "left" | "right" }) {
  const def = CHARACTERS[a.key as CharId];
  return (
    <div className={`flex items-start gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
      <img src={def?.portrait} alt="" className="h-10 w-10 border border-border bg-surface object-cover" style={{ imageRendering: "pixelated" }} />
      <div className="w-28 sm:w-36">
        <p className="font-pixel text-[8px] text-fg">{a.name.split(" ")[0]}</p>
        <div className="mt-0.5 h-2 bg-bg">
          <div className="h-full bg-hp" style={{ width: `${Math.max(0, (a.hp / a.maxHp) * 100)}%` }} />
        </div>
        <div className="mt-0.5 h-1.5 bg-bg">
          <div className="h-full bg-sp" style={{ width: `${Math.max(0, (a.sp / a.maxSp) * 100)}%` }} />
        </div>
        {a.weapon && (
          <p className="font-pixel text-[7px] text-muted">
            {a.weapon.name} {a.weapon.durability}
          </p>
        )}
      </div>
    </div>
  );
}

function TouchPad() {
  return (
    <div className="touch-game-controls pointer-events-none absolute inset-x-0 bottom-2 z-10 items-end justify-between px-2">
      <AnalogStick />
      <div className="pointer-events-auto grid grid-cols-3 gap-1">
        <TouchKey label="GR" code="KeyU" />
        <TouchKey label="SP" code="KeyI" />
        <TouchKey label="GD" code="KeyO" />
        <TouchKey label="J" code="KeyJ" />
        <TouchKey label="K" code="KeyK" />
        <TouchKey label="L" code="KeyL" />
        <TouchKey label="JP" code="Space" />
        <TouchKey label="RN" code="ShiftLeft" />
        <TouchKey label="☰" code="Escape" />
      </div>
    </div>
  );
}

function AnalogStick() {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const setStick = (x: number, y: number) => {
    const len = Math.hypot(x, y);
    const nx = len > 1 ? x / len : x;
    const ny = len > 1 ? y / len : y;
    setKnob({ x: nx, y: ny });
    const inp = (window as unknown as { __lwInput?: { stick: { x: number; y: number; active: boolean } } }).__lwInput;
    if (!inp) return;
    inp.stick.x = nx;
    inp.stick.y = ny;
    inp.stick.active = Math.hypot(nx, ny) > 0.08;
  };
  const release = () => {
    origin.current = null;
    setStick(0, 0);
  };
  return (
    <div
      className="pointer-events-auto relative h-28 w-28 touch-none rounded-full border border-border bg-surface/55 shadow-lg"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = e.currentTarget.getBoundingClientRect();
        origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        setStick((e.clientX - origin.current.x) / 42, (e.clientY - origin.current.y) / 42);
      }}
      onPointerMove={(e) => {
        if (!origin.current) return;
        setStick((e.clientX - origin.current.x) / 42, (e.clientY - origin.current.y) / 42);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/70 bg-surface-2/90"
        style={{ marginLeft: knob.x * 28, marginTop: knob.y * 28 }}
      />
    </div>
  );
}

function RotateNotice() {
  return (
    <div className="rotate-game-notice absolute inset-0 z-[60] items-center justify-center bg-bg p-8 text-center">
      <div>
        <p className="font-display text-3xl text-primary">VIRE O CELULAR</p>
        <p className="mt-3 text-sm text-muted">Last Ward foi ajustado para jogar no modo paisagem.</p>
        <p className="mt-4 text-4xl">↻</p>
      </div>
    </div>
  );
}

function TouchKey({ label, code }: { label: string; code: string }) {
  const fire = (down: boolean) => {
    window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }));
  };
  return (
    <button
      className="h-11 w-11 rounded-full border border-border bg-surface/70 font-pixel text-[8px] text-fg"
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        fire(true);
      }}
      onPointerUp={() => fire(false)}
      onPointerCancel={() => fire(false)}
    >
      {label}
    </button>
  );
}

function PauseMenu({ onResume, onMoves, onMenu }: { onResume: () => void; onMoves: () => void; onMenu: () => void }) {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const setScreen = useGameStore((s) => s.setScreen);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-shadow/70">
      <div className="w-72 rounded-md border border-border bg-surface p-4">
        <p className="mb-3 font-display text-primary">{t.pause}</p>
        {[
          [t.resume, onResume],
          [t.moveList, onMoves],
          [t.stageMap, () => setScreen("routes")],
          [t.controls, () => setScreen("controls")],
          [t.options, () => setScreen("options")],
          [t.toMenu, onMenu],
        ].map(([label, fn]) => (
          <button key={String(label)} className="mb-1 w-full rounded bg-surface-2 px-3 py-2 text-left text-sm hover:bg-primary hover:text-shadow" onClick={fn as () => void}>
            {label as string}
          </button>
        ))}
      </div>
    </div>
  );
}

function MovesOverlay({ onClose, char }: { onClose: () => void; char: CharId }) {
  const c = CHARACTERS[char]!;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-shadow/80 p-4">
      <div className="max-h-[80%] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-surface p-4">
        <div className="mb-3 flex justify-between">
          <p className="font-display text-primary">{c.name}</p>
          <button onClick={onClose} className="font-pixel text-[8px] text-muted">
            X
          </button>
        </div>
        {c.moves.map((m) => (
          <p key={m.id} className="border-b border-border py-1 font-pixel text-[8px]">
            {m.seq.join(" + ")} — {m.name}
            {m.secret ? " ★" : ""}
          </p>
        ))}
        <p className="mt-2 font-pixel text-[8px] text-accent">
          SP {c.special.name} · SUPER {c.super.name}
        </p>
      </div>
    </div>
  );
}

function Results() {
  const r = useGameStore((s) => s.lastResult);
  const next = useGameStore((s) => s.nextStage);
  const setScreen = useGameStore((s) => s.setScreen);
  const startSession = useGameStore((s) => s.startSession);
  const session = useGameStore((s) => s.session);
  const t = STR[useGameStore((s) => s.settings.lang)];
  if (!r) return null;
  const rows = [
    [t.time, `${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, "0")}`],
    [t.kills, r.kills],
    [t.combo, r.maxCombo],
    [t.dmg, Math.round(r.damageTaken)],
    [t.secrets, r.secrets],
    [t.score, r.score],
  ];
  const advance = () => {
    if (session?.mode === "challenge" || session?.mode === "bossrush") {
      setScreen("main");
      return;
    }
    if (session?.mode === "arcade" && r.stageId === "helix-nest") {
      setScreen("credits");
      return;
    }
    if (!next || next === "helix-nest" && r.stageId === "helix-nest") {
      useGameStore.getState().setEnding("normal");
      return;
    }
    if (r.stageId === "helix-nest") {
      const p = useGameStore.getState().persist;
      const slot = p.slots[session?.slot ?? 0];
      const ending = resolveEnding({
        flags: r.flags,
        secrets: slot?.secrets.length ?? r.secrets,
        collectibles: slot?.collectibles ?? r.collectibles,
        routes: slot?.discoveredRoutes.length ?? 0,
      });
      useGameStore.getState().setEnding(ending);
      return;
    }
    startSession({ ...(session ?? { mode: "story", difficulty: "normal", chars: ["kael"], coop: false, slot: 0 }), stageId: next, mode: session?.mode ?? "story" });
  };
  return (
    <Panel title={STAGES[r.stageId]?.name ?? r.stageId}>
      <div className="mx-auto max-w-md p-6">
        <p className="mb-4 text-center font-display text-5xl text-primary">{r.rank}</p>
        {r.challengeId && (
          <p className={`mb-4 text-center font-pixel text-[9px] ${r.challengeSuccess ? "text-accent" : "text-danger"}`}>
            {r.challengeSuccess ? "DESAFIO CONCLUÍDO" : "DESAFIO NÃO CONCLUÍDO"}
          </p>
        )}
        {r.bossRushComplete && <p className="mb-4 text-center font-pixel text-[9px] text-accent">BOSS RUSH CONCLUÍDO</p>}
        {rows.map(([k, v]) => (
          <div key={String(k)} className="flex justify-between border-b border-border py-2 text-sm">
            <span className="text-muted">{k}</span>
            <span>{v}</span>
          </div>
        ))}
        <button className="mt-6 w-full rounded-md bg-primary py-3 font-display text-shadow" onClick={advance}>
          {next ? t.next : t.credits}
        </button>
        <button className="mt-2 w-full py-2 text-sm text-muted" onClick={() => setScreen("hub")}>
          {t.hub}
        </button>
      </div>
    </Panel>
  );
}

function Hub() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const setScreen = useGameStore((s) => s.setScreen);
  const session = useGameStore((s) => s.session);
  const startSession = useGameStore((s) => s.startSession);
  const next = useGameStore((s) => s.nextStage);
  return (
    <Panel title={t.hub}>
      <div className="mx-auto grid max-w-lg gap-2 p-6">
        <MenuCard title={t.next} desc={next ?? session?.stageId ?? ""} onClick={() => startSession({ ...(session ?? { mode: "story", difficulty: "normal", chars: ["kael"], coop: false, slot: 0 }), stageId: next ?? session?.stageId ?? "rain-street", mode: session?.mode ?? "story" })} />
        <MenuCard title={t.upgrades} desc="" onClick={() => setScreen("upgrades")} />
        <MenuCard title={t.characters} desc="" onClick={() => setScreen("chars")} />
        <MenuCard title={t.stageMap} desc="" onClick={() => setScreen("routes")} />
        <MenuCard title={t.challenges} desc="" onClick={() => setScreen("challenges")} />
      </div>
    </Panel>
  );
}

function GameOver() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const setScreen = useGameStore((s) => s.setScreen);
  const session = useGameStore((s) => s.session);
  const startSession = useGameStore((s) => s.startSession);
  const consumeContinue = useGameStore((s) => s.consumeContinue);
  const continues = session?.continues ?? 0;
  const arcade = session?.mode === "arcade";
  const canContinue = !arcade || continues > 0;
  return (
    <Panel title={t.gameOver}>
      <div className="mx-auto flex max-w-sm flex-col gap-3 p-8">
        {arcade && <p className="text-center font-pixel text-[9px] text-muted">CONTINUES: {continues}</p>}
        <button
          disabled={!canContinue}
          className="rounded-md bg-primary py-3 font-display text-shadow disabled:opacity-40"
          onClick={() => {
            if (!session) return;
            if (arcade) {
              if (!consumeContinue()) return;
              const fresh = useGameStore.getState().session;
              if (fresh) startSession(fresh);
            } else {
              startSession(session);
            }
          }}
        >
          {t.continueQ}
        </button>
        <button className="rounded-md border border-border py-3" onClick={() => setScreen("main")}>
          {t.toMenu}
        </button>
      </div>
    </Panel>
  );
}

function Ending() {
  const ending = useGameStore((s) => s.ending) ?? "normal";
  const t = STR[useGameStore((s) => s.settings.lang)];
  const setScreen = useGameStore((s) => s.setScreen);
  const text =
    ending === "good"
      ? t.endingGood
      : ending === "secret"
        ? t.endingSecret
        : ending === "complete"
          ? t.endingComplete
          : ending === "bad"
            ? t.endingBad
            : t.endingNormal;
  useEffect(() => {
    useGameStore.getState().unlockAchievement("finish");
  }, [ending]);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-bg p-6 text-center">
      <p className="font-pixel text-[8px] text-accent">{ending.toUpperCase()}</p>
      <h2 className="font-display text-4xl text-primary">LAST WARD</h2>
      <p className="max-w-md text-muted">{text}</p>
      <button className="rounded-md bg-primary px-6 py-2 font-display text-shadow" onClick={() => setScreen("credits")}>
        {t.credits}
      </button>
    </div>
  );
}

function TrainingSetup() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const startSession = useGameStore((s) => s.startSession);
  const [dummy, setDummy] = useState<"idle" | "attack" | "block">("idle");
  return (
    <Panel title={t.training}>
      <div className="mx-auto max-w-md p-6">
        <p className="mb-3 font-pixel text-[8px] text-muted">{t.dummy}</p>
        {(["idle", "attack", "block"] as const).map((d) => (
          <button key={d} onClick={() => setDummy(d)} className={`mb-2 w-full rounded border px-3 py-2 text-left ${dummy === d ? "border-primary" : "border-border"}`}>
            {d === "idle" ? t.dummyIdle : d === "attack" ? t.dummyAtk : t.dummyBlock}
          </button>
        ))}
        <button
          className="mt-4 w-full rounded-md bg-primary py-3 font-display text-shadow"
          onClick={() => startSession({ mode: "training", difficulty: "normal", chars: ["kael"], coop: false, slot: 0, stageId: "dojo", trainingDummy: dummy })}
        >
          {t.start}
        </button>
      </div>
    </Panel>
  );
}

function Challenges() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const startSession = useGameStore((s) => s.startSession);
  const slotPick = useGameStore((s) => s.slotPick);
  return (
    <Panel title={t.challenges}>
      <div className="mx-auto grid max-w-lg gap-2 p-4">
        {CHALLENGES.map((c) => (
          <MenuCard
            key={c.id}
            title={c.name}
            desc={c.desc}
            onClick={() => startSession({ mode: "challenge", difficulty: "normal", chars: ["kael"], coop: false, slot: slotPick, stageId: "rain-street", challengeId: c.id })}
          />
        ))}
      </div>
    </Panel>
  );
}

function BossRushSetup() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const startSession = useGameStore((s) => s.startSession);
  const slotPick = useGameStore((s) => s.slotPick);
  return (
    <Panel title={t.bossRush}>
      <div className="mx-auto max-w-md p-6">
        <p className="mb-4 text-sm text-muted">{BOSS_RUSH.length} chefes em sequência.</p>
        <button className="w-full rounded-md bg-primary py-3 font-display text-shadow" onClick={() => startSession({ mode: "bossrush", difficulty: "hard", chars: ["kael"], coop: false, slot: slotPick, stageId: "dojo" })}>
          {t.start}
        </button>
      </div>
    </Panel>
  );
}

function CharacterBios() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  return (
    <Panel title={t.characters}>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        {CHAR_LIST.map((c) => (
          <div key={c.id} className="rounded-md border border-border bg-surface-2 p-3">
            <div className="flex gap-3">
              <img src={c.portrait} alt="" className="h-20 w-20 object-contain" style={{ imageRendering: "pixelated" }} />
              <div>
                <p className="font-display text-primary">{c.name}</p>
                <p className="text-xs text-accent">{c.title}</p>
                <p className="mt-1 text-sm text-muted">{c.blurb}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Upgrades() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const persist = useGameStore((s) => s.persist);
  const [who, setWho] = useState<CharId>("kael");
  const slotPick = useGameStore((s) => s.slotPick);
  const slot = persist.slots[slotPick];
  const owned = slot?.upgrades[who] ?? [];
  const tokens = slot?.tokens ?? 0;
  return (
    <Panel title={t.upgrades}>
      <div className="p-4">
        <p className="mb-3 font-pixel text-[8px] text-primary">
          {t.tokens}: {tokens}
        </p>
        <div className="mb-3 flex gap-2">
          {CHAR_LIST.map((c) => (
            <button key={c.id} onClick={() => setWho(c.id)} className={`rounded border px-2 py-1 font-pixel text-[8px] ${who === c.id ? "border-primary" : "border-border"}`}>
              {c.name.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {UPGRADES[who].map((u) => {
            const on = owned.includes(u.id);
            const reqOk = (u.req ?? []).every((id) => owned.includes(id));
            return (
              <button
                key={u.id}
                disabled={on || tokens < u.cost || !reqOk}
                onClick={() => {
                  const p = useGameStore.getState().persist;
                  const sl = p.slots[slotPick];
                  if (!sl || sl.tokens < u.cost || !(u.req ?? []).every((id) => sl.upgrades[who].includes(id))) return;
                  sl.tokens -= u.cost;
                  sl.upgrades[who] = [...sl.upgrades[who], u.id];
                  sl.empty = false;
                  useGameStore.getState().saveCurrent(sl);
                }}
                className={`rounded-md border p-3 text-left ${on ? "border-accent" : "border-border"} disabled:opacity-40`}
              >
                <p className="font-pixel text-[8px] text-primary">
                  {u.name} · {u.tree} · {u.cost}
                </p>
                <p className="text-sm text-muted">{u.desc}</p>
                {!reqOk && <p className="mt-1 text-xs text-danger">Requer: {(u.req ?? []).join(", ")}</p>}
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function Extras() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const setScreen = useGameStore((s) => s.setScreen);
  return (
    <Panel title={t.extras}>
      <div className="mx-auto grid max-w-lg gap-2 p-6">
        <MenuCard title="Galeria" desc="Artes, sprites, inimigos, chefes." onClick={() => setScreen("gallery")} />
        <MenuCard title={t.stageMap} desc="Rotas descobertas." onClick={() => setScreen("routes")} />
        <MenuCard title="Colecionáveis" desc={`${Object.keys(COLLECTIBLE_LORE).length} itens de história.`} onClick={() => setScreen("gallery")} />
        <MenuCard title={t.controls} desc="" onClick={() => setScreen("controls")} />
      </div>
    </Panel>
  );
}

function Achievements() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const got = useGameStore((s) => s.persist.achievements);
  return (
    <Panel title={t.achievements}>
      <div className="grid gap-2 p-4 md:grid-cols-2">
        {ACHIEVEMENTS.map((a) => (
          <div key={a.id} className={`rounded-md border p-3 ${got.includes(a.id) ? "border-primary" : "border-border opacity-50"}`}>
            <p className="font-pixel text-[8px] text-primary">{a.name}</p>
            <p className="text-sm text-muted">{a.hidden && !got.includes(a.id) ? "???" : a.desc}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Stats() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const st = useGameStore((s) => s.persist.stats);
  const rows = [
    ["Tempo", Math.round(st.timePlayed) + "s"],
    [t.kills, st.kills],
    ["Chefes", st.bosses],
    [t.combo, st.maxCombo],
    ["Mortes", st.deaths],
    ["Fases", st.stages],
    [t.secrets, st.secrets],
    ["Rotas", st.routes],
    ["Finais", st.endings],
    ["Objetos quebrados", st.breaks],
    ["KOs por agarrão", st.grabKills],
    ["Desafios", st.challenges.length],
    ["Boss Rush", st.bossRushClears],
    ["Favorito", st.favChar],
  ];
  return (
    <Panel title={t.stats}>
      <div className="mx-auto max-w-md p-6">
        {rows.map(([k, v]) => (
          <div key={String(k)} className="flex justify-between border-b border-border py-2 text-sm">
            <span className="text-muted">{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Options() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const settings = useGameStore((s) => s.settings);
  const patch = useGameStore((s) => s.patchSettings);
  return (
    <Panel title={t.options}>
      <div className="mx-auto max-w-md space-y-4 p-6">
        <label className="block text-sm">
          {t.language}
          <select className="ml-2 bg-surface-2 text-fg" value={settings.lang} onChange={(e) => patch({ lang: e.target.value as "pt" | "en" })}>
            <option value="pt">Português</option>
            <option value="en">English</option>
          </select>
        </label>
        {(
          [
            ["master", t.volume],
            ["music", t.music],
            ["sfx", t.sfx],
            ["shake", t.shake],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="block text-sm">
            {label}
            <input className="mt-1 w-full" type="range" min={0} max={1} step={0.05} value={settings[k]} onChange={(e) => patch({ [k]: Number(e.target.value) })} />
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.scanlines} onChange={(e) => patch({ scanlines: e.target.checked })} />
          {t.scanlines}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.reduced} onChange={(e) => patch({ reduced: e.target.checked })} />
          Reduzir flashes, partículas e movimento de câmera
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.debug} onChange={(e) => patch({ debug: e.target.checked })} />
          {t.debug}
        </label>
        <button className="text-sm text-accent" onClick={() => useGameStore.getState().setScreen("controls")}>
          {t.controls}
        </button>
      </div>
    </Panel>
  );
}

function Credits() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  return (
    <Panel title={t.credits}>
      <pre className="whitespace-pre-wrap p-8 text-center text-sm text-muted">{t.creditsBody}</pre>
    </Panel>
  );
}

function RouteMap() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const discovered = useGameStore((s) => s.persist.slots[0]?.discoveredRoutes ?? []);
  return (
    <Panel title={t.stageMap}>
      <div className="p-4">
        {STAGE_ORDER.map((id) => {
          const known = discovered.includes(id) || id === "rain-street" || id === "dojo";
          const next = ROUTE_GRAPH[id] ?? [];
          return (
            <div key={id} className="mb-2 rounded border border-border p-2">
              <p className="font-pixel text-[8px] text-primary">{known ? STAGES[id]?.name : "???"}</p>
              {known && <p className="text-xs text-muted">{next.map((n) => (discovered.includes(n) ? STAGES[n]?.name : "???")).join(" · ")}</p>}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Gallery() {
  const persist = useGameStore((s) => s.persist);
  const slotPick = useGameStore((s) => s.slotPick);
  return (
    <Panel title="Galeria">
      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        {CHAR_LIST.map((c) => (
          <figure key={c.id} className="rounded border border-border bg-surface-2 p-2">
            <img src={c.idle} alt={c.name} className="h-24 w-full object-contain" style={{ imageRendering: "pixelated" }} />
            <figcaption className="mt-1 font-pixel text-[8px]">{c.name}</figcaption>
          </figure>
        ))}
      </div>
      <div className="p-4">
        <p className="mb-2 font-pixel text-[8px] text-accent">Colecionáveis</p>
        {Object.entries(COLLECTIBLE_LORE).map(([id, v]) => (
          <p key={id} className="border-b border-border py-1 text-sm text-muted">
            <span className="text-primary">{v.name}:</span> {persist.slots[slotPick]?.collectibles.includes(id) ? v.text : "???"}
          </p>
        ))}
      </div>
    </Panel>
  );
}

function ControlsHelp() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  return (
    <Panel title={t.controls}>
      <div className="mx-auto max-w-lg space-y-2 p-6 font-pixel text-[8px] leading-6">
        <p>P1: WASD — mover (no modo solo, setas também funcionam)</p>
        <p>J / Z — soco leve · K / X — pesado · L / C — especial</p>
        <p>O / F — esquiva · parado + esquiva — bloquear</p>
        <p>Baixo + pesado — arremessar arma</p>
        <p>Espaço — pulo · Shift — correr · Esc — pausa</p>
        <p>Gamepad: stick mover · X leve · Y pesado · B especial · A pulo · RB super · LB agarrão</p>
        <p>P2: setas — mover · Numpad 1–7 — ações · ou segundo gamepad</p>
        <p>Toque: cruz à esquerda, botões à direita</p>
      </div>
    </Panel>
  );
}

function StageSelect() {
  const t = STR[useGameStore((s) => s.settings.lang)];
  const startSession = useGameStore((s) => s.startSession);
  const slotPick = useGameStore((s) => s.slotPick);
  const discovered = useGameStore((s) => s.persist.slots[s.slotPick]?.discoveredRoutes ?? ["rain-street"]);
  return (
    <Panel title={t.stageSelect}>
      <div className="grid gap-2 p-4 md:grid-cols-2">
        {STAGE_ORDER.filter((id) => id !== "dojo").map((id) => {
          const known = discovered.includes(id) || id === "rain-street";
          return (
            <button
              key={id}
              disabled={!known}
              className="rounded-md border border-border bg-surface-2 p-3 text-left disabled:opacity-40"
              onClick={() => startSession({ mode: "story", difficulty: "normal", chars: ["kael"], coop: false, slot: slotPick, stageId: id })}
            >
              <p className="font-pixel text-[8px] text-primary">{known ? STAGES[id]?.name : "???"}</p>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

export function useMenuBlip() {
  return useMemo(() => () => {}, []);
}
