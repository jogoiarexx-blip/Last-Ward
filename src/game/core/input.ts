export type Actions = {
  moveX: number;
  moveY: number;
  jump: boolean;
  light: boolean;
  heavy: boolean;
  special: boolean;
  super: boolean;
  grab: boolean;
  run: boolean;
  dodge: boolean;
  pause: boolean;
  confirm: boolean;
  back: boolean;
  taunt: boolean;
};

export type PlayerInput = Actions & {
  just: Actions;
  released: Actions;
  buffer: { name: keyof Actions; t: number }[];
  facingHint: number;
};

const EMPTY: Actions = {
  moveX: 0,
  moveY: 0,
  jump: false,
  light: false,
  heavy: false,
  special: false,
  super: false,
  grab: false,
  run: false,
  dodge: false,
  pause: false,
  confirm: false,
  back: false,
  taunt: false,
};

const BOOL_KEYS: (keyof Actions)[] = [
  "jump",
  "light",
  "heavy",
  "special",
  "super",
  "grab",
  "run",
  "dodge",
  "pause",
  "confirm",
  "back",
  "taunt",
];

function cloneActions(a: Actions): Actions {
  return { ...a };
}

function radialDeadzone(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export class InputManager {
  keys = new Set<string>();
  injected = new Set<string>();
  prev: [Actions, Actions] = [cloneActions(EMPTY), cloneActions(EMPTY)];
  players: [PlayerInput, PlayerInput] = [
    { ...cloneActions(EMPTY), just: cloneActions(EMPTY), released: cloneActions(EMPTY), buffer: [], facingHint: 1 },
    { ...cloneActions(EMPTY), just: cloneActions(EMPTY), released: cloneActions(EMPTY), buffer: [], facingHint: 1 },
  ];
  pointers = new Map<number, { x: number; y: number; role: "stick" | "btn"; btn?: keyof Actions }>();
  stick = { x: 0, y: 0, active: false, id: -1 };
  touchButtons = new Set<keyof Actions>();
  enabled = true;
  coop = false;
  doubleTap: { dir: number; t: number }[] = [{ dir: 0, t: 0 }, { dir: 0, t: 0 }];
  now = 0;

  attach() {
    const down = (e: KeyboardEvent) => {
      this.keys.add(e.code);
      if (GAME_CODES.has(e.code)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => this.keys.delete(e.code);
    const clear = () => this.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    const visibility = () => {
      if (document.hidden) this.keys.clear();
    };
    document.addEventListener("visibilitychange", visibility);
    this._detach = () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", visibility);
    };
  }

  _detach = () => {};

  destroy() {
    this._detach();
  }

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
  }

  has(code: string) {
    return this.keys.has(code) || this.injected.has(code);
  }

  poll(now: number) {
    this.now = now;
    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() ?? [] : [];
    this.buildPlayer(0, now, pads[0] ?? null, false);
    this.buildPlayer(1, now, pads[1] ?? null, true);
  }

  private buildPlayer(i: 0 | 1, now: number, pad: Gamepad | null, p2: boolean) {
    const a = cloneActions(EMPTY);
    const kb = this.keyboard(i, p2);
    a.moveX += kb.x;
    a.moveY += kb.y;
    Object.assign(a, { ...a, ...kb.btns });

    if (i === 0) {
      a.moveX += this.stick.x;
      a.moveY += this.stick.y;
      for (const b of this.touchButtons) a[b] = true as never;
    }

    if (pad) {
      const ax = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      a.moveX += ax.x;
      a.moveY += ax.y;
      const b = pad.buttons;
      const pressed = (n: number) => !!b[n]?.pressed;
      if (pressed(14) || (pad.axes[0] ?? 0) < -0.5) a.moveX -= 1;
      if (pressed(15) || (pad.axes[0] ?? 0) > 0.5) a.moveX += 1;
      if (pressed(12) || (pad.axes[1] ?? 0) < -0.5) a.moveY -= 1;
      if (pressed(13) || (pad.axes[1] ?? 0) > 0.5) a.moveY += 1;
      if (pressed(0)) a.jump = true;
      if (pressed(2)) a.light = true;
      if (pressed(3)) a.heavy = true;
      if (pressed(1)) a.special = true;
      if (pressed(5)) a.super = true;
      if (pressed(4)) a.grab = true;
      if ((b[7]?.value ?? 0) > 0.4) a.run = true;
      if ((b[6]?.value ?? 0) > 0.4) a.dodge = true;
      if (pressed(9)) a.pause = true;
      if (pressed(0)) a.confirm = true;
      if (pressed(1)) a.back = true;
    }

    a.moveX = clamp(a.moveX, -1, 1);
    a.moveY = clamp(a.moveY, -1, 1);

    const prev = this.prev[i];
    const just = cloneActions(EMPTY);
    const released = cloneActions(EMPTY);
    just.moveX = a.moveX;
    just.moveY = a.moveY;
    for (const k of BOOL_KEYS) {
      just[k] = (a[k] && !prev[k]) as never;
      released[k] = (!a[k] && prev[k]) as never;
    }

    if (just.light || just.heavy || just.special || just.jump || just.grab || just.dodge || just.super) {
      const name = (["light", "heavy", "special", "jump", "grab", "dodge", "super"] as const).find((n) => just[n])!;
      this.players[i].buffer.push({ name, t: now });
    }
    this.players[i].buffer = this.players[i].buffer.filter((b) => now - b.t < 180);

    const dir = a.moveX === 0 ? 0 : Math.sign(a.moveX);
    if (dir !== 0 && dir !== Math.sign(prev.moveX) && prev.moveX === 0) {
      const dtap = this.doubleTap[i];
      if (dtap.dir === dir && now - dtap.t < 220) a.run = true;
      this.doubleTap[i] = { dir, t: now };
    }

    this.prev[i] = a;
    const p = this.players[i];
    Object.assign(p, a);
    p.just = just;
    p.released = released;
    if (Math.abs(a.moveX) > 0.25) p.facingHint = Math.sign(a.moveX);
  }

  private keyboard(i: number, p2: boolean) {
    const left = p2 ? this.has("ArrowLeft") : this.has("KeyA") || (!this.coop && this.has("ArrowLeft"));
    const right = p2 ? this.has("ArrowRight") : this.has("KeyD") || (!this.coop && this.has("ArrowRight"));
    const up = p2 ? this.has("ArrowUp") : this.has("KeyW") || (!this.coop && this.has("ArrowUp"));
    const down = p2 ? this.has("ArrowDown") : this.has("KeyS") || (!this.coop && this.has("ArrowDown"));
    const btns: Partial<Actions> = {};
    if (i === 0) {
      btns.jump = this.has("Space");
      btns.light = this.has("KeyJ") || this.has("KeyZ");
      btns.heavy = this.has("KeyK") || this.has("KeyX");
      btns.special = this.has("KeyL") || this.has("KeyC");
      btns.super = this.has("KeyI") || this.has("KeyV");
      btns.grab = this.has("KeyU") || this.has("KeyG");
      btns.run = this.has("ShiftLeft") || this.has("ShiftRight");
      btns.dodge = this.has("KeyO") || this.has("KeyF");
      btns.pause = this.has("Escape") || this.has("KeyP");
      btns.confirm = this.has("Enter") || this.has("Space") || this.has("KeyJ");
      btns.back = this.has("Escape") || this.has("Backspace");
      btns.taunt = this.has("KeyT");
    } else {
      btns.jump = this.has("Numpad0");
      btns.light = this.has("Numpad1");
      btns.heavy = this.has("Numpad2");
      btns.special = this.has("Numpad3");
      btns.super = this.has("Numpad4");
      btns.grab = this.has("Numpad5");
      btns.run = this.has("Numpad6");
      btns.dodge = this.has("Numpad7");
      btns.pause = false;
      btns.confirm = this.has("Numpad1");
      btns.back = this.has("Numpad3");
    }
    return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0), btns };
  }
}

const GAME_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyJ",
  "KeyK",
  "KeyL",
  "KeyI",
  "KeyU",
  "KeyO",
  "KeyZ",
  "KeyX",
  "KeyC",
  "KeyV",
  "KeyG",
  "KeyF",
  "KeyP",
  "KeyT",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Enter",
  "Escape",
]);

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
