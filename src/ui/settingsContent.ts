import type { PlayerSave } from "../game/types";

export function renderSettingsHtml(save: PlayerSave): string {
  const soundOn = save.sfxEnabled !== false;

  return `
    <div class="settings-screen interactive">
      <div class="settings-bg" aria-hidden="true"></div>
      <div class="settings-vignette" aria-hidden="true"></div>

      <header class="settings-header">
        <button class="settings-back interactive" id="btn-settings-back">← HUB</button>
        <div class="settings-head-text">
          <h1 class="settings-title">SETTINGS</h1>
          <p class="settings-sub">Captain profile · audio · game data</p>
        </div>
      </header>

      <div class="settings-body">
        <section class="settings-section">
          <h2 class="settings-section-title">Captain</h2>
          <label class="settings-field">
            <span>Callsign</span>
            <input class="settings-input interactive" id="settings-name" type="text" maxlength="20" value="${save.name || "VoxelHero"}" placeholder="Enter callsign" />
          </label>
          <button class="settings-btn interactive" id="btn-save-name">SAVE CALLSIGN</button>
        </section>

        <section class="settings-section">
          <h2 class="settings-section-title">Audio</h2>
          <label class="settings-toggle interactive">
            <span>Sound effects</span>
            <input type="checkbox" id="settings-sfx" ${soundOn ? "checked" : ""} />
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
          </label>
        </section>

        <section class="settings-section">
          <h2 class="settings-section-title">Help</h2>
          <button class="settings-btn interactive" id="btn-open-manual">FIELD MANUAL</button>
          <button class="settings-btn interactive" id="btn-replay-training">REPLAY TRAINING</button>
        </section>

        <section class="settings-section settings-danger">
          <h2 class="settings-section-title">Data</h2>
          <p class="settings-note">Reset wipes credits, cargo, upgrades, and sector progress. Faction and ship paint are kept.</p>
          <button class="settings-btn settings-btn-danger interactive" id="btn-reset-save">RESET PROGRESS</button>
        </section>
      </div>
    </div>`;
}
