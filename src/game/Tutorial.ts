import type { Sector } from "../world/Sector";
import type { PlayerSave } from "./types";

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  hint: string;
  check: (save: PlayerSave, sector: Sector) => boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "fly",
    title: "Take the controls",
    body: "You're in the training lane above Sector K-7. Learn to fly before heading into the scrap field.",
    hint: "WASD to steer · W thrust · Shift boost",
    check: (_s, sector) => sector.ship.velocity.length() > 4,
  },
  {
    id: "scan",
    title: "Ping the void",
    body: "Wrecks don't show on radar until you scan. Scavengers who fly blind don't fly long.",
    hint: "Press TAB to scan the sector",
    check: (s) => s.hasScanned,
  },
  {
    id: "mine",
    title: "Strip the rock",
    body: "Ore pays the bills. Fly toward the gold beacons — training asteroids are dead ahead.",
    hint: "Fly to the gold beacon · hold SPACE within 14m to mine",
    check: (s) => s.cargo.ore > 0 || s.oreMined > 0,
  },
  {
    id: "salvage",
    title: "Loot the dead",
    body: "Wrecks hold scrap and ship parts. The red beacon marks your training target.",
    hint: "Hold E near the wreck to salvage",
    check: (s) => s.cargo.scrap > 0 || s.wrecksSalvaged > 0,
  },
  {
    id: "dock",
    title: "Home port",
    body: "Outpost K-7 buys your cargo and refuels your hull. Dock to finish training.",
    hint: "Fly to the green beacon · Press G to dock",
    check: (s) => s.hasDocked,
  },
];

export class TutorialController {
  stepIndex = 0;
  finished = false;

  get step(): TutorialStep {
    return TUTORIAL_STEPS[Math.min(this.stepIndex, TUTORIAL_STEPS.length - 1)];
  }

  get progress(): number {
    return (this.stepIndex + (this.finished ? 1 : 0)) / TUTORIAL_STEPS.length;
  }

  update(save: PlayerSave, sector: Sector): boolean {
    if (this.finished) return false;
    const current = TUTORIAL_STEPS[this.stepIndex];
    if (!current.check(save, sector)) return false;
    if (this.stepIndex < TUTORIAL_STEPS.length - 1) {
      this.stepIndex++;
      return true;
    }
    this.finished = true;
    return true;
  }
}
