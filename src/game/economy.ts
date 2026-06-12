import { walletService } from "../chain/wallet";
import { FACTIONS, type Cargo, type Commodity, type FactionId, type MarketState, type PlayerSave, type ShipUpgrades, type TradeLogEntry } from "./types";

export interface CommodityQuote {
  commodity: Commodity;
  name: string;
  sell: number;
  buy: number;
  held: number;
  trend: "up" | "down" | "flat";
}

export interface ServiceQuote {
  fuelUnit: number;
  repairUnit: number;
  refineOre: number;
  refineScrap: number;
  dockFee: number;
}

const BASE_SELL: Record<Commodity, number> = { ore: 6, scrap: 10, components: 55, alloy: 38 };
const BASE_BUY: Record<Commodity, number> = { ore: 10, scrap: 16, components: 85, alloy: 55 };

const EMPTY_VOL: Record<Commodity, number> = { ore: 0, scrap: 0, components: 0, alloy: 0 };

export function defaultMarket(): MarketState {
  return {
    tick: 1,
    supply: { ore: 0, scrap: 0, components: 0, alloy: 0 },
    lastPrices: { ore: BASE_SELL.ore, scrap: BASE_SELL.scrap, components: BASE_SELL.components, alloy: BASE_SELL.alloy },
    volumeSold: { ...EMPTY_VOL },
    volumeBought: { ...EMPTY_VOL },
    recentTrades: [],
  };
}

export function migrateMarket(m: Partial<MarketState>): MarketState {
  const base = defaultMarket();
  return {
    ...base,
    ...m,
    supply: { ...base.supply, ...m.supply },
    lastPrices: { ...base.lastPrices, ...m.lastPrices },
    volumeSold: { ...base.volumeSold, ...m.volumeSold },
    volumeBought: { ...base.volumeBought, ...m.volumeBought },
    recentTrades: m.recentTrades ?? [],
  };
}

export function logTrade(save: PlayerSave, entry: Omit<TradeLogEntry, "tick">): void {
  const log = { ...entry, tick: save.market.tick };
  save.market.recentTrades.unshift(log);
  if (save.market.recentTrades.length > 12) save.market.recentTrades.length = 12;
}

export function getSupplyLabel(supply: number): string {
  if (supply <= 2) return "Low supply";
  if (supply <= 12) return "Balanced";
  if (supply <= 30) return "Flooded";
  return "Glutted";
}

export function getMarketSummary(save: PlayerSave): {
  oreMined: number;
  wrecksSalvaged: number;
  totalEarned: number;
  totalSpent: number;
  netProfit: number;
} {
  return {
    oreMined: save.oreMined,
    wrecksSalvaged: save.wrecksSalvaged,
    totalEarned: save.totalEarned,
    totalSpent: save.totalSpent,
    netProfit: save.totalEarned - save.totalSpent,
  };
}

export function cargoWeight(cargo: Cargo): number {
  return cargo.ore + cargo.scrap + cargo.components * 3 + cargo.alloy * 2;
}

export function cargoMax(upgrades: ShipUpgrades, faction: FactionId): number {
  return Math.floor((20 + upgrades.cargo * 15) * FACTIONS[faction].cargoBonus);
}

export function hullMax(upgrades: ShipUpgrades, faction: FactionId): number {
  return Math.floor(100 + upgrades.hull * 25 * FACTIONS[faction].hullBonus);
}

function sellMod(faction: FactionId): number {
  return faction === "syndicate" ? 1.12 : 1;
}

function buyMod(faction: FactionId): number {
  return faction === "syndicate" ? 0.95 : 1;
}

function fuelMod(faction: FactionId): number {
  return faction === "voidwalkers" ? 0.85 : 1;
}

function repairMod(faction: FactionId): number {
  return faction === "ironcorps" ? 0.8 : 1;
}

