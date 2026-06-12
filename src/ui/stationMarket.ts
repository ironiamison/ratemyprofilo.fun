import type { Commodity } from "../game/types";
import type { PlayerSave } from "../game/types";
import { getQuotes, getServices, netWorth, cargoWeight, cargoMax } from "../game/economy";
import { FACTIONS, MAX_UPGRADE, UPGRADE_COSTS } from "../game/types";
import { claimableMissions } from "../game/missions";

function trendIcon(t: "up" | "down" | "flat"): string {
  return t === "up" ? "▲" : t === "down" ? "▼" : "—";
}

function commodityRow(c: ReturnType<typeof getQuotes>[0]): string {
  return `<div class="market-row">
    <div class="market-info">
      <div class="market-name">${c.name} <span class="trend trend-${c.trend}">${trendIcon(c.trend)}</span></div>
      <div class="market-detail">Hold: ${c.held} · Sell ${c.sell} · Buy ${c.buy}</div>
    </div>
    <div class="market-actions">
      <button class="btn-xs interactive" data-trade="sell" data-c="${c.commodity}" data-q="1">S1</button>
      <button class="btn-xs interactive" data-trade="sell" data-c="${c.commodity}" data-q="10">S10</button>
      <button class="btn-xs interactive" data-trade="sell" data-c="${c.commodity}" data-q="all">SALL</button>
      <button class="btn-xs interactive buy" data-trade="buy" data-c="${c.commodity}" data-q="1">B1</button>
      <button class="btn-xs interactive buy" data-trade="buy" data-c="${c.commodity}" data-q="5">B5</button>
    </div>
  </div>`;
}

