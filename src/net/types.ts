import type { ShipPaint } from "../game/shipPaint";
import type { ShipShapeId } from "../game/shipShapes";
import type { FactionId } from "../game/types";

export interface NetShipSnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  vx: number;
  vy: number;
  vz: number;
  boosting: boolean;
  shape: ShipShapeId;
  paint: ShipPaint;
  faction: FactionId;
  t: number;
}

export type NetWorldEvent =
  | { type: "wreck-salvaged"; wreckId: string }
  | { type: "asteroid-ore"; id: number; ore: number; depleted: boolean }
  | { type: "race-progress"; checkpoint: number; finished: boolean; elapsedMs: number; name: string }
  | { type: "race-go"; startAt: number }
  | { type: "orb-pickup"; id: number };

export type MultiplayerMode = "local" | "online";

export interface MultiplayerSession {
  readonly clientId: string;
  readonly mode: MultiplayerMode;
  readonly roomCode?: string;
  readonly worldSeed: number;
  onRemoteShip?: (snap: NetShipSnapshot | null, peerId: string) => void;
  onWorldEvent?: (event: NetWorldEvent, fromPeerId?: string) => void;
  onPeerCount?: (count: number) => void;
  publishShip(snapshot: Omit<NetShipSnapshot, "id" | "t">): void;
  publishWorld(event: NetWorldEvent): void;
  close(): void;
  /** Local same-browser session only — other tab client IDs. */
  getPeerIds?(): string[];
  /** Online relay — host signals everyone to enter the sector together. */
  signalLaunch?(): void;
  onRoomLaunch?: () => void;
}

export { defaultMpServerUrl, getMpServerUrl, saveMpServerUrl } from "./mpConfig";
