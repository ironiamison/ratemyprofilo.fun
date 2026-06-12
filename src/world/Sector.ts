import * as THREE from "three";
import { sfx } from "../audio/SFX";
import { Asteroid } from "../entities/Asteroid";
import { NPCShip } from "../entities/NPCShip";
import { Ship } from "../entities/Ship";
import { Station } from "../entities/Station";
import { Wreck } from "../entities/Wreck";
import { EngineTrail } from "../effects/EngineTrail";
import { MiningBeam } from "../effects/MiningBeam";
import type { Input } from "../game/Input";
import { FACTIONS, WRECK_DEFS, type FactionId, type PlayerSave, type RadarPOI } from "../game/types";
import { SpaceBackdrop } from "../visuals/SpaceBackdrop";
import { seededRandom } from "../utils/voxel";
import { createStarfield } from "./Starfield";

export type SectorAction = "dock" | null;

export interface SectorState {
  nearestType: "asteroid" | "wreck" | "station" | null;
  nearestDist: number;
  nearestWreck: Wreck | null;
  mining: boolean;
  salvaging: boolean;
  scanActive: boolean;
  message: string;
  boosting: boolean;
  actionProgress: number;
  actionLabel: string;
  hazardFlash: boolean;
  mineQuality: "far" | "good" | "sweet" | "close";
  oreBurst: number;
}

export class Sector {
  group = new THREE.Group();
  ship: Ship;
  asteroids: Asteroid[] = [];
  wrecks: Wreck[] = [];
  station: Station;
  npcs: NPCShip[] = [];
  trail: EngineTrail;
  miningBeam: MiningBeam;
  state: SectorState = {
    nearestType: null,
    nearestDist: Infinity,
    nearestWreck: null,
    mining: false,
    salvaging: false,
    scanActive: false,
    message: "",
    boosting: false,
    actionProgress: 0,
    actionLabel: "",
    hazardFlash: false,
    mineQuality: "good",
    oreBurst: 0,
  };
  scanTimer = 0;
  private seed = 7;
  private beaconPulse = 0;
  private mineSfxTimer = 0;
  private oreBurstTimer = 0;
  private lastMinedOre = 0;
  private hazardSfxTimer = 0;
  private backdrop: SpaceBackdrop;
  private wasMining = false;
  private wasSalvaging = false;
  readonly training: boolean;

  constructor(save: PlayerSave, options?: { training?: boolean }) {
    this.training = options?.training ?? false;
    this.ship = new Ship(save.shipPaint, save.shipShape, true);
    this.station = new Station();
    this.trail = new EngineTrail(this.group);
    this.miningBeam = new MiningBeam(this.group);

    this.group.add(new THREE.AmbientLight(0x7799cc, 0.65));
    this.group.add(new THREE.HemisphereLight(0xc8d8ff, 0x283848, 1.0));

    const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
    sun.position.set(120, 80, -60);
    this.group.add(sun);

    const rim = new THREE.DirectionalLight(0x88aaff, 0.55);
    rim.position.set(-80, 40, 100);
    this.group.add(rim);

    this.backdrop = new SpaceBackdrop(this.seed);
    this.group.add(this.backdrop.group);
    this.group.add(createStarfield(2000, this.seed));
    this.group.add(this.ship.group);
    this.group.add(this.station.group);

    for (const def of WRECK_DEFS) {
      const w = new Wreck(def);
      this.wrecks.push(w);
      this.group.add(w.group);
    }

    if (this.training) {
      this.setupTraining();
    } else {
      this.spawnAsteroids();
      this.spawnNPCs();
    }
  }

  private setupTraining(): void {
    this.ship.position.set(0, 0, 0);
    this.ship.group.position.copy(this.ship.position);

    for (const ast of this.asteroids) this.group.remove(ast.group);
    this.asteroids = [];
    const trainRock = new Asteroid(0, 1, 32, this.seed, 900);
    this.asteroids.push(trainRock);
    this.group.add(trainRock.group);

    for (let i = 1; i < this.wrecks.length; i++) {
      this.wrecks[i].salvaged = true;
      this.wrecks[i].group.visible = false;
    }
    const wreck = this.wrecks[0];
    wreck.position.set(-8, 0, 58);
    wreck.group.position.copy(wreck.position);

    this.station.position.set(42, 0, 28);
    this.station.group.position.copy(this.station.position);
  }

