import { cargoWeight, logTrade } from "./economy";
import type { Cargo, PlayerSave } from "./types";

/** Fuel gained per cargo mass unit when burning the entire hold. */
export const CARGO_TO_FUEL_RATE = 5;

export function previewFuelFromCargo(save: PlayerSave): number {
  return Math.min(100 - save.fuel, Math.floor(cargoWeight(save.cargo) * CARGO_TO_FUEL_RATE));
}

export function burnAllCargoForFuel(save: PlayerSave): { ok: boolean; message: string; gain: number } {
  const weight = cargoWeight(save.cargo);
  if (weight <= 0) return { ok: false, message: "No cargo to burn", gain: 0 };
  if (save.fuel >= 100) return { ok: false, message: "Fuel tank already full", gain: 0 };

  const gain = previewFuelFromCargo(save);
  if (gain <= 0) return { ok: false, message: "Cannot convert cargo", gain: 0 };

  const burned: Cargo = { ...save.cargo };
  save.cargo = { ore: 0, scrap: 0, components: 0, alloy: 0 };
  save.fuel = Math.min(100, save.fuel + gain);
  logTrade(save, { side: "service", label: "cargo burn", qty: gain, total: 0 });
  const parts = Object.entries(burned)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ");
  return {
    ok: true,
    message: `Burned ${parts || "cargo"} → +${gain} emergency fuel`,
    gain,
  };
}
