import { createServer } from "http";
import { randomBytes, randomUUID } from "crypto";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? process.env.MP_PORT ?? 8787);
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_ROOM = 8;
const ROOM_TTL_MS = 30 * 60 * 1000;

/** @type {Map<string, { seed: number; created: number; clients: Map<WebSocket, { id: string; name: string }> }>} */
const rooms = new Map();

function makeCode() {
  const buf = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[buf[i] % CODE_CHARS.length];
  return rooms.has(code) ? makeCode() : code;
}

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(room, msg, except) {
  for (const client of room.clients.keys()) {
    if (client !== except) send(client, msg);
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

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.clients.size === 0 || now - room.created > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }
}

setInterval(cleanupRooms, 60_000);

const httpServer = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  /** @type {{ id: string; name: string; code?: string } | null} */
  let meta = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    if (msg.type === "host") {
      const code = makeCode();
      const seed = msg.seed ?? Math.floor(Math.random() * 1_000_000);
      const id = randomUUID();
      const name = String(msg.name ?? "Scavenger").slice(0, 24);
      const room = { seed, created: Date.now(), clients: new Map() };
      room.clients.set(ws, { id, name });
      rooms.set(code, room);
      meta = { id, name, code };
      send(ws, { type: "room", code, seed, id, peers: 1 });
      return;
    }

    if (msg.type === "join") {
      const code = String(msg.code ?? "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      const room = rooms.get(code);
      if (!room) {
        send(ws, { type: "error", message: "Room not found" });
        return;
      }
      if (room.clients.size >= MAX_ROOM) {
        send(ws, { type: "error", message: "Room full" });
        return;
      }
      const id = randomUUID();
      const name = String(msg.name ?? "Scavenger").slice(0, 24);
      room.clients.set(ws, { id, name });
      meta = { id, name, code };
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
    const room = rooms.get(meta.code);
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
  });

  ws.on("close", () => {
    if (!meta?.code) return;
    const room = rooms.get(meta.code);
    if (!room) return;
    room.clients.delete(ws);
    broadcast(room, { type: "leave", id: meta.id });
    notifyPeerCount(room);
    if (room.clients.size === 0) rooms.delete(meta.code);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Space Salvagers relay listening on port ${PORT}`);
});
