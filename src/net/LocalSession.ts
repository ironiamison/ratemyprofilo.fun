import type {
  MultiplayerSession,
  NetShipSnapshot,
  NetWorldEvent,
} from "./types";

const CHANNEL = "space-salvagers-local-v2";

type NetMessage =
  | { type: "presence"; id: string; name: string }
  | { type: "ship"; id: string; payload: NetShipSnapshot }
  | { type: "leave"; id: string }
  | { type: "world"; id: string; event: NetWorldEvent };

/** Same-browser tab sync via BroadcastChannel (local co-op). */
export class LocalSession implements MultiplayerSession {
  readonly clientId: string;
  readonly mode = "local" as const;
  readonly worldSeed: number;
  onRemoteShip?: (snap: NetShipSnapshot | null, peerId: string) => void;
  onWorldEvent?: (event: NetWorldEvent, fromPeerId?: string) => void;
  onPeerCount?: (count: number) => void;

  private channel: BroadcastChannel | null = null;
  private peers = new Set<string>();
  private presenceTimer: ReturnType<typeof setInterval> | null = null;

  constructor(worldSeed = 7) {
    this.clientId = crypto.randomUUID();
    this.worldSeed = worldSeed;
    if (typeof BroadcastChannel === "undefined") return;
    this.channel = new BroadcastChannel(CHANNEL);
    this.channel.onmessage = (ev: MessageEvent<NetMessage>) => {
      const msg = ev.data;
      if (!msg?.id || msg.id === this.clientId) return;
      if (msg.type === "presence") {
        this.peers.add(msg.id);
        this.emitPeerCount();
      }
      if (msg.type === "ship") {
        this.peers.add(msg.id);
        this.emitPeerCount();
        this.onRemoteShip?.(msg.payload, msg.id);
      }
      if (msg.type === "leave") {
        this.peers.delete(msg.id);
        this.emitPeerCount();
        this.onRemoteShip?.(null, msg.id);
      }
      if (msg.type === "world") {
        this.onWorldEvent?.(msg.event, msg.id);
      }
    };
  }

  static supported(): boolean {
    return typeof BroadcastChannel !== "undefined";
  }

  /** Broadcast lobby presence so other tabs detect this player before sector entry. */
  announce(name: string): void {
    this.postPresence(name);
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    this.presenceTimer = setInterval(() => this.postPresence(name), 2000);
  }

  getPeerIds(): string[] {
    return Array.from(this.peers);
  }

  private postPresence(name: string): void {
    if (!this.channel) return;
    this.channel.postMessage({ type: "presence", id: this.clientId, name } satisfies NetMessage);
  }

  private emitPeerCount(): void {
    this.onPeerCount?.(this.peers.size + 1);
  }

  publishShip(snapshot: Omit<NetShipSnapshot, "id" | "t">): void {
    if (!this.channel) return;
    const payload: NetShipSnapshot = { ...snapshot, id: this.clientId, t: Date.now() };
    this.channel.postMessage({ type: "ship", id: this.clientId, payload } satisfies NetMessage);
  }

  publishWorld(event: NetWorldEvent): void {
    if (!this.channel) return;
    this.channel.postMessage({ type: "world", id: this.clientId, event } satisfies NetMessage);
  }

  close(): void {
    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }
    if (this.channel) {
      this.channel.postMessage({ type: "leave", id: this.clientId } satisfies NetMessage);
      this.channel.close();
      this.channel = null;
    }
    this.peers.clear();
  }
}
