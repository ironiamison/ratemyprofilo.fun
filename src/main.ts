import "./style.css";
import "./style-home.css";
import "./style-intro.css";
import "./style-factions.css";
import "./style-settings.css";
import "./style-market.css";
import { preloadKenneyModels } from "./assets/kenneyLoader";
import { preloadPolyyModels } from "./assets/polyyLoader";
import { Game } from "./game/Game";

const gameRoot = document.getElementById("game-root");
const uiRoot = document.getElementById("ui-root");

if (!gameRoot || !uiRoot) throw new Error("Missing game containers");

function showBootError(message: string, detail?: string): void {
  uiRoot.innerHTML = "";
  const el = document.createElement("div");
  el.className = "boot-splash";
  el.innerHTML = `
    <div class="boot-error">
      <p class="boot-error-title">Failed to start Space Salvagers</p>
      <p class="boot-error-body">${message}</p>
      ${detail ? `<pre class="boot-error-detail">${detail}</pre>` : ""}
      <button class="boot-error-reload interactive" type="button">Reload</button>
    </div>`;
  el.querySelector(".boot-error-reload")?.addEventListener("click", () => location.reload());
  uiRoot.appendChild(el);
}

async function boot(): Promise<void> {
  const splash = document.createElement("div");
  splash.className = "boot-splash";
  splash.textContent = "Starting…";
  uiRoot.appendChild(splash);

  // Warm models in the background — never block the menu on asset downloads.
  void Promise.race([
    preloadKenneyModels().catch((err) => console.warn("Kenney preload failed:", err)),
    new Promise((resolve) => setTimeout(resolve, 12_000)),
  ]);
  void preloadPolyyModels().catch((err) => console.warn("Polyy preload failed:", err));

  try {
    new Game(gameRoot, uiRoot);
  } catch (err) {
    splash.remove();
    const detail = err instanceof Error ? err.stack ?? err.message : String(err);
    showBootError("Something crashed during startup. Try a hard refresh (Cmd+Shift+R).", detail);
    console.error(err);
    return;
  }

  splash.remove();
}

boot().catch((err) => {
  showBootError("Boot failed unexpectedly.", err instanceof Error ? err.message : String(err));
  console.error(err);
});
