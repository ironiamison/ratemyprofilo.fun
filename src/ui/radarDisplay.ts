import type { RadarPOI } from "../game/types";

export const RADAR_SIZE = 132;
const CENTER = RADAR_SIZE / 2;
const MAX_RANGE = 120;
const BLIP_RADIUS = 54;

export function renderRadarBlips(pois: RadarPOI[]): string {
  return pois
    .map((p) => {
      const norm = Math.min(p.dist, MAX_RANGE) / MAX_RANGE;
      const r = norm * BLIP_RADIUS;
      const x = CENTER + Math.sin(p.angle) * r;
      const y = CENTER - Math.cos(p.angle) * r;
      const close = p.dist < 28;
      const dim = norm > 0.85 ? " radar-blip-far" : "";
      const pulse = close ? " radar-blip-close" : "";
      return `<div class="radar-blip radar-blip-${p.kind}${dim}${pulse}" style="--blip:${p.color};left:${x}px;top:${y}px" title="${p.name} · ${Math.round(p.dist)}m">
        <span class="radar-blip-shape"></span>
      </div>`;
    })
    .join("");
}

export function renderRadarNearest(pois: RadarPOI[]): string {
  if (pois.length === 0) return "NO CONTACTS";
  const nearest = pois[0];
  const label =
    nearest.kind === "station" ? "STATION"
    : nearest.kind === "asteroid" ? "ROCK"
    : nearest.kind === "npc" ? "SHIP"
    : "WRECK";
  return `${label} · ${nearest.name} · ${Math.round(nearest.dist)}m`;
}

export function radarStateKey(pois: RadarPOI[], scanning: boolean): string {
  const blips = pois.map((p) => `${p.id}:${Math.round(p.dist)}:${p.angle.toFixed(2)}`).join("|");
  return `${scanning ? "1" : "0"}|${blips}`;
}
