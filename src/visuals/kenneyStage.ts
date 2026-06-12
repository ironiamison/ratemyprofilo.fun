import * as THREE from "three";
import { cloneKenney, kenneyReady } from "../assets/kenneyLoader";

/** Kenney hangar turntable: platform + glass arch backdrop. */
export function buildKenneyHangarStage(): THREE.Group {
  const stage = new THREE.Group();
  if (!kenneyReady()) return stage;

  const pad = cloneKenney("platform_large");
  pad.scale.multiplyScalar(1.15);
  stage.add(pad);

  const inner = cloneKenney("platform_center");
  inner.position.y = 0.02;
  inner.scale.multiplyScalar(0.85);
  stage.add(inner);

  const arch = cloneKenney("hangar_roundGlass");
  arch.position.set(0, 0, -2.8);
  arch.scale.multiplyScalar(1.1);
  stage.add(arch);

  const light = new THREE.PointLight(0x66aaff, 1.4, 18);
  light.position.set(0, 3, 2);
  stage.add(light);

  return stage;
}
