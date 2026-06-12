import type { ShipShapeId } from "./shipShapes";

/** Relative flight tuning per hull — used in sector physics only. */
const FLIGHT: Record<ShipShapeId, { thrust: number; speed: number; turn: number }> = {
  needle: { thrust: 140, speed: 220, turn: 110 },
  hauler: { thrust: 120, speed: 160, turn: 70 },
  wedge: { thrust: 155, speed: 240, turn: 125 },
  brick: { thrust: 105, speed: 140, turn: 55 },
  hammer: { thrust: 130, speed: 175, turn: 85 },
};

const BASE = FLIGHT.hauler;

export interface ShapeFlightMods {
  thrustMul: number;
  speedMul: number;
  turnMul: number;
}

export function getShapeFlightMods(shape: ShipShapeId): ShapeFlightMods {
  const s = FLIGHT[shape];
  return {
    thrustMul: s.thrust / BASE.thrust,
    speedMul: s.speed / BASE.speed,
    turnMul: s.turn / BASE.turn,
  };
}
