import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ShipShapeId } from "../game/shipShapes";

const BASE = "/models/polyy";

export type PolyyModelId = ShipShapeId;

interface ModelTuning {
  rotY?: number;
  targetSize?: number;
  ground?: boolean;
}

/** Polyy GLBs are Y-up with nose along +Z — no Y flip (unlike Kenney's -Z export). */
const TUNING: Record<PolyyModelId, ModelTuning> = {
  hauler: { rotY: 0, targetSize: 5.4, ground: true },
  wedge: { rotY: 0, targetSize: 5.0, ground: true },
  brick: { rotY: 0, targetSize: 5.2, ground: true },
  needle: { rotY: 0, targetSize: 5.8, ground: true },
  hammer: { rotY: 0, targetSize: 5.6, ground: true },
};

export const POLYY_SHIPS: Record<ShipShapeId, PolyyModelId> = {
  hauler: "hauler",
  wedge: "wedge",
  brick: "brick",
  needle: "needle",
  hammer: "hammer",
};

export const POLYY_PRELOAD: PolyyModelId[] = Object.values(POLYY_SHIPS);

const cache = new Map<PolyyModelId, THREE.Group>();
let ready = false;

let resolveReady: (() => void) | null = null;
export const whenPolyyReady = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

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

function enhancePbrMaterials(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
      mat.envMapIntensity = 1.15;
      mat.metalness = Math.min(0.92, (mat.metalness ?? 0.45) + 0.05);
      mat.roughness = Math.max(0.22, (mat.roughness ?? 0.45) - 0.05);
    }
  });
}

export async function preloadPolyyModels(): Promise<void> {
  const loader = new GLTFLoader();
  await Promise.all(
    POLYY_PRELOAD.map(async (id) => {
      const gltf = await loader.loadAsync(`${BASE}/${id}.glb`);
      const root = new THREE.Group();
      root.name = `polyy-${id}`;
      root.add(gltf.scene);
      normalizeRoot(root, TUNING[id]);
      enhancePbrMaterials(root);
      cache.set(id, root);
    })
  );
  ready = true;
  resolveReady?.();
}

export function polyyReady(): boolean {
  return ready;
}

export function clonePolyy(id: PolyyModelId): THREE.Group {
  const template = cache.get(id);
  if (!template) throw new Error(`Polyy model not loaded: ${id}`);
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

export function tintPolyyModel(root: THREE.Object3D, hullColor: number, strength = 0.28): void {
  const tint = new THREE.Color(hullColor);
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!(mat instanceof THREE.MeshStandardMaterial) || !mat.color) continue;
      mat.color.lerp(tint, strength);
      mat.emissive.lerp(tint, strength * 0.15);
      mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 0, 0.08);
    }
  });
}
