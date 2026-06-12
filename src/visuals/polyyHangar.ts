import * as THREE from "three";
import { cloneKenney, kenneyReady } from "../assets/kenneyLoader";

/** Premium showcase stage for Polyy PBR ships — Kenney props + lit turntable. */
export function buildPolyyHangarStage(): THREE.Group {
  const stage = new THREE.Group();

  if (kenneyReady()) {
    const pad = cloneKenney("platform_large");
    pad.scale.multiplyScalar(0.92);
    stage.add(pad);

    const inner = cloneKenney("platform_center");
    inner.position.y = 0.04;
    inner.scale.multiplyScalar(0.72);
    stage.add(inner);

    const arch = cloneKenney("hangar_roundGlass");
    arch.position.set(0, 0.1, -6.5);
    arch.scale.multiplyScalar(1.05);
    stage.add(arch);

    for (const side of [-1, 1]) {
      const dish = cloneKenney("satelliteDish_large");
      dish.position.set(side * 6.8, 0.2, -3.2);
      dish.rotation.y = side * 0.45;
      dish.scale.multiplyScalar(0.9);
      stage.add(dish);
    }
  } else {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 64),
      new THREE.MeshStandardMaterial({
        color: 0x141c2e,
        metalness: 0.9,
        roughness: 0.28,
        emissive: 0x0a1428,
        emissiveIntensity: 0.65,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    stage.add(floor);
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.4, 0.045, 12, 72),
    new THREE.MeshStandardMaterial({
      color: 0x8866ff,
      emissive: 0x6644cc,
      emissiveIntensity: 1.1,
      metalness: 0.95,
      roughness: 0.15,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.03;
  stage.add(ring);

  const innerRing = ring.clone();
  (innerRing.material as THREE.MeshStandardMaterial).color.setHex(0x44aaff);
  (innerRing.material as THREE.MeshStandardMaterial).emissive.setHex(0x2288dd);
  innerRing.scale.setScalar(0.62);
  stage.add(innerRing);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 14),
    new THREE.MeshBasicMaterial({ color: 0x06080d, transparent: true, opacity: 0.92 })
  );
  backdrop.position.set(0, 5.5, -8);
  stage.add(backdrop);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 10),
    new THREE.MeshBasicMaterial({
      color: 0x5533aa,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.position.set(0, 3.5, -7.5);
  stage.add(glow);

  const padLight = new THREE.PointLight(0x8866ff, 2.2, 22);
  padLight.position.set(0, 4.5, 2.5);
  stage.add(padLight);

  const rimLight = new THREE.PointLight(0x44ccff, 1.4, 16);
  rimLight.position.set(-4, 2.5, -3);
  stage.add(rimLight);

  return stage;
}
