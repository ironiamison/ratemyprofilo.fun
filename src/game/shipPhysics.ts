import { SHAPE_STATS } from "../ui/garageStats";
import type { ShipShapeId } from "./shipShapes";

const BASE = SHAPE_STATS.hauler;

export interface ShapeFlightMods {
  thrustMul: number;
  speedMul: number;
  turnMul: number;
}

export function getShapeFlightMods(shape: ShipShapeId): ShapeFlightMods {
  const s = SHAPE_STATS[shape];
  return {
    thrustMul: s.thrust / BASE.thrust,
    speedMul: s.speed / BASE.speed,
    turnMul: s.turn / BASE.turn,
  };
}
