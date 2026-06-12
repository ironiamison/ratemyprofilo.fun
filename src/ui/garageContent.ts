import { isSkinUnlocked } from "../chain/holderPerks";
import { walletService } from "../chain/wallet";
import { FACTIONS, type FactionId } from "../game/types";
import {
  COLOR_PALETTE,
  PAINT_PARTS,
  SHIP_SKINS,
  paintToHex,
  type ShipPaint,
} from "../game/shipPaint";
import { SHIP_SHAPES, type ShipShapeId } from "../game/shipShapes";
import { GARAGE_SLOTS, HULL_OPTIONS, SHAPE_STATS } from "./garageStats";

export type GarageTab = "ships" | "paint" | "faction";

const BODY_PARTS = new Set(["hull", "hull2", "chassis", "wings", "trim"]);
const DETAIL_PARTS = new Set(["glow", "cockpit", "engine", "thruster", "metal", "accent"]);

function renderPalette(part: string, paint: ShipPaint): string {
  return COLOR_PALETTE.map(
    (c) =>
      `<button type="button" class="palette-swatch interactive${paint[part as keyof ShipPaint] === c ? " active" : ""}"
        data-part="${part}" data-color="${c}" style="background:${paintToHex(c)}"
        title="Apply color"></button>`
  ).join("");
}

function renderPaintZone(paint: ShipPaint, key: string, label: string): string {
  return `<div class="paint-zone">
    <div class="paint-zone-head">
      <span class="paint-zone-label">${label}</span>
      <span class="paint-zone-current" style="background:${paintToHex(paint[key as keyof ShipPaint] as number)}"></span>
    </div>
    <div class="paint-palette">${renderPalette(key, paint)}</div>
  </div>`;
}

