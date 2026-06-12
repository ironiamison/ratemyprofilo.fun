# Space Salvagers

**The galaxy is full of dead people's stuff. Go get it.**

Browser-based space salvage game at [spacesalvagers.com](https://www.spacesalvagers.com). Complete flight school, then deploy to Sector K-7 — mine asteroids, strip wrecks, trade at the station, upgrade your ship, and fly alongside NPC salvagers.

## Play

```bash
npm install
npm run dev
```

Deploy to GitHub Pages:

```bash
npm run deploy
```

## Controls

| Key | Action |
|-----|--------|
| W / S | Thrust / brake |
| A / D | Turn |
| R / F | Pitch up / down |
| Q | Ascend |
| Shift | Boost (uses fuel) |
| Space (hold) | Mine asteroid (within ~14 m) |
| E (hold) | Salvage wreck (within ~24 m) |
| G | Dock at Outpost K-7 |
| Tab | Scan pulse — reveal wreck signatures |
| Esc | Pause |

On mobile/tablet, on-screen **FLY** and **ACTIONS** pads appear automatically. Hold **SALVAGE** near a wreck (same as E on keyboard).

## Factions

- **The Syndicate** — +25% cargo capacity
- **Void Walkers** — +30% fuel efficiency
- **Iron Corps** — +25% hull strength

## Features

- **Flight school** — 5-step tutorial with labeled MINE / SALVAGE / DOCK pillars
- **Sector K-7** — procedural asteroid field, 5 story wrecks with logs and hazards
- **Outpost K-7** — dynamic market (prices shift when you dock), refuel, repair, ore/alloy refining
- **Missions** — contracts with claim-at-station rewards
- **Hangar** — ship paint, hull shapes, upgrades
- **NPC traffic** — 8 AI ships on patrol with radar blips
- **Audio** — procedural sci-fi ambient + flight SFX
- **Persistent save** — credits, cargo, upgrades, mission progress (localStorage)

## Community

- X: [@spacesalvagerss](https://x.com/spacesalvagerss)

## Stack

Vite · TypeScript · Three.js · GitHub Pages
