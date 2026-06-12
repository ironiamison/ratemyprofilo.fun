export interface ShipPaint {
  skin: string;
  hull: number;
  hull2: number;
  trim: number;
  chassis: number;
  wings: number;
  glow: number;
  cockpit: number;
  engine: number;
  thruster: number;
  metal: number;
  accent: number;
}

export type PaintPart = keyof Omit<ShipPaint, "skin">;

export const PAINT_PARTS: { key: PaintPart; label: string; col: 0 | 1 }[] = [
  { key: "hull", label: "HULL", col: 0 },
  { key: "trim", label: "TRIM", col: 0 },
  { key: "wings", label: "WINGS", col: 0 },
  { key: "glow", label: "GLOW", col: 0 },
  { key: "cockpit", label: "COCKPIT", col: 0 },
  { key: "engine", label: "ENGINE", col: 0 },
  { key: "hull2", label: "HULL 2", col: 1 },
  { key: "chassis", label: "CHASSIS", col: 1 },
  { key: "metal", label: "METAL", col: 1 },
  { key: "accent", label: "ACCENT", col: 1 },
  { key: "thruster", label: "THRUSTER", col: 1 },
];

export const COLOR_PALETTE = [
  0xffffff, 0xcccccc, 0x888888, 0x444444, 0x111111,
  0xff4444, 0xff8844, 0xffdd44, 0x88ff44, 0x44ff88,
  0x44ddff, 0x4488ff, 0x8844ff, 0xff44cc, 0xff66aa,
  0xc4784a, 0x9a8f82, 0x5a6a8a, 0x3a4558, 0x66ffaa,
];

export const SHIP_SKINS: Record<string, { name: string; swatch: number; paint: ShipPaint }> = {
  classic: {
    name: "CLASSIC",
    swatch: 0xcc3333,
    paint: {
      skin: "classic",
      hull: 0xcc3333,
      hull2: 0xaa2222,
      trim: 0xffdd44,
      chassis: 0x3a4558,
      wings: 0xcc3333,
      glow: 0x44eeff,
      cockpit: 0x88ddff,
      engine: 0xff8844,
      thruster: 0xffcc44,
      metal: 0xb8c8d8,
      accent: 0x44eeff,
    },
  },
  midnight: {
    name: "MIDNIGHT",
    swatch: 0x223355,
    paint: {
      skin: "midnight",
      hull: 0x334466,
      hull2: 0x223355,
      trim: 0x6688aa,
      chassis: 0x1a2233,
      wings: 0x2a3a55,
      glow: 0x4488ff,
      cockpit: 0x6699cc,
      engine: 0xff6644,
      thruster: 0xffaa44,
      metal: 0x6a7a8a,
      accent: 0x88aacc,
    },
  },
  bubblegum: {
    name: "BUBBLEGUM",
    swatch: 0xff66aa,
    paint: {
      skin: "bubblegum",
      hull: 0xff66aa,
      hull2: 0xff88cc,
      trim: 0x44ddff,
      chassis: 0x553355,
      wings: 0xff88bb,
      glow: 0x88ffff,
      cockpit: 0xccffff,
      engine: 0xff44cc,
      thruster: 0xffaadd,
      metal: 0xddccdd,
      accent: 0x44ffff,
    },
  },
  swamp: {
    name: "SWAMP",
    swatch: 0x557744,
    paint: {
      skin: "swamp",
      hull: 0x557744,
      hull2: 0x446633,
      trim: 0x88aa55,
      chassis: 0x2a3322,
      wings: 0x668855,
      glow: 0xaadd66,
      cockpit: 0x99cc88,
      engine: 0xdd8844,
      thruster: 0xffaa55,
      metal: 0x7a8a6a,
      accent: 0xccff88,
    },
  },
  goldrush: {
    name: "GOLD RUSH",
    swatch: 0xffd23f,
    paint: {
      skin: "goldrush",
      hull: 0xffd23f,
      hull2: 0xcc9922,
      trim: 0xffee88,
      chassis: 0x3a3020,
      wings: 0xeebb33,
      glow: 0xffaa22,
      cockpit: 0xffeecc,
      engine: 0xff6622,
      thruster: 0xffcc44,
      metal: 0xddccaa,
      accent: 0xffffff,
    },
  },
  void: {
    name: "VOID",
    swatch: 0x6633aa,
    paint: {
      skin: "void",
      hull: 0x6633aa,
      hull2: 0x442266,
      trim: 0xaa66ff,
      chassis: 0x1a0a30,
      wings: 0x553388,
      glow: 0xcc44ff,
      cockpit: 0x9966ff,
      engine: 0xff44aa,
      thruster: 0xff88dd,
      metal: 0x7a6a9a,
      accent: 0xee66ff,
    },
  },
  salvage: {
    name: "$SALVAGE",
    swatch: 0x5cd878,
    paint: {
      skin: "salvage",
      hull: 0x1a3a2a,
      hull2: 0x0d2218,
      trim: 0x5cd878,
      chassis: 0x0a1510,
      wings: 0x2a5a40,
      glow: 0x5cd878,
      cockpit: 0x88ffaa,
      engine: 0xffb800,
      thruster: 0x5cd878,
      metal: 0x4a6a58,
      accent: 0xffb800,
    },
  },
};

export function defaultShipPaint(): ShipPaint {
  return { ...SHIP_SKINS.classic.paint };
}

export function clonePaint(p: ShipPaint): ShipPaint {
  return { ...p };
}

export function applySkin(id: string): ShipPaint {
  const skin = SHIP_SKINS[id];
  return skin ? clonePaint(skin.paint) : defaultShipPaint();
}

export function cyclePartColor(paint: ShipPaint, part: PaintPart): ShipPaint {
  const next = clonePaint(paint);
  const idx = COLOR_PALETTE.indexOf(paint[part]);
  next[part] = COLOR_PALETTE[(idx + 1) % COLOR_PALETTE.length];
  next.skin = "custom";
  return next;
}

export function setPartColor(paint: ShipPaint, part: PaintPart, color: number): ShipPaint {
  const next = clonePaint(paint);
  next[part] = color;
  next.skin = "custom";
  return next;
}

export function randomizePaint(): ShipPaint {
  const ids = Object.keys(SHIP_SKINS);
  const base = applySkin(ids[Math.floor(Math.random() * ids.length)]);
  const next = clonePaint(base);
  next.skin = "custom";
  for (const { key } of PAINT_PARTS) {
    if (Math.random() < 0.45) {
      next[key] = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    }
  }
  return next;
}

export function paintToHex(c: number): string {
  return `#${c.toString(16).padStart(6, "0")}`;
}
