import * as THREE from "three";

/** Layered additive flame cones that pulse and flicker behind engines. */
export class EngineExhaust {
  readonly group = new THREE.Group();
  private layers: THREE.Mesh[] = [];
  private t = Math.random() * 10;

  constructor(
    parent: THREE.Object3D,
    position: THREE.Vector3,
    innerColor: number,
    outerColor: number,
    scale = 1
  ) {
    const colors = [innerColor, outerColor, outerColor];
    const sizes = [0.22, 0.32, 0.44];
    const lengths = [0.55, 0.85, 1.15];

    for (let i = 0; i < 3; i++) {
      const geo = new THREE.ConeGeometry(sizes[i] * scale, lengths[i] * scale, 10, 1, true);
      geo.translate(0, -lengths[i] * scale * 0.5, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.55 - i * 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
      this.layers.push(mesh);
      this.group.add(mesh);
    }

    this.group.position.copy(position);
    parent.add(this.group);
  }

  update(dt: number, intensity = 1): void {
    this.t += dt * (6 + intensity * 8);
    for (let i = 0; i < this.layers.length; i++) {
      const mesh = this.layers[i];
      const flicker = 0.75 + Math.sin(this.t * (1.4 + i * 0.3)) * 0.15 + Math.sin(this.t * 3.7) * 0.08;
      const stretch = (0.85 + i * 0.12) * intensity * flicker;
      mesh.scale.set(stretch, stretch * (1.1 + intensity * 0.35), stretch);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.5 - i * 0.1) * intensity * flicker;
    }
  }

  dispose(): void {
    for (const mesh of this.layers) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.group.removeFromParent();
  }
}
