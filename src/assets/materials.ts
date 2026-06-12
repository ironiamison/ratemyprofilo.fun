import * as THREE from "three";
import { getHullTexture } from "./proceduralTextures";

export function hullMaterial(
  color: number,
  opts: {
    metalness?: number;
    roughness?: number;
    emissive?: number;
    emissiveIntensity?: number;
    map?: boolean;
  } = {}
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    map: opts.map !== false ? getHullTexture() : undefined,
    metalness: opts.metalness ?? 0.55,
    roughness: opts.roughness ?? 0.42,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    flatShading: false,
  });
}

export function metalMaterial(color: number): THREE.MeshStandardMaterial {
  return hullMaterial(color, { metalness: 0.9, roughness: 0.22 });
}

export function glassMaterial(color: number, opacity = 0.55): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.15,
    roughness: 0.2,
    transparent: true,
    opacity,
    emissive: color,
    emissiveIntensity: 0.12,
    depthWrite: false,
  });
}

export function emissiveMaterial(color: number, intensity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    metalness: 0.1,
    roughness: 0.4,
    transparent: false,
    opacity: 1,
    toneMapped: true,
  });
}

export function glowMaterial(color: number, intensity = 1.2): THREE.MeshStandardMaterial {
  return emissiveMaterial(color, intensity);
}
