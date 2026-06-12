import * as THREE from "three";
import type { EngineExhaust } from "../effects/EngineExhaust";
import { COLORS } from "../utils/voxel";

export interface ShipAnimState {
  speed?: number;
  boost?: boolean;
  preview?: boolean;
  hover?: boolean;
}

export class ShipAnimator {
  private engineMeshes: THREE.Mesh[] = [];
  private exhausts: EngineExhaust[] = [];
  private spinners: THREE.Object3D[] = [];
  private claws: THREE.Object3D[] = [];
  private root: THREE.Object3D;
  private hoverBaseY = 0;
  private t = 0;

  constructor(root: THREE.Object3D) {
    this.root = root;
    this.hoverBaseY = root.position.y;
  }

  registerEngines(meshes: THREE.Mesh[]): void {
    this.engineMeshes = meshes;
  }

  registerExhaust(exhaust: EngineExhaust): void {
    this.exhausts.push(exhaust);
  }

  registerSpinner(obj: THREE.Object3D): void {
    this.spinners.push(obj);
  }

  registerClaw(obj: THREE.Object3D): void {
    this.claws.push(obj);
    obj.userData.clawBaseRot = obj.rotation.z;
  }

  setHoverBase(y: number): void {
    this.hoverBaseY = y;
  }

  update(dt: number, state: ShipAnimState = {}): void {
    this.t += dt;
    const speed = state.speed ?? 0;
    const boost = state.boost ?? false;
    const preview = state.preview ?? false;
    const hover = state.hover ?? false;

    const thrust = preview
      ? 0.45 + Math.sin(this.t * 2.2) * 0.08
      : 0.35 + Math.min(1, speed / 22) * (boost ? 1.4 : 0.85);

    for (const eng of this.engineMeshes) {
      const m = eng.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.55 + thrust * 1.8;
      m.emissive.setHex(boost ? COLORS.engineHot : COLORS.engine);
    }

    for (const exhaust of this.exhausts) {
      exhaust.update(dt, thrust);
    }

    for (const spinner of this.spinners) {
      spinner.rotation.y += dt * 1.6;
    }

    for (let i = 0; i < this.claws.length; i++) {
      const claw = this.claws[i];
      const base = (claw.userData.clawBaseRot as number) ?? 0;
      claw.rotation.z = base + Math.sin(this.t * 1.8 + i * 1.2) * 0.12;
    }

    if (hover) {
      this.root.position.y = this.hoverBaseY + Math.sin(this.t * 1.4) * 0.06;
    }
  }

  dispose(): void {
    for (const exhaust of this.exhausts) exhaust.dispose();
    this.exhausts = [];
    this.engineMeshes = [];
    this.spinners = [];
    this.claws = [];
  }
}
