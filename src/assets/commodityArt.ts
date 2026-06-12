import type { Commodity } from "../game/types";

const cache: Partial<Record<Commodity, string>> = {};

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x * size, y * size, size, size);
}

function renderOre(size: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const u = size / 16;
  ctx.fillStyle = "#0a0e18";
  ctx.fillRect(0, 0, size, size);

  const rock = [
    "....xxxx....",
    "...xxxxxx...",
    "..xxxxxxxx..",
    ".xxxxxxxxxx.",
    "xxxxxxxxxxxx",
    "xxxxxxxxxxxx",
    ".xxxxxxxxxx.",
    "..xxxxxxxx..",
    "...xxxxxx...",
    "....xxxx....",
  ];
  const colors = ["#5a4030", "#8a5838", "#c87840", "#e8a050", "#6a4830"];
  for (let y = 0; y < rock.length; y++) {
    for (let x = 0; x < rock[y].length; x++) {
      if (rock[y][x] === "x") {
        const c = colors[(x + y * 3) % colors.length];
        px(ctx, x + 2, y + 3, u, c);
        if ((x + y) % 4 === 0) px(ctx, x + 2, y + 3, u, "#ffd080");
      }
    }
  }
  return canvas.toDataURL();
}

function renderScrap(size: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const u = size / 16;
  ctx.fillStyle = "#0a0e18";
  ctx.fillRect(0, 0, size, size);

  px(ctx, 3, 4, u, "#7a8494");
  px(ctx, 4, 4, u, "#9aa8b8");
  px(ctx, 5, 4, u, "#6a7484");
  px(ctx, 6, 5, u, "#b8c4d4");
  px(ctx, 7, 5, u, "#8898a8");
  px(ctx, 4, 5, u, "#5a6474");
  px(ctx, 5, 6, u, "#c43c3c");
  px(ctx, 6, 6, u, "#8a3030");
  px(ctx, 7, 6, u, "#aa5050");
  px(ctx, 8, 7, u, "#6a7484");
  px(ctx, 9, 7, u, "#9aa8b8");
  px(ctx, 5, 7, u, "#4a5464");
  px(ctx, 6, 8, u, "#7a8494");
  px(ctx, 7, 8, u, "#ff6644");
  px(ctx, 8, 8, u, "#cc4422");
  px(ctx, 4, 8, u, "#3a4454");
  px(ctx, 9, 9, u, "#5a6474");
  px(ctx, 3, 9, u, "#8898a8");
  return canvas.toDataURL();
}

function renderComponents(size: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const u = size / 16;
  ctx.fillStyle = "#0a0e18";
  ctx.fillRect(0, 0, size, size);

  for (let y = 5; y < 11; y++) {
    for (let x = 4; x < 12; x++) {
      px(ctx, x, y, u, "#1a2840");
    }
  }
  const pins = ["#44ddff", "#ff44aa", "#88ff44", "#ffdd44", "#aa66ff"];
  for (let i = 0; i < 5; i++) {
    px(ctx, 5 + i * 2, 4, u, pins[i]);
    px(ctx, 5 + i * 2, 11, u, pins[i]);
  }
  px(ctx, 6, 6, u, "#224466");
  px(ctx, 7, 6, u, "#336688");
  px(ctx, 8, 6, u, "#44aacc");
  px(ctx, 9, 6, u, "#336688");
  px(ctx, 6, 7, u, "#112233");
  px(ctx, 7, 7, u, "#66eeff");
  px(ctx, 8, 7, u, "#88ffff");
  px(ctx, 9, 7, u, "#44ccdd");
  px(ctx, 7, 8, u, "#224466");
  px(ctx, 8, 8, u, "#336688");
  px(ctx, 5, 7, u, "#ffaa22");
  px(ctx, 10, 8, u, "#ff6644");
  return canvas.toDataURL();
}

function renderAlloy(size: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const u = size / 16;
  ctx.fillStyle = "#0a0e18";
  ctx.fillRect(0, 0, size, size);

  const bars = [
    { x: 4, y: 6, w: 3, h: 5 },
    { x: 7, y: 5, w: 3, h: 6 },
    { x: 10, y: 7, w: 3, h: 4 },
  ];
  for (const b of bars) {
    for (let dy = 0; dy < b.h; dy++) {
      for (let dx = 0; dx < b.w; dx++) {
        const shade = dy === 0 ? "#f0e8d0" : dy === b.h - 1 ? "#8a7a50" : "#d4c890";
        px(ctx, b.x + dx, b.y + dy, u, dx === 0 ? "#fff8e8" : shade);
      }
    }
  }
  px(ctx, 5, 4, u, "#88ccff");
  px(ctx, 8, 3, u, "#aaddff");
  px(ctx, 11, 5, u, "#66aadd");
  return canvas.toDataURL();
}

function renderIcon(commodity: Commodity, size = 96): string {
  switch (commodity) {
    case "ore":
      return renderOre(size);
    case "scrap":
      return renderScrap(size);
    case "components":
      return renderComponents(size);
    case "alloy":
      return renderAlloy(size);
  }
}

export function getCommodityIconUrl(commodity: Commodity): string {
  if (!cache[commodity]) cache[commodity] = renderIcon(commodity);
  return cache[commodity]!;
}

export function getRefineryIconUrl(): string {
  return renderAlloy(72);
}
