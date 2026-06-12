import { defaultMarket, migrateMarket } from "./economy";
import { defaultShipPaint } from "./shipPaint";
import { DEFAULT_SHIP_SHAPE, isShipShape } from "./shipShapes";
import type { FactionId, PlayerSave } from "./types";

const KEY = "space-salvagers-save";

export function defaultSave(faction: FactionId = "syndicate"): PlayerSave {
  return {
    faction,
    shipPaint: defaultShipPaint(),
    shipShape: DEFAULT_SHIP_SHAPE,
    credits: 75,
    cargo: { ore: 0, scrap: 0, components: 0, alloy: 0 },
    upgrades: { engine: 1, hull: 1, cargo: 1, scanner: 1 },
    fuel: 100,
    hull: 100,
    wrecksSalvaged: 0,
    oreMined: 0,
    name: "VoxelHero",
    hubDaily: { streak: 1, lastClaimMs: 0 },
    hasScanned: false,
    hasDocked: false,
    claimedMissions: [],
    salvagedWreckIds: [],
    market: defaultMarket(),
    totalEarned: 0,
    totalSpent: 0,
    tutorialComplete: false,
    sfxEnabled: true,
  };
}

function migrate(raw: Partial<PlayerSave>): PlayerSave {
  const base = defaultSave(raw.faction ?? "syndicate");
  const cargo = { ...base.cargo, ...raw.cargo, alloy: raw.cargo?.alloy ?? 0 };
  return {
    ...base,
    ...raw,
    cargo,
    market: raw.market ? migrateMarket(raw.market) : defaultMarket(),
    totalEarned: raw.totalEarned ?? 0,
    totalSpent: raw.totalSpent ?? 0,
    shipPaint: raw.shipPaint ?? defaultShipPaint(),
    shipShape: raw.shipShape && isShipShape(raw.shipShape) ? raw.shipShape : DEFAULT_SHIP_SHAPE,
    hubDaily: raw.hubDaily ?? { streak: 1, lastClaimMs: 0 },
    tutorialComplete: raw.tutorialComplete ?? !!(raw.wrecksSalvaged || raw.hasDocked || (raw.totalEarned ?? 0) > 0),
    sfxEnabled: raw.sfxEnabled ?? true,
    walletAddress: raw.walletAddress,
  };
}

export function loadSave(): PlayerSave | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeSave(data: PlayerSave): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function resetSave(faction: FactionId): PlayerSave {
  const save = defaultSave(faction);
  writeSave(save);
  return save;
}
