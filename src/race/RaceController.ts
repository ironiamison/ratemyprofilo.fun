import * as THREE from "three";
import { sfx } from "../audio/SFX";
import { formatRaceTime, RACE_GATES } from "../game/raceCourse";
import { RaceGate } from "./RaceGate";
import { RaceTrackGuide } from "./RaceTrackGuide";

export type RacePhase = "countdown" | "racing" | "finished";

export interface PeerRaceState {
  id: string;
  name: string;
  checkpoint: number;
  finished: boolean;
  elapsedMs: number;
}

export class RaceController {
  readonly gates: RaceGate[] = [];
  private trackGuide: RaceTrackGuide;
  phase: RacePhase = "countdown";
  countdown = 3;
  /** Next gate index to pass (0-based in RACE_GATES). */
  nextGate = 0;
  elapsedMs = 0;
  finished = false;
  finishMs = 0;
  onProgress?: (checkpoint: number, finished: boolean, elapsedMs: number) => void;
  onCountdownTick?: (n: number) => void;

  private peers = new Map<string, PeerRaceState>();
  private gateCooldown = 0;
  private lastCountdownInt = 4;
  private raceStartAt = 0;

  constructor(sceneRoot: THREE.Group) {
    this.trackGuide = new RaceTrackGuide(sceneRoot);
    RACE_GATES.forEach((def, i) => {
      const gate = new RaceGate(i, def);
      this.gates.push(gate);
      sceneRoot.add(gate.group);
    });
    this.gates[0]?.setActive(true);
  }

  /** Sync countdown to an absolute GO timestamp (multiplayer). */
  syncRaceStart(startAt: number): void {
    if (this.phase === "racing" || this.finished) return;
    if (this.raceStartAt > 0 && startAt >= this.raceStartAt) return;
    this.raceStartAt = startAt;
    this.phase = "countdown";
    this.lastCountdownInt = 4;
  }

  update(dt: number, shipPos: THREE.Vector3): void {
    this.trackGuide.update(dt);
    for (const g of this.gates) g.update(dt);
    if (this.gateCooldown > 0) this.gateCooldown -= dt;

    if (this.phase === "countdown") {
      if (this.raceStartAt > 0) {
        const remain = (this.raceStartAt - Date.now()) / 1000;
        if (remain <= 0) {
          if (this.lastCountdownInt !== 0) {
            this.lastCountdownInt = 0;
            sfx.boost();
            this.onCountdownTick?.(0);
            this.phase = "racing";
          }
        } else {
          const tick = Math.ceil(remain);
          if (tick !== this.lastCountdownInt) {
            this.lastCountdownInt = tick;
            if (tick > 0) {
              sfx.uiClick();
              this.onCountdownTick?.(tick);
            }
          }
        }
        return;
      }

      this.countdown -= dt;
      const tick = Math.ceil(Math.max(0, this.countdown));
      if (tick !== this.lastCountdownInt) {
        this.lastCountdownInt = tick;
        if (tick > 0) {
          sfx.uiClick();
          this.onCountdownTick?.(tick);
        } else {
          sfx.boost();
          this.onCountdownTick?.(0);
          this.phase = "racing";
        }
      }
      return;
    }

    if (this.phase !== "racing" || this.finished) return;

    this.elapsedMs += dt * 1000;
    this.tryPassGate(shipPos);
  }

  private tryPassGate(shipPos: THREE.Vector3): void {
    if (this.nextGate >= RACE_GATES.length || this.gateCooldown > 0) return;

    const def = RACE_GATES[this.nextGate];
    const dist = shipPos.distanceTo(def.position);
    if (dist > def.radius) return;

    this.gates[this.nextGate]?.setPassed();
    this.nextGate++;
    this.gateCooldown = 0.75;

    if (this.nextGate >= RACE_GATES.length) {
      this.finished = true;
      this.finishMs = this.elapsedMs;
      this.phase = "finished";
      sfx.mission();
      this.onProgress?.(RACE_GATES.length, true, this.elapsedMs);
      return;
    }

    sfx.upgrade();
    this.gates[this.nextGate]?.setActive(true);
    this.onProgress?.(this.nextGate, false, this.elapsedMs);
  }

  applyPeerProgress(peerId: string, name: string, checkpoint: number, finished: boolean, elapsedMs: number): void {
    this.peers.set(peerId, { id: peerId, name, checkpoint, finished, elapsedMs });
  }

  removePeer(peerId: string): void {
    this.peers.delete(peerId);
  }

  getStandings(localName: string, localId: string): PeerRaceState[] {
    const local: PeerRaceState = {
      id: localId,
      name: localName,
      checkpoint: this.nextGate,
      finished: this.finished,
      elapsedMs: this.finished ? this.finishMs : this.elapsedMs,
    };
    const all = [local, ...Array.from(this.peers.values()).filter((p) => p.id !== localId)];
    return all.sort((a, b) => {
      if (a.finished && b.finished) return a.elapsedMs - b.elapsedMs;
      if (a.finished) return -1;
      if (b.finished) return 1;
      if (b.checkpoint !== a.checkpoint) return b.checkpoint - a.checkpoint;
      return a.elapsedMs - b.elapsedMs;
    });
  }

  gateProgressLabel(): string {
    return this.finished ? "FINISHED" : `Gate ${Math.min(this.nextGate + 1, RACE_GATES.length)}/${RACE_GATES.length}`;
  }

  hudHint(): string {
    if (this.phase === "countdown") return "Get ready…";
    if (this.finished) return `FINISH — ${formatRaceTime(this.finishMs)}`;
    const next = RACE_GATES[this.nextGate];
    return next ? `Next: ${next.label} · ${formatRaceTime(this.elapsedMs)}` : "Race complete";
  }
}