  private spawnAsteroids(): void {
    for (let i = 0; i < 28; i++) {
      const x = (seededRandom(this.seed, i) - 0.5) * 220;
      const y = (seededRandom(this.seed, i + 1) - 0.5) * 40;
      const z = (seededRandom(this.seed, i + 2) - 0.5) * 220;
      if (Math.abs(x) < 25 && Math.abs(z) < 25) continue;
      const ast = new Asteroid(x, y, z, this.seed, i);
      this.asteroids.push(ast);
      this.group.add(ast.group);
    }
  }

  private npcPassCooldown = new Map<string, number>();

  private spawnNPCs(): void {
    const routes: [FactionId, THREE.Vector3[], string][] = [
      ["voidwalkers", [new THREE.Vector3(-40, 10, 30), new THREE.Vector3(-90, 5, -20), new THREE.Vector3(-30, 8, -70)], "Void Skimmer"],
      ["ironcorps", [new THREE.Vector3(30, 0, -30), new THREE.Vector3(80, 3, 10), new THREE.Vector3(20, 5, 60)], "Iron Corsair"],
      ["syndicate", [new THREE.Vector3(-20, 15, 80), new THREE.Vector3(40, 10, 40), new THREE.Vector3(0, 5, -40)], "Trade Ghost"],
      ["voidwalkers", [new THREE.Vector3(70, 12, -80), new THREE.Vector3(20, 8, -50), new THREE.Vector3(-50, 6, -90)], "Drift Saint"],
      ["syndicate", [new THREE.Vector3(-70, 6, 50), new THREE.Vector3(-10, 12, 90), new THREE.Vector3(50, 8, 30)], "Gold Liner"],
      ["ironcorps", [new THREE.Vector3(60, 4, -60), new THREE.Vector3(100, 10, -10), new THREE.Vector3(55, 6, 40)], "Bulk Hauler IX"],
      ["voidwalkers", [new THREE.Vector3(-100, 18, -30), new THREE.Vector3(-60, 14, 20), new THREE.Vector3(-20, 10, -10)], "Echo Needle"],
      ["syndicate", [new THREE.Vector3(0, 20, 100), new THREE.Vector3(-45, 15, 60), new THREE.Vector3(15, 8, 20)], "Brick Runner"],
    ];
    routes.forEach(([faction, path, name], i) => {
      const shape = NPCShip.shapeForIndex(i);
      const npc = new NPCShip(faction, shape, path, name, this.group);
      this.npcs.push(npc);
      this.group.add(npc.ship.group);
    });
  }

  update(input: Input, dt: number, save: PlayerSave): SectorAction {
    const faction = FACTIONS[save.faction];
    const wasBoosting = this.state.boosting;
    this.ship.updateFlight(input, dt, save, faction, this.training);
    const canBoost = this.training || save.fuel > 0;
    this.state.boosting = input.boost && canBoost && this.ship.velocity.length() > 5;
    if (this.state.boosting && !wasBoosting) sfx.boost();

    const speed = this.ship.velocity.length();
    this.trail.emit(this.ship.position, this.ship.getForward(), speed, this.state.boosting);
    this.trail.update(dt);

    if (input.consumeScan()) {
      this.scanTimer = 6;
      this.state.scanActive = true;
      save.hasScanned = true;
      this.state.message = "SCAN PULSE — wreck signatures on radar";
      sfx.scan();
    }
    if (this.scanTimer > 0) {
      this.scanTimer -= dt;
      if (this.scanTimer <= 0) this.state.scanActive = false;
    }

    this.updateNPCs(dt);
    for (const ast of this.asteroids) ast.update(dt);
    this.updateInteractions(input, dt, save);
    this.updateBeacons(dt);
    this.backdrop.update(dt);
    this.clampBounds();

    if (this.state.mining && !this.wasMining) sfx.startMining();
    if (!this.state.mining && this.wasMining) sfx.stopMining();
    if (this.state.salvaging && !this.wasSalvaging) sfx.startSalvage();
    if (!this.state.salvaging && this.wasSalvaging) sfx.stopSalvage();
    this.wasMining = this.state.mining;
    this.wasSalvaging = this.state.salvaging;

    return this.processActions(input, save);
  }

