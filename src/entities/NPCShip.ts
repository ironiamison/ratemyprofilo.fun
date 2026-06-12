import * as THREE from "three";
import { applySkin } from "../game/shipPaint";
import type { ShipShapeId } from "../game/shipShapes";
import type { FactionId } from "../game/types";
import { EngineTrail } from "../effects/EngineTrail";
import { Ship } from "./Ship";

const NPC_SHAPES: ShipShapeId[] = ["needle", "wedge", "hauler", "brick", "hammer"];

const FACTION_SKINS: Record<FactionId, string> = {
  syndicate: "goldrush",
  voidwalkers: "midnight",
  ironcorps: "classic",
};

export class NPCShip {
  ship: Ship;
  trail: EngineTrail;
  path: THREE.Vector3[];
  pathIndex = 0;
  wait = 0;
  name: string;
  speed: number;
  faction: FactionId;

  constructor(
    factionId: FactionId,
    shape: ShipShapeId,
    path: THREE.Vector3[],
    name: string,
    sceneRoot: THREE.Group,
    speed = 16 + Math.random() * 8
  ) {
    const npcPaint = applySkin(FACTION_SKINS[factionId]);
    this.ship = new Ship(npcPaint, shape, false);
    this.trail = new EngineTrail(sceneRoot);
    this.path = path;
    this.name = name;
    this.speed = speed;
    this.faction = factionId;
    this.ship.position.copy(path[0]);
    this.ship.group.position.copy(path[0]);
  }

  static shapeForIndex(i: number): ShipShapeId {
    return NPC_SHAPES[i % NPC_SHAPES.length];
  }

  update(dt: number): void {
    if (this.wait > 0) {
      this.wait -= dt;
      this.trail.update(dt);
      return;
    }

    const target = this.path[this.pathIndex];
    const dir = target.clone().sub(this.ship.position);
    const dist = dir.length();

    if (dist < 3) {
      this.pathIndex = (this.pathIndex + 1) % this.path.length;
      if (this.pathIndex === 0) this.wait = 1.5 + Math.random() * 2.5;
      this.trail.update(dt);
      return;
    }

    dir.normalize();
    this.ship.yaw = Math.atan2(dir.x, dir.z);
    this.ship.pitch = Math.asin(Math.max(-0.5, Math.min(0.5, dir.y)));
    this.ship.velocity.copy(dir.multiplyScalar(this.speed));
    this.ship.position.add(this.ship.velocity.clone().multiplyScalar(dt));
    this.ship.group.position.copy(this.ship.position);
    this.ship.group.rotation.set(this.ship.pitch, this.ship.yaw, 0, "YXZ");
    const spd = this.ship.velocity.length();
    this.ship.tickAnimations(dt, { speed: spd });
    this.trail.emit(this.ship.position, this.ship.getForward(), spd, false);
    this.trail.update(dt);
  }
}
