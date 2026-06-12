import * as THREE from "three";
import { sfx } from "../audio/SFX";
import { isSkinUnlocked } from "../chain/holderPerks";
import { walletService } from "../chain/wallet";
import {
  advanceMarket,
  buyCommodity,
  buyFuel,
  buyRepair,
  cargoWeight,
  hullMax,
  payDockFee,
  refineOre,
  refineScrap,
  sellCommodity,
} from "./economy";
import { burnAllCargoForFuel } from "./fuelEmergency";
import { Input as InputClass } from "./Input";
import { claimableMissions, claimMission } from "./missions";
import { loadSave, resetSave, writeSave } from "./Save";
import {
  applySkin,
  clonePaint,
  randomizePaint,
  setPartColor,
  type ShipPaint,
} from "./shipPaint";
import type { ShipShapeId } from "./shipShapes";
import { FACTIONS, type FactionId, type PlayerSave } from "./types";
import { TutorialController } from "./Tutorial";
import { Sector } from "../world/Sector";
import { UI, applyUpgrade } from "../ui/UI";
import { parseTradeAction } from "../ui/stationMarket";
import { applyGarageViewOffset, bindGarageViewport } from "./garageViewport";
import { Garage } from "../visuals/Garage";
import { OrionStation } from "../visuals/OrionStation";
import { clearTextureCache } from "../assets/proceduralTextures";
import { createSkyDome } from "../visuals/SkyDome";
import { COLORS } from "../utils/voxel";

