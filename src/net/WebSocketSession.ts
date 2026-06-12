import type {
  MultiplayerSession,
  NetShipSnapshot,
  NetWorldEvent,
} from "./types";

type ServerMessage =
  | { type: "room"; code: string; seed: number; id: string; peers: number }
  | { type: "joined"; code: string; seed: number; id: string; peers: number }
  | { type: "ship"; id: string; payload: NetShipSnapshot }
  | { type: "world"; id: string; event: NetWorldEvent }
  | { type: "leave"; id: string }
  | { type: "peer-hello"; id: string; name: string }
  | { type: "peers"; count: number }
  | { type: "launch"; id: string }
  | { type: "error"; message: string };

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) return trimmed;
  if (trimmed.startsWith("http://")) return `ws://${trimmed.slice(7)}`;
  if (trimmed.startsWith("https://")) return `wss://${trimmed.slice(8)}`;
  return `ws://${trimmed}`;
}

function waitForOpen(ws: WebSocket, timeoutMs = 8000): Promise<void> {
  if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Connection timed out")), timeoutMs);
    ws.addEventListener(
      "open",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
    ws.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        reject(new Error("WebSocket failed"));
      },
      { once: true }
    );
  });
}

function waitForMessage(ws: WebSocket, types: string[], timeoutMs = 8000): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeEventListener("message", onMessage);
      reject(new Error("Server did not respond"));
    }, timeoutMs);

    const onMessage = (ev: MessageEvent) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (msg.type === "error") {
        clearTimeout(timer);
        ws.removeEventListener("message", onMessage);
        reject(new Error(msg.message));
        return;
      }
      if (types.includes(msg.type)) {
        clearTimeout(timer);
        ws.removeEventListener("message", onMessage);
        resolve(msg);
      }
    };

    ws.addEventListener("message", onMessage);
  });
}

/** Online co-op via WebSocket relay (LAN or hosted server). */
export class WebSocketSession implements MultiplayerSession {
  readonly mode = "online" as const;
  readonly clientId: string;
  readonly roomCode: string;
  readonly worldSeed: number;
  onRemoteShip?: (snap: NetShipSnapshot | null, peerId: string) => void;
  onWorldEvent?: (event: NetWorldEvent, fromPeerId?: string) => void;
  onPeerCount?: (count: number) => void;
  onRoomLaunch?: () => void;

  private ws: WebSocket;

  private constructor(ws: WebSocket, clientId: string, roomCode: string, worldSeed: number) {
    this.ws = ws;
    this.clientId = clientId;
    this.roomCode = roomCode;
    this.worldSeed = worldSeed;
    ws.addEventListener("message", (ev) => this.handleMessage(ev));
    ws.addEventListener("close", () => this.onPeerCount?.(1));
  }

  static async host(serverUrl: string, name: string, seed?: number): Promise<WebSocketSession> {
    const ws = new WebSocket(normalizeUrl(serverUrl));
    await waitForOpen(ws);
    ws.send(JSON.stringify({ type: "host", name, seed }));
    const msg = await waitForMessage(ws, ["room"]);
    if (msg.type !== "room") throw new Error("Unexpected server response");
    const session = new WebSocketSession(ws, msg.id, msg.code, msg.seed);
    session.onPeerCount?.(msg.peers);
    return session;
  }

  static async join(serverUrl: string, code: string, name: string): Promise<WebSocketSession> {
    const ws = new WebSocket(normalizeUrl(serverUrl));
    await waitForOpen(ws);
    ws.send(JSON.stringify({ type: "join", code: code.toUpperCase(), name }));
    const msg = await waitForMessage(ws, ["joined"]);
    if (msg.type !== "joined") throw new Error("Unexpected server response");
    const session = new WebSocketSession(ws, msg.id, msg.code, msg.seed);
    session.onPeerCount?.(msg.peers);
    return session;
  }

  private handleMessage(ev: MessageEvent): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      return;
    }

    if (msg.type === "ship" && msg.id !== this.clientId) {
      this.onRemoteShip?.(msg.payload, msg.id);
    }
    if (msg.type === "leave" && msg.id !== this.clientId) {
      this.onRemoteShip?.(null, msg.id);
    }
    if (msg.type === "world" && msg.id !== this.clientId) {
      this.onWorldEvent?.(msg.event, msg.id);
    }
    if (msg.type === "peers") {
      this.onPeerCount?.(msg.count);
    }
    if (msg.type === "launch" && msg.id !== this.clientId) {
      this.onRoomLaunch?.();
    }
  }

  signalLaunch(): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "launch" }));
  }

  publishShip(snapshot: Omit<NetShipSnapshot, "id" | "t">): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    const payload: NetShipSnapshot = { ...snapshot, id: this.clientId, t: Date.now() };
    this.ws.send(JSON.stringify({ type: "ship", payload }));
  }

  publishWorld(event: NetWorldEvent): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "world", event }));
  }

  close(): void {
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
    }
  }
}
