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

async function boot(): Promise<void> {
  const splash = document.createElement("div");
  splash.className = "boot-splash";
  splash.textContent = "Loading assets…";
  uiRoot.appendChild(splash);

  try {
    await preloadKenneyModels();
  } catch (err) {
    console.error("Kenney preload failed:", err);
  }

  try {
    await preloadPolyyModels();
  } catch (err) {
    console.error("Polyy ship preload failed, using Kenney/procedural fallback:", err);
  }

  splash.remove();
  new Game(gameRoot, uiRoot);
}

boot();
