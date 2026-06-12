export type HolderTier = "none" | "holder" | "veteran" | "founder";

const VETERAN_MIN = 100_000;
const FOUNDER_MIN = 1_000_000;

export function tierFromBalance(balance: number): HolderTier {
  if (balance >= FOUNDER_MIN) return "founder";
  if (balance >= VETERAN_MIN) return "veteran";
  if (balance > 0) return "holder";
  return "none";
}

export function tierLabel(tier: HolderTier): string {
  if (tier === "founder") return "FOUNDER";
  if (tier === "veteran") return "VETERAN HOLDER";
  if (tier === "holder") return "TOKEN HOLDER";
  return "NO HOLDINGS";
}

export function sellMultiplier(tier: HolderTier): number {
  if (tier === "founder") return 1.1;
  if (tier === "veteran") return 1.05;
  return 1;
}

export function isSkinUnlocked(skinId: string, tier: HolderTier): boolean {
  if (skinId === "salvage") return tier !== "none";
  return true;
}

export function getPerkLines(tier: HolderTier): string[] {
  if (tier === "founder") {
    return ["$SALVAGE paint unlocked", "+10% market sell bonus", "Founder badge on home"];
  }
  if (tier === "veteran") {
    return ["$SALVAGE paint unlocked", "+5% market sell bonus", "Holder badge on home"];
  }
  if (tier === "holder") {
    return ["$SALVAGE paint unlocked", "Holder badge on home"];
  }
  return ["Hold any $SALVAGE → exclusive paint", "100K+ → +5% sells · 1M+ → +10%"];
}
