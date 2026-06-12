import { LocalSession } from "../net/LocalSession";
import { getMpServerUrl } from "../net/mpConfig";

export type MultiplayerLobbyTab = "local" | "online" | "race";

export function renderMultiplayerLobbyHtml(
  serverUrl = getMpServerUrl(),
  initialTab: MultiplayerLobbyTab = "online"
): string {
  const localSupported = LocalSession.supported();
  const tab = (id: MultiplayerLobbyTab, label: string, extraClass = "") =>
    `<button type="button" class="mp-tab interactive${initialTab === id ? " active" : ""}${extraClass}" data-mp-tab="${id}">${label}</button>`;
  const panel = (id: MultiplayerLobbyTab, body: string) =>
    `<div class="mp-tab-panel${initialTab === id ? "" : " hidden"}" data-mp-panel="${id}">${body}</div>`;

  return `
    <div class="mp-overlay interactive" id="mp-overlay">
      <div class="mp-backdrop" aria-hidden="true"></div>
      <div class="mp-panel mp-panel-wide">
        <span class="mp-tag">${initialTab === "race" ? "RACE MODE" : "MULTIPLAYER"}</span>
        <h2 class="mp-title">${initialTab === "race" ? "Checkpoint Sprint" : "Fly Together"}</h2>

        <div class="mp-tabs">
          ${tab("online", "ONLINE")}
          ${tab("local", "SAME PC")}
          ${tab("race", "RACE", " mp-tab-race")}
        </div>

        ${panel("online", `
          <p class="mp-body">Play with friends on other computers — create a room, share the 6-letter code.</p>
          <ul class="mp-features">
            <li>Synced ships & shared wrecks</li>
            <li>Host launches when everyone is ready</li>
          </ul>
          <div class="mp-online-actions">
            <button class="mp-launch interactive" id="btn-mp-host">CREATE ROOM</button>
            <div class="mp-join-row">
              <input class="mp-input mp-code interactive" id="mp-code" type="text" maxlength="6" placeholder="CODE" autocomplete="off" spellcheck="false" />
              <button class="mp-launch mp-join interactive" id="btn-mp-join">JOIN ROOM</button>
            </div>
          </div>
          <div class="mp-room hidden" id="mp-room">
            <p class="mp-room-label">Room code — send to friends</p>
            <p class="mp-room-code" id="mp-room-code">------</p>
            <p class="mp-room-peers" id="mp-room-peers">Waiting for co-pilots…</p>
            <p class="mp-room-hint hidden" id="mp-room-hint"></p>
            <button class="mp-launch interactive hidden" id="btn-mp-launch-online">LAUNCH SECTOR</button>
          </div>
          <details class="mp-advanced">
            <summary class="mp-advanced-summary interactive">Advanced · relay server</summary>
            <label class="mp-field">
              <span class="mp-field-label">WebSocket URL</span>
              <input class="mp-input interactive" id="mp-server" type="text" value="${serverUrl}" spellcheck="false" />
            </label>
            <p class="mp-note">Self-host: <code>npm run mp-server</code> · LAN: <code>ws://YOUR-IP:8787</code></p>
          </details>
          <p class="mp-error hidden" id="mp-error"></p>
        `)}

        ${panel("local", `
          <p class="mp-body">Two tabs on this computer — shared salvage sector.</p>
          <ul class="mp-features">
            <li>Synced ships & radar blips</li>
            <li>Shared wrecks & asteroids</li>
          </ul>
          ${
            localSupported
              ? `
          <div class="mp-local-wait hidden" id="mp-local-wait">
            <p class="mp-room-peers" id="mp-local-peers">1 scavenger ready</p>
            <p class="mp-note">Open a second tab → Hub → CO-OP → READY UP</p>
            <button class="mp-launch interactive" id="btn-mp-local-enter">ENTER SECTOR</button>
          </div>
          <button class="mp-launch interactive" id="btn-mp-local">READY UP</button>`
              : `<p class="mp-note mp-warn">BroadcastChannel not supported — use Online tab.</p>`
          }
        `)}

        ${panel("race", `
          <p class="mp-body">Fly through 5 gate rings in order. Unlimited fuel. Fastest time wins.</p>
          <ul class="mp-features">
            <li>3-2-1-GO countdown</li>
            <li>Live leaderboard vs other racers</li>
            <li>Online or same-PC</li>
          </ul>
          ${
            localSupported
              ? `
          <div class="mp-local-wait hidden" id="mp-race-local-wait">
            <p class="mp-room-peers" id="mp-race-local-peers">1 racer ready</p>
            <p class="mp-note">Open a second tab → RACE → READY UP</p>
            <button class="mp-launch mp-launch-race interactive" id="btn-mp-race-local-enter">START RACE</button>
          </div>
          <button class="mp-launch mp-launch-race interactive" id="btn-mp-race-local">READY UP</button>`
              : ""
          }
          <div class="mp-online-actions">
            <button class="mp-launch mp-launch-race interactive" id="btn-mp-race-host">HOST RACE</button>
            <div class="mp-join-row">
              <input class="mp-input mp-code interactive" id="mp-race-code" type="text" maxlength="6" placeholder="CODE" autocomplete="off" spellcheck="false" />
              <button class="mp-launch mp-join mp-launch-race interactive" id="btn-mp-race-join">JOIN RACE</button>
            </div>
          </div>
          <div class="mp-room hidden" id="mp-race-room">
            <p class="mp-room-label">Race lobby</p>
            <p class="mp-room-code" id="mp-race-room-code">------</p>
            <p class="mp-room-peers" id="mp-race-room-peers">Waiting for racers…</p>
            <p class="mp-room-hint hidden" id="mp-race-room-hint"></p>
            <button class="mp-launch mp-launch-race interactive hidden" id="btn-mp-race-launch">START RACE</button>
          </div>
          <details class="mp-advanced">
            <summary class="mp-advanced-summary interactive">Advanced · relay server</summary>
            <label class="mp-field">
              <span class="mp-field-label">WebSocket URL</span>
              <input class="mp-input interactive" id="mp-race-server" type="text" value="${serverUrl}" spellcheck="false" />
            </label>
          </details>
          <p class="mp-error hidden" id="mp-race-error"></p>
        `)}

        <button class="mp-close interactive" id="btn-mp-close">BACK</button>
      </div>
    </div>`;
}
