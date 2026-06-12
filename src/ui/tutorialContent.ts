import { TUTORIAL_STEPS, type TutorialController } from "../game/Tutorial";

const STEP_ACCENT: Record<string, string> = {
  fly: "#5cc8ff",
  scan: "#44ddff",
  mine: "#ffb800",
  salvage: "#ff5566",
  dock: "#44ff99",
};

const STEP_ICON: Record<string, string> = {
  fly: "⬡",
  scan: "◎",
  mine: "◆",
  salvage: "✦",
  dock: "▣",
};

export function renderTutorialHudHtml(tutorial: TutorialController): string {
  const step = tutorial.step;
  const accent = STEP_ACCENT[step.id] ?? "#ffb800";
  const icon = STEP_ICON[step.id] ?? "◈";
  const stepNum = tutorial.stepIndex + 1;
  const progress = Math.round(tutorial.progress * 100);

  const pips = TUTORIAL_STEPS.map((s, i) => {
    const done = i < tutorial.stepIndex;
    const active = i === tutorial.stepIndex;
    const pipAccent = STEP_ACCENT[s.id] ?? "#ffb800";
    const cls = done ? "tutorial-pip done" : active ? "tutorial-pip active" : "tutorial-pip";
    const style = active || done ? ` style="--pip-color:${pipAccent}"` : "";
    return `<span class="${cls}"${style} aria-hidden="true"></span>`;
  }).join("");

  return `
    <div class="tutorial-card" data-step="${step.id}" style="--tut-accent:${accent}">
      <div class="tutorial-card-glow" aria-hidden="true"></div>
      <div class="tutorial-card-bracket tutorial-card-bracket--tl" aria-hidden="true"></div>
      <div class="tutorial-card-bracket tutorial-card-bracket--tr" aria-hidden="true"></div>
      <div class="tutorial-card-bracket tutorial-card-bracket--bl" aria-hidden="true"></div>
      <div class="tutorial-card-bracket tutorial-card-bracket--br" aria-hidden="true"></div>
      <div class="tutorial-card-inner">
        <div class="tutorial-head">
          <div class="tutorial-icon-ring" aria-hidden="true">
            <span class="tutorial-icon">${icon}</span>
          </div>
          <div class="tutorial-head-text">
            <div class="tutorial-step-label">FLIGHT SCHOOL · STEP ${stepNum} / ${TUTORIAL_STEPS.length}</div>
            <div class="tutorial-step-title">${step.title}</div>
          </div>
        </div>
        <p class="tutorial-step-body">${step.body}</p>
        <div class="tutorial-step-hint">
          <span class="tutorial-hint-tag">OBJECTIVE</span>
          <span class="tutorial-hint-text">${step.hint}</span>
        </div>
        <div class="tutorial-progress-row">
          <div class="tutorial-pips">${pips}</div>
          <span class="tutorial-progress-pct">${progress}%</span>
        </div>
        <div class="tutorial-progress" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="tutorial-progress-fill" style="width:${progress}%"></div>
          <div class="tutorial-progress-shine" aria-hidden="true"></div>
        </div>
      </div>
    </div>`;
}

export function renderTutorialTagHtml(): string {
  return `<span class="tutorial-tag-dot" aria-hidden="true"></span>TRAINING LANE`;
}
