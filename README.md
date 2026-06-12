# Space Salvagers

**The galaxy is full of dead people's stuff. Go get it.**

Browser-based space salvage MMO prototype. Explore a procedural sector, mine asteroids, salvage abandoned wrecks, upgrade your ship at the station, and fly alongside other salvagers.

## Play

```bash
npm install
npm run dev
```

## Controls

| Key | Action |
|-----|--------|
| W/S | Thrust / brake |
| A/D | Turn |
| R/F | Pitch up/down |
| Q | Ascend |
| Shift | Boost (uses fuel) |
| Space | Mine asteroid (when close) |
| E (hold) | Salvage wreck |
| E (tap) | Dock at station |
| Tab | Scan pulse — highlight signals |

## Factions

- **The Syndicate** — +25% cargo
- **Void Walkers** — +30% fuel efficiency
- **Iron Corps** — +25% hull

## MVP features

- Procedural asteroid field (40 asteroids)
- Abandoned wreck **UES Prosperity** with ship log
- Outpost K-7 — upgrades, sell ore/scrap, refuel
- 3 NPC ships patrolling (fake MMO population)
- Persistent save — credits, cargo, upgrades

## Stack

Vite · TypeScript · Three.js
