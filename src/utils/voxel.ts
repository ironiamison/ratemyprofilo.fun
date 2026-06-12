import * as THREE from "three";
import {
  emissiveMaterial,
  glassMaterial,
  glowMaterial,
  hullMaterial,
  metalMaterial,
} from "../assets/materials";

export const COLORS = {
  space: 0x0a0e1c,
  spaceBright: 0x121830,
  asteroid: 0xb0a898,
  asteroidDark: 0x807868,
  asteroidOre: 0xffd966,
  metal: 0xa8b8c8,
  metalDark: 0x5a6a78,
  hull: 0x8a9ab0,
  hullDark: 0x5a6478,
  engine: 0xff6622,
  engineHot: 0xffaa33,
  scan: 0x44ccee,
  station: 0x44dd99,
  wreck: 0x8a7a98,
  laser: 0x22eedd,
  glass: 0x99ccff,
  rust: 0xb06840,
};

export function hullMat(
  color: number,
  opts: { metalness?: number; roughness?: number; emissive?: number; emissiveIntensity?: number } = {}
): THREE.MeshStandardMaterial {
  return hullMaterial(color, opts);
}

export function glowMat(color: number, intensity = 1.0): THREE.MeshStandardMaterial {
  return glowMaterial(color, intensity);
}

export function voxel(
  w: number,
  h: number,
  d: number,
  color: number,
  x = 0,
  y = 0,
  z = 0,
  opts: { emissive?: number; emissiveIntensity?: number; metalness?: number; metal?: boolean } = {}
): THREE.Mesh {
  const mat = opts.metal
    ? metalMaterial(color)
    : hullMaterial(color, {
        emissive: opts.emissive,
        emissiveIntensity: opts.emissiveIntensity,
        metalness: opts.metalness,
      });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

export function addTo(group: THREE.Group, ...args: Parameters<typeof voxel>): THREE.Mesh {
  const mesh = voxel(...args);
  group.add(mesh);
  return mesh;
}

export function addCyl(
  group: THREE.Group,
  rt: number,
  rb: number,
  h: number,
  color: number,
  x: number,
  y: number,
  z: number,
  segs = 12,
  metal = false
): THREE.Mesh {
  const mat = metal ? metalMaterial(color) : hullMaterial(color);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
  mesh.position.set(x, y + h / 2, z);
  group.add(mesh);
  return mesh;
}

export function addGlow(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
  intensity?: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), emissiveMaterial(color, intensity ?? 1.0));
  mesh.position.set(x, y + h / 2, z);
  group.add(mesh);
  return mesh;
}

export function addGlowCyl(
  group: THREE.Group,
  rt: number,
  rb: number,
  h: number,
  color: number,
  x: number,
  y: number,
  z: number,
  intensity = 1,
  segs = 12
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, segs),
    emissiveMaterial(color, intensity)
  );
  mesh.position.set(x, y + h / 2, z);
  group.add(mesh);
  return mesh;
}

export function addGlass(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMaterial(color));
  mesh.position.set(x, y + h / 2, z);
  group.add(mesh);
  return mesh;
}

export function addAngled(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
  rotY = 0,
  rotZ = 0,
  opts: { emissive?: number; emissiveIntensity?: number; metalness?: number; metal?: boolean } = {}
): THREE.Mesh {
  const mesh = voxel(w, h, d, color, 0, 0, 0, opts);
  mesh.position.set(x, y + h / 2, z);
  mesh.rotation.set(rotZ, rotY, 0);
  group.add(mesh);
  return mesh;
}

export function darken(color: number, f = 0.72): number {
  const r = ((color >> 16) & 0xff) * f;
  const g = ((color >> 8) & 0xff) * f;
  const b = (color & 0xff) * f;
  return (r << 16) | (g << 8) | b;
}

export function seededRandom(seed: number, i: number): number {
  const x = Math.sin(seed * 9999 + i * 127.1) * 43758.5453;
  return x - Math.floor(x);
}
