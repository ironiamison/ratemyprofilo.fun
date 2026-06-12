import { FACTIONS, type FactionId, type PlayerSave } from "../game/types";
import {
  paintToHex,
  RIG_ENGINE_COLORS,
  RIG_LIGHT_COLORS,
  type RigSlot,
  type ShipPaint,
} from "../game/shipPaint";
import { SHIP_SHAPES, type ShipShapeId } from "../game/shipShapes";
import {
  GARAGE_SLOTS,
  HULL_OPTIONS,
  computeLiveGarageStats,
  renderGarageStatBar,
  renderGarageStatList,
  SHAPE_STATS,
} from "./garageStats";

export type GarageTab = "ships" | "faction";

function renderRigPalette(slot: RigSlot, colors: number[], paint: ShipPaint): string {
  const active =
    slot === "engine"
      ? (c: number) => paint.engine === c
      : (c: number) => paint.glow === c;
  return colors
    .map(
      (c) =>
        `<button type="button" class="palette-swatch interactive${active(c) ? " active" : ""}"
        data-rig="${slot}" data-color="${c}" style="background:${paintToHex(c)}"
        title="Apply color"></button>`
    )
    .join("");
}

export function renderGarageHtml(
  save: PlayerSave,
  paint: ShipPaint,
  faction: FactionId,
  shape: ShipShapeId,
  credits: number,
  activeTab: GarageTab = "ships",
  dirty = false
): string {
  const live = computeLiveGarageStats(save, shape, faction);
  const shapeInfo = SHIP_SHAPES[shape];

  const hullCards = HULL_OPTIONS.map((h) => {
    const s = SHAPE_STATS[h.id];
    const selected = h.id === shape ? " selected" : "";
    return `<button type="button" class="hull-card interactive${selected}" data-shape="${h.id}">
      <span class="hull-card-icon">${h.icon}</span>
      <span class="hull-card-info">
        <span class="hull-card-name">${h.label}</span>
        <span class="hull-card-role">${h.role}</span>
        <span class="hull-card-stats">📦 ${s.cargo} base · ${s.mineLabel}</span>
      </span>
    </button>`;
  }).join("");

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

  const equipped = live.equipped
    .map((e) => `<li class="equipped-item"><span class="eq-dot"></span>${e}</li>`)
    .join("");

  const slots = GARAGE_SLOTS.map((s) => {
    const sel = s.id === shape ? " selected" : "";
    return `<button type="button" class="ship-slot interactive${sel}" data-shape="${s.id}" title="${s.label}">
      <div class="slot-thumb slot-thumb-${s.id}"></div>
      <span class="slot-name">${s.label.split(" ")[0]}</span>
    </button>`;
  }).join("");

  const tab = (id: GarageTab, label: string) =>
    `<button type="button" class="gar-tab interactive${activeTab === id ? " active" : ""}" data-tab="${id}">${label}</button>`;

  return `
    <div class="garage-premium" id="garage-root">
      <header class="gar-top interactive">
        <div class="gar-top-left">
          <h1 class="gar-logo">HANGAR</h1>
          <span class="gar-ship-name" id="gar-ship-name">${live.label}</span>
          <span class="gar-ship-class" id="gar-ship-class">${shapeInfo.tag}</span>
          <span class="gar-dirty-badge${dirty ? "" : " hidden"}" id="gar-dirty-badge">UNSAVED</span>
        </div>
        <div class="gar-stat-bar" id="gar-stat-bar">${renderGarageStatBar(live)}</div>
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
            ${tab("faction", "FACTION")}
          </div>

          <div class="gar-tab-panel${activeTab === "ships" ? "" : " hidden"}" data-panel="ships">
            <p class="panel-hint">Pick a hull — stats on the right reflect your upgrades.</p>
            <div class="hull-list">${hullCards}</div>
            <p class="panel-sub">ENGINE GLOW</p>
            <p class="panel-hint">Exhaust & thruster color — visible in flight.</p>
            <div class="paint-palette rig-palette">${renderRigPalette("engine", RIG_ENGINE_COLORS, paint)}</div>
            <p class="panel-sub">RUNNING LIGHTS</p>
            <p class="panel-hint">Scanner, laser & salvage gear on your hull.</p>
            <div class="paint-palette rig-palette">${renderRigPalette("lights", RIG_LIGHT_COLORS, paint)}</div>
          </div>

          <div class="gar-tab-panel${activeTab === "faction" ? "" : " hidden"}" data-panel="faction">
            <p class="panel-hint">Faction affects market prices, fuel burn, and hull bonus on deploy.</p>
            <div class="crew-list">${factionOpts}</div>
          </div>
        </aside>

        <div class="gar-viewport interactive" id="gar-viewport">
          <div class="gar-viewport-frame" aria-hidden="true"></div>
          <div class="gar-viewport-hint">Drag to rotate · Scroll to zoom · Double-click reset</div>
        </div>

        <aside class="gar-panel gar-right interactive">
          <h2 class="panel-title">LIVE STATS</h2>
          <p class="panel-hint panel-hint-tight">Based on hull + your current upgrades.</p>
          <dl class="stat-list" id="gar-stat-list">${renderGarageStatList(live)}</dl>
          <h2 class="panel-title">BUILT-IN GEAR</h2>
          <ul class="equipped-list" id="gar-equipped">${equipped}</ul>
          <button type="button" class="gar-btn-save interactive" id="btn-save">SAVE LOADOUT</button>
        </aside>
      </div>

      <footer class="gar-bottom interactive">
        <div class="gar-bottom-left">
          <span class="gar-sector-tag">SECTOR K-7</span>
        </div>
        <div class="gar-slots">${slots}
          <div class="ship-slot locked-slot interactive" id="btn-slot-lock" title="Coming soon">
            <div class="slot-thumb slot-new">+</div>
            <span class="slot-name">SLOT</span>
          </div>
        </div>
        <button type="button" class="gar-btn-launch interactive" id="btn-launch">
          <span class="launch-rocket">🚀</span> DEPLOY TO K-7
        </button>
      </footer>
    </div>`;
}
