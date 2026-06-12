import { mintConfigured, PUMP_MINT } from "../chain/config";
import { fetchPumpStats } from "../chain/pumpPrice";
import { walletService } from "../chain/wallet";
import { getMissionProgress } from "../game/missionProgress";
import { getActiveMission } from "../game/missions";
import { cargoMax, cargoWeight } from "../game/economy";
import { FACTIONS, MAX_UPGRADE, UPGRADE_COSTS, type FactionId, type PlayerSave, type RadarPOI } from "../game/types";
import { writeSave } from "../game/Save";
import { paintToHex, type PaintPart, type ShipPaint } from "../game/shipPaint";
import type { ShipShapeId } from "../game/shipShapes";
import { getFaqHtml } from "./faqContent";
import { renderGarageHtml, type GarageTab } from "./garageContent";
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
import { renderMultiplayerComingSoonHtml } from "./multiplayerContent";
import { renderFuelCrisisHtml, renderFuelEmptyHtml } from "./fuelCrisisContent";
import { renderPauseHtml } from "./pauseContent";
import { RADAR_SIZE, radarStateKey, renderRadarBlips, renderRadarNearest } from "./radarDisplay";
import { renderStationHtml } from "./stationMarket";

export class UI {
  root: HTMLElement;
  private handlers: {
    onGarageLaunch?: (faction: FactionId, paint: ShipPaint, shape: ShipShapeId) => void;
    onGarageSkin?: (id: string) => void;
    onGaragePart?: (part: PaintPart) => void;
    onGarageColor?: (part: PaintPart, color: number) => void;
    onGarageRandom?: () => void;
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
  } = {};
  private lastRadarKey = "";
  private lastRadarScan = false;
  private lastPills = "";
  private garageTab: GarageTab = "ships";

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

  showMultiplayerComingSoon(): void {
    if (document.getElementById("mp-overlay")) return;
    const overlay = document.createElement("div");
    overlay.innerHTML = renderMultiplayerComingSoonHtml();
    const el = overlay.firstElementChild as HTMLElement;
    this.root.appendChild(el);
    el.querySelector(".mp-backdrop")?.addEventListener("click", () => this.closeMultiplayerComingSoon());
    document.getElementById("btn-mp-close")?.addEventListener("click", () => this.closeMultiplayerComingSoon());
  }

  closeMultiplayerComingSoon(): void {
    document.getElementById("mp-overlay")?.remove();
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
    const stats = mintConfigured ? await fetchPumpStats(PUMP_MINT) : null;
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
      hud.innerHTML = `
        <div class="tutorial-card">
          <div class="tutorial-step-label" id="tut-label"></div>
          <div class="tutorial-step-title" id="tut-title"></div>
          <div class="tutorial-step-hint" id="tut-hint"></div>
          <div class="tutorial-progress"><div class="tutorial-progress-fill" id="tut-progress"></div></div>
        </div>`;
      this.root.appendChild(hud);

      if (!document.getElementById("tutorial-tag")) {
        const tag = document.createElement("div");
        tag.id = "tutorial-tag";
        tag.className = "tutorial-training-tag";
        tag.textContent = "TRAINING LANE";
        this.root.appendChild(tag);
      }
    }

    const step = tutorial.step;
    const set = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set("tut-label", `STEP ${tutorial.stepIndex + 1} / 5`);
    set("tut-title", step.title);
    set("tut-hint", step.hint);
    const bar = document.getElementById("tut-progress");
    if (bar) bar.style.width = `${tutorial.progress * 100}%`;
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

  showGarage(paint: ShipPaint, faction: FactionId, shape: ShipShapeId, credits: number): void {
    this.root.innerHTML = renderGarageHtml(paint, faction, shape, credits, this.garageTab);
    this.bindGarageControls(paint, faction, shape);
  }

