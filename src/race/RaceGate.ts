import * as THREE from "three";
import type { RaceGateDef } from "../game/raceCourse";

function gateLabel(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "bold 34px Orbitron, Rajdhani, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(6, 6, canvas.width - 12, canvas.height - 12);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(14, 3.5, 1);
  sprite.position.y = defLabelOffsetY;
  return sprite;
}

const defLabelOffsetY = 8;

function orientToAxis(obj: THREE.Object3D, axis: THREE.Vector3): void {
  const normal = axis.clone().normalize();
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
}

export class RaceGate {
  readonly group = new THREE.Group();
  readonly index: number;
  private frame = new THREE.Group();
  private ring: THREE.Mesh;
  private glow: THREE.Mesh;
  private active = false;
  private pulse = 0;

  constructor(index: number, def: RaceGateDef) {
    this.index = index;
    this.group.position.copy(def.position);
    orientToAxis(this.frame, def.axis);
    this.group.add(this.frame);

    const r = def.radius;
    const ringGeo = new THREE.TorusGeometry(r * 0.52, 0.45, 10, 36);
    const ringMat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: def.color,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 0.92,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.frame.add(this.ring);

    const glowGeo = new THREE.TorusGeometry(r * 0.52, 0.18, 8, 36);
    const glowMat = new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glow = new THREE.Mesh(glowGeo, glowMat);
    this.frame.add(this.glow);

    const postMat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: def.color,
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.3,
    });
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, r * 1.1, 0.5), postMat);
      post.position.set(side * r * 0.58, 0, 0);
      this.frame.add(post);
    }

    const hex = `#${def.color.toString(16).padStart(6, "0")}`;
    const label = gateLabel(def.label, hex);
    label.position.y = r * 0.55 + 2;
    this.group.add(label);
  }

  setActive(on: boolean): void {
    this.active = on;
  }

  setPassed(): void {
    this.active = false;
    const rm = this.ring.material as THREE.MeshStandardMaterial;
    rm.emissiveIntensity = 0.06;
    rm.opacity = 0.3;
    rm.color.setHex(0x445566);
    rm.emissive.setHex(0x223344);
    const gm = this.glow.material as THREE.MeshBasicMaterial;
    gm.opacity = 0.08;
    gm.color.setHex(0x334455);
  }

  update(dt: number): void {
    this.pulse += dt * 3;
    const rm = this.ring.material as THREE.MeshStandardMaterial;
    const base = this.active ? 0.75 : 0.12;
    rm.emissiveIntensity = base + Math.sin(this.pulse) * (this.active ? 0.35 : 0.04);
    const gm = this.glow.material as THREE.MeshBasicMaterial;
    gm.opacity = (this.active ? 0.55 : 0.12) + Math.sin(this.pulse * 1.4) * 0.15;
    this.glow.rotation.z += dt * (this.active ? 2.2 : 0.4);
  }
}
