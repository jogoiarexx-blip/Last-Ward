import { asset } from "@/game/asset";
import { GROUND_Y, VIEW_H, VIEW_W } from "../config";
import { getSprite } from "../sprites";
import type { StageTheme } from "../types";

export type Palette = {
  sky0: string;
  sky1: string;
  far: string;
  mid: string;
  near: string;
  ground: string;
  ground2: string;
  accent: string;
  window: string;
};

export const THEMES: Record<StageTheme, Palette> = {
  urban: { sky0: "#0b1020", sky1: "#1a2040", far: "#141a30", mid: "#1c2440", near: "#242c48", ground: "#1a1c24", ground2: "#2a2e3a", accent: "#f0a030", window: "#ffe08a" },
  metro: { sky0: "#0a0c10", sky1: "#161410", far: "#1a1810", mid: "#2a2418", near: "#3a3220", ground: "#1c1814", ground2: "#3a3020", accent: "#e0c040", window: "#f0d060" },
  roofs: { sky0: "#0c1428", sky1: "#203058", far: "#182440", mid: "#243858", near: "#304868", ground: "#2a2830", ground2: "#3a3844", accent: "#3ad0c0", window: "#c8e8ff" },
  industrial: { sky0: "#1a140c", sky1: "#302418", far: "#2a2018", mid: "#3a2c1c", near: "#4a3824", ground: "#241c14", ground2: "#3a2c20", accent: "#e07020", window: "#ff9040" },
  factory: { sky0: "#20140c", sky1: "#401c10", far: "#301810", mid: "#482010", near: "#582818", ground: "#28180c", ground2: "#402010", accent: "#ff5020", window: "#ffc040" },
  docks: { sky0: "#0c1820", sky1: "#183040", far: "#143040", mid: "#1c4050", near: "#245060", ground: "#1a2830", ground2: "#2a4050", accent: "#3ad0c0", window: "#80e0d0" },
  mall: { sky0: "#18141c", sky1: "#2a2438", far: "#242030", mid: "#383044", near: "#4a4058", ground: "#222028", ground2: "#3a3648", accent: "#f0a030", window: "#ffe9a0" },
  hollow: { sky0: "#10140c", sky1: "#1c2418", far: "#182018", mid: "#243028", near: "#304038", ground: "#141810", ground2: "#283428", accent: "#70a060", window: "#a0c080" },
  spire: { sky0: "#081018", sky1: "#102030", far: "#183048", mid: "#204060", near: "#285878", ground: "#101820", ground2: "#203040", accent: "#d4a020", window: "#c0e8ff" },
  helix: { sky0: "#08060c", sky1: "#140e18", far: "#1a121c", mid: "#281828", near: "#342030", ground: "#100c14", ground2: "#241828", accent: "#f0a030", window: "#50c8e0" },
  secret: { sky0: "#140c10", sky1: "#2a1420", far: "#24141c", mid: "#381c28", near: "#4a2434", ground: "#1c1014", ground2: "#341c28", accent: "#e07090", window: "#ffb0c0" },
  dojo: { sky0: "#1a140e", sky1: "#2c2418", far: "#2a2218", mid: "#3a3020", near: "#4a3c28", ground: "#2a2014", ground2: "#3e3020", accent: "#d4a020", window: "#e8d0a0" },
};

const FAR_PLATE: Partial<Record<StageTheme, string>> = {
  urban: asset("sprites/bg-urban-far.jpg"),
  roofs: asset("sprites/bg-roofs-far.jpg"),
  metro: asset("sprites/bg-metro-far.jpg"),
  helix: asset("sprites/bg-helix-far.jpg"),
  factory: asset("sprites/bg-factory-far.jpg"),
  industrial: asset("sprites/bg-factory-far.jpg"),
  docks: asset("sprites/bg-docks-far.jpg"),
  mall: asset("sprites/bg-mall-far.jpg"),
  hollow: asset("sprites/bg-hollow-far.jpg"),
  secret: asset("sprites/bg-hollow-far.jpg"),
  spire: asset("sprites/bg-helix-far.jpg"),
  dojo: asset("sprites/bg-mall-far.jpg"),
};

const MID_PLATE: Partial<Record<StageTheme, string>> = {
  urban: asset("sprites/bg-urban-mid.jpg"),
  roofs: asset("sprites/bg-urban-mid.jpg"),
  mall: asset("sprites/bg-mall-far.jpg"),
  metro: asset("sprites/bg-metro-mid.jpg"),
  helix: asset("sprites/bg-metro-mid.jpg"),
  factory: asset("sprites/bg-factory-mid.jpg"),
  industrial: asset("sprites/bg-factory-mid.jpg"),
  docks: asset("sprites/bg-docks-mid.jpg"),
};

