import * as THREE from "three";
import { getNebulaTexture } from "../assets/proceduralTextures";
import { seededRandom } from "../utils/voxel";

/** Distant background nebula — kept far from the play volume so it never blows out the camera. */
export function createNebulaClouds(seed = 7, count = 6): THREE.Group {
  const group = new THREE.Group();
  const tex = getNebulaTexture();
  const tints = [0x6a5a9a, 0x4a6a9a, 0x5a5a8a, 0x7a6a9a];

  for (let i = 0; i < count; i++) {
    const w = 180 + seededRandom(seed, i) * 120;
    const h = w * 0.55;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      color: tints[i % tints.length],
      transparent: true,
      opacity: 0.055 + seededRandom(seed, i + 20) * 0.04,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    const angle = seededRandom(seed, i + 40) * Math.PI * 2;
    const dist = 320 + seededRandom(seed, i + 30) * 180;
    mesh.position.set(
      Math.cos(angle) * dist,
      -60 + seededRandom(seed, i + 50) * 40,
      Math.sin(angle) * dist - 120
    );
    mesh.lookAt(0, 0, 40);
    group.add(mesh);
  }
  return group;
}
