import type { ShipPaint } from "./shipPaint";
import type { ShipShapeId } from "./shipShapes";

export type FactionId = "syndicate" | "voidwalkers" | "ironcorps";

export interface Faction {
  id: FactionId;
  name: string;
  motto: string;
  bonus: string;
  color: number;
  cargoBonus: number;
  fuelBonus: number;
  hullBonus: number;
}

export const FACTIONS: Record<FactionId, Faction> = {
  syndicate: {
    id: "syndicate",
    name: "The Syndicate",
    motto: "Profit from the dead.",
    bonus: "+25% cargo capacity",
    color: 0xffd23f,
    cargoBonus: 1.25,
    fuelBonus: 1,
    hullBonus: 1,
  },
  voidwalkers: {
    id: "voidwalkers",
    name: "Void Walkers",
    motto: "We go where others burn.",
    bonus: "+30% fuel efficiency",
    color: 0x6ec6ff,
    cargoBonus: 1,
    fuelBonus: 1.3,
    hullBonus: 1,
  },
  ironcorps: {
    id: "ironcorps",
    name: "Iron Corps",
    motto: "Salvage rights — by force.",
    bonus: "+25% hull integrity",
    color: 0xff6b6b,
    cargoBonus: 1,
    fuelBonus: 1,
    hullBonus: 1.25,
  },
};

export interface ShipUpgrades {
  engine: number;
  hull: number;
  cargo: number;
  scanner: number;
}

export type Commodity = "ore" | "scrap" | "components" | "alloy";

export interface TradeLogEntry {
  tick: number;
  side: "buy" | "sell" | "refine" | "service";
  label: string;
  qty: number;
  total: number;
}

export interface MarketState {
  tick: number;
  supply: Record<Commodity, number>;
  lastPrices: Record<Commodity, number>;
  volumeSold: Record<Commodity, number>;
  volumeBought: Record<Commodity, number>;
  recentTrades: TradeLogEntry[];
}

export interface Cargo {
  ore: number;
  scrap: number;
  components: number;
  alloy: number;
}

export interface PlayerSave {
  faction: FactionId;
  shipPaint: ShipPaint;
  shipShape: ShipShapeId;
  credits: number;
  cargo: Cargo;
  upgrades: ShipUpgrades;
  fuel: number;
  hull: number;
  wrecksSalvaged: number;
  oreMined: number;
  name: string;
  hasScanned: boolean;
  hasDocked: boolean;
  claimedMissions: string[];
  salvagedWreckIds: string[];
  market: MarketState;
  totalEarned: number;
  totalSpent: number;
  hubDaily?: { streak: number; lastClaimMs: number };
  tutorialComplete?: boolean;
  sfxEnabled?: boolean;
  walletAddress?: string;
}

export interface WreckDef {
  id: string;
  name: string;
  position: [number, number, number];
  log: string;
  loot: { scrap: number; components: number };
  salvageTime: number;
  beaconColor: number;
  hazard?: "fuel" | "radiation";
  minScanner: number;
  scale: number;
}

export const WRECK_DEFS: WreckDef[] = [
  {
    id: "prosperity",
    name: "UES Prosperity",
    position: [-80, 5, -60],
    log: "Final entry: hull breach sector 7. Sending distress— [SIGNAL LOST]",
    loot: { scrap: 12, components: 1 },
    salvageTime: 80,
    beaconColor: 0xff4444,
    minScanner: 1,
    scale: 1,
  },
  {
    id: "mournful",
    name: "ISS Mournful",
    position: [95, 8, -45],
    log: "Captain's note: we ran out of hope before fuel. Don't land in the cargo bay.",
    loot: { scrap: 18, components: 2 },
    salvageTime: 100,
    beaconColor: 0xff8844,
    hazard: "fuel",
    minScanner: 1,
    scale: 1.1,
  },
  {
    id: "prophet",
    name: "Rust Prophet",
    position: [45, 14, -105],
    log: "They said the ore would set us free. The ore set us on fire.",
    loot: { scrap: 10, components: 4 },
    salvageTime: 120,
    beaconColor: 0xffaa44,
    minScanner: 1,
    scale: 0.9,
  },
  {
    id: "charity",
    name: "Hollow Charity",
    position: [-105, 3, 75],
    log: "Mission log: deliver medicine to the outer colonies. Nobody was home.",
    loot: { scrap: 25, components: 1 },
    salvageTime: 90,
    beaconColor: 0xaa66ff,
    minScanner: 1,
    scale: 1.2,
  },
  {
    id: "gilded",
    name: "The Gilded Lie",
    position: [10, 22, -115],
    log: "Black box recovered. Owner: classified. Contents: classified. Regret: universal.",
    loot: { scrap: 20, components: 6 },
    salvageTime: 150,
    beaconColor: 0xffd23f,
    hazard: "radiation",
    minScanner: 2,
    scale: 1.3,
  },
];

export const UPGRADE_COSTS = {
  engine: [100, 250, 500, 1000],
  hull: [80, 200, 400, 800],
  cargo: [60, 150, 300, 600],
  scanner: [120, 300, 600],
};

export const MAX_UPGRADE = { engine: 4, hull: 4, cargo: 4, scanner: 3 };

export type RadarKind = "station" | "asteroid" | "wreck" | "npc";

export interface RadarPOI {
  id: string;
  name: string;
  x: number;
  z: number;
  color: string;
  dist: number;
  angle: number;
  kind: RadarKind;
}
