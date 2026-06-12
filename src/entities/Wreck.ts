import * as THREE from "three";
import { cloneKenney, kenneyReady, KENNEY_WRECKS } from "../assets/kenneyLoader";
import type { WreckDef } from "../game/types";
import { addGlow, addTo, COLORS, hullMat } from "../utils/voxel";

export class Wreck {
  group = new THREE.Group();
  position: THREE.Vector3;
  def: WreckDef;
  name: string;
  log: string;
  salvageProgress = 0;
  salvageRequired: number;
  salvaged = false;
  loot: { scrap: number; components: number };
  beaconMesh: THREE.Mesh;

  constructor(def: WreckDef) {
    this.def = def;
    this.position = new THREE.Vector3(...def.position);
    this.name = def.name;
    this.log = def.log;
    this.salvageRequired = def.salvageTime;
    this.loot = { ...def.loot };
    const s = def.scale;

    if (kenneyReady()) {
      const modelId = KENNEY_WRECKS[def.id.charCodeAt(0) % KENNEY_WRECKS.length];
      const hull = cloneKenney(modelId);
      hull.scale.multiplyScalar(s * 0.85);
      hull.rotation.y = (def.id.charCodeAt(0) % 10) * 0.35;
      if (modelId === "meteor_half") hull.rotation.z = 0.4;
      if (modelId === "craft_speederD") hull.rotation.x = 0.25;
      this.group.add(hull);
    } else {
      addTo(this.group, 7 * s, 2.2 * s, 15 * s, COLORS.wreck, 0, 0, 0);
      addTo(this.group, 5 * s, 3.5 * s, 7 * s, COLORS.rust, 2.5 * s, 1.2 * s, -3 * s);
      addTo(this.group, 3.5 * s, 2 * s, 9 * s, COLORS.metal, -3.5 * s, 0.8 * s, 2 * s);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        addTo(this.group, 0.4 * s, 3 * s, 0.4 * s, COLORS.metalDark, Math.cos(angle) * 3.5 * s, 1.5 * s, Math.sin(angle) * 3.5 * s);
      }
      for (let i = 0; i < 3; i++) {
        const win = addGlow(this.group, 0.8 * s, 1.2 * s, 0.15 * s, COLORS.glass, (i - 1) * 2.2 * s, 2.2 * s, 5 * s, 0.35);
        win.scale.y = 0.3 + i * 0.2;
      }
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(4 * s, 0.25 * s, 6, 16),
        hullMat(COLORS.metal, { metalness: 0.8 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.5 * s;
      this.group.add(ring);
    }

    this.beaconMesh = addGlow(this.group, 0.5, 0.5, 0.5, def.beaconColor, 0, 4 * s, 0);
    this.group.position.copy(this.position);
    this.group.rotation.y = (def.id.charCodeAt(0) % 10) * 0.15;
  }

  salvage(dt: number): number {
    if (this.salvaged) return 0;
    this.salvageProgress += dt * 12;
    const pulse = 0.8 + Math.sin(this.salvageProgress * 0.2) * 0.4;
    const m = this.beaconMesh.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = pulse * 0.6;
    if (this.salvageProgress >= this.salvageRequired) {
      this.salvaged = true;
      return 1;
    }
    return 0;
  }

  distanceTo(pos: THREE.Vector3): number {
    return this.position.distanceTo(pos);
  }

  isVisibleToScanner(scannerLevel: number, scanActive: boolean): boolean {
    return scanActive || scannerLevel >= this.def.minScanner;
  }
}
