export type ShipShapeId = "hauler" | "wedge" | "brick" | "needle" | "hammer";

export const SHIP_SHAPES: Record<ShipShapeId, { name: string; tag: string }> = {
  hauler: { name: "HAULER", tag: "Cargo pods · mining laser · salvage claws" },
  wedge: { name: "WEDGE", tag: "Delta wings · speed · lean profile" },
  brick: { name: "BRICK", tag: "Armored slab · external tanks · max hold" },
  needle: { name: "NEEDLE", tag: "Sensor mast · spine hull · scout range" },
  hammer: { name: "HAMMER", tag: "Boom arms · floodlights · wreck grapples" },
};

export const DEFAULT_SHIP_SHAPE: ShipShapeId = "hauler";

export function isShipShape(id: string): id is ShipShapeId {
  return id in SHIP_SHAPES;
}
