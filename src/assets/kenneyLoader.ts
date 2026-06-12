import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ShipShapeId } from "../game/shipShapes";
import { getHullBounds } from "./modelBounds";

export { getHullBounds as getKenneyBounds };

const BASE = "/models/kenney";

export type KenneyModelId = string;

interface ModelTuning {
  rotY?: number;
  targetSize?: number;
  ground?: boolean;
}

/** Kenney exports are Y-up; ships face -Z — rotate to game +Z forward. */
const TUNING: Record<string, ModelTuning> = {
  craft_miner: { rotY: Math.PI, targetSize: 4.8, ground: true },
  craft_speederA: { rotY: Math.PI, targetSize: 4.4, ground: true },
  craft_cargoB: { rotY: Math.PI, targetSize: 5.0, ground: true },
  craft_racer: { rotY: Math.PI, targetSize: 5.2, ground: true },
  craft_cargoA: { rotY: Math.PI, targetSize: 5.4, ground: true },
  craft_speederD: { rotY: Math.PI, targetSize: 4.2, ground: true },
  platform_large: { targetSize: 10, ground: true },
  platform_center: { targetSize: 6, ground: true },
  platform_high: { targetSize: 5, ground: true },
  hangar_roundGlass: { targetSize: 7, ground: true },
  meteor: { targetSize: 3.2, ground: true },
  meteor_detailed: { targetSize: 3.8, ground: true },
  meteor_half: { targetSize: 4.5, ground: true },
  rock_largeA: { targetSize: 3.5, ground: true },
  rock_largeB: { targetSize: 3.5, ground: true },
  rock_crystals: { targetSize: 3.8, ground: true },
  structure_detailed: { targetSize: 5.5, ground: true },
  satelliteDish_large: { targetSize: 2.5, ground: true },
};

export const KENNEY_SHIPS: Record<ShipShapeId, KenneyModelId> = {
  hauler: "craft_miner",
  wedge: "craft_speederA",
  brick: "craft_cargoB",
  needle: "craft_racer",
  hammer: "craft_cargoA",
};

export const KENNEY_ASTEROIDS: KenneyModelId[] = [
  "meteor",
  "meteor_detailed",
  "rock_largeA",
  "rock_largeB",
  "rock_crystals",
];

export const KENNEY_WRECKS: KenneyModelId[] = [
  "meteor_half",
  "structure_detailed",
  "craft_speederD",
];

export const KENNEY_PRELOAD: KenneyModelId[] = [
  ...new Set([
    ...Object.values(KENNEY_SHIPS),
    ...KENNEY_ASTEROIDS,
    ...KENNEY_WRECKS,
    "platform_large",
    "platform_center",
    "hangar_roundGlass",
    "satelliteDish_large",
  ]),
];

const cache = new Map<KenneyModelId, THREE.Group>();
let ready = false;

function normalizeRoot(root: THREE.Group, tuning?: ModelTuning): void {
  if (tuning?.rotY) root.rotation.y = tuning.rotY;

  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);

  if (tuning?.targetSize) {
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z);
    if (max > 0.001) root.scale.setScalar(tuning.targetSize / max);
  }

  if (tuning?.ground !== false) {
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root);
    root.position.y -= box.min.y;
  }
}

export async function preloadKenneyModels(): Promise<void> {
  const loader = new GLTFLoader();
  await Promise.all(
    KENNEY_PRELOAD.map(async (id) => {
      const gltf = await loader.loadAsync(`${BASE}/${id}.glb`);
      const root = new THREE.Group();
      root.name = `kenney-${id}`;
      root.add(gltf.scene);
      normalizeRoot(root, TUNING[id]);
      cache.set(id, root);
    })
  );
  ready = true;
}

export function kenneyReady(): boolean {
  return ready;
}

export function cloneKenney(id: KenneyModelId): THREE.Group {
  const template = cache.get(id);
  if (!template) throw new Error(`Kenney model not loaded: ${id}`);
  const clone = template.clone(true);
  clone.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry = obj.geometry.clone();
    obj.material = Array.isArray(obj.material)
      ? obj.material.map((m) => m.clone())
      : obj.material.clone();
  });
  return clone;
}

export function tintKenneyModel(root: THREE.Object3D, hullColor: number, strength = 0.45): void {
  const tint = new THREE.Color(hullColor);
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const m = obj.material as THREE.MeshStandardMaterial;
    if (!m.color) return;
    m.color.lerp(tint, strength);
    m.metalness = Math.min(0.75, (m.metalness ?? 0.3) + 0.15);
    m.roughness = Math.max(0.35, (m.roughness ?? 0.5) - 0.08);
  });
}
