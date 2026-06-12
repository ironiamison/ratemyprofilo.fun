import type { MissionDef } from "./missions";
import type { PlayerSave } from "./types";

function totalSold(save: PlayerSave): number {
  return Object.values(save.market.volumeSold).reduce((a, b) => a + b, 0);
}

export function getMissionProgress(save: PlayerSave, mission: MissionDef): string | null {
  if (mission.check(save) && !save.claimedMissions.includes(mission.id)) {
    return "Ready — claim at K-7";
  }

  switch (mission.id) {
    case "mine":
      return `${Math.min(save.oreMined, 20)}/20 ore`;
    case "salvage1":
      return `${Math.min(save.wrecksSalvaged, 1)}/1 wrecks`;
    case "salvage3":
      return `${Math.min(save.wrecksSalvaged, 3)}/3 wrecks`;
    case "salvage5":
      return `${Math.min(save.wrecksSalvaged, 5)}/5 wrecks`;
    case "rich":
      return `${save.credits}/400 CR`;
    case "tycoon":
      return `${save.totalEarned}/1000 CR`;
    case "alloy":
      return `${save.cargo.alloy}/2 alloy`;
    case "trade":
      return totalSold(save) > 0 ? "Sold" : "Sell at market";
    case "hazard":
      return "Mournful or Gilded Lie";
    case "scan":
      return save.hasScanned ? "Scanned" : "Press TAB";
    case "dock":
      return save.hasDocked ? "Docked" : "Fly to K-7";
    default:
      return null;
  }
}