  private updateNPCs(dt: number): void {
    for (const npc of this.npcs) {
      npc.update(dt);
      const dist = npc.ship.position.distanceTo(this.ship.position);
      const cd = this.npcPassCooldown.get(npc.name) ?? 0;
      if (cd > 0) this.npcPassCooldown.set(npc.name, cd - dt);
      else if (dist > 8 && dist < 22 && npc.ship.velocity.length() > 8) {
        sfx.passBy();
        this.npcPassCooldown.set(npc.name, 5);
      }
    }
  }

  private mineRateMul(dist: number): { mul: number; quality: SectorState["mineQuality"] } {
    if (dist < 7) return { mul: 0.75, quality: "close" };
    if (dist >= 9 && dist <= 12) return { mul: 1.3, quality: "sweet" };
    if (dist > 12) return { mul: 0.85, quality: "far" };
    return { mul: 1, quality: "good" };
  }

  private laserOrigin(): THREE.Vector3 {
    return this.ship.position.clone().add(this.ship.getForward().multiplyScalar(2.8));
  }

  private updateInteractions(input: Input, dt: number, save: PlayerSave): void {
    const mineRange = 14;
    const interactRange = 24;

    this.state.mining = false;
    this.state.salvaging = false;
    this.state.message = "";
    this.state.nearestWreck = null;
    this.state.actionProgress = 0;
    this.state.actionLabel = "";
    this.state.hazardFlash = false;
    this.state.oreBurst = Math.max(0, this.state.oreBurst - dt);

    for (const ast of this.asteroids) ast.setMiningActive(false);

    let nearest: SectorState["nearestType"] = null;
    let nearestDist = Infinity;
    let nearestAsteroid: Asteroid | null = null;

    for (const ast of this.asteroids) {
      if (ast.depleted) continue;
      const d = ast.distanceTo(this.ship.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = "asteroid";
        nearestAsteroid = ast;
      }
    }

    if (nearestAsteroid && nearestDist < mineRange && input.mine) {
      const ast = nearestAsteroid;
      const cargoMax = this.ship.getCargoMax(save.upgrades, FACTIONS[save.faction]);
      const { mul, quality } = this.mineRateMul(nearestDist);
      this.state.mineQuality = quality;

      if (this.ship.getCargoUsed(save.cargo) < cargoMax) {
        const mined = ast.mine(dt, mul);
        if (mined > 0) {
          const oreGain = Math.ceil(mined);
          save.cargo.ore += oreGain;
          save.oreMined += oreGain;
          this.lastMinedOre += oreGain;
          this.state.mining = true;
          ast.setMiningActive(true);
          const pct = Math.round((1 - ast.oreRatio()) * 100);
          const qual =
            quality === "sweet" ? " · SWEET SPOT" : quality === "close" ? " · TOO CLOSE" : quality === "far" ? " · BACK UP" : "";
          this.state.actionLabel = `Drilling · ${ast.oreRemaining()} ore left · ${pct}%${qual}`;
          this.state.actionProgress = 1 - ast.oreRatio();
          const aim = ast.getAimPoint();
          const origin = this.laserOrigin();
          this.miningBeam.setActive(true);
          this.miningBeam.update(origin, aim, dt, quality === "sweet" ? 1.2 : 0.85);
          this.ship.showLaser(aim, true);

          this.oreBurstTimer += dt;
          if (this.oreBurstTimer > 0.35) {
            this.oreBurstTimer = 0;
            this.miningBeam.burstOre(aim, this.ship.position, quality === "sweet" ? 4 : 2);
            this.state.oreBurst = 1;
          }

          this.mineSfxTimer += dt;
          if (this.mineSfxTimer > 0.1) { sfx.mine(); this.mineSfxTimer = 0; }

          if (ast.depleted) {
            this.miningBeam.burstOre(aim, this.ship.position, 8);
            this.state.message = "Asteroid depleted — rock crumbled!";
            sfx.depleted();
          }
        }
      } else {
        this.state.message = "Cargo full — sell ore at MARKET or dock";
        this.miningBeam.burstOre(ast.getAimPoint(), this.ship.position, 1);
      }
    } else if (nearestAsteroid && nearestDist < mineRange) {
      this.state.mineQuality = this.mineRateMul(nearestDist).quality;
    }

    if (!this.state.mining) {
      this.ship.showLaser(this.ship.position, false);
      this.miningBeam.setActive(false);
      this.lastMinedOre = 0;
    }

    for (const wreck of this.wrecks) {
      if (wreck.salvaged) continue;
      if (!wreck.isVisibleToScanner(save.upgrades.scanner, this.state.scanActive)) continue;

      const d = wreck.distanceTo(this.ship.position);
      if (d < nearestDist) { nearestDist = d; nearest = "wreck"; this.state.nearestWreck = wreck; }

      if (d < interactRange && input.interact) {
        const cargoMax = this.ship.getCargoMax(save.upgrades, FACTIONS[save.faction]);
        if (this.ship.getCargoUsed(save.cargo) < cargoMax - 2) {
          this.state.salvaging = true;
          this.state.actionLabel = "Salvaging";
          this.state.actionProgress = wreck.salvageProgress / wreck.salvageRequired;
          this.applyHazard(wreck, dt, save);
          const done = wreck.salvage(dt);
          this.state.actionProgress = wreck.salvageProgress / wreck.salvageRequired;
          if (done) {
            save.cargo.scrap += wreck.loot.scrap;
            save.cargo.components += wreck.loot.components;
            save.wrecksSalvaged++;
            if (!save.salvagedWreckIds.includes(wreck.def.id)) {
              save.salvagedWreckIds.push(wreck.def.id);
            }
            this.state.message = `Salvaged ${wreck.name}! +${wreck.loot.scrap} scrap, +${wreck.loot.components} parts`;
            sfx.salvageDone();
          }
        }
      }
    }

    const stationDist = this.station.distanceTo(this.ship.position);
    if (stationDist < nearestDist) { nearestDist = stationDist; nearest = "station"; }

    this.state.nearestType = nearest;
    this.state.nearestDist = nearestDist;
  }

