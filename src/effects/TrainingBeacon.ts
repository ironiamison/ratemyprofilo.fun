import * as THREE from "three";

export type TrainingBeaconKind = "mine" | "salvage" | "dock";

const KIND_COLOR: Record<TrainingBeaconKind, number> = {
  mine: 0xffcc22,
  salvage: 0xff3344,
  dock: 0x33ff99,
};

const KIND_LABEL: Record<TrainingBeaconKind, string> = {
  mine: "MINE",
  salvage: "SALVAGE",
  dock: "DOCK",
};

function labelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "bold 36px Orbitron, Rajdhani, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(10, 2.5, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export class TrainingBeacon {
  readonly group = new THREE.Group();
  readonly kind: TrainingBeaconKind;
  private readonly pillar: THREE.Mesh;
  private readonly ring: THREE.Mesh;
  private readonly core: THREE.Mesh;
  private readonly sprite: THREE.Sprite;
  private readonly pillarH: number;
  private highlight = 1;
  private phase = 0;

  constructor(kind: TrainingBeaconKind, position: THREE.Vector3, options?: { tall?: boolean; label?: boolean }) {
    this.kind = kind;
    const color = KIND_COLOR[kind];
    const tall = options?.tall ?? true;
    const showLabel = options?.label ?? tall;
    this.pillarH = tall ? (kind === "dock" ? 24 : 20) : 14;
    this.phase = position.x * 0.1 + position.z * 0.07;

    const pillarMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(tall ? 0.2 : 0.12, tall ? 0.75 : 0.45, this.pillarH, 10, 1, true),
      pillarMat
    );
    this.pillar.position.set(0, this.pillarH / 2, 0);

    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(tall ? 4.2 : 2.8, 0.18, 8, 40), ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.15;

    const coreMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.core = new THREE.Mesh(new THREE.OctahedronGeometry(tall ? 0.9 : 0.55), coreMat);
    this.core.position.y = this.pillarH + (tall ? 1.2 : 0.8);

    this.sprite = labelSprite(KIND_LABEL[kind], `#${color.toString(16).padStart(6, "0")}`);
    this.sprite.position.y = this.pillarH + (tall ? 3.8 : 2.6);
    this.sprite.visible = showLabel;

    this.group.position.copy(position);
    this.group.add(this.pillar, this.ring, this.core, this.sprite);
  }

  setHighlight(strength: number): void {
    this.highlight = THREE.MathUtils.clamp(strength, 0.12, 1);
  }

  update(pulse: number): void {
    const bob = Math.sin(pulse * 2.2 + this.phase) * 0.35;
    const pulseA = 0.55 + Math.sin(pulse * 3.5 + this.phase) * 0.35;
    const h = this.highlight;

    (this.pillar.material as THREE.MeshBasicMaterial).opacity = (0.22 + pulseA * 0.28) * h;
    (this.ring.material as THREE.MeshBasicMaterial).opacity = (0.5 + pulseA * 0.4) * h;
    (this.core.material as THREE.MeshBasicMaterial).opacity = (0.7 + pulseA * 0.25) * h;

    const ringScale = 1 + Math.sin(pulse * 4 + this.phase) * 0.08;
    this.ring.scale.setScalar((0.85 + h * 0.2) * ringScale);
    this.core.position.y = this.pillarH + 1.2 + bob;
    this.sprite.position.y = this.pillarH + 3.8 + bob;
    this.sprite.material.opacity = 0.65 + pulseA * 0.35 * h;
    this.group.visible = h > 0.08;
  }
}