type Mode = "intro" | "training" | "home" | "factions" | "market" | "missions" | "settings" | "garage" | "sector" | "station";

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private skyDome: THREE.Mesh;
  private sceneLights: THREE.Light[] = [];
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private input: InputClass;
  private ui: UI;
  private save: PlayerSave;
  private mode: Mode = "home";
  private sector: Sector | null = null;
  private garage: Garage;
  private hub: OrionStation;
  private garagePaint: ShipPaint;
  private garageShape: ShipShapeId;
  private garageFaction: FactionId;
  private animId = 0;
  private lastToast = "";
  private baseFov = 58;
  private shake = 0;
  private fuelWarnTimer = 0;
  private fuelEmptyLatch = false;
  private saveTimer = 0;
  private hudTimer = 0;
  private missionToasts = new Set<string>();
  private introSlide = 0;
  private tutorial: TutorialController | null = null;
  private paused = false;
  private garageViewportUnbind: (() => void) | null = null;

  constructor(container: HTMLElement, uiRoot: HTMLElement) {
    this.input = new InputClass();
    this.ui = new UI(uiRoot);
    this.save = loadSave() ?? resetSave("syndicate");
    sfx.setEnabled(this.save.sfxEnabled !== false);
    this.garagePaint = clonePaint(this.save.shipPaint);
    this.garageShape = this.save.shipShape;
    this.garageFaction = this.save.faction;
    this.garage = new Garage();
    this.hub = new OrionStation();
    this.refreshGarageShip();

    this.ui.setHandlers({
      onHomeNav: (nav) => this.handleHomeNav(nav),
      onDailyClaim: () => {
        const hub = this.save.hubDaily ?? { streak: 1, lastClaimMs: 0 };
        const canClaim = hub.streak < 5 && (hub.lastClaimMs === 0 || Date.now() - hub.lastClaimMs > 86_400_000);
        if (!canClaim) {
          this.ui.showToast(hub.streak >= 5 ? "All daily rewards claimed" : "Next reward unlocks tomorrow");
          return;
        }
        const nextDay = hub.streak + 1;
        const reward = 150 + nextDay * 100;
        this.save.credits += reward;
        this.save.hubDaily = { streak: nextDay, lastClaimMs: Date.now() };
        writeSave(this.save);
        this.ui.showToast(`Daily reward claimed! +${reward} CR`);
        this.ui.showHome(this.save);
      },
      onGarageHome: () => this.enterHome(),
      onFactionsHome: () => this.enterHome(),
      onFactionJoin: (faction) => {
        if (this.save.faction === faction) return;
        this.save.faction = faction;
        this.garageFaction = faction;
        writeSave(this.save);
        this.ui.showToast(`Enlisted with ${FACTIONS[faction].name}`);
        this.ui.showFactions(this.save);
      },
      onSettingsHome: () => this.enterHome(),
      onSettingsName: (name) => {
        this.save.name = name;
        writeSave(this.save);
        this.ui.showToast(`Callsign updated: ${name}`);
      },
      onSettingsSfx: (enabled) => {
        this.save.sfxEnabled = enabled;
        sfx.setEnabled(enabled);
        writeSave(this.save);
      },
      onSettingsManual: () => this.ui.openFaq(),
      onSettingsReplayTraining: () => {
        this.save.tutorialComplete = false;
        writeSave(this.save);
        this.enterTraining();
      },
      onMarketHome: () => this.enterHome(),
      onMissionsHome: () => this.enterHome(),
      onMarketTrade: (el) => this.handleTrade(el),
      onMarketDeploy: () => {
        if (this.save.tutorialComplete) this.deployFromHome();
        else this.ui.showToast("Complete training before deploying to sector");
      },
      onSettingsReset: () => {
        const faction = this.save.faction;
        const name = this.save.name;
        const paint = clonePaint(this.save.shipPaint);
        const shape = this.save.shipShape;
        const tutorial = this.save.tutorialComplete;
        const sfxOn = this.save.sfxEnabled;
        this.save = resetSave(faction);
        this.save.name = name;
        this.save.shipPaint = paint;
        this.save.shipShape = shape;
        this.save.tutorialComplete = tutorial;
        this.save.sfxEnabled = sfxOn;
        writeSave(this.save);
        this.ui.showToast("Progress reset");
        this.ui.showSettings(this.save);
      },
      onGarageLaunch: (faction, paint, shape) => this.launch(faction, paint, shape),
      onGarageSkin: (id) => {
        if (!isSkinUnlocked(id, walletService.tier)) {
          this.ui.showToast("Hold $SALVAGE to unlock this paint");
          return;
        }
        this.setGaragePaint(applySkin(id));
      },
      onWalletConnect: async () => {
        const ok = await walletService.connect();
        if (!ok) {
          this.ui.showToast(walletService.hasPhantom() ? "Wallet connection cancelled" : "Install Phantom to connect");
          return;
        }
        this.save.walletAddress = walletService.publicKey ?? undefined;
        writeSave(this.save);
        this.ui.showHome(this.save);
        if (walletService.tier !== "none") {
          this.ui.showToast("$SALVAGE holder perks unlocked!");
        } else {
          this.ui.showToast("Wallet connected — hold $SALVAGE for perks");
        }
      },
      onWalletDisconnect: async () => {
        await walletService.disconnect();
        delete this.save.walletAddress;
        writeSave(this.save);
        this.ui.showHome(this.save);
        this.ui.showToast("Wallet disconnected");
      },
      onPauseResume: () => this.resumeFlight(),
      onPauseHome: () => this.retreatToHome(),
      onHudHome: () => this.openPauseMenu(),
      onFuelCrisisBurn: () => this.handleFuelCrisisBurn(),
      onFuelCrisisDismiss: () => this.handleFuelCrisisDismiss(),
      onGarageColor: (part, color) => this.setGaragePaint(setPartColor(this.garagePaint, part, color)),
      onGarageRandom: () => this.setGaragePaint(randomizePaint()),
      onGarageShape: (shape) => {
        this.garageShape = shape;
        this.refreshGarageShip();
        this.garage.resetView();
        this.refreshGarageUI();
      },
      onGarageFaction: (faction) => {
        this.garageFaction = faction;
        this.refreshGarageUI();
      },
      onGarageSave: () => {
        this.save.shipPaint = clonePaint(this.garagePaint);
        this.save.shipShape = this.garageShape;
        this.save.faction = this.garageFaction;
        writeSave(this.save);
        this.ui.showToast("Ship configuration saved");
      },
      onCloseStation: () => this.closeStation(),
      onStationHome: () => this.retreatToHome(),
      onUpgrade: (key) => {
        if (applyUpgrade(this.save, key)) {
          sfx.upgrade();
          this.ui.showToast("Upgrade installed!");
          this.ui.showStation(this.save);
        } else {
          sfx.fail();
          this.ui.showToast("Can't upgrade — need credits or ship parts");
        }
      },
      onTrade: (el) => this.handleTrade(el),
      onClaimMission: (id) => {
        const reward = claimMission(this.save, id);
        if (reward > 0) {
          sfx.mission();
          this.ui.showToast(`Contract complete! +${reward} CR`);
          writeSave(this.save);
          this.ui.showStation(this.save);
        }
      },
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.space);
    this.scene.fog = new THREE.FogExp2(0x0c1020, 0.0001);

    this.camera = new THREE.PerspectiveCamera(this.baseFov, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    clearTextureCache();
    this.skyDome = createSkyDome();
    this.scene.add(this.skyDome);
    this.scene.add(this.garage.group);
    this.scene.add(this.hub.group);
    this.garage.group.visible = false;
    this.hub.group.visible = false;

    this.setupLights();
    window.addEventListener("resize", () => this.onResize());
    document.addEventListener("pointerdown", () => sfx.unlock(), { once: true });
    void walletService.tryReconnect(this.save.walletAddress);
    if (this.save.tutorialComplete) this.enterHome();
    else this.enterIntro();
    this.loop();
  }

  private handleHomeNav(nav: string): void {
    switch (nav) {
      case "hangar":
      case "build":
        this.enterGarage();
        break;
      case "play":
      case "deploy":
      case "map":
        if (this.save.tutorialComplete) this.deployFromHome();
        else this.enterTraining();
        break;
      case "training":
        this.enterTraining();
        break;
      case "market":
        this.enterMarket();
        break;
      case "missions":
        this.enterMissions();
        break;
      case "factions":
        this.enterFactions();
        break;
      case "settings":
        this.enterSettings();
        break;
      case "multiplayer":
        this.ui.showMultiplayerComingSoon();
        break;
      case "leaderboards":
        this.ui.showToast("Leaderboards coming soon");
        break;
      default:
        break;
    }
  }

  private flushSave(): void {
    writeSave(this.save);
    this.saveTimer = 0;
  }

  private enterIntro(slide = 0): void {
    this.mode = "intro";
    this.introSlide = slide;
    const gameRoot = document.getElementById("game-root");
    if (gameRoot) gameRoot.style.visibility = "hidden";
    this.garage.group.visible = false;
    this.hub.group.visible = false;
    this.ui.showIntro(slide, this.getIntroHandlers());
  }

  private getIntroHandlers() {
    return {
      onNext: () => {
        if (this.introSlide >= 3) this.enterTraining();
        else {
          this.introSlide++;
          this.ui.showIntro(this.introSlide, this.getIntroHandlers());
        }
      },
      onBack: () => {
        if (this.introSlide > 0) {
          this.introSlide--;
          this.ui.showIntro(this.introSlide, this.getIntroHandlers());
        }
      },
      onSkip: () => this.enterTraining(),
    };
  }

  private focusFlight(): void {
    this.input.clear();
    this.input.focusGame(this.renderer.domElement);
  }

  private enterTraining(): void {
    this.mode = "training";
    this.tutorial = new TutorialController();
    const gameRoot = document.getElementById("game-root");
    if (gameRoot) gameRoot.style.visibility = "visible";
    if (this.sector) {
      this.scene.remove(this.sector.group);
      this.sector = null;
    }
    this.hub.group.visible = false;
    this.garage.group.visible = false;
    this.setBackdrop("space");
    this.save.hasScanned = false;
    this.save.hasDocked = false;
    this.save.cargo = { ore: 0, scrap: 0, components: 0, alloy: 0 };
    this.save.fuel = 100;
    this.save.hull = hullMax(this.save.upgrades, this.save.faction);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.sector = new Sector(this.save, { training: true });
    this.scene.add(this.sector.group);
    this.ui.showHUD(this.save, this.tutorial.step.hint, this.sector.getRadarPOIs(this.save), {});
    this.ui.showTutorial(this.tutorial);
    this.ui.bindMobile(this.input);
    this.focusFlight();
    sfx.startAmbient();
    this.ui.showToast("Training rocks ahead with gold beacons · WASD to fly");
  }

  private finishTraining(): void {
    this.save.tutorialComplete = true;
    this.flushSave();
    this.mode = "intro";
    const gameRoot = document.getElementById("game-root");
    if (gameRoot) gameRoot.style.visibility = "hidden";
    if (this.sector) {
      this.scene.remove(this.sector.group);
      this.sector = null;
    }
    this.tutorial = null;
    this.ui.showTrainingComplete(() => this.enterHome());
  }

  private deployFromHome(): void {
    const gameRoot = document.getElementById("game-root");
    if (gameRoot) gameRoot.style.visibility = "visible";
    this.hub.group.visible = false;
    this.setBackdrop("space");
    this.flushSave();
    this.enterSector();
  }

  private refreshGarageShip(): void {
    this.garage.setShip(this.garagePaint, this.garageShape);
  }

  private refreshGarageUI(): void {
    this.ui.showGarage(this.garagePaint, this.garageFaction, this.garageShape, this.save.credits);
  }

  private setGaragePaint(paint: ShipPaint): void {
    this.garagePaint = paint;
    this.refreshGarageShip();
    this.ui.patchGaragePaint(paint);
  }

  private enterFactions(): void {
    this.mode = "factions";
    const gameRoot = document.getElementById("game-root");
    if (gameRoot) gameRoot.style.visibility = "hidden";
    this.garage.group.visible = false;
    this.hub.group.visible = false;
    this.ui.showFactions(this.save);
  }

  private enterMarket(): void {
    this.mode = "market";
    const gameRoot = document.getElementById("game-root");
    if (gameRoot) gameRoot.style.visibility = "hidden";
    this.garage.group.visible = false;
    this.hub.group.visible = false;
    this.ui.showMarket(this.save);
  }

  private enterSettings(): void {
    this.mode = "settings";
    const gameRoot = document.getElementById("game-root");
    if (gameRoot) gameRoot.style.visibility = "hidden";
    this.garage.group.visible = false;
    this.hub.group.visible = false;
    this.ui.showSettings(this.save);
  }

  private openPauseMenu(): void {
    if (this.mode !== "sector" && this.mode !== "training") return;
    if (this.ui.isFaqOpen()) this.ui.closeFaq();
    this.paused = true;
    sfx.stopMining();
    sfx.stopSalvage();
    sfx.stopEngine();
    this.ui.showPause(this.mode === "training");
  }

  private resumeFlight(): void {
    if (!this.paused) return;
    this.paused = false;
    this.ui.closePause();
    this.focusFlight();
  }

  private retreatToHome(): void {
    this.paused = false;
    this.ui.closePause();
    this.ui.closeFuelCrisis();
    this.fuelEmptyLatch = false;
    if (this.mode === "training") {
      this.tutorial = null;
      document.getElementById("tutorial-hud")?.remove();
      document.getElementById("tutorial-tag")?.remove();
    }
    this.enterHome();
    this.ui.showToast("Returned to Orion Station");
  }

  private leaveGarageViewport(): void {
    this.garageViewportUnbind?.();
    this.garageViewportUnbind = null;
    this.camera.clearViewOffset();
  }

  private enterHome(): void {
    sfx.stopMining();
    sfx.stopSalvage();
    sfx.stopEngine();
    sfx.stopAmbient();
    this.paused = false;
    this.ui.closePause();
    this.leaveGarageViewport();
    this.mode = "home";
    if (this.sector) {
      this.flushSave();
      this.scene.remove(this.sector.group);
      this.sector = null;
    }
    this.garage.group.visible = false;
    this.hub.group.visible = false;
    const gameRoot = document.getElementById("game-root");
    if (gameRoot) gameRoot.style.visibility = "hidden";
    this.ui.showHome(this.save);
  }

  private enterGarage(): void {
    this.mode = "garage";
    const gameRoot = document.getElementById("game-root");
    if (gameRoot) gameRoot.style.visibility = "visible";
    if (this.sector) {
      this.scene.remove(this.sector.group);
      this.sector = null;
    }
    this.hub.group.visible = false;
    this.garage.group.visible = true;
    this.garagePaint = clonePaint(this.save.shipPaint);
    this.garageShape = this.save.shipShape;
    this.garageFaction = this.save.faction;
    this.ui.resetGarageTab();
    this.refreshGarageShip();
    this.garage.resetView();
    this.refreshGarageUI();
    this.setBackdrop("garage");
    this.garageViewportUnbind?.();
    requestAnimationFrame(() => {
      this.garageViewportUnbind = bindGarageViewport(this.garage);
      this.updateGarageCamera();
    });
  }

  private updateGarageCamera(): void {
    this.camera.fov = 42;
    this.camera.near = 0.1;
    this.camera.far = 200;
    this.camera.updateProjectionMatrix();
    applyGarageViewOffset(this.camera);
    const { position, lookAt } = this.garage.getCameraPose();
    this.camera.position.copy(position);
    this.camera.lookAt(lookAt);
  }

  private setBackdrop(mode: "hub" | "garage" | "space"): void {
    const fog = this.scene.fog as THREE.FogExp2;
    if (mode === "space") {
      this.renderer.toneMappingExposure = 1.55;
      fog.density = 0.00004;
      fog.color.setHex(0x1a2040);
      this.scene.background = new THREE.Color(0x0e1428);
      this.skyDome.visible = true;
    } else if (mode === "hub") {
      this.renderer.toneMappingExposure = 1.15;
      fog.density = 0;
      fog.color.setHex(0x080c18);
      this.scene.background = new THREE.Color(0x060a14);
      this.skyDome.visible = true;
    } else {
      this.renderer.toneMappingExposure = 1.58;
      fog.density = 0;
      fog.color.setHex(0x1a2848);
      this.scene.background = new THREE.Color(0x121a30);
      this.skyDome.visible = false;
    }
    const lightScale = mode === "hub" ? 0.85 : 1;
    for (const light of this.sceneLights) {
      const base = (light.userData.baseIntensity as number | undefined)
        ?? ((light.userData.baseIntensity = light.intensity), light.intensity);
      light.intensity = base * lightScale;
    }
  }

  private updateHubCamera(): void {
    this.camera.fov = 34;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(5.5, 2.8, 7.5);
    this.camera.lookAt(0, 1.4, -2);
  }

  private handleTrade(el: HTMLElement): void {
    const action = parseTradeAction(el);
    if (!action) return;

    let result;
    if (action.type === "sell" || action.type === "buy") {
      const qty = action.qty === "all"
        ? this.save.cargo[action.commodity]
        : action.qty;
      result = action.type === "sell"
        ? sellCommodity(this.save, action.commodity, qty)
        : buyCommodity(this.save, action.commodity, qty);
    } else if (action.type === "refine") {
      result = action.mode === "ore" ? refineOre(this.save) : refineScrap(this.save);
    } else if (action.type === "svc") {
      if (action.mode === "fuel10") result = buyFuel(this.save, 10);
      else if (action.mode === "fuel25") result = buyFuel(this.save, 25);
      else if (action.mode === "repair10") result = buyRepair(this.save, 10);
      else result = buyRepair(this.save, hullMax(this.save.upgrades, this.save.faction));
    } else {
      return;
    }

    this.ui.showToast(result.message);
    if (result.ok) {
      sfx.trade();
      writeSave(this.save);
      if (this.mode === "market") this.ui.showMarket(this.save);
      else if (this.mode === "station") this.ui.showStation(this.save);
    } else {
      sfx.fail();
    }
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xaabbdd, 1.35);
    this.scene.add(ambient);
    this.sceneLights.push(ambient);

    const hemi = new THREE.HemisphereLight(0xd8e8ff, 0x384868, 1.65);
    this.scene.add(hemi);
    this.sceneLights.push(hemi);

    const sun = new THREE.DirectionalLight(0xfff8f0, 2.0);
    sun.position.set(80, 120, 60);
    this.scene.add(sun);
    this.sceneLights.push(sun);

    const fill = new THREE.DirectionalLight(0x99bbee, 1.15);
    fill.position.set(-60, 40, -80);
    this.scene.add(fill);
    this.sceneLights.push(fill);
  }

  private launch(faction: FactionId, paint: ShipPaint, shape: ShipShapeId): void {
    if (this.save.faction !== faction) this.save = resetSave(faction);
    this.save.faction = faction;
    this.save.shipPaint = clonePaint(paint);
    this.save.shipShape = shape;
    this.flushSave();
    this.leaveGarageViewport();
    this.garage.group.visible = false;
    this.hub.group.visible = false;
    this.setBackdrop("space");
    this.enterSector();
  }

  private enterSector(): void {
    if (this.sector) {
      this.scene.remove(this.sector.group);
      this.sector = null;
    }
    this.mode = "sector";
    this.hub.group.visible = false;
    this.garage.group.visible = false;
    this.setBackdrop("space");
    this.saveTimer = 0;
    this.hudTimer = 0;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.lastToast = "";
    this.missionToasts.clear();
    this.fuelEmptyLatch = false;
    this.ui.closeFuelCrisis();
    this.sector = new Sector(this.save);
    this.scene.add(this.sector.group);
    this.ui.showHUD(this.save, "TAB to scan · G to dock at green beacon", [], {});
    this.ui.bindMobile(this.input);
    this.focusFlight();
    sfx.startAmbient();
  }

  private checkFuelCrisis(): void {
    if (!this.sector || this.paused || this.ui.isPauseOpen() || this.ui.isFaqOpen()) return;
    if (this.mode !== "sector" && this.mode !== "training") return;

    if (this.save.fuel > 0) {
      this.fuelEmptyLatch = false;
      if (this.ui.isFuelCrisisOpen()) this.ui.closeFuelCrisis();
      return;
    }

    if (this.fuelEmptyLatch || this.ui.isFuelCrisisOpen()) return;

    this.fuelEmptyLatch = true;
    sfx.warn();
    if (cargoWeight(this.save.cargo) > 0) this.ui.showFuelCrisis(this.save);
    else this.ui.showFuelEmpty();
  }

  private handleFuelCrisisBurn(): void {
    const result = burnAllCargoForFuel(this.save);
    this.ui.closeFuelCrisis();
    if (!result.ok) {
      this.ui.showToast(result.message);
      return;
    }
    this.fuelEmptyLatch = false;
    sfx.dock();
    this.ui.showToast(result.message);
    writeSave(this.save);
  }

  private handleFuelCrisisDismiss(): void {
    this.ui.closeFuelCrisis();
  }

  private openStation(): void {
    if (this.mode === "training") {
      this.save.hasDocked = true;
      sfx.dock();
      this.finishTraining();
      return;
    }
    const fee = payDockFee(this.save);
    if (!fee.ok) {
      sfx.fail();
      this.ui.showToast(fee.message);
      return;
    }
    advanceMarket(this.save);
    this.mode = "station";
    this.flushSave();
    this.ui.showToast(fee.message);
    this.ui.showStation(this.save);
  }

  private closeStation(): void {
    this.mode = "sector";
    this.setBackdrop("space");
    sfx.undock();
    this.flushSave();
    this.ui.showHUD(this.save, "Undocked.", this.sector?.getRadarPOIs(this.save) ?? [], {});
    this.ui.bindMobile(this.input);
    this.focusFlight();
  }

  private enterMissions(): void {
    this.mode = "missions";
    this.garage.group.visible = false;
    this.hub.group.visible = false;
    this.setBackdrop("hub");
    this.ui.showMissions(this.save);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    if (this.mode === "garage") this.updateGarageCamera();
    else if (this.mode === "home") this.updateHubCamera();
    else this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private loop = (): void => {
    this.animId = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.mode === "garage" && !this.ui.isFaqOpen()) {
      this.garage.update(dt);
      applyGarageViewOffset(this.camera);
      const { position, lookAt } = this.garage.getCameraPose();
      this.camera.position.copy(position);
      this.camera.lookAt(lookAt);
    }

    if ((this.mode === "sector" || this.mode === "training") && this.sector) {
      if (this.input.consumeEscape()) {
        if (this.ui.isFaqOpen()) this.ui.closeFaq();
        else if (this.ui.isPauseOpen()) this.resumeFlight();
        else this.openPauseMenu();
      }

      if (!this.paused && !this.ui.isFaqOpen() && !this.ui.isPauseOpen()) {
      const action = this.sector.update(this.input, dt, this.save);
      if (action === "dock") this.openStation();

      if (this.sector.state.message && this.sector.state.message !== this.lastToast) {
        this.lastToast = this.sector.state.message;
        this.ui.showToast(this.sector.state.message);
      }

      for (const mission of claimableMissions(this.save)) {
        if (!this.missionToasts.has(mission.id)) {
          this.missionToasts.add(mission.id);
          this.ui.showToast(`Contract ready: ${mission.title} — dock at K-7 to claim`);
        }
      }

      if (this.mode === "training" && this.tutorial && !this.tutorial.finished) {
        if (this.tutorial.update(this.save, this.sector)) {
          this.ui.showTutorial(this.tutorial);
          if (this.tutorial.finished) this.ui.showToast("Training objective complete — dock at K-7");
        }
      }

      const tutorialHint = this.mode === "training" && this.tutorial && !this.tutorial.finished
        ? this.tutorial.step.hint
        : undefined;

      this.hudTimer += dt;
      if (this.hudTimer >= 0.08) {
        this.hudTimer = 0;
        this.ui.updateHUD(this.save, this.sector.getHint(this.save, tutorialHint), this.sector.getRadarPOIs(this.save), {
          mining: this.sector.state.mining,
          salvaging: this.sector.state.salvaging,
          scan: this.sector.state.scanActive,
          boosting: this.sector.state.boosting,
          actionProgress: this.sector.state.actionProgress,
          actionLabel: this.sector.state.actionLabel,
          hazardFlash: this.sector.state.hazardFlash,
        });
      }

      const speed = this.sector.ship.velocity.length();
      const camPos = this.sector.getCameraPosition(speed);
      const target = this.sector.getCameraTarget(speed);

      if (this.sector.state.mining) {
        this.shake = Math.max(this.shake, 0.04 + this.sector.state.actionProgress * 0.06);
      }

      const targetFov = this.sector.getFlightFov(speed, this.sector.state.boosting);
      if (this.sector.state.boosting) this.shake = Math.max(this.shake, 0.15);
      if (this.sector.state.hazardFlash) this.shake = Math.max(this.shake, 0.06);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, this.sector.state.boosting ? 0.12 : 0.08);
      this.camera.updateProjectionMatrix();

      if (this.shake > 0) {
        camPos.x += (Math.random() - 0.5) * this.shake;
        camPos.y += (Math.random() - 0.5) * this.shake;
        this.shake *= 0.9;
      }

      this.camera.position.lerp(camPos, this.sector.getCameraLerp(speed));
      this.camera.lookAt(target);

      sfx.setEngine(speed, this.sector.state.boosting);

      if (this.save.fuel < 15 && this.save.fuel > 0) {
        this.fuelWarnTimer += dt;
        if (this.fuelWarnTimer > 4) { sfx.lowFuel(); this.fuelWarnTimer = 0; }
      } else {
        this.fuelWarnTimer = 0;
      }

      this.checkFuelCrisis();

      this.saveTimer += dt;
      if (this.saveTimer >= 4) {
        writeSave(this.save);
        this.saveTimer = 0;
      }
      } else if (this.paused && this.sector) {
        const speed = this.sector.ship.velocity.length() * 0.15;
        const camPos = this.sector.getCameraPosition(speed);
        const target = this.sector.getCameraTarget(speed);
        this.camera.position.lerp(camPos, 0.05);
        this.camera.lookAt(target);
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  destroy(): void {
    cancelAnimationFrame(this.animId);
    this.flushSave();
    this.renderer.dispose();
  }
}
