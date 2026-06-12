import * as THREE from "three";
import { getHullBounds } from "../assets/modelBounds";
import { kenneyReady } from "../assets/kenneyLoader";
import { polyyReady } from "../assets/polyyLoader";
import { buildShip } from "../entities/buildShip";
import { disposeShipContents } from "../entities/disposeShip";
import type { ShipAnimator } from "../entities/ShipAnimator";
import type { ShipPaint } from "../game/shipPaint";
import type { ShipShapeId } from "../game/shipShapes";
import { buildKenneyHangarStage } from "./kenneyStage";
import { buildPolyyHangarStage } from "./polyyHangar";

const KENNEY_PREVIEW: Record<ShipShapeId, { scale: number; distMul: number; yaw: number }> = {
  hauler: { scale: 1.05, distMul: 2.65, yaw: 0.72 },
  wedge: { scale: 1.2, distMul: 2.55, yaw: 0.62 },
  brick: { scale: 0.95, distMul: 2.75, yaw: 0.68 },
  needle: { scale: 1.15, distMul: 2.85, yaw: 0.58 },
  hammer: { scale: 0.92, distMul: 2.8, yaw: 0.75 },
};

const POLYY_PREVIEW: Record<ShipShapeId, { scale: number; distMul: number; yaw: number; fit: number }> = {
  hauler: { scale: 1.0, distMul: 2.9, yaw: 0.68, fit: 4.2 },
  wedge: { scale: 1.02, distMul: 2.75, yaw: 0.6, fit: 4.0 },
  brick: { scale: 0.98, distMul: 2.95, yaw: 0.7, fit: 4.3 },
  needle: { scale: 1.05, distMul: 3.0, yaw: 0.55, fit: 4.5 },
  hammer: { scale: 0.95, distMul: 3.05, yaw: 0.72, fit: 4.4 },
};

const SHIP_FLOOR_Y = 0.14;

function alignShipOnFloor(shipRoot: THREE.Group): { center: THREE.Vector3; radius: number } {
  shipRoot.updateMatrixWorld(true);
  const box = getHullBounds(shipRoot);
  const center = box.getCenter(new THREE.Vector3());
  shipRoot.position.set(-center.x, SHIP_FLOOR_Y - box.min.y, -center.z);
  shipRoot.updateMatrixWorld(true);
  const aligned = getHullBounds(shipRoot);
  const alignedCenter = aligned.getCenter(new THREE.Vector3());
  const sphere = new THREE.Sphere();
  aligned.getBoundingSphere(sphere);
  return { center: alignedCenter, radius: Math.max(1.8, sphere.radius) };
}

