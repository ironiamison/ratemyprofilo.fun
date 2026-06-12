import * as THREE from "three";
import { createNebulaClouds } from "./NebulaClouds";
import { seededRandom } from "../utils/voxel";

function planetTexture(seed: number, c1: string, c2: string, c3: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size * 0.35, size * 0.3, 0, size * 0.5, size * 0.5, size * 0.55);
  g.addColorStop(0, c1);
  g.addColorStop(0.5, c2);
  g.addColorStop(1, c3);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 40; i++) {
    const x = seededRandom(seed, i) * size;
    const y = seededRandom(seed, i + 50) * size;
    const r = seededRandom(seed, i + 100) * 18 + 4;
    ctx.fillStyle = `rgba(0,0,0,${seededRandom(seed, i + 150) * 0.15})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPlanet(
  radius: number,
  pos: THREE.Vector3,
  seed: number,
  colors: [string, string, string],
  ring = false
): THREE.Group {
  const g = new THREE.Group();
  const tex = planetTexture(seed, ...colors);
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 24),
    new THREE.MeshBasicMaterial({ map: tex, fog: false })
  );
  g.add(body);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.08, 16, 12),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(colors[0]).multiplyScalar(0.5),
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      fog: false,
    })
  );
  g.add(glow);

  if (ring) {
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.4, radius * 2.1, 48),
      new THREE.MeshBasicMaterial({
        color: 0xaa8866,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        fog: false,
      })
    );
    ringMesh.rotation.x = Math.PI / 2.3;
    g.add(ringMesh);
  }

  g.position.copy(pos);
  return g;
}

function createSunGlow(): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255, 245, 220, 1)");
  g.addColorStop(0.15, "rgba(255, 210, 140, 0.55)");
  g.addColorStop(0.45, "rgba(255, 150, 60, 0.15)");
  g.addColorStop(1, "rgba(255, 100, 40, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
  });
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), mat);
  sun.position.set(220, 100, -300);
  sun.lookAt(0, 0, 0);
  return sun;
}

function createDustMotes(count: number, seed: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (seededRandom(seed, i) - 0.5) * 500;
    positions[i * 3 + 1] = (seededRandom(seed, i + 1) - 0.5) * 120;
    positions[i * 3 + 2] = (seededRandom(seed, i + 2) - 0.5) * 500;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 1.4,
      color: 0x99bbee,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
}

export class SpaceBackdrop {
  group = new THREE.Group();
  private nebula: THREE.Group;
  private planets: THREE.Group[] = [];
  private time = 0;

  constructor(seed = 7) {
    this.group.add(createSunGlow());

    this.group.add(createPlanet(55, new THREE.Vector3(-200, 40, -250), seed, ["#88ccaa", "#448866", "#1a3040"]));
    this.group.add(createPlanet(28, new THREE.Vector3(-120, -15, -180), seed + 1, ["#cc8866", "#884422", "#331a10"]));
    this.group.add(createPlanet(38, new THREE.Vector3(160, 25, -320), seed + 2, ["#6688cc", "#334488", "#0a1028"], true));
    this.group.add(createPlanet(12, new THREE.Vector3(-60, 55, -140), seed + 3, ["#aaaaaa", "#666666", "#222222"]));
    this.group.add(createPlanet(18, new THREE.Vector3(90, -30, -200), seed + 4, ["#ddaa66", "#aa6633", "#442211"]));

    this.nebula = createNebulaClouds(seed, 12);
    this.group.add(this.nebula);
    this.group.add(createDustMotes(600, seed + 99));

    for (const child of this.group.children) {
      if (child instanceof THREE.Group && child !== this.nebula) {
        this.planets.push(child);
      }
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.nebula.rotation.y = Math.sin(this.time * 0.02) * 0.08;
    for (let i = 0; i < this.planets.length; i++) {
      const p = this.planets[i];
      p.rotation.y += dt * (0.01 + i * 0.004);
    }
  }
}