function priceFor(market: MarketState, commodity: Commodity, mode: "sell" | "buy", faction: FactionId): number {
  const supplyPressure = market.supply[commodity] * 0.04;
  const base = mode === "sell" ? BASE_SELL[commodity] : BASE_BUY[commodity];
  const mod = mode === "sell" ? sellMod(faction) : buyMod(faction);
  const drift = Math.sin(market.tick * 0.7 + commodity.length) * 0.08;
  const pressure = mode === "sell" ? 1 - supplyPressure : 1 + supplyPressure * 0.5;
  return Math.max(1, Math.round(base * mod * pressure * (1 + drift)));
}

export interface CommodityQuoteExtended extends CommodityQuote {
  supply: number;
  supplyLabel: string;
  sold: number;
  bought: number;
  spread: number;
}

export function getQuotes(save: PlayerSave): CommodityQuoteExtended[] {
  const m = save.market;
  const names: Record<Commodity, string> = { ore: "Raw Ore", scrap: "Salvage Scrap", components: "Ship Parts", alloy: "Refined Alloy" };
  return (Object.keys(BASE_SELL) as Commodity[]).map((c) => {
    const sell = priceFor(m, c, "sell", save.faction);
    const buy = priceFor(m, c, "buy", save.faction);
    const last = m.lastPrices[c];
    const trend: CommodityQuote["trend"] = sell > last ? "up" : sell < last ? "down" : "flat";
    const supply = m.supply[c];
    return {
      commodity: c,
      name: names[c],
      sell,
      buy,
      held: save.cargo[c],
      trend,
      supply,
      supplyLabel: getSupplyLabel(supply),
      sold: m.volumeSold[c],
      bought: m.volumeBought[c],
      spread: buy - sell,
    };
  });
}

export function getServices(save: PlayerSave): ServiceQuote {
  const m = save.market;
  const drift = Math.sin(m.tick * 0.5) * 2;
  return {
    fuelUnit: Math.max(3, Math.round((12 + drift) * fuelMod(save.faction))),
    repairUnit: Math.max(2, Math.round((8 + drift) * repairMod(save.faction))),
    refineOre: 12,
    refineScrap: 18,
    dockFee: 15,
  };
}

export function advanceMarket(save: PlayerSave): void {
  const m = save.market;
  const quotes = getQuotes(save);
  for (const q of quotes) m.lastPrices[q.commodity] = q.sell;
  m.tick++;
  for (const c of Object.keys(m.supply) as Commodity[]) {
    m.supply[c] = Math.max(0, m.supply[c] - 0.5);
  }
}

export type TradeResult = { ok: true; message: string } | { ok: false; message: string };

export function sellCommodity(save: PlayerSave, commodity: Commodity, qty: number): TradeResult {
  if (qty <= 0) return { ok: false, message: "Invalid quantity" };
  if (save.cargo[commodity] < qty) return { ok: false, message: "Not enough cargo" };
  const price = priceFor(save.market, commodity, "sell", save.faction);
  const total = Math.round(price * qty * walletService.getSellMultiplier());
  save.cargo[commodity] -= qty;
  save.credits += total;
  save.market.supply[commodity] += qty;
  save.market.volumeSold[commodity] += qty;
  save.totalEarned += total;
  logTrade(save, { side: "sell", label: commodity, qty, total });
  const bonus = walletService.getSellMultiplier();
  const bonusNote = bonus > 1 ? ` (+${Math.round((bonus - 1) * 100)}% $SALVAGE)` : "";
  return { ok: true, message: `Sold ${qty} ${commodity} for ${total} CR (@ ${price}/ea)${bonusNote}` };
}

export function buyCommodity(save: PlayerSave, commodity: Commodity, qty: number): TradeResult {
  if (qty <= 0) return { ok: false, message: "Invalid quantity" };
  const price = priceFor(save.market, commodity, "buy", save.faction);
  const total = price * qty;
  if (save.credits < total) return { ok: false, message: "Insufficient credits" };
  const weight = commodity === "components" ? 3 : commodity === "alloy" ? 2 : 1;
  if (cargoWeight(save.cargo) + qty * weight > cargoMax(save.upgrades, save.faction)) {
    return { ok: false, message: "Cargo hold full" };
  }
  save.credits -= total;
  save.cargo[commodity] += qty;
  save.totalSpent += total;
  save.market.supply[commodity] = Math.max(0, save.market.supply[commodity] - qty * 0.5);
  save.market.volumeBought[commodity] += qty;
  logTrade(save, { side: "buy", label: commodity, qty, total });
  return { ok: true, message: `Bought ${qty} ${commodity} for ${total} CR` };
}