function buildProceduralStage(): THREE.Group {
  const stage = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 48),
    new THREE.MeshStandardMaterial({
      color: 0x1a2438,
      metalness: 0.85,
      roughness: 0.35,
      emissive: 0x0a1428,
      emissiveIntensity: 0.5,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  stage.add(floor);

  const grid = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 5.2, 32),
    new THREE.MeshBasicMaterial({
      color: 0x4488cc,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    })
  );
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = 0.01;
  stage.add(grid);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.04, 8, 48),
    new THREE.MeshStandardMaterial({
      color: 0x66aaff,
      emissive: 0x3388dd,
      emissiveIntensity: 0.9,
      metalness: 0.9,
      roughness: 0.2,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;
  stage.add(ring);

  const innerRing = ring.clone();
  (innerRing.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
  innerRing.scale.setScalar(0.55);
  stage.add(innerRing);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 12),
    new THREE.MeshBasicMaterial({
      color: 0x0a1020,
      transparent: true,
      opacity: 0.85,
    })
  );
  backdrop.position.set(0, 4, -6);
  stage.add(backdrop);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 8),
    new THREE.MeshBasicMaterial({
      color: 0x2244aa,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.position.set(0, 2.5, -5.5);
  stage.add(glow);

  return stage;
}

function buildHangarStage(): THREE.Group {
  if (polyyReady()) return buildPolyyHangarStage();
  if (kenneyReady()) return buildKenneyHangarStage();
  return buildProceduralStage();
}

export class Garage {
  group = new THREE.Group();
  private shipRoot = new THREE.Group();
  private shipAnimator: ShipAnimator | null = null;
  private shape: ShipShapeId = "hauler";
  private yaw = 0.65;
  private pitch = 0.38;
  private distance = 14;
  private targetYaw = 0.65;
  private targetPitch = 0.38;
  private targetDistance = 14;
  private autoRotate = true;
  private idleTimer = 0;
  private shipRadius = 3;
  private lookAt = new THREE.Vector3(0, 1.2, 0);
  private spot: THREE.SpotLight | null = null;

  constructor() {
    this.group.add(buildHangarStage());

    const ambient = new THREE.AmbientLight(0xc8d4f0, polyyReady() ? 0.55 : 0.55);
    this.group.add(ambient);

    const hemi = new THREE.HemisphereLight(0xe8f0ff, 0x283850, polyyReady() ? 1.45 : 1.1);
    this.group.add(hemi);

    const key = new THREE.DirectionalLight(0xfff8f0, polyyReady() ? 3.0 : 2.2);
    key.position.set(6, 12, 8);
    this.group.add(key);

    const fill = new THREE.DirectionalLight(0x88aaff, polyyReady() ? 1.35 : 0.9);
    fill.position.set(-7, 6, 6);
    this.group.add(fill);

    const rim = new THREE.DirectionalLight(0xaaccff, polyyReady() ? 2.0 : 1.4);
    rim.position.set(0, 5, -9);
    this.group.add(rim);

    if (polyyReady()) {
      const accent = new THREE.DirectionalLight(0x9966ff, 0.95);
      accent.position.set(5, 3, 4);
      this.group.add(accent);
    }

    const spot = new THREE.SpotLight(0xffffff, polyyReady() ? 3.8 : 2.8, 40, 0.36, 0.42, 1);
    spot.position.set(2, 14, 8);
    spot.target.position.set(0, 1.2, 0);
    this.spot = spot;
    this.group.add(spot);
    this.group.add(spot.target);

    const under = new THREE.PointLight(0x4488ff, polyyReady() ? 1.8 : 1.2, 16);
    under.position.set(0, 0.5, 2);
    this.group.add(under);

    const accent = new THREE.PointLight(polyyReady() ? 0xaa88ff : 0xffaa66, polyyReady() ? 0.65 : 0.35, 12);
    accent.position.set(-3, 3, 4);
    this.group.add(accent);

    this.shipRoot.position.set(0, 0, 0);
    this.group.add(this.shipRoot);
  }

  setShip(paint: ShipPaint, shape: ShipShapeId): void {
    this.shape = shape;
    const cfg = polyyReady() ? POLYY_PREVIEW[shape] : KENNEY_PREVIEW[shape];
    this.targetYaw = cfg.yaw;
    this.yaw = cfg.yaw;
    this.targetPitch = polyyReady() ? 0.36 : 0.34;

    disposeShipContents(this.shipRoot, this.shipAnimator);
    this.shipAnimator = null;

    this.shipRoot.scale.setScalar(1);
    this.shipRoot.rotation.set(0, 0, 0);
    this.shipRoot.position.set(0, 0, 0);

    const built = buildShip(this.shipRoot, paint, shape, true, true);
    this.shipAnimator = built.animator;
    this.fitShipToStage();
    this.frameCamera();
    this.shipAnimator.setHoverBase(this.shipRoot.position.y);
    if (this.spot) this.spot.target.position.copy(this.lookAt);
  }

  private fitShipToStage(): void {
    const hull = this.shipRoot.children[0];
    if (!hull) return;

    const cfg = polyyReady() ? POLYY_PREVIEW[this.shape] : KENNEY_PREVIEW[this.shape];
    const box = getHullBounds(hull);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const target = polyyReady() ? (POLYY_PREVIEW[this.shape].fit ?? 4.2) : 4.8;
    const fit = maxDim > 0.01 ? THREE.MathUtils.clamp(target / maxDim, 0.25, 2.5) : 1;
    this.shipRoot.scale.setScalar(cfg.scale * fit);

    const aligned = alignShipOnFloor(this.shipRoot);
    this.lookAt.copy(aligned.center);
    this.shipRadius = aligned.radius;
  }

  private frameCamera(): void {
    const cfg = polyyReady() ? POLYY_PREVIEW[this.shape] : KENNEY_PREVIEW[this.shape];
    const dist = this.shipRadius * cfg.distMul;
    this.targetDistance = dist;
    this.distance = dist;
  }

  onDrag(dx: number, dy: number): void {
    this.autoRotate = false;
    this.idleTimer = 0;
    this.targetYaw += dx * 0.008;
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dy * 0.005, 0.22, 0.52);
  }

  onZoom(delta: number): void {
    this.autoRotate = false;
    this.idleTimer = 0;
    const min = this.shipRadius * 1.85;
    const max = this.shipRadius * 4.2;
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + delta * 0.02, min, max);
  }

  resetView(): void {
    const cfg = polyyReady() ? POLYY_PREVIEW[this.shape] : KENNEY_PREVIEW[this.shape];
    this.targetYaw = cfg.yaw;
    this.targetPitch = polyyReady() ? 0.36 : 0.34;
    this.frameCamera();
    this.autoRotate = true;
  }

  getCameraPose(): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
    const position = new THREE.Vector3(
      this.distance * Math.sin(this.yaw) * Math.cos(this.pitch),
      this.lookAt.y + this.distance * Math.sin(this.pitch),
      this.distance * Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    return { position, lookAt: this.lookAt.clone() };
  }

  update(dt: number): void {
    if (this.autoRotate) {
      this.targetYaw += dt * 0.1;
    } else {
      this.idleTimer += dt;
      if (this.idleTimer > 4) this.autoRotate = true;
    }

    this.yaw = THREE.MathUtils.lerp(this.yaw, this.targetYaw, 1 - Math.pow(0.001, dt));
    this.pitch = THREE.MathUtils.lerp(this.pitch, this.targetPitch, 1 - Math.pow(0.001, dt));
    this.distance = THREE.MathUtils.lerp(this.distance, this.targetDistance, 1 - Math.pow(0.001, dt));

    this.shipAnimator?.update(dt, { preview: true, hover: true, speed: 8 });
  }
}
