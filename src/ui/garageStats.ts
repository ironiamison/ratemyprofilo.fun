import type { ShipShapeId } from "../game/shipShapes";

export interface ShipStatBlock {
  slotLabel: string;
  mass: number;
  energy: number;
  thrust: number;
  shield: number;
  cargo: number;
  speed: number;
  turn: number;
  jump: number;
  equipped: string[];
}

export const SHAPE_STATS: Record<ShipShapeId, ShipStatBlock> = {
  needle: {
    slotLabel: "SCOUT MK1",
    mass: 82,
    energy: 95,
    thrust: 140,
    shield: 60,
    cargo: 18,
    speed: 220,
    turn: 110,
    jump: 18,
    equipped: ["Scout Cockpit", "Light Hull", "Twin Thrusters", "Basic Scanner"],
  },
  hauler: {
    slotLabel: "HAULER",
    mass: 148,
    energy: 85,
    thrust: 120,
    shield: 80,
    cargo: 42,
    speed: 160,
    turn: 70,
    jump: 12,
    equipped: ["Scavenger Cockpit", "Reinforced Hull", "Cargo Bays", "Mining Laser"],
  },
  wedge: {
    slotLabel: "FIGHTER",
    mass: 96,
    energy: 90,
    thrust: 155,
    shield: 72,
    cargo: 14,
    speed: 240,
    turn: 125,
    jump: 16,
    equipped: ["Fighter Canopy", "Delta Wings", "Afterburner", "Pulse Scanner"],
  },
  brick: {
    slotLabel: "FREIGHTER",
    mass: 172,
    energy: 78,
    thrust: 105,
    shield: 95,
    cargo: 48,
    speed: 140,
    turn: 55,
    jump: 10,
    equipped: ["Block Bridge", "Armored Plating", "Heavy Cargo", "Docking Clamps"],
  },
  hammer: {
    slotLabel: "GUNBOAT",
    mass: 134,
    energy: 88,
    thrust: 130,
    shield: 88,
    cargo: 22,
    speed: 175,
    turn: 85,
    jump: 14,
    equipped: ["Command Pod", "Boom Arms", "Dual Drives", "Tactical Array"],
  },
};

export const HULL_OPTIONS: {
  id: ShipShapeId;
  label: string;
  role: string;
  icon: string;
}[] = [
  { id: "needle", label: "SCOUT MK1", role: "Fast scout · light cargo", icon: "◆" },
  { id: "hauler", label: "HAULER", role: "Mining & salvage workhorse", icon: "▣" },
  { id: "wedge", label: "FIGHTER", role: "High speed · agile", icon: "▲" },
  { id: "brick", label: "FREIGHTER", role: "Max cargo · heavy armor", icon: "■" },
  { id: "hammer", label: "GUNBOAT", role: "Wreck grapples · wide reach", icon: "⊞" },
];

export const GARAGE_SLOTS: { id: ShipShapeId; label: string }[] = [
  { id: "needle", label: "SCOUT MK1" },
  { id: "hauler", label: "HAULER" },
  { id: "wedge", label: "FIGHTER" },
];
