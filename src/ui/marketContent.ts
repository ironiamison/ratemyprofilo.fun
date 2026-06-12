import { getCommodityIconUrl } from "../assets/commodityArt";
import { cargoMax, cargoWeight, getMarketSummary, getQuotes, getServices, netWorth } from "../game/economy";
import { FACTIONS, type PlayerSave } from "../game/types";
import { buildCommodityCard, getPersonalizedTips, MONEY_LOOP } from "./marketCatalog";

function trendIcon(t: "up" | "down" | "flat"): string {
  return t === "up" ? "▲" : t === "down" ? "▼" : "—";
}

function trendLabel(t: "up" | "down" | "flat"): string {
  return t === "up" ? "Rising" : t === "down" ? "Falling" : "Flat";
}

export function renderMarketHtml(save: PlayerSave): string {
  const quotes = getQuotes(save);
  const svc = getServices(save);
  const f = FACTIONS[save.faction];
  const worth = netWorth(save);
  const used = cargoWeight(save.cargo);
  const max = cargoMax(save.upgrades, save.faction);
  const summary = getMarketSummary(save);
  const trades = save.market.recentTrades;
  const tips = getPersonalizedTips(save, quotes);

  const cards = quotes
    .map((q) => {
      const meta = buildCommodityCard(q);
      const icon = getCommodityIconUrl(q.commodity);
      const supplyPct = Math.min(100, q.supply * 3);
      const sellAll = q.held > 0 ? q.sell * q.held : 0;

      return `
        <article class="mkt-card" data-commodity="${q.commodity}">
          <div class="mkt-card-top">
            <div class="mkt-card-art">
              <img src="${icon}" alt="${meta.tagline}" width="72" height="72" />
              <span class="mkt-card-held">${q.held} in hold</span>
            </div>
            <div class="mkt-card-head">
              <h3>${q.name}</h3>
              <p class="mkt-card-tag">${meta.tagline}</p>
              <p class="mkt-card-flavor">${meta.flavor}</p>
            </div>
          </div>

          <div class="mkt-card-prices">
            <div class="mkt-card-price sell">
              <label>Sell</label>
              <strong>${q.sell} CR</strong>
              ${q.held > 0 ? `<small>all → ${sellAll.toLocaleString()} CR</small>` : ""}
            </div>
            <div class="mkt-card-price buy">
              <label>Buy</label>
              <strong>${q.buy} CR</strong>
              <small>spread +${q.spread}</small>
            </div>
            <div class="mkt-card-price trend trend-${q.trend}">
              <label>${trendLabel(q.trend)}</label>
              <strong>${trendIcon(q.trend)}</strong>
              <small>cycle ${save.market.tick}</small>
            </div>
          </div>

          <div class="mkt-card-supply">
            <div class="mkt-supply-bar"><div style="width:${supplyPct}%"></div></div>
            <span>${q.supplyLabel} · ${Math.round(q.supply)} units flooded · you moved ${q.sold} sold / ${q.bought} bought</span>
          </div>

          <dl class="mkt-card-meta">
            <div><dt>How to get</dt><dd>${meta.howToGet}</dd></div>
            <div><dt>Why sell</dt><dd>${meta.whySell}</dd></div>
            <div class="mkt-useless"><dt>Useless fact</dt><dd>${meta.uselessFact}</dd></div>
          </dl>

          <div class="mkt-card-actions">
            <button class="mkt-btn interactive" data-trade="sell" data-c="${q.commodity}" data-q="1">SELL 1</button>
            <button class="mkt-btn interactive" data-trade="sell" data-c="${q.commodity}" data-q="10">SELL 10</button>
            <button class="mkt-btn interactive" data-trade="sell" data-c="${q.commodity}" data-q="all">SELL ALL</button>
            <button class="mkt-btn mkt-btn-buy interactive" data-trade="buy" data-c="${q.commodity}" data-q="1">BUY 1</button>
            <button class="mkt-btn mkt-btn-buy interactive" data-trade="buy" data-c="${q.commodity}" data-q="5">BUY 5</button>
          </div>
        </article>`;
    })
    .join("");

  const loopSteps = MONEY_LOOP.map(
    (s) => `
      <div class="mkt-guide-step">
        <span class="mkt-guide-num">${s.num}</span>
        <div>
          <strong>${s.title}</strong>
          <p>${s.body}</p>
        </div>
      </div>`
  ).join("");

  const tipItems = tips.map((t) => `<li>${t}</li>`).join("");

  const ledger =
    trades.length === 0
      ? `<p class="mkt-empty">No trades logged yet. Your cargo is theoretical wealth until you click SELL.</p>`
      : `<ul class="mkt-ledger">${trades
          .map(
            (t) => `
        <li>
          <span class="mkt-ledger-side side-${t.side}">${t.side.toUpperCase()}</span>
          <span class="mkt-ledger-label">${t.label} ×${t.qty}</span>
          <span class="mkt-ledger-total">${t.side === "sell" ? "+" : "-"}${t.total} CR</span>
          <span class="mkt-ledger-tick">cycle ${t.tick}</span>
        </li>`
          )
          .join("")}</ul>`;

  return `
    <div class="market-screen interactive">
      <div class="market-terminal">
        <header class="mkt-header">
          <button class="mkt-back interactive" id="btn-market-back">← HUB</button>
          <div class="mkt-brand">
            <span class="mkt-brand-tag">ORION EXCHANGE</span>
            <h1 class="mkt-title">SECTOR K-7 COMMODITIES</h1>
            <p class="mkt-sub">Real prices from your save · Real cargo · Real questionable life choices</p>
          </div>
          <button class="mkt-deploy interactive" id="btn-market-deploy">DEPLOY TO SECTOR</button>
        </header>

        <div class="mkt-stats">
          <div class="mkt-stat"><label>Balance</label><strong>${save.credits.toLocaleString()} CR</strong></div>
          <div class="mkt-stat"><label>Net worth</label><strong>${worth.toLocaleString()} CR</strong></div>
          <div class="mkt-stat"><label>Cargo</label><strong>${used} / ${max}</strong></div>
          <div class="mkt-stat"><label>Career profit</label><strong class="${summary.netProfit >= 0 ? "pos" : "neg"}">${summary.netProfit >= 0 ? "+" : ""}${summary.netProfit.toLocaleString()} CR</strong></div>
          <div class="mkt-stat"><label>Ore mined (career)</label><strong>${summary.oreMined}</strong></div>
          <div class="mkt-stat"><label>Wrecks stripped</label><strong>${summary.wrecksSalvaged}</strong></div>
          <div class="mkt-stat"><label>Market cycle</label><strong>#${save.market.tick}</strong></div>
          <div class="mkt-stat"><label>Faction perk</label><strong style="color:#${f.color.toString(16).padStart(6, "0")}">${f.bonus}</strong></div>
        </div>

        <div class="mkt-body">
          <div class="mkt-main">
            <section class="mkt-guide">
              <div class="mkt-guide-header">
                <h2>SALVAGER'S HANDBOOK</h2>
                <p>How to turn space trash into Credits (CR) — explained like flight school, but for greed.</p>
              </div>
              <div class="mkt-guide-steps">${loopSteps}</div>
              <div class="mkt-guide-tips">
                <h3>Your situation right now</h3>
                <ul>${tipItems}</ul>
              </div>
            </section>

            <section class="mkt-cards">
              <h2 class="mkt-cards-title">COMMODITY FLOOR</h2>
              <div class="mkt-cards-grid">${cards}</div>
            </section>
          </div>

          <aside class="mkt-aside">
            <section class="mkt-panel">
              <h2>Trade ledger</h2>
              <p class="mkt-panel-desc">Every buy, sell, and refinery run you've actually made.</p>
              ${ledger}
            </section>

            <section class="mkt-panel mkt-panel-refine">
              <h2>Refinery</h2>
              <p class="mkt-panel-desc">Turn cheap inputs into slightly less cheap outputs. Science.</p>
              <div class="mkt-service mkt-service-rich">
                <img src="${getCommodityIconUrl("alloy")}" alt="" width="40" height="40" class="mkt-svc-icon" />
                <div>
                  <strong>Ore → Alloy</strong>
                  <small>Costs 5 ore + ${svc.refineOre} CR · you have ${save.cargo.ore} ore</small>
                  <span class="mkt-svc-note">Alloy sells higher per slot — check card prices first.</span>
                </div>
                <button class="mkt-btn interactive" data-refine="ore">RUN</button>
              </div>
              <div class="mkt-service mkt-service-rich">
                <img src="${getCommodityIconUrl("components")}" alt="" width="40" height="40" class="mkt-svc-icon" />
                <div>
                  <strong>Scrap fusion</strong>
                  <small>3 scrap + 1 ore + ${svc.refineScrap} CR → 1 alloy</small>
                  <span class="mkt-svc-note">Desperate times. Desperate chemistry.</span>
                </div>
                <button class="mkt-btn interactive" data-refine="scrap">RUN</button>
              </div>
            </section>

            <section class="mkt-panel">
              <h2>Station services</h2>
              <p class="mkt-panel-desc">Stay alive to spend your profits.</p>
              <div class="mkt-service">
                <div>
                  <strong>Fuel</strong>
                  <small>${svc.fuelUnit} CR per unit · tank ${Math.round(save.fuel)}%</small>
                </div>
                <div class="mkt-svc-row">
                  <button class="mkt-btn interactive" data-svc="fuel10">+10</button>
                  <button class="mkt-btn interactive" data-svc="fuel25">+25</button>
                </div>
              </div>
              <div class="mkt-service">
                <div>
                  <strong>Hull repair</strong>
                  <small>${svc.repairUnit} CR per point · ${Math.round(save.hull)}% integrity</small>
                </div>
                <div class="mkt-svc-row">
                  <button class="mkt-btn interactive" data-svc="repair10">+10</button>
                  <button class="mkt-btn interactive" data-svc="repairmax">MAX</button>
                </div>
              </div>
            </section>

            <p class="mkt-foot">CR = in-game credits (off-chain). $SALVAGE = community token (home screen). spacesalvagers.com · Selling floods supply and lowers prices next cycle. Ship upgrades need docking at K-7 in-sector (G).</p>
          </aside>
        </div>
      </div>
    </div>`;
}
