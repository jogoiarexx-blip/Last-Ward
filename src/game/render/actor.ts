import { asset } from "@/game/asset";
import { drawSheet } from "../sprites";
import { worldToScreen } from "./background";
import type { Actor } from "../sim/actor";

export function drawShadow(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(sx, sy - 2, r, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawFighter(ctx: CanvasRenderingContext2D, a: Actor, camX: number) {
  const { sx, sy } = worldToScreen(a.x, a.y, a.z, camX);
  const ground = worldToScreen(a.x, a.y, 0, camX);
  const fallen = a.state === "fallen" || a.downed;
  const squash = a.squash || 1;
  const h = (fallen ? 28 : 56) * a.scale * (2 - squash);
  const w = 48 * a.scale * squash;
  drawShadow(ctx, ground.sx, ground.sy, (fallen ? 18 : 14) * a.scale);

  if (a.state === "super" || a.state === "special") {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.ellipse(sx, sy - h * 0.45, 22 * a.scale, 28 * a.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if ((a.anim === "run" || a.state === "dodge" || a.state === "special") && !fallen) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    const srcGhost = sheetFor(a);
    drawSheet(ctx, srcGhost, Math.floor(a.frame) % 4, 2, 2, sx - a.facing * 12, sy, w, h, a.facing < 0, false);
    ctx.globalAlpha = 0.12;
    drawSheet(ctx, srcGhost, Math.floor(a.frame) % 4, 2, 2, sx - a.facing * 22, sy, w, h, a.facing < 0, false);
    ctx.restore();
  }

  const src = sheetFor(a);
  const fr = Math.floor(a.frame) % 4;
  drawSheet(ctx, src, fr, 2, 2, sx, sy, w, h, a.facing < 0, a.flash > 0);

  if (a.ai?.windup && a.ai.windup > 0) {
    ctx.fillStyle = "#f0a030";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillText("!", sx - 3, sy - h - 4);
    ctx.strokeStyle = "rgba(240,160,48,0.8)";
    ctx.strokeRect(sx - 16, sy - h, 32, h);
  }

  if (a.state === "block") {
    ctx.strokeStyle = "rgba(80,200,224,0.75)";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - 14, sy - h, 28, h);
  }

  if (a.parryFlash && a.parryFlash > 0) {
    ctx.strokeStyle = "rgba(240,224,80,0.9)";
    ctx.strokeRect(sx - 16, sy - h - 2, 32, h + 4);
  }

  if (a.weapon && !fallen) {
    drawSheet(ctx, asset("sprites/weapons.png"), a.weapon.spriteIndex, 4, 2, sx + a.facing * 14, sy - 18, 22, 22, a.facing < 0);
  }

  if (!a.isPlayer && a.hp < a.maxHp && a.state !== "dead") {
    ctx.fillStyle = "#2a1010";
    ctx.fillRect(sx - 12, sy - h - 6, 24, 3);
    ctx.fillStyle = a.archetype === "boss" || a.archetype === "miniboss" ? "#f0a030" : "#e05050";
    ctx.fillRect(sx - 12, sy - h - 6, 24 * Math.max(0, a.hp / a.maxHp), 3);
  }

  if (a.downed) {
    ctx.fillStyle = "#f0a030";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillText("HELP", sx - 14, sy - h - 8);
  }
}

function sheetFor(a: Actor) {
  if (a.state === "fallen" || a.downed) return a.hurt || a.idle;
  if (a.state === "hurt" || a.state === "launch" || a.state === "stun") return a.hurt || a.idle;
  if (a.anim === "attack" || a.state === "special" || a.state === "super" || a.state === "throw") return a.attack;
  if (a.state === "jump" || a.state === "airAttack" || a.z > 8) return a.jump || a.idle;
  if (a.anim === "walk" || a.anim === "run") return a.walk;
  return a.idle;
}
