export function renderMultiplayerComingSoonHtml(): string {
  return `
    <div class="mp-overlay interactive" id="mp-overlay">
      <div class="mp-backdrop" aria-hidden="true"></div>
      <div class="mp-panel">
        <span class="mp-tag">COMING SOON</span>
        <h2 class="mp-title">Co-op Salvage</h2>
        <p class="mp-body">
          Sector K-7 is single-player for now — those other ships are NPCs cosplaying as captains.
          Real multiplayer is in the works.
        </p>
        <ul class="mp-features">
          <li>Fly the same sector with other scavengers</li>
          <li>See live ships, not patrol bots</li>
          <li>Split wrecks, compete on ore, cause chaos</li>
        </ul>
        <p class="mp-note">Hold $SALVAGE for early perks when co-op drops.</p>
        <button class="mp-close interactive" id="btn-mp-close">BACK TO STATION</button>
      </div>
    </div>`;
}