const FLOOR_PLATE: Partial<Record<StageTheme, string>> = {
  urban: asset("sprites/floor-urban.jpg"),
  roofs: asset("sprites/floor-roofs.jpg"),
  metro: asset("sprites/floor-metro.jpg"),
  factory: asset("sprites/floor-factory.jpg"),
  industrial: asset("sprites/floor-factory.jpg"),
  docks: asset("sprites/floor-docks.jpg"),
  mall: asset("sprites/floor-mall.jpg"),
  helix: asset("sprites/floor-mall.jpg"),
  hollow: asset("sprites/floor-docks.jpg"),
  secret: asset("sprites/floor-mall.jpg"),
  dojo: asset("sprites/floor-mall.jpg"),
  spire: asset("sprites/floor-metro.jpg"),
};

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function plate(ctx: CanvasRenderingContext2D, src: string | undefined, camX: number, factor: number, dy: number, dh: number, alpha: number) {
  if (!src) return false;
  const img = getSprite(src);
  if (!img || !img.naturalWidth) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  const w = VIEW_W;
  const off = -((camX * factor) % w);
  ctx.drawImage(img, off, dy, w, dh);
  ctx.drawImage(img, off + w, dy, w, dh);
  ctx.restore();
  return true;
}

export function drawBackground(ctx: CanvasRenderingContext2D, theme: StageTheme, camX: number, time: number, dark = false) {
  const p = THEMES[theme];
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, p.sky0);
  g.addColorStop(1, p.sky1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const farOff = camX * 0.12;
  const midOff = camX * 0.32;
  const nearOff = camX * 0.55;

  const usedFar = plate(ctx, FAR_PLATE[theme], camX, 0.12, 0, 128, theme === "urban" || theme === "roofs" ? 0.72 : 0.85);
  if (!usedFar) {
    drawSkyline(ctx, p.far, farOff, 70, 0.7, 1);
    if (theme === "spire") drawMoon(ctx);
  }

  if (theme === "docks") drawWater(ctx, camX, time, p);
  if (theme === "metro" || theme === "helix") drawTunnel(ctx, p, camX);

  const usedMid = plate(ctx, MID_PLATE[theme], camX, 0.32, 36, 110, 0.7);
  if (!usedMid) drawSkyline(ctx, p.mid, midOff, 95, 1, 2);

  drawShopRow(ctx, p, nearOff, theme);
  if (theme === "urban" || theme === "roofs") drawRain(ctx, time, camX);
  drawThemeExtras(ctx, theme, p, camX, time);
  drawParked(ctx, p, camX, theme);
  drawGround(ctx, p, camX, theme);
  drawWires(ctx, camX, p);

  if (dark) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

export function drawForeground(ctx: CanvasRenderingContext2D, theme: StageTheme, camX: number, time: number) {
  const p = THEMES[theme];
  const off = camX * 0.92;
  ctx.save();
  ctx.globalAlpha = 0.55;
  const ox = -((off % 140) + 140) % 140;
  for (let x = ox; x < VIEW_W + 40; x += 140) {
    ctx.fillStyle = p.near;
    ctx.fillRect(x + 6, GROUND_Y - 24, 5, 50);
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(x + 4, GROUND_Y + 20, 9, 18);
  }
  ctx.restore();
  if (theme === "urban" || theme === "roofs" || theme === "docks") {
    ctx.strokeStyle = "rgba(180,200,220,0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const x = ((i * 71 + camX * 1.1 + time * 180) % (VIEW_W + 16)) - 8;
      const y = ((i * 37 + time * 320) % (VIEW_H + 16)) - 8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3, y + 14);
      ctx.stroke();
    }
  }
}

