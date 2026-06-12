import { claimableMissions, getActiveMission, MISSIONS } from "../game/missions";
import { getMissionProgress } from "../game/missionProgress";
import type { PlayerSave } from "../game/types";

function statusLabel(save: PlayerSave, id: string, done: boolean): string {
  if (save.claimedMissions.includes(id)) return "CLAIMED";
  if (done) return "READY";
  return "ACTIVE";
}

export function renderMissionsHtml(save: PlayerSave): string {
  const active = getActiveMission(save);
  const ready = claimableMissions(save).length;

  const rows = MISSIONS.map((m) => {
    const done = m.check(save);
    const claimed = save.claimedMissions.includes(m.id);
    const status = statusLabel(save, m.id, done);
    const prog = getMissionProgress(save, m);
    const isActive = active?.id === m.id && !claimed;
    return `<div class="mission-row ${claimed ? "claimed" : done ? "done" : ""} ${isActive ? "current" : ""}">
      <div class="mission-row-head">
        <span class="mission-status">${status}</span>
        <strong>${m.title}</strong>
        <span class="mission-reward-tag">+${m.reward} CR</span>
      </div>
      <p class="mission-row-desc">${m.desc}${prog ? ` · ${prog}` : ""}</p>
    </div>`;
  }).join("");

  return `
    <div class="missions-screen interactive">
      <div class="missions-panel">
        <button class="mkt-back interactive" id="btn-missions-back">← HUB</button>
        <h2>SECTOR CONTRACTS</h2>
        <p class="missions-sub">${ready} ready to claim at K-7 · ${save.claimedMissions.length}/${MISSIONS.length} completed</p>
        <div class="missions-list">${rows}</div>
      </div>
    </div>`;
}
