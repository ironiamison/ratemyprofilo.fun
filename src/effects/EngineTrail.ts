import * as THREE from "three";

export class EngineTrail {
  private particles: { mesh: THREE.Mesh; life: number; vel: THREE.Vector3 }[] = [];
  private pool: THREE.Mesh[] = [];
  private timer = 0;

  constructor(private world: THREE.Group) {
    for (let i = 0; i < 64; i++) {
      const geo = new THREE.PlaneGeometry(0.42, 0.42);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff8844,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      this.pool.push(m);
      this.world.add(m);
    }
  }

  emit(pos: THREE.Vector3, forward: THREE.Vector3, speed: number, boosting: boolean): void {
    if (speed < 6) return;
    this.timer += 0.016;
    if (this.timer < 0.022) return;
    this.timer = 0;

    const mesh = this.pool.find((m) => !m.visible);
    if (!mesh) return;

    const back = forward.clone().normalize().multiplyScalar(-3.2);
    mesh.position.copy(pos).add(back);
    mesh.lookAt(pos.clone().add(forward));
    mesh.visible = true;
    mesh.scale.set(boosting ? 1.6 : 1, boosting ? 2.2 : 1.4, 1);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(boosting ? 0xffeeaa : 0xff7733);
    mat.opacity = boosting ? 0.85 : 0.65;
    const vel = back.clone().multiplyScalar(-0.35);
    this.particles.push({ mesh, life: 1, vel });
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt * 1.4;
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = p.life * 0.75;
      p.mesh.scale.multiplyScalar(0.97);
      if (p.life <= 0) {
        p.mesh.visible = false;
        this.particles.splice(i, 1);
      }
    }
  }
}
