import * as THREE from "three";

function noise2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function fbm(x: number, y: number, seed: number, oct = 5): number {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * noise2(x * f, y * f, seed + i * 17.3);
    f *= 2.1;
    a *= 0.5;
  }
  return v;
}

function canvasTex(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createNebulaTexture(size = 512, seed = 42): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(u * 3.5, v * 3.5, seed);
      const n2 = fbm(u * 7 + 1, v * 7 + 2, seed + 50);
      const cloud = Math.pow(n * 0.6 + n2 * 0.4, 2.0);
      const edge = 1 - Math.pow(Math.abs(u - 0.5) * 2, 3) * Math.pow(Math.abs(v - 0.5) * 2, 3);
      const a = cloud * edge * 0.55;
      const i = (y * size + x) * 4;
      d[i] = 140 + cloud * 60;
      d[i + 1] = 120 + cloud * 50;
      d[i + 2] = 200 + cloud * 40;
      d[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = canvasTex(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Rich space sky — nebula washes + sun glare; stars come from Starfield. */
export function createSkyTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#0c1028");
  grad.addColorStop(0.35, "#141c38");
  grad.addColorStop(0.7, "#1a1840");
  grad.addColorStop(1, "#0a0e1c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const nebula1 = ctx.createRadialGradient(size * 0.72, size * 0.22, 0, size * 0.72, size * 0.22, size * 0.42);
  nebula1.addColorStop(0, "rgba(255, 120, 180, 0.28)");
  nebula1.addColorStop(0.45, "rgba(140, 80, 200, 0.14)");
  nebula1.addColorStop(1, "transparent");
  ctx.fillStyle = nebula1;
  ctx.fillRect(0, 0, size, size);

  const nebula2 = ctx.createRadialGradient(size * 0.18, size * 0.55, 0, size * 0.18, size * 0.55, size * 0.38);
  nebula2.addColorStop(0, "rgba(60, 140, 220, 0.22)");
  nebula2.addColorStop(0.5, "rgba(40, 80, 160, 0.1)");
  nebula2.addColorStop(1, "transparent");
  ctx.fillStyle = nebula2;
  ctx.fillRect(0, 0, size, size);

  const sun = ctx.createRadialGradient(size * 0.88, size * 0.12, 0, size * 0.88, size * 0.12, size * 0.35);
  sun.addColorStop(0, "rgba(255, 240, 200, 0.55)");
  sun.addColorStop(0.25, "rgba(255, 180, 80, 0.2)");
  sun.addColorStop(1, "transparent");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, size, size);

  const tex = canvasTex(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function createHullTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / size * 18, y / size * 18, 3, 4);
      const scratch = fbm(x / size * 40, y / size * 8, 9, 3);
      const v = 118 + n * 28 + scratch * 12;
      const i = (y * size + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = canvasTex(canvas);
  tex.repeat.set(2, 2);
  return tex;
}

export function createGridTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#14102a";
  ctx.fillRect(0, 0, size, size);

  const step = size / 16;
  ctx.strokeStyle = "rgba(100, 180, 255, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 16; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }

  const tex = canvasTex(canvas);
  tex.repeat.set(4, 4);
  return tex;
}

let cache: Record<string, THREE.CanvasTexture> = {};

export function getNebulaTexture(): THREE.CanvasTexture {
  return (cache.nebula ??= createNebulaTexture());
}
export function getSkyTexture(): THREE.CanvasTexture {
  return (cache.sky ??= createSkyTexture());
}
export function getHullTexture(): THREE.CanvasTexture {
  return (cache.hull ??= createHullTexture());
}
export function getGridTexture(): THREE.CanvasTexture {
  return (cache.grid ??= createGridTexture());
}

/** Call after texture algorithm changes so dev hot-reload picks up new art. */
export function clearTextureCache(): void {
  for (const t of Object.values(cache)) t.dispose();
  cache = {};
}