  private applyHazard(wreck: Wreck, dt: number, save: PlayerSave): void {
    if (!wreck.def.hazard) return;
    this.state.hazardFlash = true;
    this.hazardSfxTimer += dt;
    if (this.hazardSfxTimer > 1.2) {
      sfx.warn();
      this.hazardSfxTimer = 0;
    }
    if (wreck.def.hazard === "fuel") save.fuel = Math.max(0, save.fuel - dt * 8);
    if (wreck.def.hazard === "radiation") {
      const prev = save.hull;
      save.hull = Math.max(0, save.hull - dt * 5);
      if (save.hull < prev && this.hazardSfxTimer > 0.9) sfx.hullHit();
    }
  }

  private updateBeacons(dt: number): void {
    this.beaconPulse += dt * 3;
    for (const w of this.wrecks) {
      if (w.salvaged) continue;
      const mat = w.beaconMesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.45 + Math.sin(this.beaconPulse + w.def.id.length) * 0.25;
    }
  }

  private clampBounds(): void {
    const limit = 130;
    this.ship.position.x = Math.max(-limit, Math.min(limit, this.ship.position.x));
    this.ship.position.y = Math.max(-30, Math.min(55, this.ship.position.y));
    this.ship.position.z = Math.max(-limit, Math.min(limit, this.ship.position.z));
  }

  private processActions(input: Input, save: PlayerSave): SectorAction {
    if (this.station.inDockRange(this.ship.position) && input.consumeDock()) {
      save.hasDocked = true;
      sfx.dock();
      return "dock";
    }
    return null;
  }