  patchGaragePaint(paint: ShipPaint): void {
    if (!this.root.querySelector(".garage-premium")) return;

    this.root.querySelectorAll(".skin-tile").forEach((el) => {
      const tile = el as HTMLElement;
      tile.classList.toggle("selected", tile.dataset.skin === paint.skin);
    });

    this.root.querySelectorAll(".palette-swatch").forEach((el) => {
      const btn = el as HTMLElement;
      const part = btn.dataset.part as PaintPart | undefined;
      const color = Number(btn.dataset.color);
      if (!part) return;
      btn.classList.toggle("active", paint[part] === color);
    });

    this.root.querySelectorAll(".paint-zone").forEach((zone) => {
      const swatch = zone.querySelector(".paint-zone-current") as HTMLElement | null;
      const part = zone.querySelector(".palette-swatch")?.getAttribute("data-part") as PaintPart | null;
      if (swatch && part) swatch.style.background = paintToHex(paint[part]);
    });
  }

  private bindGarageControls(paint: ShipPaint, faction: FactionId, shape: ShipShapeId): void {
    const root = this.root;

    root.querySelectorAll(".gar-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const id = (tab as HTMLElement).dataset.tab as GarageTab;
        this.garageTab = id;
        root.querySelectorAll(".gar-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        root.querySelectorAll(".gar-tab-panel").forEach((p) => {
          p.classList.toggle("hidden", (p as HTMLElement).dataset.panel !== id);
        });
      });
    });

    root.querySelectorAll("[data-shape]").forEach((el) => {
      el.addEventListener("click", () => this.handlers.onGarageShape?.((el as HTMLElement).dataset.shape as ShipShapeId));
    });
    root.querySelectorAll("[data-skin]").forEach((el) => {
      el.addEventListener("click", () => this.handlers.onGarageSkin?.((el as HTMLElement).dataset.skin!));
    });
    root.querySelectorAll(".palette-swatch").forEach((el) => {
      el.addEventListener("click", () => {
        const btn = el as HTMLElement;
        const part = btn.dataset.part as PaintPart;
        const color = Number(btn.dataset.color);
        if (part && Number.isFinite(color)) this.handlers.onGarageColor?.(part, color);
      });
    });
    root.querySelectorAll("[data-faction]").forEach((el) => {
      el.addEventListener("click", () => this.handlers.onGarageFaction?.((el as HTMLElement).dataset.faction as FactionId));
    });
    document.getElementById("btn-random")?.addEventListener("click", () => this.handlers.onGarageRandom?.());
    document.getElementById("btn-save")?.addEventListener("click", () => this.handlers.onGarageSave?.());
    document.getElementById("btn-launch")?.addEventListener("click", () => {
      this.handlers.onGarageLaunch?.(faction, paint, shape);
    });
    document.getElementById("btn-home")?.addEventListener("click", () => this.handlers.onGarageHome?.());
    document.getElementById("btn-faq")?.addEventListener("click", () => this.openFaq());
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
      const field = map[(btn as HTMLElement).dataset.m!];
      const down = () => { input.mobile[field] = true; };
      const up = () => { input.mobile[field] = false; };
      btn.addEventListener("pointerdown", (e) => { e.preventDefault(); down(); });
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointerleave", up);
    });
  }

  private renderMobileControls(): void {
    const el = document.getElementById("mobile-controls");
    if (!el) return;
    el.innerHTML = `
      <div class="mob-dpad">
        <button class="mob-btn" data-m="left">◀</button>
        <button class="mob-btn" data-m="up">▲</button>
        <button class="mob-btn" data-m="down">▼</button>
        <button class="mob-btn" data-m="right">▶</button>
      </div>
      <div class="mob-actions">
        <button class="mob-btn" data-m="pu">R</button>
        <button class="mob-btn" data-m="pd">F</button>
        <button class="mob-btn" data-m="su">Q</button>
        <button class="mob-btn boost" data-m="boost">⚡</button>
        <button class="mob-btn" data-m="mine">⛏</button>
        <button class="mob-btn" data-m="act">E</button>
        <button class="mob-btn dock" data-m="dock">G</button>
        <button class="mob-btn" data-m="scan">⌖</button>
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
