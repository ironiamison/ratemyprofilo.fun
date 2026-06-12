import * as THREE from "three";
import { buildShip } from "./buildShip";
import type { ShipAnimator } from "./ShipAnimator";
import { cargoMax, cargoWeight, hullMax } from "../game/economy";
import type { ShipPaint } from "../game/shipPaint";
import type { ShipShapeId } from "../game/shipShapes";
import type { Faction, PlayerSave, ShipUpgrades } from "../game/types";
import type { Input } from "../game/Input";
import { getShapeFlightMods } from "../game/shipPhysics";

export class Ship {
  group = new THREE.Group();
  position = new THREE.Vector3(0, 0, 40);
  velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  private shape: ShipShapeId;
  private animator: ShipAnimator;
  laserBeam: THREE.Mesh | null = null;

  constructor(paint: ShipPaint, shape: ShipShapeId, isPlayer = true) {
    this.shape = shape;
    const built = buildShip(this.group, paint, shape, isPlayer);
    this.animator = built.animator;
    this.group.position.copy(this.position);
  }

  getForward(): THREE.Vector3 {
    return new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    );
  }

  updateFlight(input: Input, dt: number, save: PlayerSave, faction: Faction, training = false): void {
    const engineLvl = save.upgrades.engine;
    const mods = getShapeFlightMods(this.shape);
    const thrust = (42 + engineLvl * 10) * mods.thrustMul;
    const turn = (2.5 + engineLvl * 0.2) * mods.turnMul;
    const hasFuel = training || save.fuel > 0;
    const boostMul = input.boost && hasFuel ? 2.1 : 1;

    if (input.left) this.yaw += turn * dt;
    if (input.right) this.yaw -= turn * dt;
    if (input.pitchUp) this.pitch = Math.min(0.8, this.pitch + turn * dt);
    else if (input.pitchDown) this.pitch = Math.max(-0.8, this.pitch - turn * dt);
    else this.pitch = THREE.MathUtils.lerp(this.pitch, 0, 1 - Math.pow(0.0005, dt));

    if (input.forward && hasFuel) {
      this.velocity.add(this.getForward().multiplyScalar(thrust * boostMul * dt));
      if (!training) {
        save.fuel = Math.max(0, save.fuel - dt * (input.boost ? 4 : 1) / faction.fuelBonus);
      }
    }
    if (input.back && hasFuel) {
      this.velocity.add(this.getForward().multiplyScalar(-thrust * 0.4 * dt));
    }
    if (input.strafeUp) this.velocity.y += 18 * dt;

    this.velocity.multiplyScalar(input.forward || input.back ? 0.988 : 0.982);
    const maxSpeed = (52 + engineLvl * 8) * mods.speedMul * boostMul;
    if (this.velocity.length() > maxSpeed) this.velocity.setLength(maxSpeed);

    this.position.add(this.velocity.clone().multiplyScalar(dt));
    this.group.position.copy(this.position);
    this.group.rotation.set(this.pitch, this.yaw, 0, "YXZ");

    const speed = this.velocity.length();
    const boost = input.boost && save.fuel > 0;
    this.animator.update(dt, { speed, boost });
  }

  showLaser(target: THREE.Vector3, active: boolean): void {
    if (!active) {
      if (this.laserBeam) this.laserBeam.visible = false;
      return;
    }

    const localTarget = target.clone().sub(this.position);
    const dist = localTarget.length();
    if (!this.laserBeam) {
      const geo = new THREE.CylinderGeometry(0.05, 0.1, 1, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffcc55,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.laserBeam = new THREE.Mesh(geo, mat);
      this.laserBeam.rotation.x = Math.PI / 2;
      this.group.add(this.laserBeam);
    }
    this.laserBeam.visible = true;
    const mat = this.laserBeam.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.55 + Math.sin(Date.now() * 0.02) * 0.2;
    this.laserBeam.position.copy(localTarget.clone().multiplyScalar(0.45));
    this.laserBeam.scale.set(1.1, dist * 0.9, 1.1);
    this.laserBeam.lookAt(localTarget);
  }

  getCargoMax(upgrades: ShipUpgrades, faction: Faction): number {
    return cargoMax(upgrades, faction.id);
  }

  getCargoUsed(cargo: PlayerSave["cargo"]): number {
    return cargoWeight(cargo);
  }

  getHullMax(upgrades: ShipUpgrades, faction: Faction): number {
    return hullMax(upgrades, faction.id);
  }

  getScanRange(upgrades: ShipUpgrades): number {
    return 60 + upgrades.scanner * 40;
  }

  tickAnimations(dt: number, state: { speed?: number; boost?: boolean; preview?: boolean; hover?: boolean } = {}): void {
    this.animator.update(dt, state);
  }
}
