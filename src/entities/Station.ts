import * as THREE from "three";
import { addGlow, addTo, COLORS, hullMat } from "../utils/voxel";

export class Station {
  group = new THREE.Group();
  position = new THREE.Vector3(60, 0, 50);
  dockRadius = 18;
  constructor() {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(14, 1.2, 12, 32),
      hullMat(COLORS.metal, { metalness: 0.85, roughness: 0.25 })
    );
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);

    addTo(this.group, 10, 3, 10, COLORS.hullDark, 0, 0, 0);
    addTo(this.group, 7, 7, 7, COLORS.metal, 0, 2.5, 0);
    addGlow(this.group, 4, 4, 4, COLORS.station, 0, 7.5, 0);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * 12;
      const z = Math.sin(a) * 12;
      addTo(this.group, 1.2, 9, 1.2, COLORS.hull, x, 1, z);
      addGlow(this.group, 0.4, 0.4, 0.4, COLORS.station, x, 5.5, z, 0.85);
    }

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      addTo(this.group, 0.6, 0.6, 4, COLORS.metalDark, Math.cos(a) * 8, 2, Math.sin(a) * 8);
      addGlow(this.group, 0.8, 0.3, 0.8, COLORS.scan, Math.cos(a) * 10, 1.5, Math.sin(a) * 10);
    }

    addGlow(this.group, 0.35, 2.5, 0.35, COLORS.station, 0, 10, 0, 0.7);

    this.group.position.copy(this.position);
  }

  distanceTo(pos: THREE.Vector3): number {
    return this.position.distanceTo(pos);
  }

  inDockRange(pos: THREE.Vector3): boolean {
    return this.distanceTo(pos) < this.dockRadius;
  }
}
