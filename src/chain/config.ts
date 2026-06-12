export const PUMP_MINT = (import.meta.env.VITE_PUMP_MINT ?? "").trim();
export const PUMP_URL =
  (import.meta.env.VITE_PUMP_URL ?? "").trim() ||
  (PUMP_MINT ? `https://pump.fun/coin/${PUMP_MINT}` : "");
export const SOLANA_RPC =
  (import.meta.env.VITE_SOLANA_RPC ?? "").trim() || "https://api.mainnet-beta.solana.com";

export const mintConfigured = PUMP_MINT.length >= 32;
