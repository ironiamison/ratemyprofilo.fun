import { formatRaceTime } from "../game/raceCourse";
import type { PeerRaceState } from "../race/RaceController";

export function renderRaceLeaderboard(standings: PeerRaceState[], localId: string): string {
  const rows = standings
    .map((s, i) => {
      const place = i + 1;
      const time = s.finished ? formatRaceTime(s.elapsedMs) : s.checkpoint > 0 ? `CP ${s.checkpoint}` : "—";
      const you = s.id === localId ? " race-you" : "";
      return `<li class="race-row${you}"><span class="race-place">${place}</span><span class="race-name">${s.name}</span><span class="race-time">${time}</span></li>`;
    })
    .join("");
  return `<ul class="race-standings">${rows}</ul>`;
}

export function renderRaceResults(standings: PeerRaceState[], localId: string): string {
  const rows = standings
    .map((s, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      const time = s.finished ? formatRaceTime(s.elapsedMs) : "DNF";
      const you = s.id === localId ? " race-you" : "";
      return `<li class="race-result-row${you}"><span>${medal}</span><span>${s.name}</span><span>${time}</span></li>`;
    })
    .join("");
  return `
    <div class="race-results-panel interactive">
      <h2 class="race-results-title">RACE RESULTS</h2>
      <ul class="race-results-list">${rows}</ul>
      <button type="button" class="race-results-btn interactive" id="btn-race-home">← HUB</button>
    </div>`;
}