export function renderStationHtml(save: PlayerSave): string {
  const quotes = getQuotes(save);
  const svc = getServices(save);
  const ready = claimableMissions(save);
  const worth = netWorth(save);
  const used = cargoWeight(save.cargo);
  const max = cargoMax(save.upgrades, save.faction);
  const f = FACTIONS[save.faction];

  const upgradeRow = (key: keyof PlayerSave["upgrades"], label: string) => {
    const lvl = save.upgrades[key];
    const maxLvl = MAX_UPGRADE[key];
    const cost = lvl < maxLvl ? UPGRADE_COSTS[key][lvl - 1] : null;
    const needsPart = lvl >= 2 && key !== "scanner";
    const hasPart = save.cargo.components >= 1;
    return `<div class="upgrade-row">
      <div><div class="upgrade-name">${label}</div>
        <div class="upgrade-lvl">Lv ${lvl}/${maxLvl}${needsPart && cost ? " · needs 1 part" : ""}</div></div>
      ${cost !== null
        ? `<button class="btn-sm interactive ${save.credits >= cost && (!needsPart || hasPart) ? "" : "disabled"}"
            data-upgrade="${key}">${cost} CR</button>`
        : `<span class="maxed">MAX</span>`}
    </div>`;
  };

  const missions = ready.length === 0
    ? `<p class="no-missions">No contracts ready.</p>`
    : ready.map((m) => `<div class="upgrade-row">
        <div><div class="upgrade-name">${m.title}</div><div class="upgrade-lvl">${m.desc}</div></div>
        <button class="btn-sm interactive claim" data-claim="${m.id}">+${m.reward} CR</button>
      </div>`).join("");

  const trades = save.market.recentTrades;
  const ledger = trades.length === 0
    ? `<p class="no-missions">No trades this cycle yet.</p>`
    : `<ul class="mkt-ledger">${trades.slice(0, 6).map((t) => `
        <li>
          <span class="mkt-ledger-side side-${t.side}">${t.side.toUpperCase()}</span>
          <span class="mkt-ledger-label">${t.label} ×${t.qty}</span>
          <span class="mkt-ledger-total">${t.side === "sell" ? "+" : "-"}${t.total} CR</span>
        </li>`).join("")}</ul>`;

  return `
    <div class="modal interactive">
      <div class="station-panel wide">
        <h2>OUTPOST K-7 — TRADE HUB</h2>
        <p class="station-sub">${f.name} rates active · Market cycle ${save.market.tick}</p>

        <div class="economy-bar">
          <span><strong>${save.credits}</strong> CR</span>
          <span>Net worth: <strong>${worth}</strong> CR</span>
          <span>Cargo: ${used}/${max}</span>
          <span>Earned ${save.totalEarned} · Spent ${save.totalSpent}</span>
        </div>

        <div class="station-tabs">
          <div class="station-section full">
            <h3>Commodity Exchange <span class="sub">prices shift when you sell</span></h3>
            ${quotes.map(commodityRow).join("")}
          </div>

          <div class="station-grid">
            <div class="station-section">
              <h3>Refinery</h3>
              <div class="upgrade-row">
                <div><div class="upgrade-name">Ore → Alloy</div><div class="upgrade-lvl">5 ore + ${svc.refineOre} CR → 1 alloy</div></div>
                <button class="btn-sm interactive" data-refine="ore">REFINE</button>
              </div>
              <div class="upgrade-row">
                <div><div class="upgrade-name">Scrap Fusion</div><div class="upgrade-lvl">3 scrap + 1 ore + ${svc.refineScrap} CR → 1 alloy</div></div>
                <button class="btn-sm interactive" data-refine="scrap">REFINE</button>
              </div>
            </div>

            <div class="station-section">
              <h3>Services</h3>
              <div class="upgrade-row">
                <div><div class="upgrade-name">Fuel</div><div class="upgrade-lvl">${svc.fuelUnit} CR/unit · ${Math.round(save.fuel)}%</div></div>
                <button class="btn-sm interactive" data-svc="fuel10">+10</button>
                <button class="btn-sm interactive" data-svc="fuel25">+25</button>
              </div>
              <div class="upgrade-row">
                <div><div class="upgrade-name">Hull Repair</div><div class="upgrade-lvl">${svc.repairUnit} CR/point</div></div>
                <button class="btn-sm interactive" data-svc="repair10">+10</button>
                <button class="btn-sm interactive" data-svc="repairmax">MAX</button>
              </div>
            </div>
          </div>

          <div class="station-grid">
            <div class="station-section">
              <h3>Ship Upgrades</h3>
              ${upgradeRow("engine", "Engine")}
              ${upgradeRow("hull", "Hull")}
              ${upgradeRow("cargo", "Cargo")}
              ${upgradeRow("scanner", "Scanner")}
            </div>
            <div class="station-section">
              <h3>Contracts</h3>
              ${missions}
            </div>
            <div class="station-section full">
              <h3>Trade ledger</h3>
              ${ledger}
            </div>
          </div>
        </div>

        <button class="btn btn-ghost interactive" id="btn-faq-station">FIELD MANUAL</button>
        <button class="btn btn-ghost interactive" id="btn-station-hub">← ORION HUB</button>
        <button class="btn interactive" id="btn-undock">UNDOCK</button>
      </div>
    </div>`;
}

export type TradeAction =
  | { type: "sell" | "buy"; commodity: Commodity; qty: number | "all" }
  | { type: "refine"; mode: "ore" | "scrap" }
  | { type: "svc"; mode: "fuel10" | "fuel25" | "repair10" | "repairmax" };

export function parseTradeAction(el: HTMLElement): TradeAction | null {
  if (el.dataset.refine) return { type: "refine", mode: el.dataset.refine as "ore" | "scrap" };
  if (el.dataset.svc) return { type: "svc", mode: el.dataset.svc as "fuel10" | "fuel25" | "repair10" | "repairmax" };
  if (el.dataset.trade && el.dataset.c) {
    const qty = el.dataset.q === "all" ? "all" : parseInt(el.dataset.q ?? "1", 10);
    return { type: el.dataset.trade as "sell" | "buy", commodity: el.dataset.c as Commodity, qty };
  }
  return null;
}
