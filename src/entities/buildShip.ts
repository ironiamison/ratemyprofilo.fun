import * as THREE from "three";
import { cloneKenney, kenneyReady, KENNEY_SHIPS, tintKenneyModel } from "../assets/kenneyLoader";
import { clonePolyy, polyyReady, POLYY_SHIPS, tintPolyyModel } from "../assets/polyyLoader";
import { EngineExhaust } from "../effects/EngineExhaust";
import type { ShipShapeId } from "../game/shipShapes";
import type { ShipPaint } from "../game/shipPaint";
import { addSalvageGear, addEngineGlows } from "./shipAttachments";
import { ShipAnimator } from "./ShipAnimator";
import { addAngled, addCyl, addGlass, addGlow, addGlowCyl, addTo, darken } from "../utils/voxel";

export interface BuiltShip {
  engineMeshes: THREE.Mesh[];
  cockpitGlow: THREE.Mesh;
  animator: ShipAnimator;
}

interface BuildOpts {
  glowI: number;
  trimI: number;
  emI: number;
  preview: boolean;
  isPlayer: boolean;
}

interface BuildCtx {
  animator: ShipAnimator;
  exhausts: EngineExhaust[];
}

function brightenShip(group: THREE.Group): void {
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const m = obj.material as THREE.MeshStandardMaterial;
    if (!m.emissive) return;
    if (m.emissiveIntensity < 0.5) {
      m.emissive.copy(new THREE.Color(m.color)).multiplyScalar(0.32);
      m.emissiveIntensity = Math.max(m.emissiveIntensity, 0.4);
    }
  });
}

function cockpitBlock(
  group: THREE.Group,
  paint: ShipPaint,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  opts: BuildOpts
): THREE.Mesh {
  addTo(group, w + 0.12, h + 0.08, d + 0.1, darken(paint.metal, 0.75), x, y - 0.03, z, { metal: true });
  addTo(group, w + 0.04, 0.06, d + 0.04, paint.trim, x, y + h * 0.55, z - d * 0.15);
  const glass = addGlass(group, w, h, d, paint.cockpit, x, y, z);
  addGlow(group, 0.04, 0.04, d * 0.7, paint.glow, x - w * 0.42, y + h * 0.2, z, opts.emI * 0.35);
  addGlow(group, 0.04, 0.04, d * 0.7, paint.glow, x + w * 0.42, y + h * 0.2, z, opts.emI * 0.35);
  return glass;
}

function panelLine(group: THREE.Group, paint: ShipPaint, x: number, y: number, z: number, w: number, d: number): void {
  addTo(group, w, 0.035, d, darken(paint.hull, 0.5), x, y, z);
  addTo(group, w * 0.85, 0.02, d * 0.9, darken(paint.trim, 0.6), x, y + 0.02, z);
}

function rivetRow(group: THREE.Group, paint: ShipPaint, x: number, y: number, z: number, count: number, spacing: number): void {
  for (let i = 0; i < count; i++) {
    addCyl(group, 0.03, 0.03, 0.02, darken(paint.metal, 0.8), x, y, z + (i - count / 2) * spacing, 6, true);
  }
}

function salvageClaw(
  group: THREE.Group,
  paint: ShipPaint,
  ctx: BuildCtx,
  x: number,
  y: number,
  z: number,
  spread: number,
  opts: BuildOpts
): void {
  const arm = darken(paint.metal, 0.68);
  addCyl(group, 0.06, 0.08, 0.45, arm, x, y + 0.1, z, 8, true);
  const clawL = addAngled(group, 0.07, 0.28, 0.45, paint.trim, x + spread * 0.2, y + 0.15, z + 0.25, spread * 0.55, 0.15);
  const clawR = addAngled(group, 0.07, 0.28, 0.45, paint.trim, x - spread * 0.2, y + 0.15, z + 0.25, -spread * 0.55, -0.15);
  ctx.animator.registerClaw(clawL);
  ctx.animator.registerClaw(clawR);
  addGlow(group, 0.06, 0.06, 0.06, paint.accent, x, y + 0.38, z + 0.1, opts.trimI * 0.45);
}

