import * as THREE from "three";
import { buildShip } from "../entities/buildShip";
import { disposeShipContents } from "../entities/disposeShip";
import type { ShipAnimator } from "../entities/ShipAnimator";
import type { ShipPaint } from "../game/shipPaint";
import type { ShipShapeId } from "../game/shipShapes";
import { hullMaterial, metalMaterial } from "../assets/materials";
import { addGlow, addTo } from "../utils/voxel";

function padTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#2a323c";
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = "#ffcc33";
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  ctx.moveTo(256, 40);
  ctx.lineTo(256, 472);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(255, 204, 51, 0.35)";
  ctx.lineWidth = 2;
  for (let y = 60; y < 480; y += 36) {
    ctx.beginPath();
    ctx.moveTo(236, y);
    ctx.lineTo(276, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#44aadd";
  ctx.lineWidth = 3;
  ctx.strokeRect(80, 80, 352, 352);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function planetMesh(): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(90, 80, 10, 128, 128, 128);
  g.addColorStop(0, "#6ec8ff");
  g.addColorStop(0.4, "#2a88aa");
  g.addColorStop(0.65, "#1a7848");
  g.addColorStop(1, "#061828");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(16, 32, 32),
    new THREE.MeshBasicMaterial({ map: tex, fog: false })
  );
  mesh.position.set(-28, 22, -72);
  return mesh;
}

function marketArch(): THREE.Group {
  const g = new THREE.Group();
  const mat = hullMaterial(0x2e3648, { metalness: 0.65, roughness: 0.42, map: false });

  const base = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 7), mat);
  base.position.y = 2.5;
  g.add(base);

  const left = new THREE.Mesh(new THREE.BoxGeometry(1, 5.5, 1), mat);
  left.position.set(-4.5, 5.5, 3.8);
  g.add(left);
  const right = left.clone();
  right.position.x = 4.5;
  g.add(right);
  const top = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 1), mat);
  top.position.set(0, 8.2, 3.8);
  g.add(top);

  const signCanvas = document.createElement("canvas");
  signCanvas.width = 280;
  signCanvas.height = 64;
  const sctx = signCanvas.getContext("2d")!;
  sctx.font = "bold 38px Orbitron, sans-serif";
  sctx.textAlign = "center";
  sctx.fillStyle = "#cc66ff";
  sctx.shadowColor = "#aa44ff";
  sctx.shadowBlur = 16;
  sctx.fillText("MARKET", 140, 42);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 1.5),
    new THREE.MeshBasicMaterial({ map: signTex, transparent: true, fog: false })
  );
  sign.position.set(0, 9.2, 4.1);
  g.add(sign);

  addGlow(g, 6, 0.15, 0.1, 0xaa44ff, 0, 9.5, 4.05, 0.7);

  g.position.set(14, 0, -14);
  g.rotation.y = -0.3;
  return g;
}

function npc(x: number, z: number, color: number): THREE.Group {
  const g = new THREE.Group();
  addTo(g, 0.3, 0.65, 0.22, color, 0, 0, 0);
  addTo(g, 0.22, 0.22, 0.18, 0x334455, 0, 0.7, 0);
  g.position.set(x, 0, z);
  return g;
}

export class OrionStation {
  group = new THREE.Group();
  private shipRoot = new THREE.Group();
  private shipKey = "";
  private shipAnimator: ShipAnimator | null = null;
  private t = 0;

  constructor() {
    const deck = new THREE.Mesh(
      new THREE.PlaneGeometry(48, 36),
      new THREE.MeshStandardMaterial({
        map: padTexture(),
        color: 0x8898a8,
        metalness: 0.5,
        roughness: 0.55,
      })
    );
    deck.rotation.x = -Math.PI / 2;
    deck.position.y = 0;
    this.group.add(deck);

    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4.8, 0.18, 6),
      metalMaterial(0x5a6878)
    );
    pad.position.set(0, 0.09, -1);
    this.group.add(pad);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const ring = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.08, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x44aaff, emissive: 0x2288cc, emissiveIntensity: 0.8 })
      );
      ring.position.set(Math.cos(a) * 4.8, 0.12, -1 + Math.sin(a) * 4.8);
      ring.rotation.y = -a;
      this.group.add(ring);
    }

    this.group.add(marketArch());
    this.group.add(planetMesh());

    const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 8, 3), hullMaterial(0x3a4458, { map: false }));
    tower.position.set(-12, 4, -10);
    this.group.add(tower);

    this.group.add(npc(-8, 4, 0x556677));
    this.group.add(npc(10, 2, 0x667788));
    this.group.add(npc(-5, -6, 0x4a5a6a));

    this.shipRoot.position.set(0, 0.28, -1);
    this.shipRoot.scale.setScalar(2.1);
    this.shipRoot.rotation.y = -0.35;
    this.group.add(this.shipRoot);
  }

  setShip(paint: ShipPaint, shape: ShipShapeId): void {
    const key = `${shape}:${paint.skin}:${paint.hull}:${paint.trim}:${paint.cockpit}:${paint.engine}`;
    if (key === this.shipKey) return;
    this.shipKey = key;

    disposeShipContents(this.shipRoot, this.shipAnimator);
    const built = buildShip(this.shipRoot, paint, shape, true, true);
    this.shipAnimator = built.animator;
    this.shipAnimator.setHoverBase(0.28);
    this.shipRoot.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.MeshStandardMaterial;
        if (m.emissive && m.emissiveIntensity > 0.4) m.emissiveIntensity = 0.5;
      }
    });
  }

  update(dt: number): void {
    this.t += dt;
    this.shipAnimator?.update(dt, { preview: true, hover: true, speed: 6 });
  }
}
