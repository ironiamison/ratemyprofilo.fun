const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_ROOM = 8;
const ROOM_TTL_MS = 30 * 60 * 1000;

function makeCode(rooms) {
  for (let i = 0; i < 32; i++) {
    let code = "";
    const buf = crypto.getRandomValues(new Uint8Array(6));
    for (let j = 0; j < 6; j++) code += CODE_CHARS[buf[j] % CODE_CHARS.length];
    if (!rooms.has(code)) return code;
  }
  throw new Error("Could not allocate room code");
}

function send(ws, msg) {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* closed */
  }
}

function peerCount(room) {
  return room.clients.size;
}

function notifyPeerCount(room) {
  const count = peerCount(room);
  for (const client of room.clients.keys()) {
    send(client, { type: "peers", count });
  }
}

function broadcast(room, msg, except) {
  for (const client of room.clients.keys()) {
    if (client !== except) send(client, msg);
  }
}

/** @typedef {{ seed: number; created: number; clients: Map<WebSocket, { id: string; name: string }> }} Room */

export class Relay {
  /** @param {DurableObjectState} state */
  constructor(state) {
    this.state = state;
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    /** @type {Map<WebSocket, { id: string; name: string; code?: string }>} */
    this.meta = new Map();
  }

  /** @param {Request} request */
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health" || (url.pathname === "/" && request.method === "GET")) {
      return new Response("ok", { headers: { "Content-Type": "text/plain" } });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Space Salvagers relay", { status: 200 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  cleanupRooms() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.clients.size === 0 || now - room.created > ROOM_TTL_MS) {
        this.rooms.delete(code);
      }
    }
  }

  /** @param {WebSocket} ws @param {string} raw */
  webSocketMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    let meta = this.meta.get(ws);

    if (msg.type === "host") {
      this.cleanupRooms();
      const code = makeCode(this.rooms);
      const seed = msg.seed ?? Math.floor(Math.random() * 1_000_000);
      const id = crypto.randomUUID();
      const name = String(msg.name ?? "Scavenger").slice(0, 24);
      /** @type {Room} */
      const room = { seed, created: Date.now(), clients: new Map() };
      room.clients.set(ws, { id, name });
      this.rooms.set(code, room);
      meta = { id, name, code };
      this.meta.set(ws, meta);
      send(ws, { type: "room", code, seed, id, peers: 1 });
      return;
    }

    if (msg.type === "join") {
      const code = String(msg.code ?? "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      const room = this.rooms.get(code);
      if (!room) {
        send(ws, { type: "error", message: "Room not found" });
        return;
      }
      if (room.clients.size >= MAX_ROOM) {
        send(ws, { type: "error", message: "Room full" });
        return;
      }
      const id = crypto.randomUUID();
      const name = String(msg.name ?? "Scavenger").slice(0, 24);
      room.clients.set(ws, { id, name });
      meta = { id, name, code };
      this.meta.set(ws, meta);
      send(ws, { type: "joined", code, seed: room.seed, id, peers: peerCount(room) });
      notifyPeerCount(room);
      for (const [peer, peerMeta] of room.clients) {
        if (peer === ws) continue;
        send(ws, { type: "peer-hello", id: peerMeta.id, name: peerMeta.name });
        send(peer, { type: "peer-hello", id, name });
      }
      return;
    }

    if (!meta?.code) return;
    const room = this.rooms.get(meta.code);
    if (!room) return;

    if (msg.type === "ship" && msg.payload) {
      broadcast(room, { type: "ship", id: meta.id, payload: msg.payload }, ws);
      return;
    }
    if (msg.type === "world" && msg.event) {
      broadcast(room, { type: "world", id: meta.id, event: msg.event }, ws);
      return;
    }
    if (msg.type === "launch") {
      broadcast(room, { type: "launch", id: meta.id }, ws);
    }
  }

  /** @param {WebSocket} ws */
  webSocketClose(ws) {
    const meta = this.meta.get(ws);
    this.meta.delete(ws);
    if (!meta?.code) return;
    const room = this.rooms.get(meta.code);
    if (!room) return;
    room.clients.delete(ws);
    broadcast(room, { type: "leave", id: meta.id });
    notifyPeerCount(room);
    if (room.clients.size === 0) this.rooms.delete(meta.code);
  }
}

export default {
  /** @param {Request} request @param {{ RELAY: DurableObjectNamespace }} env */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response("ok", { headers: { "Content-Type": "text/plain" } });
    }
    const id = env.RELAY.idFromName("global");
    const stub = env.RELAY.get(id);
    return stub.fetch(request);
  },
};
