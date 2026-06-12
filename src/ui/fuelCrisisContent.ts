import { cargoWeight } from "../game/economy";
import { previewFuelFromCargo } from "../game/fuelEmergency";
import type { PlayerSave } from "../game/types";

export function renderFuelCrisisHtml(save: PlayerSave): string {
  const weight = cargoWeight(save.cargo);
  const gain = previewFuelFromCargo(save);

  return `
    <div class="pause-overlay interactive fuel-crisis-overlay" id="fuel-crisis-overlay">
      <div class="pause-backdrop" aria-hidden="true"></div>
      <div class="pause-panel fuel-crisis-panel">
        <span class="pause-tag fuel-crisis-tag">FUEL EMPTY</span>
        <h2 class="pause-title">Emergency Protocol</h2>
        <p class="pause-body">
          Main tanks are dry. You can jettison and <strong>burn all cargo</strong> through the aux reactor
          for an emergency refuel — <strong>+${gain} fuel</strong> from ${weight} cargo units.
          <br><br>
          <span class="fuel-crisis-warn">This destroys ore, scrap, components, and alloy in your hold.</span>
        </p>
        <div class="pause-actions">
          <button class="pause-btn fuel-burn-btn interactive" id="btn-fuel-burn">BURN ALL CARGO (+${gain} FUEL)</button>
          <button class="pause-btn pause-primary interactive" id="btn-fuel-wait">STAY ADRIFT</button>
        </div>
        <p class="pause-hint">Dock at K-7 to buy fuel · H field manual</p>
      </div>
    </div>`;
}

export function renderFuelEmptyHtml(): string {
  return `
    <div class="pause-overlay interactive fuel-crisis-overlay" id="fuel-crisis-overlay">
      <div class="pause-backdrop" aria-hidden="true"></div>
      <div class="pause-panel fuel-crisis-panel">
        <span class="pause-tag fuel-crisis-tag">FUEL EMPTY</span>
        <h2 class="pause-title">Dead in the Water</h2>
        <p class="pause-body">
          Tanks empty and the hold is bare. Drift toward <strong>Orion Station (K-7)</strong> and dock for fuel,
          or return to the hub from the pause menu.
        </p>
        <div class="pause-actions">
          <button class="pause-btn pause-primary interactive" id="btn-fuel-wait">ACKNOWLEDGE</button>
        </div>
        <p class="pause-hint">You can still rotate and scan · thrust is offline</p>
      </div>
    </div>`;
}
