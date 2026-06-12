export interface PumpStats {
  symbol: string;
  priceUsd: number | null;
  marketCap: number | null;
  priceChange24h: number | null;
}

export async function fetchPumpStats(mint: string): Promise<PumpStats | null> {
  if (!mint) return null;
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (!res.ok) return null;
    const json = await res.json();
    const pair = json.pairs?.[0];
    if (!pair) return null;
    return {
      symbol: pair.baseToken?.symbol ?? "SALVAGE",
      priceUsd: pair.priceUsd != null ? parseFloat(pair.priceUsd) : null,
      marketCap: pair.marketCap ?? pair.fdv ?? null,
      priceChange24h: pair.priceChange?.h24 ?? null,
    };
  } catch {
    return null;
  }
}

export function formatUsd(n: number | null): string {
  if (n == null) return "—";
  if (n < 0.0001) return `$${n.toExponential(2)}`;
  if (n < 1) return `$${n.toFixed(6)}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
}

export function formatMcap(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

export function formatBalance(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(2);
}
