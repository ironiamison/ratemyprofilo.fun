import * as THREE from "three";

const PICKUP_RADIUS = 5.5;

export class BoostOrb {
  readonly id: number;
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3();
  collected = false;
  private core: THREE.Mesh;
  private glow: THREE.Mesh;
  private ring: THREE.Mesh;
  private pulse = 0;

  constructor(id: number, x: number, y: number, z: number) {
    this.id = id;
    this.position.set(x, y, z);
    this.group.position.copy(this.position);

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x88eeff,
      emissive: 0x44ddff,
      emissiveIntensity: 0.85,
      metalness: 0.35,
      roughness: 0.15,
      transparent: true,
      opacity: 0.92,
    });
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), coreMat);
    this.group.add(this.core);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x66e8ff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glow = new THREE.Mesh(new THREE.SphereGeometry(2.4, 14, 14), glowMat);
    this.group.add(this.glow);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd23f,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.08, 6, 32), ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.group.add(this.ring);
  }

  update(dt: number): void {
    if (this.collected) return;
    this.pulse += dt * 3.2;
    const bob = Math.sin(this.pulse * 1.4) * 0.35;
    this.group.position.y = this.position.y + bob;
    const scale = 1 + Math.sin(this.pulse) * 0.12;
    this.core.scale.setScalar(scale);
    const cm = this.core.material as THREE.MeshStandardMaterial;
    cm.emissiveIntensity = 0.65 + Math.sin(this.pulse * 2) * 0.35;
    const gm = this.glow.material as THREE.MeshBasicMaterial;
    gm.opacity = 0.2 + Math.sin(this.pulse * 1.6) * 0.12;
    this.ring.rotation.z += dt * 1.8;
    this.glow.rotation.y += dt * 0.9;
  }

  distanceTo(pos: THREE.Vector3): number {
    return this.position.distanceTo(pos);
  }

  inRange(pos: THREE.Vector3): boolean {
    return !this.collected && this.distanceTo(pos) <= PICKUP_RADIUS;
  }

  collect(): void {
    this.collected = true;
    this.group.visible = false;
  }
}
