import { FACTIONS, type FactionId, type PlayerSave } from "../game/types";

export interface FactionDetail {
  id: FactionId;
  image: string;
  tagline: string;
  lore: string;
  specialty: string;
  playstyle: string;
  members: string;
}

export const FACTION_DETAILS: FactionDetail[] = [
  {
    id: "syndicate",
    image: "/factions/faction-syndicate.png",
    tagline: "The galaxy's largest salvage brokerage",
    lore: "The Syndicate doesn't fly for glory — they fly for margin. Centuries of wreck claims, insurance fraud, and perfectly legal piracy built the richest salvage network in the outer rim. Every crate has a buyer. Every corpse has a contract.",
    specialty: "Cargo haulers and bulk operators",
    playstyle: "Stack ore and scrap, sell big at K-7. Slower ships, bigger payouts per run.",
    members: "12,400+ registered captains",
  },
  {
    id: "voidwalkers",
    image: "/factions/faction-voidwalkers.png",
    tagline: "Nomads of the deep dark",
    lore: "Void Walkers chart routes other crews won't touch — radiation belts, fuel deserts, sectors written off as dead. Their engines sip fuel like wine. Their pilots come back when everyone else runs dry.",
    specialty: "Long-range scouts and endurance scavengers",
    playstyle: "Boost less, explore more. Ideal for players who hate docking for fuel.",
    members: "3,800+ drift saints",
  },
  {
    id: "ironcorps",
    image: "/factions/faction-ironcorps.png",
    tagline: "Salvage rights — enforced",
    lore: "Iron Corps started as a militia protecting claim-jumpers. Now they're the claim-jumpers. Reinforced hulls, armored booms, and a simple philosophy: if it's floating and unguarded, it's theirs. Disputes are settled at the airlock.",
    specialty: "Combat-ready gunboats and hazard wrecks",
    playstyle: "Push into radiation and fuel-drain sites. Hull bonus keeps you alive longer.",
    members: "6,100+ iron corsairs",
  },
];

function hexColor(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

export function renderFactionsHtml(save: PlayerSave): string {
  const cards = FACTION_DETAILS.map((d) => {
    const f = FACTIONS[d.id];
    const color = hexColor(f.color);
    const active = save.faction === d.id;
    return `
      <article class="faction-card${active ? " faction-active" : ""}" data-faction="${d.id}" style="--faction-color:${color}">
        <div class="faction-art">
          <img src="${d.image}" alt="${f.name}" loading="lazy" />
          <div class="faction-art-overlay"></div>
          ${active ? `<span class="faction-badge">YOUR CREW</span>` : ""}
        </div>
        <div class="faction-body">
          <h2 class="faction-name">${f.name}</h2>
          <p class="faction-motto">"${f.motto}"</p>
          <p class="faction-tagline">${d.tagline}</p>
          <p class="faction-lore">${d.lore}</p>
          <div class="faction-stats">
            <div class="faction-stat"><span>Bonus</span><strong>${f.bonus}</strong></div>
            <div class="faction-stat"><span>Specialty</span><strong>${d.specialty}</strong></div>
            <div class="faction-stat"><span>Playstyle</span><strong>${d.playstyle}</strong></div>
            <div class="faction-stat"><span>Roster</span><strong>${d.members}</strong></div>
          </div>
          <button class="faction-join interactive${active ? " joined" : ""}" data-join="${d.id}"${active ? " disabled" : ""}>
            ${active ? "ENLISTED" : "JOIN FACTION"}
          </button>
        </div>
      </article>`;
  }).join("");

  const current = FACTIONS[save.faction];

  return `
    <div class="factions-screen interactive">
      <div class="factions-bg" aria-hidden="true"></div>
      <div class="factions-vignette" aria-hidden="true"></div>

      <header class="factions-header">
        <button class="factions-back interactive" id="btn-factions-back">← HUB</button>
        <div class="factions-head-text">
          <h1 class="factions-title">FACTIONS</h1>
          <p class="factions-sub">Choose your crew · Bonuses apply to all deployments</p>
        </div>
        <div class="factions-current">
          <span class="factions-current-label">ENLISTED</span>
          <span class="factions-current-name" style="color:#${current.color.toString(16).padStart(6, "0")}">${current.name}</span>
        </div>
      </header>

      <div class="factions-grid">${cards}</div>

      <footer class="factions-footer">
        <p>Faction bonus is permanent for your captain. Switch anytime — progress is kept.</p>
      </footer>
    </div>`;
}
