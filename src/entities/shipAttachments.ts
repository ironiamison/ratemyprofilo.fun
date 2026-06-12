import * as THREE from "three";
import { getHullBounds } from "../assets/modelBounds";
import type { ShipShapeId } from "../game/shipShapes";
import type { ShipPaint } from "../game/shipPaint";
import { addAngled, addCyl, addGlow, addGlowCyl, addTo, darken } from "../utils/voxel";

export interface AttachmentOpts {
  glowI: number;
  trimI: number;
  emI: number;
  preview: boolean;
  isPlayer: boolean;
}

function salvageClaw(
  group: THREE.Group,
  paint: ShipPaint,
  x: number,
  y: number,
  z: number,
  spread: number,
  opts: AttachmentOpts,
  onClaw: (m: THREE.Mesh) => void
): void {
  const arm = darken(paint.metal, 0.68);
  addCyl(group, 0.06, 0.08, 0.45, arm, x, y + 0.1, z, 8, true);
  onClaw(addAngled(group, 0.07, 0.28, 0.45, paint.trim, x + spread * 0.2, y + 0.15, z + 0.25, spread * 0.55, 0.15));
  onClaw(addAngled(group, 0.07, 0.28, 0.45, paint.trim, x - spread * 0.2, y + 0.15, z + 0.25, -spread * 0.55, -0.15));
  addGlow(group, 0.06, 0.06, 0.06, paint.accent, x, y + 0.38, z + 0.1, opts.trimI * 0.45);
}

function scannerDish(
  group: THREE.Group,
  paint: ShipPaint,
  x: number,
  y: number,
  z: number,
  opts: AttachmentOpts,
  onSpinner: (m: THREE.Object3D) => void,
  size = 1
): void {
  const s = size;
  addCyl(group, 0.03 * s, 0.03 * s, 0.35 * s, paint.metal, x, y, z, 8, true);
  onSpinner(addCyl(group, 0.28 * s, 0.24 * s, 0.07 * s, darken(paint.hull, 0.82), x, y + 0.38 * s, z, 16));
  addGlow(group, 0.14 * s, 0.035 * s, 0.14 * s, paint.glow, x, y + 0.44 * s, z, opts.emI * 0.55);
}

function miningLaser(group: THREE.Group, paint: ShipPaint, z: number, opts: AttachmentOpts): void {
  addCyl(group, 0.14, 0.18, 0.35, darken(paint.metal, 0.7), 0, 0.08, z, 10, true);
  addCyl(group, 0.08, 0.1, 0.55, darken(paint.metal, 0.55), 0, 0.05, z + 0.45, 8, true);
  addGlowCyl(group, 0.05, 0.07, 0.25, paint.glow, 0, 0.02, z + 0.82, opts.glowI * 0.7, 8);
}

export function engineUnit(
  group: THREE.Group,
  paint: ShipPaint,
  opts: AttachmentOpts,
  x: number,
  y: number,
  z: number,
  scale = 1,
  onExhaust?: (pos: THREE.Vector3, s: number) => void
): THREE.Mesh {
  const s = scale;
  addCyl(group, 0.44 * s, 0.52 * s, 0.22 * s, darken(paint.metal, 0.62), x, y, z, 14, true);
  addCyl(group, 0.32 * s, 0.38 * s, 0.9 * s, darken(paint.metal, 0.72), x, y, z - 0.58 * s, 12, true);
  addTo(group, 0.12 * s, 0.12 * s, 0.15 * s, paint.trim, x, y + 0.22 * s, z - 0.2 * s, { metal: true });
  const eng = addGlowCyl(group, 0.22 * s, 0.3 * s, 0.42 * s, paint.engine, x, y, z - 1.0 * s, opts.glowI, 12);
  addGlowCyl(group, 0.1 * s, 0.15 * s, 0.28 * s, paint.thruster, x, y, z - 1.32 * s, opts.glowI * 0.88, 10);
  onExhaust?.(new THREE.Vector3(x, y, z - 1.55 * s), s);
  return eng;
}