function scannerDish(
  group: THREE.Group,
  paint: ShipPaint,
  ctx: BuildCtx,
  x: number,
  y: number,
  z: number,
  opts: BuildOpts,
  size = 1
): void {
  const s = size;
  addCyl(group, 0.03 * s, 0.03 * s, 0.35 * s, paint.metal, x, y, z, 8, true);
  const dish = addCyl(group, 0.28 * s, 0.24 * s, 0.07 * s, darken(paint.hull, 0.82), x, y + 0.38 * s, z, 16);
  ctx.animator.registerSpinner(dish);
  addGlow(group, 0.14 * s, 0.035 * s, 0.14 * s, paint.glow, x, y + 0.44 * s, z, opts.emI * 0.55);
}

function miningLaser(group: THREE.Group, paint: ShipPaint, z: number, opts: BuildOpts): void {
  addCyl(group, 0.14, 0.18, 0.35, darken(paint.metal, 0.7), 0, 0.08, z, 10, true);
  addCyl(group, 0.08, 0.1, 0.55, darken(paint.metal, 0.55), 0, 0.05, z + 0.45, 8, true);
  addGlowCyl(group, 0.05, 0.07, 0.25, paint.glow, 0, 0.02, z + 0.82, opts.glowI * 0.7, 8);
}

function engineUnit(
  group: THREE.Group,
  paint: ShipPaint,
  ctx: BuildCtx,
  opts: BuildOpts,
  x: number,
  y: number,
  z: number,
  scale = 1
): THREE.Mesh {
  const s = scale;
  addCyl(group, 0.44 * s, 0.52 * s, 0.22 * s, darken(paint.metal, 0.62), x, y, z, 14, true);
  addCyl(group, 0.32 * s, 0.38 * s, 0.9 * s, darken(paint.metal, 0.72), x, y, z - 0.58 * s, 12, true);
  addTo(group, 0.12 * s, 0.12 * s, 0.15 * s, paint.trim, x, y + 0.22 * s, z - 0.2 * s, { metal: true });
  const eng = addGlowCyl(group, 0.22 * s, 0.3 * s, 0.42 * s, paint.engine, x, y, z - 1.0 * s, opts.glowI, 12);
  addGlowCyl(group, 0.1 * s, 0.15 * s, 0.28 * s, paint.thruster, x, y, z - 1.32 * s, opts.glowI * 0.88, 10);
  const exhaust = new EngineExhaust(
    group,
    new THREE.Vector3(x, y, z - 1.55 * s),
    paint.engine,
    paint.thruster,
    s
  );
  ctx.exhausts.push(exhaust);
  ctx.animator.registerExhaust(exhaust);
  return eng;
}

function twinEngines(
  group: THREE.Group,
  paint: ShipPaint,
  ctx: BuildCtx,
  opts: BuildOpts,
  z: number,
  spread = 0.55,
  scale = 1
): THREE.Mesh[] {
  const engineMeshes: THREE.Mesh[] = [];
  for (const side of [-spread, spread]) {
    engineMeshes.push(engineUnit(group, paint, ctx, opts, side, 0, z, scale));
  }
  addTo(group, 1.1 * scale, 0.14 * scale, 0.35 * scale, darken(paint.metal, 0.8), 0, 0.08 * scale, z - 0.15 * scale, { metal: true });
  return engineMeshes;
}

function playerExtras(group: THREE.Group, paint: ShipPaint, opts: BuildOpts): void {
  if (!opts.isPlayer) return;
  for (const side of [-1, 1]) {
    addGlow(group, 0.06, 0.06, 0.14, paint.accent, side * 2.15, 0.48, 0.15, opts.trimI * 0.5);
    addAngled(group, 0.04, 0.35, 0.08, paint.trim, side * 2.05, 0.25, -0.4, side * 0.2);
  }
  addTo(group, 0.55, 0.05, 1.25, paint.hull, 0, 0.68, -0.75, {
    emissive: paint.accent,
    emissiveIntensity: opts.preview ? 0.1 : 0.22,
  });
}

