import * as THREE from "three";

interface Chunk {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

export class MiningBeam {
  private beam: THREE.Mesh;
  private core: THREE.Mesh;
  private impact: THREE.Points;
  private impactVel: Float32Array;
  private chunks: Chunk[] = [];
  private chunkPool: THREE.Mesh[] = [];
  private pulse = 0;
  private active = false;

  constructor(world: THREE.Group) {
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffee88,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.28, 1, 8), beamMat);
    this.core = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1, 6), coreMat);
    this.beam.rotation.x = Math.PI / 2;
    this.core.rotation.x = Math.PI / 2;
    this.beam.visible = false;
    this.core.visible = false;
    world.add(this.beam);
    world.add(this.core);

    const count = 24;
    const pos = new Float32Array(count * 3);
    this.impactVel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.impactVel[i * 3] = (Math.random() - 0.5) * 8;
      this.impactVel[i * 3 + 1] = (Math.random() - 0.5) * 8;
      this.impactVel[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const impactGeo = new THREE.BufferGeometry();
    impactGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.impact = new THREE.Points(
      impactGeo,
      new THREE.PointsMaterial({
        color: 0xffcc66,
        size: 0.35,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    world.add(this.impact);

    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.14, 0.18),
        new THREE.MeshBasicMaterial({
          color: 0xffd966,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      m.visible = false;
      this.chunkPool.push(m);
      world.add(m);
    }
  }

  setActive(on: boolean): void {
    this.active = on;
    if (!on) {
      this.beam.visible = false;
      this.core.visible = false;
      (this.impact.material as THREE.PointsMaterial).opacity = 0;
    }
  }

  burstOre(from: THREE.Vector3, to: THREE.Vector3, count = 3): void {
    const dir = to.clone().sub(from).normalize();
    for (let i = 0; i < count; i++) {
      const mesh = this.chunkPool.find((m) => !m.visible);
      if (!mesh) break;
      mesh.visible = true;
      mesh.position.copy(from).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8));
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      mesh.scale.setScalar(0.6 + Math.random() * 0.5);
      const vel = dir.clone().multiplyScalar(6 + Math.random() * 4);
      vel.x += (Math.random() - 0.5) * 2;
      vel.y += (Math.random() - 0.5) * 2;
      vel.z += (Math.random() - 0.5) * 2;
      this.chunks.push({ mesh, vel, life: 0.7 + Math.random() * 0.3 });
    }
  }

  update(from: THREE.Vector3, to: THREE.Vector3, dt: number, intensity = 1): void {
    this.pulse += dt * 14;
    if (this.active) {
      const mid = from.clone().add(to).multiplyScalar(0.5);
      const dist = from.distanceTo(to);
      const dir = to.clone().sub(from).normalize();

      for (const mesh of [this.beam, this.core]) {
        mesh.visible = true;
        mesh.position.copy(mid);
        mesh.scale.set(1 + Math.sin(this.pulse) * 0.15 * intensity, dist, 1 + Math.sin(this.pulse * 1.3) * 0.1);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        mesh.quaternion.copy(q);
      }

      const beamMat = this.beam.material as THREE.MeshBasicMaterial;
      const coreMat = this.core.material as THREE.MeshBasicMaterial;
      beamMat.opacity = 0.35 + Math.sin(this.pulse * 2) * 0.2 + intensity * 0.25;
      coreMat.opacity = 0.6 + Math.sin(this.pulse * 3) * 0.25;

      const impactMat = this.impact.material as THREE.PointsMaterial;
      impactMat.opacity = 0.5 + intensity * 0.4;
      this.impact.position.copy(to);
      const attr = this.impact.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        attr.setXYZ(
          i,
          (Math.random() - 0.5) * 1.2 * intensity,
          (Math.random() - 0.5) * 1.2 * intensity,
          (Math.random() - 0.5) * 1.2 * intensity
        );
      }
      attr.needsUpdate = true;
    }

    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      c.life -= dt;
      c.mesh.position.add(c.vel.clone().multiplyScalar(dt));
      c.vel.multiplyScalar(0.96);
      const mat = c.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = c.life;
      c.mesh.scale.multiplyScalar(0.985);
      if (c.life <= 0) {
        c.mesh.visible = false;
        this.chunks.splice(i, 1);
      }
    }
  }
}
