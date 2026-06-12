#!/usr/bin/env node
/**
 * Runs the MP relay locally and exposes it via Cloudflare quick tunnel.
 * Usage: npm run mp-public
 * Prints wss:// URL — use for VITE_MP_SERVER when testing cross-PC.
 */
import { spawn } from "node:child_process";
import { get } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.MP_PORT ?? 8787);

function waitForHealth(port, ms = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      get(`http://127.0.0.1:${port}/health`, (res) => {
        if (res.statusCode === 200) resolve();
        else retry();
      }).on("error", retry);
    };
    const retry = () => {
      if (Date.now() - start > ms) reject(new Error("Relay did not start"));
      else setTimeout(tick, 300);
    };
    tick();
  });
}

const relay = spawn("node", [join(root, "server/mp-relay.mjs")], {
  stdio: "inherit",
  env: { ...process.env, MP_PORT: String(PORT), PORT: String(PORT) },
});

relay.on("exit", (code) => process.exit(code ?? 1));

await waitForHealth(PORT);

const tunnel = spawn("npx", ["--yes", "cloudflared", "tunnel", "--url", `http://127.0.0.1:${PORT}`], {
  stdio: ["ignore", "pipe", "pipe"],
});

let printed = false;
const onData = (chunk) => {
  const text = chunk.toString();
  process.stderr.write(text);
  const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (m && !printed) {
    printed = true;
    const wss = m[0].replace("https://", "wss://");
    console.log("\n────────────────────────────────────────");
    console.log("PUBLIC RELAY (temporary):");
    console.log(`  ${wss}`);
    console.log("\nBuild game with:");
    console.log(`  VITE_MP_SERVER=${wss} npm run deploy`);
    console.log("────────────────────────────────────────\n");
  }
};

tunnel.stdout.on("data", onData);
tunnel.stderr.on("data", onData);

const shutdown = () => {
  tunnel.kill();
  relay.kill();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