function cargoPod(
  group: THREE.Group,
  paint: ShipPaint,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number
): void {
  addTo(group, w, h, d, darken(paint.hull, 0.88), x, y, z);
  addTo(group, w * 0.92, 0.07, d * 0.92, paint.trim, x, y + h * 0.35, z);
  panelLine(group, paint, x, y + h * 0.55, z, w * 0.7, d * 0.5);
  addGlow(group, 0.07, 0.07, 0.07, paint.accent, x, y + h * 0.88, z + d * 0.38, 0.38);
}

function buildHauler(group: THREE.Group, paint: ShipPaint, ctx: BuildCtx, opts: BuildOpts): BuiltShip {
  const wingDark = darken(paint.wings, 0.7);
  addTo(group, 2.0, 0.38, 5.8, paint.chassis, 0, -0.12, 0.15);
  addTo(group, 2.8, 0.58, 4.4, paint.hull, 0, 0.18, 0.45);
  addTo(group, 1.7, 0.48, 2.9, paint.hull2, 0, 0.48, -0.55);
  panelLine(group, paint, 0, 0.46, 0.25, 2.2, 3.8);
  rivetRow(group, paint, -1.1, 0.42, 0.8, 4, 0.55);
  const cockpit = cockpitBlock(group, paint, 0, 0.82, 1.35, 1.15, 0.58, 1.45, opts);
  scannerDish(group, paint, ctx, 0, 0.95, 2.35, opts, 0.85);
  miningLaser(group, paint, 3.15, opts);
  for (const side of [-1, 1]) {
    cargoPod(group, paint, side * 2.15, 0.05, -0.15, 0.75, 0.55, 1.6);
    cargoPod(group, paint, side * 2.15, 0.05, -1.95, 0.65, 0.45, 1.2);
    addTo(group, 0.28, 0.22, 3.0, paint.metal, side * 2.05, 0.12, 0.15, { metal: true });
    addTo(group, 1.5, 0.14, 2.4, paint.wings, side * 1.9, 0.22, -0.45);
    addAngled(group, 0.55, 0.1, 1.35, wingDark, side * 2.35, 0.38, -1.75, side * 0.25);
    addGlow(group, 0.16, 0.16, 0.65, paint.trim, side * 2.35, 0.45, -2.35, opts.trimI);
    salvageClaw(group, paint, ctx, side * 1.55, 0.35, 2.05, side, opts);
  }
  addTo(group, 0.55, 0.38, 0.85, darken(paint.metal, 0.65), 0, 0.58, 2.65, { metal: true });
  addTo(group, 3.0, 0.1, 0.55, paint.metal, 0, 0.22, 2.95, { metal: true });
  const engineMeshes = twinEngines(group, paint, ctx, opts, -2.15, 0.58, 1.05);
  playerExtras(group, paint, opts);
  return { engineMeshes, cockpitGlow: cockpit, animator: ctx.animator };
}

