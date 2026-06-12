import * as THREE from "three";
import { cloneKenney, kenneyReady, KENNEY_ASTEROIDS } from "../assets/kenneyLoader";
import { addGlow, COLORS, hullMat, seededRandom } from "../utils/voxel";

export class Asteroid {
  group = new THREE.Group();
  position: THREE.Vector3;
  ore: number;
  maxOre: number;
  id: number;
  depleted = false;
  miningActive = false;
  private oreCrystals: THREE.Mesh[] = [];
  private chunks: THREE.Mesh[] = [];
  private wobble = 0;
  private ring: THREE.Mesh | null = null;
  private baseY: number;
  constructor(x: number, y: number, z: number, seed: number, id: number) {
    this.id = id;
    this.position = new THREE.Vector3(x, y, z);
    this.baseY = y;
    this.maxOre = 8 + Math.floor(seededRandom(seed, id) * 20);
    this.ore = this.maxOre;

    const size = 2.5 + seededRandom(seed, id + 50) * 5;

    if (kenneyReady()) {
      const modelId = KENNEY_ASTEROIDS[id % KENNEY_ASTEROIDS.length];
      const rock = cloneKenney(modelId);
      const scale = size / 3.2;
      rock.scale.multiplyScalar(scale);
      rock.rotation.y = seededRandom(seed, id + 40) * Math.PI * 2;
      this.group.add(rock);
      rock.traverse((obj) => {
        if (obj instanceof THREE.Mesh) this.chunks.push(obj);
      });
    } else {
      const core = new THREE.Mesh(
        new THREE.DodecahedronGeometry(size * 0.55, 0),
        hullMat(COLORS.asteroidDark, { roughness: 0.75, metalness: 0.2, emissive: 0x443322, emissiveIntensity: 0.12 })
      );
      this.group.add(core);
      this.chunks.push(core);

      const chunkCount = 4 + Math.floor(seededRandom(seed, id + 60) * 5);
      for (let i = 0; i < chunkCount; i++) {
        const s = size * (0.25 + seededRandom(seed, id + i) * 0.35);
        const geo = new THREE.BoxGeometry(s, s * 0.7, s);
        const mat = hullMat(i % 2 === 0 ? COLORS.asteroid : COLORS.asteroidDark, {
          roughness: 0.78,
          metalness: 0.15,
          emissive: 0x554433,
          emissiveIntensity: 0.1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          (seededRandom(seed, id + i * 3) - 0.5) * size * 1.2,
          (seededRandom(seed, id + i * 3 + 1) - 0.5) * size * 0.6,
          (seededRandom(seed, id + i * 3 + 2) - 0.5) * size * 1.2
        );
        mesh.rotation.set(seededRandom(seed, i) * 2, seededRandom(seed, i + 1) * 2, 0);
        mesh.userData.baseScale = mesh.scale.clone();
        this.group.add(mesh);
        this.chunks.push(mesh);
      }
    }

    const crystalCount = 2 + Math.floor(seededRandom(seed, id + 70) * 4);
    for (let i = 0; i < crystalCount; i++) {
      const c = addGlow(
        this.group,
        0.25 + seededRandom(seed, i + 80) * 0.2,
        0.5 + seededRandom(seed, i + 81) * 0.4,
        0.25,
        COLORS.asteroidOre,
        (seededRandom(seed, i + 82) - 0.5) * size,
        seededRandom(seed, i + 83) * size * 0.3,
        (seededRandom(seed, i + 84) - 0.5) * size
      );
      this.oreCrystals.push(c);
    }

    const ringGeo = new THREE.RingGeometry(size * 0.55, size * 0.62, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = -size * 0.2;
    this.group.add(this.ring);

    this.group.position.copy(this.position);
    this.group.rotation.y = seededRandom(seed, id) * Math.PI * 2;
  }

  getAimPoint(): THREE.Vector3 {
    return this.position.clone().add(new THREE.Vector3(0, 0.5, 0));
  }

  setMiningActive(on: boolean): void {
    this.miningActive = on;
  }

  oreRatio(): number {
    return this.maxOre > 0 ? this.ore / this.maxOre : 0;
  }

  oreRemaining(): number {
    return Math.ceil(this.ore);
  }

  update(dt: number): void {
    if (this.depleted) return;

    const ringMat = this.ring?.material as THREE.MeshBasicMaterial | undefined;
    if (this.ring && ringMat) {
      const target = this.miningActive ? 0.55 : 0;
      ringMat.opacity = THREE.MathUtils.lerp(ringMat.opacity, target, dt * 8);
      this.ring.rotation.z += dt * (this.miningActive ? 2.2 : 0.4);
    }

    if (this.wobble > 0) {
      this.wobble = Math.max(0, this.wobble - dt * 2.5);
      const s = this.wobble;
      this.group.rotation.x = Math.sin(Date.now() * 0.02) * s * 0.08;
      this.group.rotation.z = Math.cos(Date.now() * 0.017) * s * 0.06;
      this.group.position.y = this.baseY + Math.sin(Date.now() * 0.025) * s * 0.15;
    } else {
      this.group.rotation.x *= 0.92;
      this.group.rotation.z *= 0.92;
      this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, this.baseY, dt * 4);
    }

    const ratio = this.oreRatio();
    for (const c of this.oreCrystals) {
      c.visible = ratio > 0.08;
      const m = c.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.2 + ratio * 0.5 + (this.miningActive ? 0.35 : 0);
      c.scale.setScalar(0.35 + ratio * 0.65);
    }
  }

  mine(dt: number, rateMul = 1): number {
    if (this.depleted) return 0;
    const extracted = Math.min(this.ore, dt * 3.2 * rateMul);
    this.ore -= extracted;
    this.wobble = Math.min(1, this.wobble + dt * 3);

    const ratio = this.oreRatio();
    for (const c of this.oreCrystals) {
      c.visible = ratio > 0.08;
      const m = c.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.25 + ratio * 0.35;
      c.scale.setScalar(0.4 + ratio * 0.6);
    }

    if (Math.random() < dt * 4 * rateMul && this.chunks.length > 1) {
      const mesh = this.chunks[1 + Math.floor(Math.random() * (this.chunks.length - 1))];
      mesh.scale.multiplyScalar(0.97);
      const hm = mesh.material as THREE.MeshStandardMaterial;
      hm.emissiveIntensity = 0.35;
      hm.emissive = new THREE.Color(0xffaa44);
    }

    if (this.ore <= 0) {
      this.ore = 0;
      this.depleted = true;
      this.group.visible = false;
    }
    return extracted;
  }

  distanceTo(pos: THREE.Vector3): number {
    return this.position.distanceTo(pos);
  }
}
