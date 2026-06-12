import { WRECK_DEFS, type PlayerSave } from "./types";

export interface MissionDef {
  id: string;
  title: string;
  desc: string;
  reward: number;
  check: (s: PlayerSave) => boolean;
}

function totalSold(save: PlayerSave): number {
  return Object.values(save.market.volumeSold).reduce((a, b) => a + b, 0);
}

function salvagedHazard(save: PlayerSave): boolean {
  return WRECK_DEFS.some((w) => w.hazard && save.salvagedWreckIds.includes(w.id));
}

export const MISSIONS: MissionDef[] = [
  { id: "scan", title: "Ping the Void", desc: "Use TAB to scan sector", reward: 40, check: (s) => s.hasScanned },
  { id: "mine", title: "Rock Hound", desc: "Mine 20 ore total", reward: 80, check: (s) => s.oreMined >= 20 },
  { id: "salvage1", title: "First Blood", desc: "Salvage any wreck", reward: 100, check: (s) => s.wrecksSalvaged >= 1 },
  { id: "dock", title: "Home Port", desc: "Dock at Outpost K-7", reward: 60, check: (s) => s.hasDocked },
  { id: "trade", title: "Market Runner", desc: "Sell cargo at K-7", reward: 90, check: (s) => totalSold(s) > 0 },
  { id: "salvage3", title: "Grave Robber", desc: "Salvage 3 wrecks", reward: 200, check: (s) => s.wrecksSalvaged >= 3 },
  { id: "alloy", title: "Smelter", desc: "Hold 2 alloy in cargo", reward: 120, check: (s) => s.cargo.alloy >= 2 },
  { id: "hazard", title: "Hot Salvage", desc: "Salvage a hazardous wreck", reward: 180, check: salvagedHazard },
  { id: "salvage5", title: "Sector Sweeper", desc: "Salvage all 5 wrecks", reward: 500, check: (s) => s.wrecksSalvaged >= 5 },
  { id: "rich", title: "Payday", desc: "Hold 400 credits", reward: 150, check: (s) => s.credits >= 400 },
  { id: "tycoon", title: "Big Score", desc: "Earn 1000 CR lifetime", reward: 250, check: (s) => s.totalEarned >= 1000 },
];

export function getActiveMission(save: PlayerSave): MissionDef | null {
  const ready = claimableMissions(save);
  if (ready.length > 0) return ready[0];
  return MISSIONS.find((m) => !save.claimedMissions.includes(m.id) && !m.check(save)) ?? null;
}

export function claimableMissions(save: PlayerSave): MissionDef[] {
  return MISSIONS.filter((m) => !save.claimedMissions.includes(m.id) && m.check(save));
}

export function claimMission(save: PlayerSave, id: string): number {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m || save.claimedMissions.includes(id) || !m.check(save)) return 0;
  save.claimedMissions.push(id);
  save.credits += m.reward;
  save.totalEarned += m.reward;
  return m.reward;
}
