import { mintConfigured, PUMP_MINT } from "../chain/config";
import { walletService } from "../chain/wallet";
import { getMissionProgress } from "../game/missionProgress";
import { getActiveMission } from "../game/missions";
import { cargoMax, cargoWeight } from "../game/economy";
import { FACTIONS, MAX_UPGRADE, UPGRADE_COSTS, type FactionId, type PlayerSave, type RadarPOI } from "../game/types";
import { writeSave } from "../game/Save";
import type { RigSlot, ShipPaint } from "../game/shipPaint";
import type { ShipShapeId } from "../game/shipShapes";
import { getFaqHtml } from "./faqContent";
import { renderGarageHtml, type GarageTab } from "./garageContent";
import { computeLiveGarageStats, renderGarageStatBar, renderGarageStatList } from "./garageStats";
import { SHIP_SHAPES } from "../game/shipShapes";
import type { TutorialController } from "../game/Tutorial";
import { renderHomeHtml } from "./homeContent";
import { buildHomeTokenView, patchTokenPanel } from "./homeTokenPanel";
import { renderFactionsHtml } from "./factionsContent";
import { renderMarketHtml } from "./marketContent";
import { renderMissionsHtml } from "./missionsContent";
import { sfx } from "../audio/SFX";
import { renderSettingsHtml } from "./settingsContent";
import { parseTradeAction } from "./stationMarket";
import { renderIntroHtml, renderTrainingCompleteHtml } from "./introContent";
import { renderMultiplayerLobbyHtml, type MultiplayerLobbyTab } from "./multiplayerContent";
import { renderRaceLeaderboard, renderRaceResults } from "./raceHud";
import type { PeerRaceState } from "../race/RaceController";
import { renderFuelCrisisHtml, renderFuelEmptyHtml } from "./fuelCrisisContent";
import { renderPauseHtml } from "./pauseContent";
import { renderTutorialHudHtml, renderTutorialTagHtml } from "./tutorialContent";
import { RADAR_SIZE, radarStateKey, renderRadarBlips, renderRadarNearest } from "./radarDisplay";
import { renderStationHtml } from "./stationMarket";

