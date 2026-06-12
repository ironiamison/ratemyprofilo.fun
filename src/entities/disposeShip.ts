import * as THREE from "three";
import type { ShipAnimator } from "./ShipAnimator";

export function disposeShipContents(root: THREE.Object3D, animator?: ShipAnimator | null): void {
  animator?.dispose();
  const toRemove = [...root.children];
  for (const child of toRemove) {
    root.remove(child);
    child.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    });
  }
}
