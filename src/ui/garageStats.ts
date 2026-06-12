import { cargoMax, hullMax } from "../game/economy";
import { getShapeFlightMods } from "../game/shipPhysics";
import type { FactionId, PlayerSave } from "../game/types";
import { SHIP_SHAPES, type ShipShapeId } from "../game/shipShapes";

export interface ShipStatBlock {
  slotLabel: string;
  cargo: number;
  equipped: string[];
  mineLabel: string;
}

export interface LiveGarageStats {
  label: string;
  tag: string;
  cargo: number;
  cargoMax: number;
  hull: number;
  maxSpeed: number;
  turnRate: number;
  thrust: number;
  scanRange: number;
  mineLabel: string;
  equipped: string[];
}

export const SHAPE_STATS: Record<ShipShapeId, ShipStatBlock> = {
  needle: {
    slotLabel: "SCOUT MK1",
    cargo: 18,
    mineLabel: "Light drill",
    equipped: ["Scout Cockpit", "Light Hull", "Twin Thrusters", "Basic Scanner"],
  },
  hauler: {
    slotLabel: "HAULER",
    cargo: 42,
    mineLabel: "Standard drill",
    equipped: ["Scavenger Cockpit", "Reinforced Hull", "Cargo Bays", "Mining Laser"],
  },
  wedge: {
    slotLabel: "FIGHTER",
    cargo: 14,
    mineLabel: "Fast drill",
    equipped: ["Fighter Canopy", "Delta Wings", "Afterburner", "Pulse Scanner"],
  },
  brick: {
    slotLabel: "FREIGHTER",
    cargo: 48,
    mineLabel: "Heavy drill",
    equipped: ["Block Bridge", "Armored Plating", "Heavy Cargo", "Docking Clamps"],
  },
  hammer: {
    slotLabel: "GUNBOAT",
    cargo: 22,
    mineLabel: "Salvage rig",
    equipped: ["Command Pod", "Boom Arms", "Dual Drives", "Tactical Array"],
  },
};

export function computeLiveGarageStats(
  save: PlayerSave,
  shape: ShipShapeId,
  faction: FactionId
): LiveGarageStats {
  const meta = SHAPE_STATS[shape];
  const mods = getShapeFlightMods(shape);
  const engine = save.upgrades.engine;
  const scanner = save.upgrades.scanner;
  const haulerCargo = SHAPE_STATS.hauler.cargo;
  const cargoCap = Math.max(8, Math.floor(cargoMax(save.upgrades, faction) * (meta.cargo / haulerCargo)));

  return {
    label: meta.slotLabel,
    tag: SHIP_SHAPES[shape].tag,
    cargo: cargoCap,
    cargoMax: cargoCap,
    hull: hullMax(save.upgrades, faction),
    maxSpeed: Math.round((52 + engine * 8) * mods.speedMul),
    turnRate: Math.round(((2.5 + engine * 0.2) * mods.turnMul) * 36),
    thrust: Math.round((42 + engine * 10) * mods.thrustMul),
    scanRange: 60 + scanner * 30,
    mineLabel: meta.mineLabel,
    equipped: meta.equipped,
  };
}

export function renderGarageStatBar(stats: LiveGarageStats): string {
  return `
    <div class="gar-stat"><span class="gar-stat-ico">📦</span>${stats.cargo}<small> cargo</small></div>
    <div class="gar-stat"><span class="gar-stat-ico">🛡</span>${stats.hull}<small> hull</small></div>
    <div class="gar-stat"><span class="gar-stat-ico">🚀</span>${stats.maxSpeed}<small> spd</small></div>
    <div class="gar-stat"><span class="gar-stat-ico">↻</span>${stats.turnRate}<small> turn</small></div>
    <div class="gar-stat"><span class="gar-stat-ico">◎</span>${stats.scanRange}m<small> scan</small></div>`;
}

export function renderGarageStatList(stats: LiveGarageStats): string {
  return `
    <div class="stat-row"><dt>Cargo bay</dt><dd>${stats.cargo}</dd></div>
    <div class="stat-row"><dt>Hull integrity</dt><dd>${stats.hull}</dd></div>
    <div class="stat-row"><dt>Top speed</dt><dd>${stats.maxSpeed}</dd></div>
    <div class="stat-row"><dt>Turn rate</dt><dd>${stats.turnRate}</dd></div>
    <div class="stat-row"><dt>Engine thrust</dt><dd>${stats.thrust}</dd></div>
    <div class="stat-row"><dt>Scan range</dt><dd>${stats.scanRange} m</dd></div>
    <div class="stat-row"><dt>Mining rig</dt><dd>${stats.mineLabel}</dd></div>`;
}

export const HULL_OPTIONS: {
  id: ShipShapeId;
  label: string;
  role: string;
  icon: string;
}[] = [
  { id: "needle", label: "SCOUT MK1", role: "Fast scout · light cargo", icon: "◆" },
  { id: "hauler", label: "HAULER", role: "Mining & salvage workhorse", icon: "▣" },
  { id: "wedge", label: "FIGHTER", role: "High speed · agile", icon: "▲" },
  { id: "brick", label: "FREIGHTER", role: "Max cargo · heavy frame", icon: "■" },
  { id: "hammer", label: "GUNBOAT", role: "Salvage reach · boom arms", icon: "⊞" },
];

export const GARAGE_SLOTS: { id: ShipShapeId; label: string }[] = HULL_OPTIONS.map((h) => ({
  id: h.id,
  label: h.label,
}));
