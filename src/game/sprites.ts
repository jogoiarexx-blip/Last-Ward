const cache = new Map<string, HTMLImageElement>();
const failed = new Set<string>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit?.complete && hit.naturalWidth) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      failed.add(src);
      const blank = new Image();
      cache.set(src, blank);
      resolve(blank);
    };
    img.src = src;
  });
}

export function getSprite(src: string): HTMLImageElement | null {
  const img = cache.get(src);
  if (!img || !img.naturalWidth) return null;
  return img;
}

export function drawSheet(
  ctx: CanvasRenderingContext2D,
  src: string,
  frame: number,
  cols: number,
  rows: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  flip: boolean,
  flash = false,
) {
  const img = getSprite(src);
  if (!img) {
    ctx.save();
    ctx.fillStyle = flash ? "#fff" : "#c45a2a";
    ctx.fillRect(dx - dw / 2, dy - dh, dw, dh);
    ctx.restore();
    return;
  }
  const cw = img.width / cols;
  const ch = img.height / rows;
  const i = frame % (cols * rows);
  const sx = (i % cols) * cw;
  const sy = Math.floor(i / cols) * ch;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.translate(dx, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, cw, ch, -dw / 2, -dh, dw, dh);
  } else {
    ctx.drawImage(img, sx, sy, cw, ch, dx - dw / 2, dy - dh, dw, dh);
  }
  if (flash) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    if (flip) ctx.fillRect(-dw / 2, -dh, dw, dh);
    else ctx.fillRect(dx - dw / 2, dy - dh, dw, dh);
  }
  ctx.restore();
}

export async function preloadAll(urls: string[]) {
  await Promise.all(urls.map((u) => loadImage(u)));
}
