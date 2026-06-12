import * as THREE from "three";
import { getSkyTexture } from "../assets/proceduralTextures";

export function createSkyDome(): THREE.Mesh {
  const tex = getSkyTexture();
  const geo = new THREE.SphereGeometry(600, 24, 16);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false });
  return new THREE.Mesh(geo, mat);
}
