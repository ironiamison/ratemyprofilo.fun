export function renderPauseHtml(training: boolean): string {
  const note = training
    ? "Leave training early — dock at K-7 to finish flight school later."
    : "Your cargo, fuel, and progress are saved when you return.";

  return `
    <div class="pause-overlay interactive" id="pause-overlay">
      <div class="pause-backdrop" aria-hidden="true"></div>
      <div class="pause-panel">
        <span class="pause-tag">PAUSED</span>
        <h2 class="pause-title">Sector K-7</h2>
        <p class="pause-body">${note}</p>
        <div class="pause-actions">
          <button class="pause-btn pause-primary interactive" id="btn-pause-resume">RESUME FLIGHT</button>
          <button class="pause-btn pause-hub interactive" id="btn-pause-home">← ORION STATION</button>
        </div>
        <p class="pause-hint">ESC to resume · H field manual</p>
      </div>
    </div>`;
}
