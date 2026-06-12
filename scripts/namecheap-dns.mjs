#!/usr/bin/env node
/**
 * Point spacesalvagers.com DNS at GitHub Pages via Namecheap API.
 * Requires in .env (see .env.example):
 *   NAMECHEAP_API_USER, NAMECHEAP_API_KEY, NAMECHEAP_USERNAME, NAMECHEAP_CLIENT_IP
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const API_USER = process.env.NAMECHEAP_API_USER;
const API_KEY = process.env.NAMECHEAP_API_KEY;
const USERNAME = process.env.NAMECHEAP_USERNAME;
const CLIENT_IP = process.env.NAMECHEAP_CLIENT_IP;
const DOMAIN = process.env.NAMECHEAP_DOMAIN || "spacesalvagers.com";
const SLD = DOMAIN.split(".")[0];
const TLD = DOMAIN.split(".").slice(1).join(".");

const GITHUB_A = [
  "185.199.108.153",
  "185.199.109.153",
  "185.199.110.153",
  "185.199.111.153",
];

if (!API_USER || !API_KEY || !USERNAME || !CLIENT_IP) {
  console.error("Missing Namecheap API vars in .env — see .env.example");
  process.exit(1);
}

async function ncApi(command, extra = {}) {
  const params = new URLSearchParams({
    ApiUser: API_USER,
    ApiKey: API_KEY,
    UserName: USERNAME,
    ClientIp: CLIENT_IP,
    Command: command,
    ...extra,
  });
  const url = `https://api.namecheap.com/xml.response?${params}`;
  const res = await fetch(url);
  const xml = await res.text();
  if (xml.includes('Status="ERROR"')) {
    const err = xml.match(/<Error[^>]*>([^<]+)/)?.[1] ?? xml.slice(0, 300);
    throw new Error(err);
  }
  return xml;
}

async function main() {
  console.log(`Setting GitHub Pages DNS for ${DOMAIN}...`);

  const hosts = [
    ...GITHUB_A.map((ip, i) => ({
      HostName: "@",
      RecordType: "A",
      Address: ip,
      TTL: "1800",
      name: `a${i}`,
    })),
    {
      HostName: "www",
      RecordType: "CNAME",
      Address: "ironiamison.github.io.",
      TTL: "1800",
      name: "www",
    },
  ];

  const hostParams = {};
  hosts.forEach((h, i) => {
    const n = i + 1;
    hostParams[`HostName${n}`] = h.HostName;
    hostParams[`RecordType${n}`] = h.RecordType;
    hostParams[`Address${n}`] = h.Address;
    hostParams[`TTL${n}`] = h.TTL;
  });

  await ncApi("namecheap.domains.dns.setHosts", {
    SLD,
    TLD,
    ...hostParams,
  });

  console.log("DNS updated:");
  for (const h of hosts) console.log(`  ${h.RecordType} ${h.HostName} → ${h.Address}`);
  console.log("\nPropagation: 5–30 minutes. Then visit https://spacesalvagers.com");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