  getRadarPOIs(save: PlayerSave): RadarPOI[] {
    const pois: RadarPOI[] = [];
    const shipPos = this.ship.position;
    const shipYaw = this.ship.yaw;

    const add = (
      id: string,
      name: string,
      pos: THREE.Vector3,
      color: string,
      kind: RadarPOI["kind"]
    ) => {
      const dx = pos.x - shipPos.x;
      const dz = pos.z - shipPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const worldAngle = Math.atan2(dx, dz);
      const angle = worldAngle - shipYaw;
      pois.push({ id, name, x: pos.x, z: pos.z, color, dist, angle, kind });
    };

    add("station", "K-7", this.station.position, "#5cd878", "station");

    for (const ast of this.asteroids) {
      if (ast.depleted) continue;
      const d = ast.distanceTo(shipPos);
      if (d > 90) continue;
      add(`ast-${ast.id}`, "Rock", ast.position, "#c8a070", "asteroid");
    }

    for (const w of this.wrecks) {
      if (w.salvaged) continue;
      if (!w.isVisibleToScanner(save.upgrades.scanner, this.state.scanActive)) continue;
      const hex = w.def.beaconColor.toString(16).padStart(6, "0");
      add(w.def.id, w.name.split(" ").pop()!, w.position, `#${hex}`, "wreck");
    }

    for (const npc of this.npcs) {
      const hex = FACTIONS[npc.faction].color.toString(16).padStart(6, "0");
      add(`npc-${npc.name}`, npc.name, npc.ship.position, `#${hex}`, "npc");
    }

    pois.sort((a, b) => a.dist - b.dist);

    return pois;
  }

  getCameraPosition(speed = 0): THREE.Vector3 {
    const dist = 11 + Math.min(speed * 0.11, 8);
    const height = 3.4 + Math.min(speed * 0.028, 2.4);
    const lag = this.ship.velocity.clone().multiplyScalar(-0.1);
    const bank = Math.sin(this.ship.yaw - Math.atan2(this.ship.velocity.x, this.ship.velocity.z || 0.001)) * 1.2;
    return this.ship.position.clone()
      .add(this.ship.getForward().multiplyScalar(-dist))
      .add(new THREE.Vector3(bank, height, 0))
      .add(lag);
  }

  getCameraTarget(speed = 0): THREE.Vector3 {
    const ahead = 14 + Math.min(speed * 0.14, 10);
    const lead = this.ship.velocity.clone().multiplyScalar(0.35);
    return this.ship.position.clone()
      .add(this.ship.getForward().multiplyScalar(ahead))
      .add(lead)
      .add(new THREE.Vector3(0, 0.6, 0));
  }

  getCameraLerp(speed = 0): number {
    return THREE.MathUtils.clamp(0.1 + speed * 0.005, 0.1, 0.28);
  }

  getFlightFov(speed: number, boosting: boolean): number {
    const cruise = 58 + Math.min(speed * 0.22, 14);
    return boosting ? Math.max(cruise, 74) : cruise;
  }

  getHint(save: PlayerSave, tutorialHint?: string): string {
    if (tutorialHint) return tutorialHint;
    const d = this.state.nearestDist;
    if (save.fuel <= 0) return "Out of fuel — drift to station or buy fuel when docked";
    if (save.hull <= 0) return "Hull critical — dock for repairs (G at K-7)";
    if (this.state.salvaging && this.state.nearestWreck)
      return `Salvaging ${this.state.nearestWreck.name}... hold E${this.state.nearestWreck.def.hazard ? " ⚠ HAZARD" : ""}`;
    if (this.state.mining) return "Drill engaged — rock chunks inbound";
    if (this.station.inDockRange(this.ship.position)) return "Press G to dock at Outpost K-7";
    if (this.state.nearestType === "wreck" && this.state.nearestWreck && d < 24)
      return `Hold E — ${this.state.nearestWreck.name}`;
    if (this.state.nearestType === "asteroid" && d < 14 && !this.state.mining) {
      if (this.state.mineQuality === "sweet") return "Sweet spot! Hold SPACE — max drill rate";
      if (this.state.mineQuality === "close") return "Too close — back up for cleaner cuts";
      if (this.state.mineQuality === "far") return "Hold SPACE to mine — ease in to 9–12m for bonus";
      return "Hold SPACE to mine — aim for 9–12m range";
    }
    if (!save.hasScanned) return `TAB scan — ${WRECK_DEFS.length} wrecks in sector`;
    return "ESC or ← HUB for menu · brown = rocks · green = K-7";
  }
}
