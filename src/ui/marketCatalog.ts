import { walletService } from "../chain/wallet";
import type { CommodityQuoteExtended } from "../game/economy";
import type { Commodity, PlayerSave } from "../game/types";

export interface CommodityCard {
  commodity: Commodity;
  tagline: string;
  flavor: string;
  howToGet: string;
  whySell: string;
  uselessFact: string;
}

export const COMMODITY_CARDS: Record<Commodity, Omit<CommodityCard, "commodity">> = {
  ore: {
    tagline: "Space gravel with ambition",
    flavor: "Unprocessed rock chipped off asteroids. Station geologists insist it's 'technically valuable.'",
    howToGet: "Deploy to Sector K-7 · fly to a grey asteroid · hold SPACE to mine.",
    whySell: "Fastest early income. Every unit you sell floods supply and nudges prices down — economics, but stupider.",
    uselessFact: "Ore has never once been mistaken for dinner. Captains who try are no longer captains.",
  },
  scrap: {
    tagline: "Formerly someone's hull",
    flavor: "Bent panels, snapped struts, and the occasional still-blinking light. Legally ambiguous. Morally flexible.",
    howToGet: "TAB to scan wrecks · fly to red/orange beacons · hold E to strip the corpse.",
    whySell: "Pays better than ore per trip. Hazard wrecks drop rarer loot but eat your hull.",
    uselessFact: "The Syndicate classifies scrap as 'pre-owned premium materials.' Everyone else calls it trash.",
  },
  components: {
    tagline: "Still warm. Don't ask.",
    flavor: "Nav chips, coolant manifolds, and parts that absolutely used to belong to a living crew.",
    howToGet: "Salvage advanced wrecks (radiation/fuel hazards). Scanner level 2 helps find the good ones.",
    whySell: "Highest raw value per hold slot. Save for upgrades or flip when buy price spikes.",
    uselessFact: "Iron Corps recommends installing components immediately. Void Walkers recommend selling them immediately.",
  },
  alloy: {
    tagline: "Ore that went to finishing school",
    flavor: "Refined metal from the station refinery. Smells like profit, ozone, and mild regret.",
    howToGet: "Refinery panel → 5 ore + processing fee → 1 alloy. Or buy when the market panics.",
    whySell: "Mid-tier staple. Refine when ore is cheap and alloy sell price is up for easy margin.",
    uselessFact: "Nobody knows what alloy is used for. The exchange buys it anyway. Don't think about it.",
  },
};

export interface GuideStep {
  num: string;
  title: string;
  body: string;
}

export const MONEY_LOOP: GuideStep[] = [
  {
    num: "01",
    title: "Deploy & gather",
    body: "PLAY sends you into Sector K-7. Mine asteroids for ore. Strip wrecks for scrap and parts. Cargo space is finite — plan your route.",
  },
  {
    num: "02",
    title: "Sell at the exchange",
    body: "Open MARKET from Orion Station (or dock in-flight with G). Sell buttons turn cargo into Credits (CR). CR is off-chain play money — not $SALVAGE.",
  },
  {
    num: "03",
    title: "Watch the market",
    body: "Prices drift every cycle. Flooding one commodity lowers its sell price. Check trends (▲▼), supply bars, and your trade ledger before dumping everything.",
  },
  {
    num: "04",
    title: "Refine & reinvest",
    body: "Convert ore → alloy for better margins. Buy fuel and hull repairs here. Dock at K-7 in-sector for ship upgrades and mission payouts.",
  },
  {
    num: "05",
    title: "Repeat until legend",
    body: "Upgrade cargo to haul more. Upgrade engine to reach distant wrecks. Career profit = total earned − total spent. Negative profit is still a learning experience.",
  },
];

export function getPersonalizedTips(save: PlayerSave, quotes: CommodityQuoteExtended[]): string[] {
  const tips: string[] = [];
  const oreQ = quotes.find((q) => q.commodity === "ore");
  const scrapQ = quotes.find((q) => q.commodity === "scrap");
  const alloyQ = quotes.find((q) => q.commodity === "alloy");

  if (!save.tutorialComplete) {
    tips.push("Finish flight school first — the exchange works better when you're alive.");
  }

  if (save.cargo.ore > 0 && oreQ) {
    tips.push(
      `You hold ${save.cargo.ore} ore → sell now for up to ${(oreQ.sell * save.cargo.ore).toLocaleString()} CR at ${oreQ.sell} CR/unit.`
    );
  } else if (save.oreMined === 0) {
    tips.push("No ore yet: deploy, find a grey asteroid, hold SPACE until your hold beeps.");
  }

  if (save.cargo.scrap > 0 && scrapQ) {
    tips.push(`${save.cargo.scrap} scrap in hold · best dump price ${scrapQ.sell} CR (${scrapQ.trend === "up" ? "trending up — maybe wait" : "sell when broke"}).`);
  } else if (save.wrecksSalvaged === 0 && save.tutorialComplete) {
    tips.push("Zero wrecks salvaged. TAB scan → red beacon → hold E. That's where the real scrap is.");
  }

  if (save.cargo.ore >= 5 && alloyQ && oreQ) {
    const refineProfit = alloyQ.sell - oreQ.sell * 5 - 12;
    tips.push(
      refineProfit > 0
        ? `Refinery opportunity: 5 ore → 1 alloy could net ~${refineProfit} CR more than selling raw ore.`
        : `Refinery is underwater right now — sell ore raw or wait for alloy prices to climb.`
    );
  }

  if (save.credits < 40 && save.fuel < 30) {
    tips.push("Low credits AND fuel. Sell anything in cargo before you become a stationary monument.");
  }

  const best = quotes.reduce((a, b) => (b.sell > a.sell ? b : a));
  tips.push(`Best sell price this cycle: ${best.name} @ ${best.sell} CR (${best.supplyLabel.toLowerCase()} supply).`);

  if (walletService.tier === "veteran" || walletService.tier === "founder") {
    tips.push(`$SALVAGE holder bonus active: +${Math.round((walletService.getSellMultiplier() - 1) * 100)}% on all sells.`);
  }

  const profit = save.totalEarned - save.totalSpent;
  if (profit > 0) {
    tips.push(`Career profit: +${profit.toLocaleString()} CR. The void is mildly impressed.`);
  } else if (save.totalSpent > 0) {
    tips.push(`Career profit: ${profit.toLocaleString()} CR. You're investing in experience. Very expensive experience.`);
  }

  if (save.market.recentTrades.length === 0 && save.tutorialComplete) {
    tips.push("Trade ledger empty — your first sale writes history. S1 on ore is a valid life choice.");
  }

  return tips.slice(0, 5);
}

export function buildCommodityCard(quote: CommodityQuoteExtended): CommodityCard {
  return { commodity: quote.commodity, ...COMMODITY_CARDS[quote.commodity] };
}
