import * as THREE from "three";

/** Expanding ring when TAB scan fires. */
export class ScanPulse {
  private mesh: THREE.Mesh;
  private life = 0;

  constructor(parent: THREE.Group) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.RingGeometry(0.5, 2.5, 48), mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
    parent.add(this.mesh);
  }

  trigger(origin: THREE.Vector3): void {
    this.life = 1.6;
    this.mesh.visible = true;
    this.mesh.position.copy(origin);
    this.mesh.position.y = Math.max(0.5, origin.y - 1);
    this.mesh.scale.setScalar(1);
  }

  update(dt: number): void {
    if (this.life <= 0) return;
    this.life -= dt;
    const t = 1 - this.life / 1.6;
    const scale = 1 + t * 90;
    this.mesh.scale.setScalar(scale);
    const mat = this.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = (1 - t) * 0.35;
    if (this.life <= 0) {
      this.mesh.visible = false;
      mat.opacity = 0;
    }
  }
}