function buildWedge(group: THREE.Group, paint: ShipPaint, ctx: BuildCtx, opts: BuildOpts): BuiltShip {
  const wingDark = darken(paint.wings, 0.75);
  addTo(group, 1.25, 0.32, 6.8, paint.chassis, 0, -0.16, 0);
  addTo(group, 2.35, 0.28, 4.8, paint.hull, 0, 0.06, 0.75);
  addTo(group, 1.5, 0.22, 3.1, paint.hull2, 0, 0.14, -0.75);
  addTo(group, 0.55, 0.38, 2.4, paint.hull, 0, 0.22, 2.35);
  panelLine(group, paint, 0, 0.2, 1.2, 1.4, 2.5);
  const cockpit = cockpitBlock(group, paint, 0, 0.58, 2.55, 0.8, 0.48, 1.05, opts);
  addGlow(group, 0.08, 0.08, 0.45, paint.glow, 0, 0.58, 3.25, opts.emI * 0.55);
  for (const side of [-1, 1]) {
    addAngled(group, 2.6, 0.09, 3.0, paint.wings, side * 1.05, 0.18, -0.15, side * 0.18);
    addAngled(group, 1.8, 0.07, 2.0, darken(paint.wings, 0.72), side * 1.65, 0.32, -1.55, side * 0.32);
    addAngled(group, 0.9, 0.05, 1.2, wingDark, side * 2.05, 0.42, -2.55, side * 0.45);
    addGlow(group, 0.13, 0.13, 0.55, paint.trim, side * 2.15, 0.36, -2.95, opts.trimI);
    addTo(group, 0.35, 0.18, 0.9, darken(paint.metal, 0.75), side * 0.75, 0.05, 0.5, { metal: true });
  }
  addTo(group, 3.4, 0.07, 0.45, paint.metal, 0, 0.2, -2.85, { metal: true });
  addCyl(group, 0.08, 0.1, 0.5, paint.trim, 0, 0.35, 3.5, 8, true);
  const engineMeshes = twinEngines(group, paint, ctx, opts, -3.35, 0.42, 0.95);
  playerExtras(group, paint, opts);
  return { engineMeshes, cockpitGlow: cockpit, animator: ctx.animator };
}

function buildBrick(group: THREE.Group, paint: ShipPaint, ctx: BuildCtx, opts: BuildOpts): BuiltShip {
  addTo(group, 3.0, 0.75, 4.8, paint.hull, 0, 0.12, 0);
  addTo(group, 2.4, 0.38, 3.9, paint.hull2, 0, 0.58, 0.15);
  addTo(group, 1.7, 0.28, 2.3, paint.chassis, 0, -0.22, -0.45);
  panelLine(group, paint, 0, 0.52, 0.5, 2.4, 3.2);
  rivetRow(group, paint, 0, 0.48, -0.8, 5, 0.5);
  addTo(group, 1.5, 0.14, 1.7, paint.metal, -0.95, 0.75, 0.55, { metal: true });
  addTo(group, 1.05, 0.12, 1.25, paint.wings, 0.75, 0.82, -0.25);
  addTo(group, 0.75, 0.1, 0.95, darken(paint.metal, 0.68), -0.32, 0.92, 0.85, { metal: true });
  const cockpit = cockpitBlock(group, paint, 0, 0.58, 1.85, 0.95, 0.52, 1.15, opts);
  scannerDish(group, paint, ctx, -0.85, 0.88, 1.1, opts, 0.7);
  for (const side of [-1, 1]) {
    addCyl(group, 0.35, 0.38, 1.5, darken(paint.metal, 0.7), side * 2.05, -0.15, -0.8, 10, true);
    addCyl(group, 0.32, 0.35, 0.2, paint.trim, side * 2.05, 0.65, -0.8, 10, true);
    addTo(group, 0.58, 0.58, 1.85, darken(paint.metal, 0.62), side * 1.9, -0.02, -1.15, { metal: true });
    addTo(group, 0.38, 0.28, 1.45, paint.wings, side * 2.2, 0.18, 0.35);
    addGlow(group, 0.1, 0.1, 0.1, paint.accent, side * 2.2, 0.55, 1.05, opts.trimI * 0.4);
  }
  addTo(group, 2.5, 0.12, 0.4, paint.metal, 0, 0.38, 2.55, { metal: true });
  cargoPod(group, paint, 0, 0.02, -2.05, 1.2, 0.5, 1.0);
  const engineMeshes = twinEngines(group, paint, ctx, opts, -2.65, 0.72, 1.1);
  playerExtras(group, paint, opts);
  return { engineMeshes, cockpitGlow: cockpit, animator: ctx.animator };
}