export class UI {
  root: HTMLElement;
  private handlers: {
    onGarageLaunch?: () => void;
    onGarageRig?: (slot: RigSlot, color: number) => void;
    onGarageShape?: (shape: ShipShapeId) => void;
    onGarageFaction?: (faction: FactionId) => void;
    onGarageSave?: () => void;
    onCloseStation?: () => void;
    onStationHome?: () => void;
    onUpgrade?: (key: keyof PlayerSave["upgrades"]) => void;
    onTrade?: (el: HTMLElement) => void;
    onClaimMission?: (id: string) => void;
    onHomeNav?: (nav: string) => void;
    onDailyClaim?: () => void;
    onGarageHome?: () => void;
    onFactionsHome?: () => void;
    onFactionJoin?: (faction: FactionId) => void;
    onSettingsHome?: () => void;
    onSettingsName?: (name: string) => void;
    onSettingsSfx?: (enabled: boolean) => void;
    onSettingsManual?: () => void;
    onSettingsReplayTraining?: () => void;
    onSettingsReset?: () => void;
    onMarketHome?: () => void;
    onMarketTrade?: (el: HTMLElement) => void;
    onMarketDeploy?: () => void;
    onMissionsHome?: () => void;
    onWalletConnect?: () => void;
    onWalletDisconnect?: () => void;
    onPauseResume?: () => void;
    onPauseHome?: () => void;
    onHudHome?: () => void;
    onFuelCrisisBurn?: () => void;
    onFuelCrisisDismiss?: () => void;
    onMultiplayerLocal?: () => void;
    onMultiplayerLocalEnter?: () => void;
    onMultiplayerHost?: (serverUrl: string) => void;
    onMultiplayerJoin?: (code: string, serverUrl: string) => void;
    onMultiplayerLaunchOnline?: () => void;
    onMultiplayerRaceLocal?: () => void;
    onMultiplayerRaceLocalEnter?: () => void;
    onMultiplayerRaceHost?: (serverUrl: string) => void;
    onMultiplayerRaceJoin?: (code: string, serverUrl: string) => void;
    onMultiplayerRaceLaunch?: () => void;
    onMultiplayerLobbyClose?: () => void;
    onRaceExit?: () => void;
  } = {};
  private lastRadarKey = "";
  private lastRadarScan = false;
  private lastPills = "";
  private garageTab: GarageTab = "ships";
  private garageClickHandler: ((e: Event) => void) | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyH" || e.key === "?") {
        e.preventDefault();
        this.toggleFaq();
      }
      if (e.code === "Escape") {
        if (this.isPauseOpen()) this.handlers.onPauseResume?.();
        else this.closeFaq();
      }
    });
  }

  isPauseOpen(): boolean {
    return !!document.getElementById("pause-overlay");
  }

  showPause(training: boolean): void {
    if (this.isPauseOpen()) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = renderPauseHtml(training);
    const el = wrap.firstElementChild as HTMLElement;
    document.body.appendChild(el);
    el.querySelector(".pause-backdrop")?.addEventListener("click", () => this.handlers.onPauseResume?.());
    document.getElementById("btn-pause-resume")?.addEventListener("click", () => this.handlers.onPauseResume?.());
    document.getElementById("btn-pause-home")?.addEventListener("click", () => this.handlers.onPauseHome?.());
  }

  closePause(): void {
    document.getElementById("pause-overlay")?.remove();
  }

  isFuelCrisisOpen(): boolean {
    return !!document.getElementById("fuel-crisis-overlay");
  }

  showFuelCrisis(save: PlayerSave): void {
    if (this.isFuelCrisisOpen()) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = renderFuelCrisisHtml(save);
    const el = wrap.firstElementChild as HTMLElement;
    document.body.appendChild(el);
    el.querySelector(".pause-backdrop")?.addEventListener("click", () => this.handlers.onFuelCrisisDismiss?.());
    document.getElementById("btn-fuel-burn")?.addEventListener("click", () => this.handlers.onFuelCrisisBurn?.());
    document.getElementById("btn-fuel-wait")?.addEventListener("click", () => this.handlers.onFuelCrisisDismiss?.());
  }

  showFuelEmpty(): void {
    if (this.isFuelCrisisOpen()) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = renderFuelEmptyHtml();
    const el = wrap.firstElementChild as HTMLElement;
    document.body.appendChild(el);
    el.querySelector(".pause-backdrop")?.addEventListener("click", () => this.handlers.onFuelCrisisDismiss?.());
    document.getElementById("btn-fuel-wait")?.addEventListener("click", () => this.handlers.onFuelCrisisDismiss?.());
  }

  closeFuelCrisis(): void {
    document.getElementById("fuel-crisis-overlay")?.remove();
  }

  isFaqOpen(): boolean {
    return !!document.getElementById("faq-overlay");
  }

  toggleFaq(): void {
    if (this.isFaqOpen()) this.closeFaq();
    else this.openFaq();
  }

  openFaq(): void {
    if (this.isFaqOpen()) return;
    const overlay = document.createElement("div");
    overlay.id = "faq-overlay";
    overlay.className = "faq-overlay interactive";
    overlay.innerHTML = getFaqHtml();
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeFaq();
    });
    this.root.appendChild(overlay);
    document.getElementById("faq-close")?.addEventListener("click", () => this.closeFaq());
  }

  closeFaq(): void {
    document.getElementById("faq-overlay")?.remove();
  }

  showMultiplayerLobby(initialTab: MultiplayerLobbyTab = "online"): void {
    this.closeMultiplayerLobby();
    const overlay = document.createElement("div");
    overlay.innerHTML = renderMultiplayerLobbyHtml(undefined, initialTab);
    const el = overlay.firstElementChild as HTMLElement;
    this.root.appendChild(el);
    this.bindMultiplayerLobby(el);
  }

  private bindMultiplayerLobby(el: HTMLElement): void {
    el.querySelector(".mp-backdrop")?.addEventListener("click", () => this.closeMultiplayerLobby());
    document.getElementById("btn-mp-close")?.addEventListener("click", () => this.closeMultiplayerLobby());

    el.querySelectorAll(".mp-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        sfx.uiClick();
        const id = (tab as HTMLElement).dataset.mpTab;
        el.querySelectorAll(".mp-tab").forEach((t) => t.classList.toggle("active", (t as HTMLElement).dataset.mpTab === id));
        el.querySelectorAll(".mp-tab-panel").forEach((p) => {
          p.classList.toggle("hidden", (p as HTMLElement).dataset.mpPanel !== id);
        });
      });
    });

    document.getElementById("btn-mp-local")?.addEventListener("click", () => {
      sfx.uiClick();
      this.handlers.onMultiplayerLocal?.();
    });

    document.getElementById("btn-mp-local-enter")?.addEventListener("click", () => {
      sfx.uiClick();
      this.closeMultiplayerLobby();
      this.handlers.onMultiplayerLocalEnter?.();
    });

    document.getElementById("btn-mp-host")?.addEventListener("click", () => {
      sfx.uiClick();
      const url = (document.getElementById("mp-server") as HTMLInputElement)?.value ?? "";
      this.handlers.onMultiplayerHost?.(url);
    });

    document.getElementById("btn-mp-join")?.addEventListener("click", () => {
      sfx.uiClick();
      const code = (document.getElementById("mp-code") as HTMLInputElement)?.value ?? "";
      const url = (document.getElementById("mp-server") as HTMLInputElement)?.value ?? "";
      this.handlers.onMultiplayerJoin?.(code, url);
    });

    document.getElementById("btn-mp-launch-online")?.addEventListener("click", () => {
      sfx.uiClick();
      this.handlers.onMultiplayerLaunchOnline?.();
    });

    document.getElementById("btn-mp-race-local")?.addEventListener("click", () => {
      sfx.uiClick();
      this.handlers.onMultiplayerRaceLocal?.();
    });

    document.getElementById("btn-mp-race-local-enter")?.addEventListener("click", () => {
      sfx.uiClick();
      this.closeMultiplayerLobby();
      this.handlers.onMultiplayerRaceLocalEnter?.();
    });

    document.getElementById("btn-mp-race-host")?.addEventListener("click", () => {
      sfx.uiClick();
      const url = (document.getElementById("mp-race-server") as HTMLInputElement)?.value ?? "";
      this.handlers.onMultiplayerRaceHost?.(url);
    });

    document.getElementById("btn-mp-race-join")?.addEventListener("click", () => {
      sfx.uiClick();
      const code = (document.getElementById("mp-race-code") as HTMLInputElement)?.value ?? "";
      const url = (document.getElementById("mp-race-server") as HTMLInputElement)?.value ?? "";
      this.handlers.onMultiplayerRaceJoin?.(code, url);
    });

    document.getElementById("btn-mp-race-launch")?.addEventListener("click", () => {
      sfx.uiClick();
      this.handlers.onMultiplayerRaceLaunch?.();
    });
  }

  patchMultiplayerRacePeers(count: number): void {
    const el = document.getElementById("mp-race-room-peers");
    if (el) el.textContent = count <= 1 ? "Waiting for racers…" : `${count} racers ready`;
  }

  patchMultiplayerRaceError(message: string): void {
    const el = document.getElementById("mp-race-error");
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden");
  }

  showRaceCountdown(n: number): void {
    let el = document.getElementById("race-countdown");
    if (!el) {
      el = document.createElement("div");
      el.id = "race-countdown";
      el.className = "race-countdown";
      this.root.appendChild(el);
    }
    if (n <= 0) {
      el.textContent = "GO!";
      el.classList.add("race-go");
      window.setTimeout(() => el?.remove(), 900);
    } else {
      el.textContent = String(n);
      el.classList.remove("race-go");
    }
  }

  showRaceLeaderboard(standings: PeerRaceState[], localId: string): void {
    let board = document.getElementById("race-leaderboard");
    if (!board) {
      board = document.createElement("div");
      board.id = "race-leaderboard";
      board.className = "race-leaderboard";
      this.root.appendChild(board);
    }
    board.innerHTML = `<span class="race-lb-title">LEADERBOARD</span>${renderRaceLeaderboard(standings, localId)}`;
  }

  hideRaceUi(): void {
    document.getElementById("race-leaderboard")?.remove();
    document.getElementById("race-countdown")?.remove();
    document.getElementById("race-results-overlay")?.remove();
  }

  showRaceResults(standings: PeerRaceState[], localId: string): void {
    const existing = document.getElementById("race-results-overlay");
    existing?.remove();
    const overlay = document.createElement("div");
    overlay.id = "race-results-overlay";
    overlay.className = "race-results-overlay interactive";
    overlay.innerHTML = renderRaceResults(standings, localId);
    this.root.appendChild(overlay);
    document.getElementById("btn-race-home")?.addEventListener("click", () => {
      sfx.uiClick();
      this.hideRaceUi();
      this.handlers.onRaceExit?.();
    });
  }

  patchLocalCoopWaiting(count: number): void {
    document.getElementById("mp-local-wait")?.classList.remove("hidden");
    document.getElementById("btn-mp-local")?.classList.add("hidden");
    const el = document.getElementById("mp-local-peers");
    if (el) {
      el.textContent =
        count <= 1 ? "1 scavenger ready — waiting for co-pilot…" : `${count} scavengers ready`;
    }
  }

  patchLocalRaceWaiting(count: number): void {
    document.getElementById("mp-race-local-wait")?.classList.remove("hidden");
    document.getElementById("btn-mp-race-local")?.classList.add("hidden");
    const el = document.getElementById("mp-race-local-peers");
    if (el) {
      el.textContent = count <= 1 ? "1 racer ready — waiting for opponent…" : `${count} racers ready`;
    }
  }

  patchMultiplayerRoom(code: string, role: "host" | "guest"): void {
    const room = document.getElementById("mp-room");
    const codeEl = document.getElementById("mp-room-code");
    const launchBtn = document.getElementById("btn-mp-launch-online");
    const hint = document.getElementById("mp-room-hint");
    if (room) room.classList.remove("hidden");
    if (codeEl) codeEl.textContent = code;
    document.getElementById("mp-error")?.classList.add("hidden");
    document.querySelectorAll(".mp-tab").forEach((t) => {
      t.classList.toggle("active", (t as HTMLElement).dataset.mpTab === "online");
    });
    document.querySelectorAll(".mp-tab-panel").forEach((p) => {
      p.classList.toggle("hidden", (p as HTMLElement).dataset.mpPanel !== "online");
    });
    if (role === "host") {
      launchBtn?.classList.remove("hidden");
      hint?.classList.add("hidden");
    } else {
      launchBtn?.classList.add("hidden");
      hint?.classList.remove("hidden");
      if (hint) hint.textContent = "Waiting for host to launch the sector…";
    }
  }

  patchMultiplayerRaceRoom(code: string, role: "host" | "guest"): void {
    document.getElementById("mp-race-room")?.classList.remove("hidden");
    const codeEl = document.getElementById("mp-race-room-code");
    const launchBtn = document.getElementById("btn-mp-race-launch");
    const hint = document.getElementById("mp-race-room-hint");
    if (codeEl) codeEl.textContent = code;
    document.getElementById("mp-race-error")?.classList.add("hidden");
    document.querySelectorAll(".mp-tab").forEach((t) => {
      t.classList.toggle("active", (t as HTMLElement).dataset.mpTab === "race");
    });
    document.querySelectorAll(".mp-tab-panel").forEach((p) => {
      p.classList.toggle("hidden", (p as HTMLElement).dataset.mpPanel !== "race");
    });
    if (role === "host") {
      launchBtn?.classList.remove("hidden");
      hint?.classList.add("hidden");
    } else {
      launchBtn?.classList.add("hidden");
      hint?.classList.remove("hidden");
      if (hint) hint.textContent = "Waiting for host to start the race…";
    }
  }

  patchMultiplayerPeers(count: number): void {
    const el = document.getElementById("mp-room-peers");
    if (el) {
      el.textContent =
        count <= 1 ? "Waiting for co-pilots…" : `${count} scavengers in sector`;
    }
  }

  patchMultiplayerError(message: string): void {
    const el = document.getElementById("mp-error");
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden");
  }

  closeMultiplayerLobby(): void {
    document.getElementById("mp-overlay")?.remove();
    this.handlers.onMultiplayerLobbyClose?.();
  }

  /** @deprecated use showMultiplayerLobby */
  showMultiplayerComingSoon(): void {
    this.showMultiplayerLobby();
  }

  closeMultiplayerComingSoon(): void {
    this.closeMultiplayerLobby();
  }

  private faqBtn(): string {
    return `<button class="faq-btn interactive" id="btn-faq" title="Field Manual (H)">?</button>`;
  }

  private bindFaqBtn(): void {
    document.getElementById("btn-faq")?.addEventListener("click", () => this.openFaq());
  }

  setHandlers(h: typeof this.handlers): void {
    this.handlers = h;
  }

  showHome(save: PlayerSave): void {
    this.root.innerHTML = renderHomeHtml(save, buildHomeTokenView());
    this.bindHomeControls(save);
    void this.refreshHomeTokenData(save);
  }

  private async refreshHomeTokenData(save: PlayerSave): Promise<void> {
    const stats = mintConfigured
      ? await import("../chain/pumpPrice").then((m) => m.fetchPumpStats(PUMP_MINT))
      : null;
    await walletService.refreshBalance();
    if (!document.getElementById("home-token-panel")) return;
    patchTokenPanel(buildHomeTokenView(stats));
    this.root.innerHTML = renderHomeHtml(save, buildHomeTokenView(stats));
    this.bindHomeControls(save);
  }

  showMissions(save: PlayerSave): void {
    this.root.innerHTML = renderMissionsHtml(save);
    document.getElementById("btn-missions-back")?.addEventListener("click", () => {
      sfx.uiClick();
      this.handlers.onMissionsHome?.();
    });
  }

  showMarket(save: PlayerSave): void {
    this.root.innerHTML = renderMarketHtml(save);
    document.getElementById("btn-market-back")?.addEventListener("click", () => {
      sfx.uiClick();
      this.handlers.onMarketHome?.();
    });
    document.getElementById("btn-market-deploy")?.addEventListener("click", () => {
      this.handlers.onMarketDeploy?.();
    });
    this.root.querySelectorAll("[data-trade],[data-refine],[data-svc]").forEach((el) => {
      el.addEventListener("click", () => {
        if (parseTradeAction(el as HTMLElement)) {
          this.handlers.onMarketTrade?.(el as HTMLElement);
        }
      });
    });
  }

  showSettings(save: PlayerSave): void {
    this.root.innerHTML = renderSettingsHtml(save);
    document.getElementById("btn-settings-back")?.addEventListener("click", () => {
      this.handlers.onSettingsHome?.();
    });
    document.getElementById("btn-save-name")?.addEventListener("click", () => {
      const input = document.getElementById("settings-name") as HTMLInputElement | null;
      if (input?.value.trim()) this.handlers.onSettingsName?.(input.value.trim());
    });
    document.getElementById("settings-sfx")?.addEventListener("change", (e) => {
      this.handlers.onSettingsSfx?.((e.target as HTMLInputElement).checked);
    });
    document.getElementById("btn-open-manual")?.addEventListener("click", () => {
      this.handlers.onSettingsManual?.();
    });
    document.getElementById("btn-replay-training")?.addEventListener("click", () => {
      this.handlers.onSettingsReplayTraining?.();
    });
    document.getElementById("btn-reset-save")?.addEventListener("click", () => {
      if (confirm("Reset all progress? Credits, cargo, and upgrades will be wiped.")) {
        this.handlers.onSettingsReset?.();
      }
    });
  }

  showFactions(save: PlayerSave): void {
    this.root.innerHTML = renderFactionsHtml(save);
    document.getElementById("btn-factions-back")?.addEventListener("click", () => {
      this.handlers.onFactionsHome?.();
    });
    this.root.querySelectorAll("[data-join]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.join as FactionId;
        if (id && !btn.classList.contains("joined")) {
          this.handlers.onFactionJoin?.(id);
        }
      });
    });
  }

  showIntro(
    slide: number,
    handlers: { onNext: () => void; onBack: () => void; onSkip: () => void }
  ): void {
    this.root.innerHTML = renderIntroHtml(slide);
    document.getElementById("btn-intro-next")?.addEventListener("click", handlers.onNext);
    document.getElementById("btn-intro-back")?.addEventListener("click", handlers.onBack);
    document.getElementById("btn-intro-skip")?.addEventListener("click", handlers.onSkip);
  }

  showTrainingComplete(onDone: () => void): void {
    this.root.innerHTML = renderTrainingCompleteHtml();
    document.getElementById("btn-training-done")?.addEventListener("click", onDone);
  }

  showTutorial(tutorial: TutorialController): void {
    if (!document.getElementById("hud-root")) return;
    let hud = document.getElementById("tutorial-hud");
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "tutorial-hud";
      hud.className = "tutorial-hud";
      this.root.appendChild(hud);

      if (!document.getElementById("tutorial-tag")) {
        const tag = document.createElement("div");
        tag.id = "tutorial-tag";
        tag.className = "tutorial-training-tag";
        this.root.appendChild(tag);
      }
    }

    hud.innerHTML = renderTutorialHudHtml(tutorial);
    const tag = document.getElementById("tutorial-tag");
    if (tag) tag.innerHTML = renderTutorialTagHtml();
  }

  private bindHomeControls(_save: PlayerSave): void {
    const root = this.root;
    const nav = (id: string) => this.handlers.onHomeNav?.(id);

    root.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => {
        sfx.uiClick();
        nav((el as HTMLElement).dataset.nav!);
      });
    });

    document.getElementById("btn-social-discord")?.addEventListener("click", () => {
      this.showToast("Discord coming soon — follow us on X for updates");
    });
    document.getElementById("btn-faq-footer")?.addEventListener("click", () => this.openFaq());
    document.getElementById("btn-news-all")?.addEventListener("click", () => this.openFaq());
    document.getElementById("btn-connect-wallet")?.addEventListener("click", () => {
      this.handlers.onWalletConnect?.();
    });
    document.getElementById("btn-disconnect-wallet")?.addEventListener("click", () => {
      this.handlers.onWalletDisconnect?.();
    });
  }

  resetGarageTab(): void {
    this.garageTab = "ships";
  }

  showGarage(save: PlayerSave, paint: ShipPaint, faction: FactionId, shape: ShipShapeId, dirty = false): void {
    this.root.innerHTML = renderGarageHtml(save, paint, faction, shape, save.credits, this.garageTab, dirty);
    this.bindGarageControls();
  }

  patchGarageDirty(dirty: boolean): void {
    document.getElementById("gar-dirty-badge")?.classList.toggle("hidden", !dirty);
  }

  /** Update stat readouts after hull swap without rebuilding the whole panel. */
  patchGarageShape(shape: ShipShapeId, save: PlayerSave, faction: FactionId): void {
    if (!this.root.querySelector(".garage-premium") || !save) return;
    const live = computeLiveGarageStats(save, shape, faction);
    const shapeInfo = SHIP_SHAPES[shape];

    const nameEl = document.getElementById("gar-ship-name");
    const classEl = document.getElementById("gar-ship-class");
    if (nameEl) nameEl.textContent = live.label;
    if (classEl) classEl.textContent = shapeInfo.tag;

    const statBar = document.getElementById("gar-stat-bar");
    if (statBar) statBar.innerHTML = renderGarageStatBar(live);

    const statList = document.getElementById("gar-stat-list");
    if (statList) statList.innerHTML = renderGarageStatList(live);

    const equipped = document.getElementById("gar-equipped");
    if (equipped) {
      equipped.innerHTML = live.equipped
        .map((e) => `<li class="equipped-item"><span class="eq-dot"></span>${e}</li>`)
        .join("");
    }

    this.root.querySelectorAll("[data-shape]").forEach((el) => {
      el.classList.toggle("selected", (el as HTMLElement).dataset.shape === shape);
    });
  }

  patchGarageFaction(faction: FactionId): void {
    if (!this.root.querySelector(".garage-premium")) return;
    this.root.querySelectorAll("[data-faction]").forEach((el) => {
      el.classList.toggle("selected", (el as HTMLElement).dataset.faction === faction);
    });
  }

  patchGarageRig(paint: ShipPaint): void {
    if (!this.root.querySelector(".garage-premium")) return;

    this.root.querySelectorAll(".palette-swatch[data-rig]").forEach((el) => {
      const btn = el as HTMLElement;
      const slot = btn.dataset.rig as RigSlot | undefined;
      const color = Number(btn.dataset.color);
      if (!slot || !Number.isFinite(color)) return;
      const active = slot === "engine" ? paint.engine === color : paint.glow === color;
      btn.classList.toggle("active", active);
    });
  }

  private bindGarageControls(): void {
    const root = document.getElementById("garage-root");
    if (!root) return;

    if (this.garageClickHandler) {
      root.removeEventListener("click", this.garageClickHandler);
    }

    this.garageClickHandler = (e) => {
      const target = e.target as HTMLElement;

      const tab = target.closest(".gar-tab") as HTMLElement | null;
      if (tab?.dataset.tab) {
        sfx.uiClick();
        const id = tab.dataset.tab as GarageTab;
        this.garageTab = id;
        root.querySelectorAll(".gar-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        root.querySelectorAll(".gar-tab-panel").forEach((p) => {
          p.classList.toggle("hidden", (p as HTMLElement).dataset.panel !== id);
        });
        return;
      }

      const shapeBtn = target.closest("[data-shape]") as HTMLElement | null;
      if (shapeBtn?.dataset.shape) {
        sfx.uiClick();
        this.handlers.onGarageShape?.(shapeBtn.dataset.shape as ShipShapeId);
        return;
      }

      const rigSwatch = target.closest(".palette-swatch[data-rig]") as HTMLElement | null;
      if (rigSwatch?.dataset.rig) {
        sfx.uiClick();
        const slot = rigSwatch.dataset.rig as RigSlot;
        const color = Number(rigSwatch.dataset.color);
        if (Number.isFinite(color)) this.handlers.onGarageRig?.(slot, color);
        return;
      }

      const factionBtn = target.closest("[data-faction]") as HTMLElement | null;
      if (factionBtn?.dataset.faction) {
        sfx.uiClick();
        this.handlers.onGarageFaction?.(factionBtn.dataset.faction as FactionId);
        return;
      }

      if (target.closest("#btn-save")) {
        sfx.uiClick();
        this.handlers.onGarageSave?.();
        return;
      }
      if (target.closest("#btn-launch")) {
        sfx.uiClick();
        this.handlers.onGarageLaunch?.();
        return;
      }
      if (target.closest("#btn-home")) {
        sfx.uiClick();
        this.handlers.onGarageHome?.();
        return;
      }
      if (target.closest("#btn-faq")) {
        this.openFaq();
        return;
      }
      if (target.closest("#btn-slot-lock")) {
        this.showToast("Extra ship slots coming soon");
      }
    };

    root.addEventListener("click", this.garageClickHandler);
  }

  showHUD(
    save: PlayerSave,
    hint: string,
    pois: RadarPOI[],
    extra?: {
      mining?: boolean;
      salvaging?: boolean;
      scan?: boolean;
      boosting?: boolean;
      actionProgress?: number;
      actionLabel?: string;
      hazardFlash?: boolean;
    }
  ): void {
    this.ensureHUD();
    this.lastRadarKey = "";
    this.lastPills = "";
    this.updateHUD(save, hint, pois, extra);
  }

  updateHUD(
    save: PlayerSave,
    hint: string,
    pois: RadarPOI[],
    extra?: {
      mining?: boolean;
      salvaging?: boolean;
      scan?: boolean;
      boosting?: boolean;
      actionProgress?: number;
      actionLabel?: string;
      hazardFlash?: boolean;
    }
  ): void {
    if (!document.getElementById("hud-root")) this.ensureHUD();

    const faction = FACTIONS[save.faction];
    const cMax = cargoMax(save.upgrades, save.faction);
    const cargoUsed = cargoWeight(save.cargo);
    const hullMaxVal = Math.floor(100 + save.upgrades.hull * 25 * faction.hullBonus);
    const active = getActiveMission(save);

    const set = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    const setBar = (id: string, pct: number, low = false) => {
      const el = document.getElementById(id);
      if (el) { el.style.width = `${pct}%`; el.classList.toggle("low", low); }
    };

    set("hud-credits", String(save.credits));
    set("hud-cargo", `${cargoUsed}/${cMax}`);
    set("hud-inv", `${save.cargo.ore} · ${save.cargo.scrap} · ${save.cargo.components} · ${save.cargo.alloy}A`);
    set("hud-wrecks", `${save.wrecksSalvaged}/5`);
    set("hud-hint", hint);

    if (active) {
      const prog = getMissionProgress(save, active);
      set("hud-mission", active.title);
      set("hud-mission-reward", prog ? `${active.desc} (${prog}) → ${active.reward} CR` : `${active.desc} → ${active.reward} CR`);
    } else {
      set("hud-mission", "All contracts complete!");
      set("hud-mission-reward", "Sector mastered.");
    }

    setBar("hud-fuel-bar", save.fuel, save.fuel < 25);
    setBar("hud-hull-bar", (save.hull / hullMaxVal) * 100, save.hull < 30);
    setBar("hud-cargo-bar", (cargoUsed / cMax) * 100, cargoUsed >= cMax);

    const actionWrap = document.getElementById("hud-action");
    const actionBar = document.getElementById("hud-action-bar");
    const actionLabel = document.getElementById("hud-action-label");
    if (actionWrap && actionBar && actionLabel) {
      const showAction = (extra?.actionProgress ?? 0) > 0 && !!extra?.actionLabel;
      actionWrap.classList.toggle("hidden", !showAction);
      if (showAction) {
        actionLabel.textContent = extra!.actionLabel!;
        actionBar.style.width = `${Math.min(100, extra!.actionProgress! * 100)}%`;
      }
    }

    document.getElementById("hud-root")?.classList.toggle("hazard-flash", !!extra?.hazardFlash);
    document.getElementById("hud-action")?.classList.toggle("mining-active", extra?.mining ?? false);

    const tags: string[] = [];
    if (extra?.scan) tags.push("SCAN");
    if (extra?.mining) tags.push("MINING");
    if (extra?.salvaging) tags.push("SALVAGE");
    if (extra?.boosting) tags.push("BOOST");
    const pillKey = tags.join(",");
    if (pillKey !== this.lastPills) {
      this.lastPills = pillKey;
      const pills = document.getElementById("hud-pills");
      if (pills) {
        pills.innerHTML = tags.map((t) => `<span class="pill">${t}</span>`).join("");
      }
    }

    this.updateRadar(pois, !!extra?.scan);
  }

  private ensureHUD(): void {
    if (document.getElementById("hud-root")) return;
    this.root.innerHTML = `
      <div class="hud" id="hud-root">
        <div class="hud-left">
          <div class="panel mission-panel">
            <div class="panel-label">Active Contract</div>
            <div class="panel-value small" id="hud-mission">—</div>
            <div class="mission-reward" id="hud-mission-reward"></div>
          </div>
          <div class="panel">
            <div class="panel-label">Credits</div>
            <div class="panel-value" id="hud-credits">0</div>
          </div>
          <div class="panel">
            <div class="panel-label">Cargo</div>
            <div class="panel-value" id="hud-cargo">0/0</div>
            <div class="bar"><div class="bar-fill cargo" id="hud-cargo-bar"></div></div>
          </div>
          <div class="panel">
            <div class="panel-label">Ore · Scrap · Parts · Alloy</div>
            <div class="panel-value small" id="hud-inv">0 · 0 · 0 · 0</div>
          </div>
        </div>
        <div class="hud-right">
          <div class="panel">
            <div class="panel-label">Fuel</div>
            <div class="bar"><div class="bar-fill fuel" id="hud-fuel-bar"></div></div>
          </div>
          <div class="panel">
            <div class="panel-label">Hull</div>
            <div class="bar"><div class="bar-fill hull" id="hud-hull-bar"></div></div>
          </div>
          <div class="panel">
            <div class="panel-label">Wrecks</div>
            <div class="panel-value small" id="hud-wrecks">0/5</div>
          </div>
        </div>
        <div class="hud-bottom">
          <div class="action-progress hidden" id="hud-action">
            <div class="action-label" id="hud-action-label">Salvaging</div>
            <div class="bar action-bar"><div class="bar-fill action" id="hud-action-bar"></div></div>
          </div>
          <div class="hint" id="hud-hint"></div>
          <div class="status-pills" id="hud-pills"></div>
        </div>
        <div class="radar" id="hud-radar" style="--radar-size:${RADAR_SIZE}px">
          <div class="radar-bezel">
            <div class="radar-face">
              <div class="radar-grid" aria-hidden="true"></div>
              <div class="radar-ring radar-ring-3" aria-hidden="true"></div>
              <div class="radar-ring radar-ring-2" aria-hidden="true"></div>
              <div class="radar-ring radar-ring-1" aria-hidden="true"></div>
              <div class="radar-cross" aria-hidden="true"></div>
              <div class="radar-sweep" aria-hidden="true"><div class="radar-sweep-arm"></div></div>
              <div class="radar-center" aria-hidden="true"></div>
              <div id="radar-blips"></div>
            </div>
          </div>
          <div class="radar-readout">
            <span class="radar-label">TAC SCAN</span>
            <span class="radar-nearest" id="radar-nearest">—</span>
          </div>
          <div class="radar-legend" aria-hidden="true">
            <span><i class="leg leg-rock"></i>ROCK</span>
            <span><i class="leg leg-wreck"></i>WRECK</span>
            <span><i class="leg leg-station"></i>K-7</span>
          </div>
        </div>
        <button class="hud-hub-btn interactive" id="btn-hud-hub" title="Return to Orion Station">← HUB</button>
        <div class="mobile-controls interactive" id="mobile-controls"></div>
        ${this.faqBtn()}
      </div>`;
    this.renderMobileControls();
    this.bindFaqBtn();
    document.getElementById("btn-hud-hub")?.addEventListener("click", () => this.handlers.onHudHome?.());
  }

  private updateRadar(pois: RadarPOI[], scanning: boolean): void {
    const key = radarStateKey(pois, scanning);
    if (key === this.lastRadarKey) return;
    this.lastRadarKey = key;

    const root = document.getElementById("hud-radar");
    root?.classList.toggle("radar-scanning", scanning);

    const blips = document.getElementById("radar-blips");
    if (blips) blips.innerHTML = renderRadarBlips(pois);

    const nearest = document.getElementById("radar-nearest");
    if (nearest) nearest.textContent = renderRadarNearest(pois);

    if (scanning && !this.lastRadarScan) {
      root?.classList.remove("radar-pulse");
      void root?.offsetWidth;
      root?.classList.add("radar-pulse");
    }
    this.lastRadarScan = scanning;
  }

  showStation(save: PlayerSave): void {
    this.root.innerHTML = renderStationHtml(save);
    this.root.querySelectorAll("[data-upgrade]").forEach((el) => {
      el.addEventListener("click", () => this.handlers.onUpgrade?.((el as HTMLElement).dataset.upgrade as keyof PlayerSave["upgrades"]));
    });
    this.root.querySelectorAll("[data-claim]").forEach((el) => {
      el.addEventListener("click", () => this.handlers.onClaimMission?.((el as HTMLElement).dataset.claim!));
    });
    this.root.querySelectorAll("[data-trade],[data-refine],[data-svc]").forEach((el) => {
      el.addEventListener("click", () => this.handlers.onTrade?.(el as HTMLElement));
    });
    document.getElementById("btn-undock")?.addEventListener("click", () => this.handlers.onCloseStation?.());
    document.getElementById("btn-station-hub")?.addEventListener("click", () => this.handlers.onStationHome?.());
    document.getElementById("btn-faq-station")?.addEventListener("click", () => this.openFaq());
  }

  showToast(message: string): void {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      this.root.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("visible");
    setTimeout(() => toast?.classList.remove("visible"), 2800);
  }

  bindMobile(input: { mobile: Record<string, boolean> }): void {
    const controls = document.getElementById("mobile-controls");
    if (!controls) return;
    const map: Record<string, string> = {
      up: "forward", down: "back", left: "left", right: "right",
      pu: "pitchUp", pd: "pitchDown", su: "strafeUp", boost: "boost",
      mine: "mine", act: "interact", dock: "dock", scan: "scan",
    };
    controls.querySelectorAll(".mob-btn").forEach((btn) => {
      const el = btn as HTMLElement;
      const field = map[el.dataset.m!];
      const down = (e: Event) => {
        e.preventDefault();
        input.mobile[field] = true;
        el.classList.add("mob-btn-active");
      };
      const up = () => {
        input.mobile[field] = false;
        el.classList.remove("mob-btn-active");
      };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      el.addEventListener("pointerleave", up);
    });
  }

  private renderMobileControls(): void {
    const el = document.getElementById("mobile-controls");
    if (!el) return;
    el.innerHTML = `
      <div class="mob-cluster mob-cluster--fly">
        <span class="mob-cluster-label">FLY</span>
        <div class="mob-dpad">
          <button type="button" class="mob-btn mob-btn-lg" data-m="up" aria-label="Thrust">▲</button>
          <div class="mob-dpad-mid">
            <button type="button" class="mob-btn mob-btn-lg" data-m="left" aria-label="Turn left">◀</button>
            <button type="button" class="mob-btn mob-btn-lg" data-m="down" aria-label="Brake">▼</button>
            <button type="button" class="mob-btn mob-btn-lg" data-m="right" aria-label="Turn right">▶</button>
          </div>
        </div>
        <div class="mob-row">
          <button type="button" class="mob-btn" data-m="pu" aria-label="Pitch up">R</button>
          <button type="button" class="mob-btn" data-m="pd" aria-label="Pitch down">F</button>
          <button type="button" class="mob-btn" data-m="su" aria-label="Ascend">Q</button>
          <button type="button" class="mob-btn mob-btn-boost" data-m="boost" aria-label="Boost">⚡</button>
        </div>
      </div>
      <div class="mob-cluster mob-cluster--act">
        <span class="mob-cluster-label">ACTIONS</span>
        <div class="mob-row">
          <button type="button" class="mob-btn mob-btn-action" data-m="scan" aria-label="Scan">SCAN</button>
          <button type="button" class="mob-btn mob-btn-action mob-btn-mine" data-m="mine" aria-label="Mine">MINE</button>
        </div>
        <div class="mob-row">
          <button type="button" class="mob-btn mob-btn-action mob-btn-salvage" data-m="act" aria-label="Salvage hold">SALVAGE</button>
          <button type="button" class="mob-btn mob-btn-action mob-btn-dock" data-m="dock" aria-label="Dock">DOCK</button>
        </div>
      </div>`;
  }
}

export function applyUpgrade(save: PlayerSave, key: keyof PlayerSave["upgrades"]): boolean {
  const lvl = save.upgrades[key];
  const max = MAX_UPGRADE[key];
  if (lvl >= max) return false;
  const cost = UPGRADE_COSTS[key][lvl - 1];
  const needsPart = lvl >= 2 && key !== "scanner";
  if (save.credits < cost) return false;
  if (needsPart && save.cargo.components < 1) return false;
  save.credits -= cost;
  if (needsPart) save.cargo.components -= 1;
  save.totalSpent += cost;
  save.upgrades[key]++;
  writeSave(save);
  return true;
}