export function renderGarageHtml(
  paint: ShipPaint,
  faction: FactionId,
  shape: ShipShapeId,
  credits: number,
  activeTab: GarageTab = "ships"
): string {
  const stats = SHAPE_STATS[shape];
  const shapeInfo = SHIP_SHAPES[shape];

  const hullCards = HULL_OPTIONS.map((h) => {
    const s = SHAPE_STATS[h.id];
    const selected = h.id === shape ? " selected" : "";
    return `<button type="button" class="hull-card interactive${selected}" data-shape="${h.id}">
      <span class="hull-card-icon">${h.icon}</span>
      <span class="hull-card-info">
        <span class="hull-card-name">${h.label}</span>
        <span class="hull-card-role">${h.role}</span>
        <span class="hull-card-stats">📦 ${s.cargo} · 🚀 ${s.speed} · ⚖ ${s.mass}</span>
      </span>
    </button>`;
  }).join("");

  const skinTiles = Object.entries(SHIP_SKINS)
    .map(([id, s]) => {
      const sel = paint.skin === id ? " selected" : "";
      const locked = !isSkinUnlocked(id, walletService.tier);
      return `<button type="button" class="skin-tile interactive${sel}${locked ? " locked" : ""}" data-skin="${id}" ${locked ? "disabled" : ""} title="${locked ? "Hold $SALVAGE to unlock" : s.name}">
        <span class="skin-swatch" style="background:${paintToHex(s.swatch)}"></span>
        <span class="skin-name">${s.name}</span>
        ${locked ? '<span class="part-lock">🔒</span>' : ""}
      </button>`;
    })
    .join("");

  const bodyZones = PAINT_PARTS.filter((p) => BODY_PARTS.has(p.key))
    .map((p) => renderPaintZone(paint, p.key, p.label))
    .join("");

  const detailZones = PAINT_PARTS.filter((p) => DETAIL_PARTS.has(p.key))
    .map((p) => renderPaintZone(paint, p.key, p.label))
    .join("");

  const factionOpts = (Object.keys(FACTIONS) as FactionId[])
    .map((id) => {
      const f = FACTIONS[id];
      const sel = id === faction ? " selected" : "";
      return `<button type="button" class="crew-card interactive${sel}" data-faction="${id}">
        <span class="crew-dot" style="background:#${f.color.toString(16).padStart(6, "0")}"></span>
        <span class="crew-name">${f.name}</span>
        <span class="crew-bonus">${f.bonus}</span>
      </button>`;
    })
    .join("");

  const equipped = stats.equipped
    .map((e) => `<li class="equipped-item"><span class="eq-dot"></span>${e}</li>`)
    .join("");

  const slots = GARAGE_SLOTS.map((s) => {
    const sel = s.id === shape ? " selected" : "";
    return `<button type="button" class="ship-slot interactive${sel}" data-shape="${s.id}">
      <div class="slot-thumb slot-thumb-${s.id}"></div>
      <span class="slot-name">${s.label}</span>
    </button>`;
  }).join("");

  const extraSlots = (["brick", "hammer"] as ShipShapeId[])
    .filter((id) => !GARAGE_SLOTS.some((s) => s.id === id))
    .map((id) => {
      const sel = id === shape ? " selected" : "";
      return `<button type="button" class="ship-slot interactive${sel}" data-shape="${id}">
        <div class="slot-thumb slot-thumb-${id}"></div>
        <span class="slot-name">${SHAPE_STATS[id].slotLabel}</span>
      </button>`;
    })
    .join("");

  const tab = (id: GarageTab, label: string) =>
    `<button type="button" class="gar-tab interactive${activeTab === id ? " active" : ""}" data-tab="${id}">${label}</button>`;

  return `
    <div class="garage-premium">
      <header class="gar-top">
        <div class="gar-top-left">
          <h1 class="gar-logo">GARAGE</h1>
          <span class="gar-ship-name">${stats.slotLabel}</span>
          <span class="gar-ship-class">${shapeInfo.tag}</span>
        </div>
        <div class="gar-stat-bar">
          <div class="gar-stat"><span class="gar-stat-ico">⚖</span>${stats.mass}<small>/300</small></div>
          <div class="gar-stat"><span class="gar-stat-ico">⚡</span>${stats.energy}<small>/100</small></div>
          <div class="gar-stat"><span class="gar-stat-ico">🚀</span>${stats.thrust}</div>
          <div class="gar-stat"><span class="gar-stat-ico">🛡</span>${stats.shield}</div>
          <div class="gar-stat"><span class="gar-stat-ico">📦</span>${stats.cargo}<small>/60</small></div>
        </div>
        <div class="gar-currency">
          <button type="button" class="gar-home-btn interactive" id="btn-home" title="Return to Orion Station">← HUB</button>
          <span class="cur-gold">🪙 ${credits.toLocaleString()}</span>
          <button type="button" class="gar-faq-btn interactive" id="btn-faq" title="Field Manual">?</button>
        </div>
      </header>

      <div class="gar-body">
        <aside class="gar-panel gar-left interactive">
          <div class="gar-tabs">
            ${tab("ships", "SHIPS")}
            ${tab("paint", "PAINT")}
            ${tab("faction", "FACTION")}
          </div>

          <div class="gar-tab-panel${activeTab === "ships" ? "" : " hidden"}" data-panel="ships">
            <p class="panel-hint">Pick a hull — stats update on the right. Salvage gear is built into each frame.</p>
            <div class="hull-list">${hullCards}</div>
          </div>

          <div class="gar-tab-panel${activeTab === "paint" ? "" : " hidden"}" data-panel="paint">
            <p class="panel-sub">PRESET SKINS</p>
            <p class="panel-hint">One-click full paint jobs. Holder skins need $SALVAGE in wallet.</p>
            <div class="skin-grid">${skinTiles}</div>
            <p class="panel-sub">CUSTOM COLORS</p>
            <p class="panel-hint">Tap a swatch to paint that zone on your ship.</p>
            <div class="paint-section">
              <span class="paint-section-label">Body</span>
              ${bodyZones}
            </div>
            <div class="paint-section">
              <span class="paint-section-label">Details</span>
              ${detailZones}
            </div>
            <button type="button" class="gar-btn-secondary interactive" id="btn-random">RANDOMIZE COLORS</button>
          </div>

          <div class="gar-tab-panel${activeTab === "faction" ? "" : " hidden"}" data-panel="faction">
            <p class="panel-hint">Faction sets market prices, fuel costs, and hull bonuses for your next launch.</p>
            <div class="crew-list">${factionOpts}</div>
          </div>
        </aside>

        <div class="gar-viewport" aria-hidden="true">
          <div class="gar-viewport-hint">Drag to rotate · Scroll to zoom · Double-click reset</div>
        </div>

        <aside class="gar-panel gar-right interactive">
          <h2 class="panel-title">SHIP STATS</h2>
          <dl class="stat-list">
            <div class="stat-row"><dt>Mass</dt><dd>${stats.mass}</dd></div>
            <div class="stat-row"><dt>Energy</dt><dd>${stats.energy}</dd></div>
            <div class="stat-row"><dt>Thrust</dt><dd>${stats.thrust}</dd></div>
            <div class="stat-row"><dt>Shield</dt><dd>${stats.shield}</dd></div>
            <div class="stat-row"><dt>Cargo</dt><dd>${stats.cargo}</dd></div>
            <div class="stat-row"><dt>Top Speed</dt><dd>${stats.speed}</dd></div>
            <div class="stat-row"><dt>Turn Speed</dt><dd>${stats.turn}</dd></div>
            <div class="stat-row"><dt>Jump Range</dt><dd>${stats.jump} LY</dd></div>
          </dl>
          <h2 class="panel-title">BUILT-IN GEAR</h2>
          <ul class="equipped-list">${equipped}</ul>
          <button type="button" class="gar-btn-save interactive" id="btn-save">SAVE SHIP</button>
        </aside>
      </div>

      <footer class="gar-bottom interactive">
        <div class="gar-bottom-left">
          <span class="gar-sector-tag">SECTOR K-7</span>
        </div>
        <div class="gar-slots">${slots}${extraSlots}
          <div class="ship-slot locked-slot">
            <div class="slot-thumb slot-new">+</div>
            <span class="slot-name">NEW SLOT</span>
            <span class="slot-lock-label">🔒 10,000 CR</span>
          </div>
        </div>
        <button type="button" class="gar-btn-launch interactive" id="btn-launch">
          <span class="launch-rocket">🚀</span> LAUNCH
        </button>
      </footer>
    </div>`;
}