export function buyFuel(save: PlayerSave, units: number): TradeResult {
  if (units <= 0) return { ok: false, message: "Invalid amount" };
  const cost = getServices(save).fuelUnit * units;
  if (save.credits < cost) return { ok: false, message: "Insufficient credits" };
  const added = Math.min(units, 100 - save.fuel);
  if (added <= 0) return { ok: false, message: "Fuel tank full" };
  const actualCost = Math.ceil((added / units) * cost);
  save.credits -= actualCost;
  save.fuel += added;
  save.totalSpent += actualCost;
  logTrade(save, { side: "service", label: "fuel", qty: added, total: actualCost });
  return { ok: true, message: `Purchased ${added} fuel for ${actualCost} CR` };
}

export function buyRepair(save: PlayerSave, units: number): TradeResult {
  if (units <= 0) return { ok: false, message: "Invalid amount" };
  const max = hullMax(save.upgrades, save.faction);
  const needed = max - save.hull;
  if (needed <= 0) return { ok: false, message: "Hull already maxed" };
  const repair = Math.min(units, needed);
  const cost = getServices(save).repairUnit * repair;
  if (save.credits < cost) return { ok: false, message: "Insufficient credits" };
  save.credits -= cost;
  save.hull += repair;
  save.totalSpent += cost;
  logTrade(save, { side: "service", label: "repair", qty: repair, total: cost });
  return { ok: true, message: `Repaired ${repair} hull for ${cost} CR` };
}

export function refineOre(save: PlayerSave): TradeResult {
  const svc = getServices(save);
  if (save.cargo.ore < 5) return { ok: false, message: "Need 5 ore" };
  if (save.credits < svc.refineOre) return { ok: false, message: "Need 12 CR processing fee" };
  if (cargoWeight(save.cargo) + 2 > cargoMax(save.upgrades, save.faction)) return { ok: false, message: "Cargo full" };
  save.cargo.ore -= 5;
  save.cargo.alloy += 1;
  save.credits -= svc.refineOre;
  save.totalSpent += svc.refineOre;
  logTrade(save, { side: "refine", label: "ore→alloy", qty: 1, total: svc.refineOre });
  return { ok: true, message: "Refined 5 ore → 1 alloy" };
}

export function refineScrap(save: PlayerSave): TradeResult {
  const svc = getServices(save);
  if (save.cargo.scrap < 3 || save.cargo.ore < 1) return { ok: false, message: "Need 3 scrap + 1 ore" };
  if (save.credits < svc.refineScrap) return { ok: false, message: "Need 18 CR processing fee" };
  if (cargoWeight(save.cargo) + 2 > cargoMax(save.upgrades, save.faction)) return { ok: false, message: "Cargo full" };
  save.cargo.scrap -= 3;
  save.cargo.ore -= 1;
  save.cargo.alloy += 1;
  save.credits -= svc.refineScrap;
  save.totalSpent += svc.refineScrap;
  logTrade(save, { side: "refine", label: "scrap→alloy", qty: 1, total: svc.refineScrap });
  return { ok: true, message: "Refined 3 scrap + 1 ore → 1 alloy" };
}

export function payDockFee(save: PlayerSave): TradeResult {
  const fee = getServices(save).dockFee;
  if (save.credits < fee) return { ok: false, message: `Dock fee: ${fee} CR required` };
  save.credits -= fee;
  save.totalSpent += fee;
  return { ok: true, message: `Dock fee paid: ${fee} CR` };
}

export function netWorth(save: PlayerSave): number {
  const quotes = getQuotes(save);
  let cargoValue = 0;
  for (const q of quotes) cargoValue += q.held * q.sell;
  return save.credits + cargoValue + Math.round(save.fuel * 0.5);
}
