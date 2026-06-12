import * as THREE from "three";
import { RACE_START, raceTrackPath } from "../game/raceCourse";

function buildStartLine(): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(RACE_START);
  const matA = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const matB = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.85 });
  for (let i = -5; i <= 5; i++) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 1.8), i % 2 === 0 ? matA : matB);
    tile.position.set(i * 3.4, -1.2, 0);
    g.add(tile);
  }
  const archMat = new THREE.MeshStandardMaterial({
    color: 0x66e8ff,
    emissive: 0x66e8ff,
    emissiveIntensity: 0.4,
    metalness: 0.8,
    roughness: 0.25,
  });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 14, 0.6), archMat);
    post.position.set(side * 19, 5.5, 0);
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(38, 0.8, 0.8), archMat);
  beam.position.set(0, 12.5, 0);
  g.add(beam);
  return g;
}

export class RaceTrackGuide {
  readonly group = new THREE.Group();
  private beacons: THREE.Mesh[] = [];
  private pulse = 0;

  constructor(sceneRoot: THREE.Group) {
    sceneRoot.add(this.group);
    this.group.add(buildStartLine());
    this.spawnBeacons();
  }

  private spawnBeacons(): void {
    const path = raceTrackPath();
    const geo = new THREE.OctahedronGeometry(0.55, 0);
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const dist = from.distanceTo(to);
      const steps = Math.max(3, Math.floor(dist / 14));
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const pos = new THREE.Vector3().lerpVectors(from, to, t);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffd23f,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const beacon = new THREE.Mesh(geo, mat);
        beacon.position.copy(pos);
        this.beacons.push(beacon);
        this.group.add(beacon);
      }
    }
  }

  update(dt: number): void {
    this.pulse += dt * 2.5;
    const flicker = 0.28 + Math.sin(this.pulse) * 0.12;
    for (let i = 0; i < this.beacons.length; i++) {
      const m = this.beacons[i].material as THREE.MeshBasicMaterial;
      m.opacity = flicker + Math.sin(this.pulse + i * 0.4) * 0.08;
      this.beacons[i].rotation.y += dt * 1.2;
    }
  }
}