function buildNeedle(group: THREE.Group, paint: ShipPaint, ctx: BuildCtx, opts: BuildOpts): BuiltShip {
  addTo(group, 0.95, 0.95, 7.8, paint.hull, 0, 0, 0);
  addTo(group, 0.68, 0.68, 5.8, paint.hull2, 0, 0.06, -0.85);
  addTo(group, 0.48, 0.48, 3.2, paint.chassis, 0, 0.1, -2.55);
  panelLine(group, paint, 0, 0.52, -0.5, 0.35, 4.5);
  panelLine(group, paint, 0, 0.38, -2.2, 0.28, 2.8);
  const cockpit = cockpitBlock(group, paint, 0, 0.38, 3.85, 0.58, 0.42, 0.95, opts);
  addCyl(group, 0.06, 0.08, 1.8, paint.metal, 0, 0.35, 5.2, 8, true);
  addGlow(group, 0.1, 0.1, 0.35, paint.glow, 0, 0.35, 6.15, opts.emI * 0.65);
  addAngled(group, 0.12, 0.12, 0.9, paint.trim, 0, 0.32, 6.55, 0, 0);
  for (const side of [-1, 1]) {
    addAngled(group, 0.1, 0.38, 1.7, paint.wings, side * 0.58, 0.06, -0.45, side * 0.12);
    addTo(group, 0.07, 0.22, 0.85, paint.metal, side * 0.72, 0.14, -1.85, { metal: true });
    addGlow(group, 0.07, 0.07, 0.38, paint.glow, side * 0.78, 0.22, -2.25, opts.trimI * 0.75);
    addAngled(group, 0.05, 0.45, 0.12, paint.trim, side * 0.52, 0.55, 1.2, side * 0.35);
  }
  scannerDish(group, paint, ctx, 0, 0.72, 1.5, opts, 0.55);
  addTo(group, 0.22, 0.22, 1.55, paint.metal, 0, -0.38, 0.45, { metal: true });
  const engineMeshes: THREE.Mesh[] = [];
  engineMeshes.push(engineUnit(group, paint, ctx, opts, 0, 0, -4.35, 1.15));
  addGlowCyl(group, 0.14, 0.18, 0.5, paint.thruster, 0, 0, -5.05, opts.glowI * 0.75, 10);
  playerExtras(group, paint, opts);
  return { engineMeshes, cockpitGlow: cockpit, animator: ctx.animator };
}

function buildHammer(group: THREE.Group, paint: ShipPaint, ctx: BuildCtx, opts: BuildOpts): BuiltShip {
  addTo(group, 5.2, 0.38, 1.5, paint.hull, 0, 0.22, 1.85);
  addTo(group, 1.45, 0.58, 5.0, paint.hull2, 0, 0.12, -0.45);
  addTo(group, 1.05, 0.42, 3.3, paint.chassis, 0, -0.06, -0.15);
  panelLine(group, paint, 0, 0.42, 1.5, 4.5, 0.8);
  rivetRow(group, paint, -2.2, 0.38, 1.85, 6, 0.45);
  const cockpit = cockpitBlock(group, paint, 0, 0.68, 0.85, 1.05, 0.52, 1.25, opts);
  addTo(group, 0.12, 0.48, 1.25, paint.glow, -0.48, 0.68, 0.95, { emissive: paint.glow, emissiveIntensity: opts.emI });
  addTo(group, 0.12, 0.48, 1.25, paint.glow, 0.48, 0.68, 0.95, { emissive: paint.glow, emissiveIntensity: opts.emI });
  for (const side of [-1, 1]) {
    addTo(group, 1.25, 0.28, 2.1, paint.wings, side * 3.05, 0.28, 1.55);
    addTo(group, 0.45, 0.16, 1.7, darken(paint.wings, 0.68), side * 3.05, 0.45, 0.25);
    addGlow(group, 0.22, 0.22, 0.55, paint.trim, side * 3.05, 0.55, 2.25, opts.trimI);
    addCyl(group, 0.12, 0.14, 0.6, paint.metal, side * 3.05, 0.62, 2.55, 8, true);
    addGlow(group, 0.08, 0.08, 0.08, paint.accent, side * 3.05, 0.95, 2.55, opts.trimI * 0.5);
    salvageClaw(group, paint, ctx, side * 2.35, 0.42, 2.85, side, opts);
    addTo(group, 0.38, 0.38, 1.25, paint.metal, side * 1.05, 0.06, -2.15, { metal: true });
  }
  addCyl(group, 0.2, 0.22, 0.8, darken(paint.metal, 0.7), 0, 0.15, -2.65, 10, true);
  addTo(group, 2.3, 0.14, 0.65, paint.metal, 0, 0.35, -2.85, { metal: true });
  scannerDish(group, paint, ctx, 0, 0.55, -1.85, opts, 0.9);
  const engineMeshes = twinEngines(group, paint, ctx, opts, -3.05, 0.88, 1.05);
  playerExtras(group, paint, opts);
  return { engineMeshes, cockpitGlow: cockpit, animator: ctx.animator };
}

