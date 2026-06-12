import * as THREE from "three";
import { sfx } from "../audio/SFX";
import { Asteroid } from "../entities/Asteroid";
import { BoostOrb } from "../entities/BoostOrb";
import { NPCShip } from "../entities/NPCShip";
import { RemotePlayer } from "../entities/RemotePlayer";
import { Ship } from "../entities/Ship";
import { Station } from "../entities/Station";
import { Wreck } from "../entities/Wreck";
import { EngineTrail } from "../effects/EngineTrail";
import { MiningBeam } from "../effects/MiningBeam";
import { ScanPulse } from "../effects/ScanPulse";
import { TrainingBeacon } from "../effects/TrainingBeacon";
import { RACE_GATES, RACE_START, RACE_START_YAW, raceTrackPath } from "../game/raceCourse";
import { RaceController } from "../race/RaceController";
import type { NetShipSnapshot, NetWorldEvent } from "../net/types";
import type { Input } from "../game/Input";
import { MINE_AIM_DOT, MINE_RANGE, ORE_BURST_INTERVAL } from "../game/miningConfig";
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
  private boostOrbs: BoostOrb[] = [];
  private boostBuffSec = 0;
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
  private oreExtractBuffer = 0;
  private hazardSfxTimer = 0;
  private backdrop: SpaceBackdrop;
  private wasMining = false;
  private wasSalvaging = false;
  private trainingBeacons: TrainingBeacon[] = [];
  private tutorialFocus = "fly";
  readonly training: boolean;
  readonly coop: boolean;
  readonly race: boolean;
  raceController: RaceController | null = null;
  onRaceCountdown?: (n: number) => void;
  onRaceFinish?: () => void;
  private starfield: THREE.Group;
  private scanPulse: ScanPulse;
  private remotePlayers = new Map<string, RemotePlayer>();
  private remoteLinked = false;
  private lastSyncedOre = new Map<number, number>();
  onCoopWorldEvent?: (event: NetWorldEvent) => void;

  constructor(save: PlayerSave, options?: { training?: boolean; localCoop?: boolean; coop?: boolean; race?: boolean; worldSeed?: number }) {
    this.training = options?.training ?? false;
    this.coop = options?.coop ?? options?.localCoop ?? false;
    this.race = options?.race ?? false;
    if (options?.worldSeed != null) this.seed = options.worldSeed;
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
    this.starfield = createStarfield(this.coop ? 2800 : 2400, this.seed);
    this.group.add(this.starfield);
    this.scanPulse = new ScanPulse(this.group);
    this.group.add(this.ship.group);
    this.group.add(this.station.group);

    for (const def of WRECK_DEFS) {
      const w = new Wreck(def);
      this.wrecks.push(w);
      this.group.add(w.group);
    }

    if (this.training) {
      this.setupTraining();
    } else if (this.race) {
      this.setupRace();
      this.spawnRaceOrbs();
    } else {
      this.spawnAsteroids();
      this.spawnNPCs();
      this.spawnSectorOrbs();
    }
  }

  private setupRace(): void {
    this.ship.position.copy(RACE_START);
    this.ship.yaw = RACE_START_YAW;
    this.ship.pitch = 0;
    this.ship.velocity.set(0, 0, 0);
    this.ship.group.position.copy(RACE_START);
    this.ship.group.rotation.set(0, RACE_START_YAW, 0, "YXZ");

    this.raceController = new RaceController(this.group);
    this.raceController.onCountdownTick = (n) => this.onRaceCountdown?.(n);

    for (const w of this.wrecks) w.group.visible = false;
    this.station.group.visible = false;
  }

  private setupTraining(): void {
    this.ship.position.set(0, 0, 0);
    this.ship.group.position.copy(this.ship.position);
    this.ship.yaw = 0;
    this.ship.group.rotation.set(0, 0, 0, "YXZ");

    for (const ast of this.asteroids) this.group.remove(ast.group);
    this.asteroids = [];

    const rockSpots: [number, number, number][] = [
      [0, 0, 18],
      [-14, 1, 26],
      [14, 1, 26],
      [-8, 2, 34],
      [10, 0, 38],
    ];
    for (let i = 0; i < rockSpots.length; i++) {
      const [x, y, z] = rockSpots[i];
      const ast = new Asteroid(x, y, z, this.seed, 900 + i);
      ast.maxOre = 12;
      ast.ore = 12;
      this.asteroids.push(ast);
      this.group.add(ast.group);
      const beacon = new TrainingBeacon("mine", new THREE.Vector3(x, y, z), {
        tall: i === 0,
        label: i === 0,
      });
      this.trainingBeacons.push(beacon);
      this.group.add(beacon.group);
    }

    for (let i = 1; i < this.wrecks.length; i++) {
      this.wrecks[i].salvaged = true;
      this.wrecks[i].group.visible = false;
    }
    const wreck = this.wrecks[0];
    wreck.position.set(-10, 0, 52);
    wreck.group.position.copy(wreck.position);
    wreck.salvageRequired = 45;
    wreck.loot = { scrap: 8, components: 1 };

    const wreckBeacon = new TrainingBeacon("salvage", wreck.position.clone());
    this.trainingBeacons.push(wreckBeacon);
    this.group.add(wreckBeacon.group);

    this.station.position.set(32, 0, 48);
    this.station.group.position.copy(this.station.position);
    const dockBeacon = new TrainingBeacon("dock", this.station.position.clone());
    this.trainingBeacons.push(dockBeacon);
    this.group.add(dockBeacon.group);

    this.applyTutorialBeaconFocus();
  }

  setTutorialFocus(stepId: string): void {
    if (!this.training) return;
    if (this.tutorialFocus === stepId) return;
    this.tutorialFocus = stepId;
    this.applyTutorialBeaconFocus();
  }

  private applyTutorialBeaconFocus(): void {
    const focus = this.tutorialFocus;
    const trainingWreck = this.wrecks[0];
    for (const b of this.trainingBeacons) {
      if (b.kind === "salvage" && trainingWreck?.salvaged) {
        b.setHighlight(0);
        continue;
      }
      let strength = 0.2;
      if (focus === "fly") strength = b.kind === "mine" ? 0.55 : 0.15;
      else if (focus === "scan") strength = b.kind === "salvage" ? 0.7 : b.kind === "mine" ? 0.35 : 0.2;
      else if (focus === "mine") strength = b.kind === "mine" ? 1 : 0.18;
      else if (focus === "salvage") strength = b.kind === "salvage" ? 1 : b.kind === "mine" ? 0.12 : 0.2;
      else if (focus === "dock") strength = b.kind === "dock" ? 1 : 0.15;
      b.setHighlight(strength);
    }
  }

  private nearestLiveAsteroid(): Asteroid | null {
    let best: Asteroid | null = null;
    let bestDist = Infinity;
    for (const ast of this.asteroids) {
      if (ast.depleted) continue;
      const d = ast.distanceTo(this.ship.position);
      if (d < bestDist) {
        bestDist = d;
        best = ast;
      }
    }
    return best;
  }

  private nearestLiveWreck(): Wreck | null {
    let best: Wreck | null = null;
    let bestDist = Infinity;
    for (const wreck of this.wrecks) {
      if (wreck.salvaged) continue;
      const d = wreck.distanceTo(this.ship.position);
      if (d < bestDist) {
        bestDist = d;
        best = wreck;
      }
    }
    return best;
  }

  private wreckLootWeight(wreck: Wreck): number {
    return wreck.loot.scrap + wreck.loot.components * 3;
  }

  /** Training wrecks stay interactable; live sector needs scan pulse or scanner upgrade. */
  private wreckDetected(wreck: Wreck, save: PlayerSave): boolean {
    if (this.training) return true;
    return wreck.isVisibleToScanner(save.upgrades.scanner, this.state.scanActive);
  }

  private spawnSectorOrbs(): void {
    let id = 0;
    for (let i = 0; i < 20; i++) {
      const x = (seededRandom(this.seed, i + 200) - 0.5) * 200;
      const y = (seededRandom(this.seed, i + 201) - 0.5) * 28 + 10;
      const z = (seededRandom(this.seed, i + 202) - 0.5) * 200;
      if (Math.abs(x) < 28 && Math.abs(z) < 28) continue;
      const orb = new BoostOrb(id++, x, y, z);
      this.boostOrbs.push(orb);
      this.group.add(orb.group);
    }
  }

  private spawnRaceOrbs(): void {
    const path = raceTrackPath();
    let id = 1000;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      for (const t of [0.32, 0.68]) {
        const p = new THREE.Vector3().lerpVectors(from, to, t);
        p.y += 1.5;
        const orb = new BoostOrb(id++, p.x, p.y, p.z);
        this.boostOrbs.push(orb);
        this.group.add(orb.group);
      }
    }
  }

  private updateBoostOrbs(dt: number, save: PlayerSave): void {
    for (const orb of this.boostOrbs) orb.update(dt);

    if (this.boostBuffSec > 0) {
      this.boostBuffSec -= dt;
      this.state.boosting = true;
      this.ship.velocity.add(this.ship.getForward().multiplyScalar(50 * dt));
      const speedCap = this.race ? 88 : 70;
      if (this.ship.velocity.length() > speedCap) this.ship.velocity.setLength(speedCap);
    }

    for (const orb of this.boostOrbs) {
      if (!orb.inRange(this.ship.position)) continue;
      this.collectOrb(orb, save);
      break;
    }
  }

  private collectOrb(orb: BoostOrb, save: PlayerSave): void {
    orb.collect();
    if (!this.race && !this.training) {
      save.fuel = Math.min(100, save.fuel + 35);
    }
    this.boostBuffSec = Math.max(this.boostBuffSec, 3.5);
    this.ship.velocity.add(this.ship.getForward().multiplyScalar(24));
    sfx.boost();
    this.state.message = this.race ? "Boost orb — surge!" : "Boost orb — +fuel · surge!";
    if (this.coop) {
      this.onCoopWorldEvent?.({ type: "orb-pickup", id: orb.id });
    }
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

  /** Offset co-op spawns so ships don't stack on the same pad. */
  applyCoopSpawn(slot: number): void {
    const slots: [number, number, number][] = [
      [0, 0, 0],
      [-14, 0, -10],
      [14, 0, -10],
      [0, 0, -20],
    ];
    const [dx, dy, dz] = slots[slot % slots.length];
    this.ship.position.x += dx;
    this.ship.position.y += dy;
    this.ship.position.z += dz;
    this.ship.group.position.copy(this.ship.position);
  }

  setRemotePlayer(snap: NetShipSnapshot | null): void {
    if (!snap) return;
    this.upsertRemotePlayer(snap);
  }

  upsertRemotePlayer(snap: NetShipSnapshot): void {
    let rp = this.remotePlayers.get(snap.id);
    if (!rp) {
      rp = new RemotePlayer(snap, this.group);
      this.remotePlayers.set(snap.id, rp);
      this.group.add(rp.ship.group);
      if (!this.remoteLinked) {
        this.remoteLinked = true;
        this.state.message = `Co-pilot linked: ${snap.name}`;
      }
    } else {
      rp.applySnapshot(snap);
    }
  }

  removeRemotePlayer(peerId: string): void {
    const rp = this.remotePlayers.get(peerId);
    if (!rp) return;
    this.group.remove(rp.ship.group);
    this.remotePlayers.delete(peerId);
    if (this.remotePlayers.size === 0) this.remoteLinked = false;
  }

  applyWorldEvent(event: NetWorldEvent, peerId = "remote"): void {
    if (event.type === "wreck-salvaged") {
      const wreck = this.wrecks.find((w) => w.def.id === event.wreckId);
      if (wreck && !wreck.salvaged) {
        wreck.markSalvaged();
        this.state.message = `${wreck.name} cleared by co-pilot`;
      }
      return;
    }
    if (event.type === "asteroid-ore") {
      const ast = this.asteroids.find((a) => a.id === event.id);
      if (ast) ast.syncOre(event.ore, event.depleted);
      return;
    }
    if (event.type === "race-go" && this.raceController) {
      this.raceController.syncRaceStart(event.startAt);
      return;
    }
    if (event.type === "race-progress" && this.raceController) {
      this.raceController.applyPeerProgress(
        peerId,
        event.name,
        event.checkpoint,
        event.finished,
        event.elapsedMs
      );
      return;
    }
    if (event.type === "orb-pickup") {
      const orb = this.boostOrbs.find((o) => o.id === event.id);
      if (orb && !orb.collected) orb.collect();
    }
  }

  private broadcastAsteroidOre(ast: Asteroid): void {
    if (!this.coop) return;
    const prev = this.lastSyncedOre.get(ast.id);
    if (prev === ast.ore) return;
    this.lastSyncedOre.set(ast.id, ast.ore);
    this.onCoopWorldEvent?.({
      type: "asteroid-ore",
      id: ast.id,
      ore: ast.ore,
      depleted: ast.depleted,
    });
  }

  private updateRemotePlayers(dt: number): void {
    for (const [id, rp] of this.remotePlayers) {
      rp.update(dt);
      if (rp.staleSec > 4) this.removeRemotePlayer(id);
    }
  }

  private updateStarfieldParallax(dt: number): void {
    const parallax = 0.018;
    this.starfield.position.set(
      -this.ship.position.x * parallax,
      -this.ship.position.y * parallax * 0.35,
      -this.ship.position.z * parallax
    );
    this.starfield.rotation.y += dt * 0.0015;
  }

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
    const cap = this.coop ? 4 : routes.length;
    routes.slice(0, cap).forEach(([faction, path, name], i) => {
      const shape = NPCShip.shapeForIndex(i);
      const npc = new NPCShip(faction, shape, path, name, this.group);
      this.npcs.push(npc);
      this.group.add(npc.ship.group);
    });
  }

  update(input: Input, dt: number, save: PlayerSave): SectorAction {
    const faction = FACTIONS[save.faction];

    if (this.race && this.raceController) {
      this.raceController.update(dt, this.ship.position);
      const frozen = this.raceController.phase === "countdown";
      if (!frozen) {
        const wasBoosting = this.state.boosting;
        this.ship.updateFlight(input, dt, save, faction, true);
        this.state.boosting = input.boost && this.ship.velocity.length() > 5;
        if (this.state.boosting && !wasBoosting) sfx.boost();
      } else {
        this.ship.velocity.set(0, 0, 0);
        this.state.boosting = false;
      }
      const speed = this.ship.velocity.length();
      this.trail.emit(this.ship.position, this.ship.getForward(), speed, this.state.boosting);
      this.trail.update(dt);
      this.updateBoostOrbs(dt, save);
      this.updateRemotePlayers(dt);
      this.clampBounds();
      return null;
    }

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
      this.scanPulse.trigger(this.ship.position);
      sfx.scan();
    }
    if (this.scanTimer > 0) {
      this.scanTimer -= dt;
      if (this.scanTimer <= 0) this.state.scanActive = false;
    }

    this.updateNPCs(dt);
    for (const ast of this.asteroids) ast.update(dt);
    this.updateBoostOrbs(dt, save);
    this.updateInteractions(input, dt, save);
    this.updateBeacons(dt);
    this.backdrop.update(dt);
    this.scanPulse.update(dt);
    this.updateStarfieldParallax(dt);
    this.updateRemotePlayers(dt);
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
    if (dist > 16) return { mul: 0.85, quality: "far" };
    return { mul: 1, quality: "good" };
  }

  /** Prefer the asteroid in front of the ship; fall back to nearest in range. */
  private pickMineTarget(mineRange: number): { ast: Asteroid; dist: number } | null {
    const forward = this.ship.getForward().normalize();
    let aimed: { ast: Asteroid; dist: number; score: number } | null = null;
    let nearest: { ast: Asteroid; dist: number } | null = null;

    for (const ast of this.asteroids) {
      if (ast.depleted) continue;
      const offset = ast.position.clone().sub(this.ship.position);
      const dist = offset.length();
      if (dist >= mineRange) continue;

      if (!nearest || dist < nearest.dist) nearest = { ast, dist };

      offset.normalize();
      const dot = forward.dot(offset);
      if (dot < MINE_AIM_DOT) continue;
      const score = dist - dot * 10;
      if (!aimed || score < aimed.score) aimed = { ast, dist, score };
    }

    if (aimed) return { ast: aimed.ast, dist: aimed.dist };
    return nearest;
  }

  private aimedRockHint(): string | null {
    const forward = this.ship.getForward().normalize();
    let best: { ast: Asteroid; dist: number } | null = null;
    for (const ast of this.asteroids) {
      if (ast.depleted) continue;
      const offset = ast.position.clone().sub(this.ship.position);
      const dist = offset.length();
      if (dist > MINE_RANGE + 12) continue;
      offset.normalize();
      if (forward.dot(offset) < MINE_AIM_DOT) continue;
      if (!best || dist < best.dist) best = { ast, dist };
    }
    if (!best) return null;
    const d = Math.round(best.dist);
    if (best.dist <= MINE_RANGE) return null;
    return `Rock ahead ${d}m — close in to ${MINE_RANGE}m to mine`;
  }

  private laserOrigin(): THREE.Vector3 {
    return this.ship.position.clone().add(this.ship.getForward().multiplyScalar(2.8));
  }

  private updateInteractions(input: Input, dt: number, save: PlayerSave): void {
    const mineRange = MINE_RANGE;
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

    for (const ast of this.asteroids) {
      if (ast.depleted) continue;
      const d = ast.distanceTo(this.ship.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = "asteroid";
      }
    }

    const mineTarget = this.pickMineTarget(mineRange);

    if (mineTarget && input.mine) {
      const { ast, dist: mineDist } = mineTarget;
      const cargoMax = this.ship.getCargoMax(save.upgrades, FACTIONS[save.faction]);
      const { mul, quality } = this.mineRateMul(mineDist);
      this.state.mineQuality = quality;

      const salvageReserve = this.training ? 12 : 0;
      if (this.ship.getCargoUsed(save.cargo) < cargoMax - salvageReserve) {
        const mined = ast.mine(dt, mul);
        if (mined > 0) {
          this.oreExtractBuffer += mined;
          const oreGain = Math.floor(this.oreExtractBuffer);
          if (oreGain > 0) this.oreExtractBuffer -= oreGain;
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
          if (this.oreBurstTimer > ORE_BURST_INTERVAL) {
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
          this.broadcastAsteroidOre(ast);
        }
      } else {
        this.state.message = this.training
          ? "Hold full for salvage — fly to the red beacon ahead"
          : "Cargo full — sell ore at MARKET or dock";
        this.miningBeam.burstOre(ast.getAimPoint(), this.ship.position, 1);
      }
    } else if (input.mine && !mineTarget) {
      const ahead = this.aimedRockHint();
      this.state.message = ahead ?? "Face a rock and close in — hold SPACE to mine";
    } else if (mineTarget) {
      this.state.mineQuality = this.mineRateMul(mineTarget.dist).quality;
      if (nearest === "asteroid") {
        nearestDist = mineTarget.dist;
      }
    }

    if (!this.state.mining) {
      this.ship.showLaser(this.ship.position, false);
      this.miningBeam.setActive(false);
      this.lastMinedOre = 0;
      if (!input.mine) this.oreExtractBuffer = 0;
    }

    for (const wreck of this.wrecks) {
      if (wreck.salvaged) continue;
      if (!this.wreckDetected(wreck, save)) continue;

      const d = wreck.distanceTo(this.ship.position);
      if (d < nearestDist) { nearestDist = d; nearest = "wreck"; this.state.nearestWreck = wreck; }

      if (d < interactRange && input.interact) {
        const cargoMax = this.ship.getCargoMax(save.upgrades, FACTIONS[save.faction]);
        const lootW = this.wreckLootWeight(wreck);
        const cargoFree = cargoMax - this.ship.getCargoUsed(save.cargo);
        const canSalvage = this.training || lootW <= cargoFree;
        if (canSalvage) {
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
            if (this.coop) {
              this.onCoopWorldEvent?.({ type: "wreck-salvaged", wreckId: wreck.def.id });
            }
          }
        } else {
          this.state.message = `Cargo full — need ${lootW} free hold (${cargoFree} free)`;
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
    if (this.training) {
      for (const b of this.trainingBeacons) b.update(this.beaconPulse);
      return;
    }
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

    if (this.race && this.raceController) {
      const next = RACE_GATES[this.raceController.nextGate];
      if (next && !this.raceController.finished) {
        const hex = `#${next.color.toString(16).padStart(6, "0")}`;
        add(`race-${this.raceController.nextGate}`, next.label, next.position, hex, "wreck");
      }
      for (const rp of this.remotePlayers.values()) {
        add(`player-${rp.name}`, rp.name, rp.ship.position, "#66e8ff", "player");
      }
      pois.sort((a, b) => a.dist - b.dist);
      return pois;
    }

    for (const ast of this.asteroids) {
      if (ast.depleted) continue;
      const d = ast.distanceTo(shipPos);
      if (d > 90) continue;
      add(
        `ast-${ast.id}`,
        this.training ? "Training rock" : "Rock",
        ast.position,
        "#c8a070",
        "asteroid"
      );
    }

    for (const w of this.wrecks) {
      if (w.salvaged) continue;
      if (!this.wreckDetected(w, save)) continue;
      const hex = w.def.beaconColor.toString(16).padStart(6, "0");
      add(w.def.id, w.name.split(" ").pop()!, w.position, `#${hex}`, "wreck");
    }

    for (const npc of this.npcs) {
      const hex = FACTIONS[npc.faction].color.toString(16).padStart(6, "0");
      add(`npc-${npc.name}`, npc.name, npc.ship.position, `#${hex}`, "npc");
    }

    for (const rp of this.remotePlayers.values()) {
      add(`player-${rp.name}`, rp.name, rp.ship.position, "#66e8ff", "player");
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
    if (this.race && this.raceController) {
      return this.raceController.hudHint();
    }
    if (tutorialHint) {
      if (this.training && tutorialHint.toLowerCase().includes("space")) {
        const rock = this.nearestLiveAsteroid();
        if (rock) {
          const d = Math.round(rock.distanceTo(this.ship.position));
          if (d > MINE_RANGE) return `${tutorialHint} · gold MINE pillar ${d}m ahead`;
          return `${tutorialHint} · in range — hold SPACE now`;
        }
      }
      if (this.training && tutorialHint.toLowerCase().includes("wreck")) {
        const wreck = this.nearestLiveWreck();
        if (wreck) {
          const d = Math.round(wreck.distanceTo(this.ship.position));
          if (d > 24) return `${tutorialHint} · follow the red SALVAGE pillar (${d}m)`;
          if (d > 14) return `${tutorialHint} · red pillar ${d}m — close in and hold E`;
          return `${tutorialHint} · in range — hold E now`;
        }
      }
      if (this.training && tutorialHint.toLowerCase().includes("dock")) {
        const d = Math.round(this.station.distanceTo(this.ship.position));
        if (d > 24) return `${tutorialHint} · follow the green DOCK pillar (${d}m)`;
        if (d > this.station.dockRadius) return `${tutorialHint} · green pillar ${d}m — press G in range`;
        return `${tutorialHint} · in dock range — press G`;
      }
      return tutorialHint;
    }
    const d = this.state.nearestDist;
    if (save.fuel <= 0) return "Out of fuel — drift to station or buy fuel when docked";
    if (save.hull <= 0) return "Hull critical — dock for repairs (G at K-7)";
    if (this.state.salvaging && this.state.nearestWreck)
      return `Salvaging ${this.state.nearestWreck.name}... hold E${this.state.nearestWreck.def.hazard ? " ⚠ HAZARD" : ""}`;
    if (this.state.mining) return "Drill engaged — rock chunks inbound";
    if (this.station.inDockRange(this.ship.position)) return "Press G to dock at Outpost K-7";
    if (this.state.nearestType === "wreck" && this.state.nearestWreck && d < 24)
      return `Hold E — ${this.state.nearestWreck.name}`;
    const mineTarget = this.pickMineTarget(MINE_RANGE);
    if (mineTarget && !this.state.mining) {
      const md = mineTarget.dist;
      if (this.state.mineQuality === "sweet") return "Sweet spot! Hold SPACE — max drill rate";
      if (this.state.mineQuality === "close") return "Too close — back up for cleaner cuts";
      if (this.state.mineQuality === "far") return `Hold SPACE to mine (${Math.round(md)}m) — sweet spot 9–12m`;
      return `Hold SPACE to mine — ${Math.round(md)}m · sweet spot 9–12m`;
    }
    const ahead = this.aimedRockHint();
    if (ahead) return ahead;
    if (!save.hasScanned) return `TAB scan — ${WRECK_DEFS.length} wrecks in sector`;
    return "Face a brown rock · hold SPACE within 22m to mine";
  }
}
