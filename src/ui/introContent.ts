export interface IntroSlide {
  tag: string;
  title: string;
  body: string;
}

export const INTRO_SLIDES: IntroSlide[] = [
  {
    tag: "ORION STATION",
    title: "Welcome, Salvager",
    body: "The outer rim is a graveyard of fortunes lost and found. Orion Station is your hub — the sector beyond is where captains get rich or get recycled.",
  },
  {
    tag: "SECTOR K-7",
    title: "The junkyard calls",
    body: "Mine asteroids for ore. Strip wrecks for scrap and parts. Sell everything at Outpost K-7. Upgrade your ship. Repeat until you're legend or debris.",
  },
  {
    tag: "FLIGHT SCHOOL",
    title: "Training required",
    body: "Every captain runs the training lane before first deployment. Five minutes in the sim beats five hours drifting without fuel.",
  },
  {
    tag: "READY",
    title: "Suit up",
    body: "You'll learn to fly, scan, mine, salvage, and dock. Complete training to unlock full sector access.",
  },
];

export function renderIntroHtml(slideIndex: number): string {
  const slide = INTRO_SLIDES[slideIndex];
  const dots = INTRO_SLIDES.map((_, i) =>
    `<span class="intro-dot${i === slideIndex ? " active" : ""}"></span>`
  ).join("");

  const isLast = slideIndex >= INTRO_SLIDES.length - 1;

  return `
    <div class="intro-screen interactive">
      <div class="intro-bg" aria-hidden="true"></div>
      <div class="intro-vignette" aria-hidden="true"></div>
      <div class="intro-panel">
        <div class="intro-tag">${slide.tag}</div>
        <h1 class="intro-title">${slide.title}</h1>
        <p class="intro-body">${slide.body}</p>
        <div class="intro-dots">${dots}</div>
        <div class="intro-actions">
          ${slideIndex > 0 ? `<button class="intro-btn intro-ghost interactive" id="btn-intro-back">BACK</button>` : ""}
          <button class="intro-btn intro-primary interactive" id="btn-intro-next">
            ${isLast ? "START TRAINING" : "NEXT"}
          </button>
        </div>
        <button class="intro-skip interactive" id="btn-intro-skip">Skip intro</button>
      </div>
    </div>`;
}

export function renderTrainingCompleteHtml(): string {
  return `
    <div class="intro-screen interactive training-done">
      <div class="intro-bg" aria-hidden="true"></div>
      <div class="intro-vignette" aria-hidden="true"></div>
      <div class="intro-panel">
        <div class="intro-tag">CLEARED FOR DEPLOYMENT</div>
        <h1 class="intro-title">Training complete</h1>
        <p class="intro-body">You're cleared for Sector K-7. Customize your ship in the Hangar, then hit PLAY to deploy for real.</p>
        <div class="intro-actions">
          <button class="intro-btn intro-primary interactive" id="btn-training-done">ENTER ORION STATION</button>
        </div>
      </div>
    </div>`;
}