const BUILDERS: Record<ShipShapeId, (g: THREE.Group, p: ShipPaint, c: BuildCtx, o: BuildOpts) => BuiltShip> = {
  hauler: buildHauler,
  wedge: buildWedge,
  brick: buildBrick,
  needle: buildNeedle,
  hammer: buildHammer,
};

function buildModelHybrid(
  group: THREE.Group,
  paint: ShipPaint,
  shape: ShipShapeId,
  isPlayer: boolean,
  opts: BuildOpts,
  source: "polyy" | "kenney"
): BuiltShip {
  const animator = new ShipAnimator(group);
  const hull =
    source === "polyy"
      ? (() => {
          const h = clonePolyy(POLYY_SHIPS[shape]);
          tintPolyyModel(h, paint.hull, isPlayer ? 0.32 : 0.22);
          return h;
        })()
      : (() => {
          const h = cloneKenney(KENNEY_SHIPS[shape]);
          tintKenneyModel(h, paint.hull, isPlayer ? 0.5 : 0.35);
          return h;
        })();
  group.add(hull);

  const onExhaust = (pos: THREE.Vector3, s: number) => {
    const ex = new EngineExhaust(group, pos, paint.engine, paint.thruster, s);
    animator.registerExhaust(ex);
  };

  const cockpitGlow = addSalvageGear(group, hull, shape, paint, opts, {
    onSpinner: (m) => animator.registerSpinner(m),
    onClaw: (m) => animator.registerClaw(m),
  });
  const engineMeshes = addEngineGlows(group, hull, shape, paint, opts, onExhaust);
  animator.registerEngines(engineMeshes);
  if (isPlayer) brightenShip(group);
  return { engineMeshes, cockpitGlow, animator };
}

export function buildShip(
  group: THREE.Group,
  paint: ShipPaint,
  shape: ShipShapeId,
  isPlayer: boolean,
  preview = false
): BuiltShip {
  const opts: BuildOpts = {
    glowI: isPlayer ? 0.85 : 0.55,
    trimI: isPlayer ? 0.52 : 0.4,
    emI: isPlayer ? 0.35 : 0.22,
    preview,
    isPlayer,
  };

  if (polyyReady()) return buildModelHybrid(group, paint, shape, isPlayer, opts, "polyy");
  if (kenneyReady()) return buildModelHybrid(group, paint, shape, isPlayer, opts, "kenney");

  const animator = new ShipAnimator(group);
  const ctx: BuildCtx = { animator, exhausts: [] };
  const built = BUILDERS[shape](group, paint, ctx, opts);
  animator.registerEngines(built.engineMeshes);
  if (isPlayer) brightenShip(group);
  return built;
}