function drawGround(ctx: CanvasRenderingContext2D, p: Palette, camX: number, theme: StageTheme) {
  ctx.fillStyle = p.ground;
  ctx.fillRect(0, GROUND_Y - 78, VIEW_W, VIEW_H);
  const floor = getSprite(FLOOR_PLATE[theme] ?? "");
  if (floor && floor.naturalWidth) {
    const fw = floor.naturalWidth;
    const fh = floor.naturalHeight;
    const ox = -((camX % fw) + fw) % fw;
    ctx.imageSmoothingEnabled = false;
    for (let x = ox; x < VIEW_W + fw; x += fw) {
      ctx.drawImage(floor, x, GROUND_Y - 78, fw, Math.max(fh, 36));
    }
  } else {
    ctx.fillStyle = p.ground2;
    const tile = 24;
    const ox = -((camX % tile) + tile) % tile;
    for (let x = ox; x < VIEW_W + tile; x += tile) {
      ctx.globalAlpha = 0.22;
      ctx.fillRect(x, GROUND_Y - 78, 12, 3);
      ctx.globalAlpha = 0.08;
      ctx.fillRect(x, GROUND_Y - 40, 18, 1);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.accent;
  ctx.globalAlpha = 0.4;
  ctx.fillRect(0, GROUND_Y - 80, VIEW_W, 2);
  ctx.globalAlpha = 1;

  if (theme === "urban" || theme === "docks") {
    ctx.fillStyle = "rgba(80,140,180,0.12)";
    const px = -((camX * 0.7) % 90);
    for (let x = px; x < VIEW_W; x += 90) {
      ctx.beginPath();
      ctx.ellipse(x + 30, GROUND_Y - 30, 22, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawShopRow(ctx: CanvasRenderingContext2D, p: Palette, off: number, theme: StageTheme) {
  const ox = -((off % 96) + 96) % 96;
  for (let i = -1; i < 8; i++) {
    const x = ox + i * 96;
    const h = 58 + hash(i + 3) * 28;
    const y = GROUND_Y - 78 - h;
    ctx.fillStyle = i % 2 ? p.near : p.mid;
    ctx.fillRect(x, y, 88, h);
    ctx.fillStyle = p.window;
    ctx.globalAlpha = 0.28 + hash(i * 9) * 0.25;
    ctx.fillRect(x + 8, y + 10, 22, 16);
    ctx.fillRect(x + 36, y + 10, 22, 16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = hash(i * 4) > 0.5 ? p.accent : p.window;
    ctx.fillRect(x + 6, y + 30, 50, 6);
    ctx.fillStyle = "#1a1210";
    ctx.fillRect(x + 54, y + h - 28, 18, 28);
    if (theme === "urban" || theme === "mall") {
      ctx.fillStyle = p.accent;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x + 10, y - 8, 40, 8);
      ctx.globalAlpha = 1;
    }
  }
}

function drawParked(ctx: CanvasRenderingContext2D, p: Palette, camX: number, theme: StageTheme) {
  if (theme === "dojo" || theme === "helix" || theme === "metro") return;
  const ox = -((camX * 0.7) % 220);
  for (let i = 0; i < 4; i++) {
    const x = ox + i * 220 + 40;
    ctx.fillStyle = i % 2 ? "#1a2030" : "#241810";
    ctx.fillRect(x, GROUND_Y - 96, 38, 14);
    ctx.fillRect(x + 6, GROUND_Y - 104, 22, 10);
    ctx.fillStyle = p.window;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x + 8, GROUND_Y - 101, 8, 5);
    ctx.fillRect(x + 20, GROUND_Y - 101, 8, 5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0a0a0c";
    ctx.fillRect(x + 4, GROUND_Y - 84, 8, 4);
    ctx.fillRect(x + 26, GROUND_Y - 84, 8, 4);
  }
}

function drawWires(ctx: CanvasRenderingContext2D, camX: number, p: Palette) {
  ctx.strokeStyle = p.far;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const ox = -((camX * 0.2) % 160);
  ctx.moveTo(ox, 28);
  for (let x = ox; x < VIEW_W + 40; x += 40) ctx.lineTo(x, 28 + Math.sin(x * 0.04) * 6);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawSkyline(ctx: CanvasRenderingContext2D, color: string, off: number, base: number, s: number, seed: number) {
  ctx.fillStyle = color;
  for (let i = -2; i < 18; i++) {
    const w = (40 + hash(i * 3 + seed) * 50) * s;
    const h = (50 + hash(i * 7 + seed) * 90) * s;
    const x = i * 70 * s - (off % (70 * s));
    ctx.fillRect(x, base + 40 - h * 0.4, w, h);
    ctx.fillStyle = "rgba(255,220,140,0.35)";
    const win = 4;
    for (let wy = 8; wy < h - 10; wy += 10) {
      for (let wx = 6; wx < w - 8; wx += 8) {
        if (hash(i * 11 + wy + wx + seed) > 0.55) ctx.fillRect(x + wx, base + 40 - h * 0.4 + wy, win, win);
      }
    }
    ctx.fillStyle = color;
  }
}

function drawRain(ctx: CanvasRenderingContext2D, time: number, camX: number) {
  ctx.strokeStyle = "rgba(180,200,220,0.28)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 50; i++) {
    const x = ((i * 97 + camX * 0.4 + time * 140) % (VIEW_W + 20)) - 10;
    const y = ((i * 53 + time * 280) % (VIEW_H + 20)) - 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 2, y + 10);
    ctx.stroke();
  }
}

function drawWater(ctx: CanvasRenderingContext2D, camX: number, time: number, p: Palette) {
  ctx.fillStyle = "#0a2830";
  ctx.fillRect(0, 150, VIEW_W, 40);
  ctx.strokeStyle = p.accent;
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    const y = 158 + i * 4;
    ctx.moveTo(0, y);
    for (let x = 0; x < VIEW_W; x += 8) ctx.lineTo(x, y + Math.sin((x + camX + time * 40) * 0.05 + i) * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawTunnel(ctx: CanvasRenderingContext2D, p: Palette, camX: number) {
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, VIEW_W, 40);
  ctx.fillRect(0, 140, VIEW_W, 20);
  ctx.fillStyle = p.accent;
  const ox = -((camX * 0.5) % 48);
  for (let x = ox; x < VIEW_W; x += 48) {
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, 44, 6, 4);
    ctx.fillRect(x, 136, 6, 4);
  }
  ctx.globalAlpha = 1;
}

function drawMoon(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#d8e8ff";
  ctx.beginPath();
  ctx.arc(400, 36, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#102030";
  ctx.beginPath();
  ctx.arc(406, 32, 14, 0, Math.PI * 2);
  ctx.fill();
}

function drawThemeExtras(ctx: CanvasRenderingContext2D, theme: StageTheme, p: Palette, camX: number, time: number) {
  ctx.save();
  if (theme === "urban") {
    drawNeon(ctx, 80 - (camX * 0.55) % 220, 58, "VÉSPER", p.accent);
    drawNeon(ctx, 260 - (camX * 0.55) % 220, 72, "WARD", p.window);
    drawLampRow(ctx, camX * 0.55, GROUND_Y - 78, p.window);
  } else if (theme === "metro") {
    const ox = -((camX * 0.4) % 160);
    ctx.fillStyle = "#2a2214";
    for (let x = ox; x < VIEW_W + 40; x += 160) ctx.fillRect(x, 88, 110, 36);
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = 0.5 + Math.sin(time * 4) * 0.2;
    ctx.fillRect(ox + 12, 96, 18, 6);
    ctx.globalAlpha = 1;
  } else if (theme === "mall") {
    const ox = -((camX * 0.5) % 90);
    for (let i = 0; i < 8; i++) {
      const x = ox + i * 90;
      ctx.fillStyle = i % 2 ? "#3a3048" : "#2c2438";
      ctx.fillRect(x, 70, 70, 70);
      ctx.fillStyle = p.window;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x + 8, 80, 54, 40);
      ctx.globalAlpha = 1;
    }
  } else if (theme === "factory" || theme === "industrial") {
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = 0.25 + Math.sin(time * 6) * 0.1;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 97 - camX * 0.3) % VIEW_W + VIEW_W) % VIEW_W;
      ctx.fillRect(x, 40 + (i % 3) * 8, 3, 40);
    }
    ctx.globalAlpha = 1;
  } else if (theme === "helix") {
    ctx.strokeStyle = p.window;
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 80 - (camX * 0.2) % 80;
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x + Math.sin(time + i) * 10, 140);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (theme === "docks") {
    drawLampRow(ctx, camX * 0.4, 148, p.accent);
  } else if (theme === "dojo") {
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(40, 50, 4, 90);
    ctx.fillRect(VIEW_W - 44, 50, 4, 90);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawNeon(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.font = "8px 'Press Start 2P', monospace";
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}

function drawLampRow(ctx: CanvasRenderingContext2D, off: number, ground: number, glow: string) {
  const ox = -((off % 96) + 96) % 96;
  for (let x = ox; x < VIEW_W + 20; x += 96) {
    ctx.fillStyle = "#1a1c22";
    ctx.fillRect(x + 18, ground - 48, 3, 48);
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(x + 19, ground - 50, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function worldToScreen(x: number, y: number, z: number, camX: number) {
  const sx = x - camX;
  const sy = GROUND_Y - y * 0.55 - z;
  return { sx, sy };
}

export const BG_URLS = [
  asset("sprites/bg-urban-far.jpg"),
  asset("sprites/bg-urban-mid.jpg"),
  asset("sprites/bg-metro-far.jpg"),
  asset("sprites/bg-metro-mid.jpg"),
  asset("sprites/bg-factory-far.jpg"),
  asset("sprites/bg-factory-mid.jpg"),
  asset("sprites/bg-docks-far.jpg"),
  asset("sprites/bg-docks-mid.jpg"),
  asset("sprites/bg-roofs-far.jpg"),
  asset("sprites/bg-mall-far.jpg"),
  asset("sprites/bg-hollow-far.jpg"),
  asset("sprites/bg-helix-far.jpg"),
  asset("sprites/floor-urban.jpg"),
  asset("sprites/floor-metro.jpg"),
  asset("sprites/floor-factory.jpg"),
  asset("sprites/floor-docks.jpg"),
  asset("sprites/floor-roofs.jpg"),
  asset("sprites/floor-mall.jpg"),
];

export function themeAssetUrls(theme: StageTheme): string[] {
  return [FAR_PLATE[theme], MID_PLATE[theme], FLOOR_PLATE[theme]].filter((u): u is string => Boolean(u));
}
