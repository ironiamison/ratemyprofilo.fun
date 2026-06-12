import * as THREE from "three";
import { seededRandom } from "../utils/voxel";

function buildStarLayer(count: number, seed: number, size: number, opacity: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const r = 200 + seededRandom(seed, i) * 800;
    const theta = seededRandom(seed, i + 100) * Math.PI * 2;
    const phi = Math.acos(2 * seededRandom(seed, i + 200) - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const roll = seededRandom(seed, i + 300);
    if (roll > 0.94) {
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.95;
      colors[i * 3 + 2] = 0.85;
    } else if (roll > 0.82) {
      colors[i * 3] = 0.75;
      colors[i * 3 + 1] = 0.88;
      colors[i * 3 + 2] = 1;
    } else {
      const b = 0.6 + seededRandom(seed, i + 400) * 0.35;
      colors[i * 3] = b;
      colors[i * 3 + 1] = b;
      colors[i * 3 + 2] = b + 0.1;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  return new THREE.Points(geo, mat);
}

/** Layered point stars — no custom shaders (avoids WebGL point-sprite glitches). */
export function createStarfield(count = 1200, seed = 42): THREE.Group {
  const group = new THREE.Group();
  group.add(buildStarLayer(Math.floor(count * 0.7), seed, 2.0, 0.9));
  group.add(buildStarLayer(Math.floor(count * 0.3), seed + 50, 3.2, 0.75));
  return group;
}
