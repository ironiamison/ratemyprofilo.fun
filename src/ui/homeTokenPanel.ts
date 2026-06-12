import { mintConfigured, PUMP_URL } from "../chain/config";
import { getPerkLines, tierLabel, type HolderTier } from "../chain/holderPerks";
import { formatBalance, formatMcap, formatUsd } from "../chain/pumpPrice";
import { walletService } from "../chain/wallet";

export interface HomeTokenView {
  symbol: string;
  priceUsd: number | null;
  marketCap: number | null;
  priceChange24h: number | null;
  connected: boolean;
  walletShort: string;
  balance: number;
  tier: HolderTier;
}

export function buildHomeTokenView(
  stats?: { symbol: string; priceUsd: number | null; marketCap: number | null; priceChange24h: number | null } | null
): HomeTokenView {
  return {
    symbol: stats?.symbol ?? "SALVAGE",
    priceUsd: stats?.priceUsd ?? null,
    marketCap: stats?.marketCap ?? null,
    priceChange24h: stats?.priceChange24h ?? null,
    connected: walletService.connected,
    walletShort: walletService.shortAddress(walletService.publicKey),
    balance: walletService.balance,
    tier: walletService.tier,
  };
}

export function renderTokenPanel(view: HomeTokenView): string {
  const perks = getPerkLines(view.tier);
  const tierBadge =
    view.tier !== "none"
      ? `<span class="token-tier token-tier-${view.tier}">${tierLabel(view.tier)}</span>`
      : "";

  const change =
    view.priceChange24h != null
      ? `<span class="token-change ${view.priceChange24h >= 0 ? "up" : "down"}">${view.priceChange24h >= 0 ? "+" : ""}${view.priceChange24h.toFixed(1)}%</span>`
      : "";

  const walletBlock = view.connected
    ? `<div class="token-wallet">
        <div class="token-wallet-info">
          <span class="token-wallet-addr">${view.walletShort}</span>
          <span class="token-wallet-meta">
            <span class="token-wallet-bal">${formatBalance(view.balance)} $${view.symbol}</span>
            ${tierBadge}
          </span>
        </div>
        <button class="token-btn token-btn-ghost token-btn-disconnect interactive" id="btn-disconnect-wallet" type="button">DISCONNECT</button>
      </div>`
    : `<button class="token-btn token-btn-connect interactive" id="btn-connect-wallet" type="button">CONNECT</button>`;

  const setupNote = !mintConfigured
    ? `<p class="token-setup">Set <code>VITE_PUMP_MINT</code> in <code>.env</code> to enable live price & perks.</p>`
    : "";

  const buyBtn = PUMP_URL
    ? `<a class="token-btn token-btn-buy interactive" id="btn-buy-pump" href="${PUMP_URL}" target="_blank" rel="noopener noreferrer">BUY ON PUMP.FUN</a>`
    : "";

  return `
    <aside class="home-token interactive" id="home-token-panel">
      <div class="token-header">
        <span class="token-ticker">$${view.symbol}</span>
        <span class="token-live">LIVE</span>
      </div>
      <div class="token-price-row">
        <span class="token-price" id="token-price">${formatUsd(view.priceUsd)}</span>
        ${change}
      </div>
      <div class="token-mcap" id="token-mcap">MCAP ${formatMcap(view.marketCap)}</div>
      <div class="token-actions">
        ${buyBtn}
        ${walletBlock}
      </div>
      <ul class="token-perks" id="token-perks">
        ${perks.map((p) => `<li>${p}</li>`).join("")}
      </ul>
      ${setupNote}
      <p class="token-note">In-game credits (CR) stay off-chain · $SALVAGE is the community token</p>
    </aside>`;
}

export function patchTokenPanel(view: HomeTokenView): void {
  const price = document.getElementById("token-price");
  if (price) price.textContent = formatUsd(view.priceUsd);
  const mcap = document.getElementById("token-mcap");
  if (mcap) mcap.textContent = `MCAP ${formatMcap(view.marketCap)}`;
}