export function addSalvageGear(
  group: THREE.Group,
  hull: THREE.Object3D,
  shape: ShipShapeId,
  paint: ShipPaint,
  opts: AttachmentOpts,
  hooks: {
    onSpinner: (m: THREE.Object3D) => void;
    onClaw: (m: THREE.Mesh) => void;
  }
): THREE.Mesh {
  const box = getHullBounds(hull);
  const midY = (box.min.y + box.max.y) * 0.42;
  const topY = box.max.y * 0.72;
  const noseZ = box.max.z;
  const beamZ = box.max.z + 0.35;
  const rearZ = box.min.z - 0.15;
  const halfW = (box.max.x - box.min.x) * 0.38;

  switch (shape) {
    case "hauler":
      scannerDish(group, paint, 0, topY, noseZ * 0.72, opts, hooks.onSpinner, 0.85);
      miningLaser(group, paint, beamZ, opts);
      for (const side of [-1, 1]) {
        salvageClaw(group, paint, side * halfW * 0.85, midY, noseZ * 0.55, side, opts, hooks.onClaw);
      }
      break;
    case "wedge":
      addGlow(group, 0.08, 0.08, 0.45, paint.glow, 0, topY, noseZ * 0.92, opts.emI * 0.55);
      break;
    case "brick":
      scannerDish(group, paint, -halfW * 0.55, topY, noseZ * 0.55, opts, hooks.onSpinner, 0.7);
      break;
    case "needle":
      scannerDish(group, paint, 0, topY, noseZ * 0.42, opts, hooks.onSpinner, 0.55);
      addGlow(group, 0.1, 0.1, 0.35, paint.glow, 0, topY * 0.9, noseZ * 0.95, opts.emI * 0.65);
      break;
    case "hammer":
      for (const side of [-1, 1]) {
        salvageClaw(group, paint, side * halfW, midY, noseZ * 0.62, side, opts, hooks.onClaw);
        addGlow(group, 0.22, 0.22, 0.55, paint.trim, side * halfW * 1.1, topY, noseZ * 0.5, opts.trimI);
      }
      scannerDish(group, paint, 0, topY * 0.85, rearZ * 0.55, opts, hooks.onSpinner, 0.9);
      break;
  }

  if (opts.isPlayer) {
    for (const side of [-1, 1]) {
      addGlow(group, 0.06, 0.06, 0.14, paint.accent, side * halfW, midY, noseZ * 0.35, opts.trimI * 0.5);
    }
  }

  return addGlow(group, 0.12, 0.12, 0.12, paint.cockpit, 0, topY, noseZ * 0.58, opts.emI * 0.4);
}

export function addEngineGlows(
  group: THREE.Group,
  hull: THREE.Object3D,
  shape: ShipShapeId,
  paint: ShipPaint,
  opts: AttachmentOpts,
  onExhaust: (pos: THREE.Vector3, s: number) => void
): THREE.Mesh[] {
  const box = getHullBounds(hull);
  const rearZ = box.min.z - 0.2;
  const spread = Math.max(0.35, (box.max.x - box.min.x) * 0.12);
  const engScale = shape === "needle" ? 0.95 : shape === "brick" ? 1.05 : 0.9;

  if (shape === "needle") {
    const eng = engineUnit(group, paint, opts, 0, 0, rearZ, engScale, onExhaust);
    addGlowCyl(group, 0.14, 0.18, 0.5, paint.thruster, 0, 0, rearZ - 0.7, opts.glowI * 0.75, 10);
    return [eng];
  }

  const meshes: THREE.Mesh[] = [];
  for (const side of [-spread, spread]) {
    meshes.push(engineUnit(group, paint, opts, side, 0, rearZ, engScale, onExhaust));
  }
  return meshes;
}
