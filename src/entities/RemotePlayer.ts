import * as THREE from "three";
import { EngineTrail } from "../effects/EngineTrail";
import type { NetShipSnapshot } from "../net/types";
import { Ship } from "./Ship";

export class RemotePlayer {
  ship: Ship;
  trail: EngineTrail;
  readonly name: string;
  private target = {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    boosting: false,
  };
  staleSec = 0;

  constructor(snap: NetShipSnapshot, sceneRoot: THREE.Group) {
    this.name = snap.name || "Scavenger";
    this.ship = new Ship(snap.paint, snap.shape, false);
    this.trail = new EngineTrail(sceneRoot);
    this.applySnapshot(snap, true);
  }

  applySnapshot(snap: NetShipSnapshot, instant = false): void {
    this.target.x = snap.x;
    this.target.y = snap.y;
    this.target.z = snap.z;
    this.target.yaw = snap.yaw;
    this.target.pitch = snap.pitch;
    this.target.vx = snap.vx;
    this.target.vy = snap.vy;
    this.target.vz = snap.vz;
    this.target.boosting = snap.boosting;
    this.staleSec = 0;
    if (instant) this.syncShip(true);
  }

  private syncShip(instant: boolean): void {
    const t = this.target;
    if (instant) {
      this.ship.position.set(t.x, t.y, t.z);
      this.ship.yaw = t.yaw;
      this.ship.pitch = t.pitch;
      this.ship.velocity.set(t.vx, t.vy, t.vz);
    } else {
      const lerp = 0.28;
      this.ship.position.lerp(new THREE.Vector3(t.x, t.y, t.z), lerp);
      this.ship.yaw = THREE.MathUtils.lerp(this.ship.yaw, t.yaw, lerp);
      this.ship.pitch = THREE.MathUtils.lerp(this.ship.pitch, t.pitch, lerp);
      this.ship.velocity.lerp(new THREE.Vector3(t.vx, t.vy, t.vz), lerp);
    }
    this.ship.group.position.copy(this.ship.position);
    this.ship.group.rotation.set(this.ship.pitch, this.ship.yaw, 0, "YXZ");
  }

  update(dt: number): void {
    this.staleSec += dt;
    this.syncShip(false);
    const spd = this.ship.velocity.length();
    this.ship.tickAnimations(dt, { speed: spd, boost: this.target.boosting });
    this.trail.emit(this.ship.position, this.ship.getForward(), spd, this.target.boosting);
    this.trail.update(dt);
  }
}
