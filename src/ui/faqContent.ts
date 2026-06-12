import { MISSIONS } from "../game/missions";
import { FACTIONS, WRECK_DEFS } from "../game/types";

export function getFaqHtml(): string {
  const factions = Object.values(FACTIONS)
    .map((f) => `<li><strong style="color:#${f.color.toString(16).padStart(6, "0")}">${f.name}</strong> — ${f.bonus}. <em>${f.motto}</em></li>`)
    .join("");

  const contracts = MISSIONS.map((m) => `<li><strong>${m.title}</strong> — ${m.desc} <span class="faq-reward">+${m.reward} CR</span></li>`).join("");

  const wrecks = WRECK_DEFS.map((w) => {
    const hazard = w.hazard === "fuel" ? " ⚠ drains fuel while salvaging" : w.hazard === "radiation" ? " ⚠ radiation damage" : "";
    const scan = w.minScanner > 1 ? ` (needs Scanner Lv${w.minScanner} or TAB scan)` : "";
    return `<li><strong>${w.name}</strong> — ${w.loot.scrap} scrap, ${w.loot.components} parts${hazard}${scan}</li>`;
  }).join("");

  return `
    <div class="faq-panel interactive">
      <button class="faq-close interactive" id="faq-close" aria-label="Close">✕</button>
      <h2>SALVAGER FIELD MANUAL</h2>
      <p class="faq-intro">Everything you need to strip Sector K-7 clean.</p>

      <section>
        <h3>What is this?</h3>
        <p>Space Salvagers is a browser space salvage game. Fly a sector, mine asteroids, loot abandoned wrecks, sell cargo at the station, upgrade your ship, and complete contracts for credits. Progress saves automatically.</p>
      </section>

      <section>
        <h3>Controls — Keyboard</h3>
        <div class="faq-grid">
          <div><kbd>W</kbd> / <kbd>S</kbd> Thrust / brake</div>
          <div><kbd>A</kbd> / <kbd>D</kbd> Turn left / right</div>
          <div><kbd>R</kbd> / <kbd>F</kbd> Pitch up / down</div>
          <div><kbd>Q</kbd> Ascend</div>
          <div><kbd>Shift</kbd> Boost (uses extra fuel)</div>
          <div><kbd>Space</kbd> Mine asteroid (when close)</div>
          <div><kbd>E</kbd> hold Salvage wreck</div>
          <div><kbd>G</kbd> Dock at station</div>
          <div><kbd>Tab</kbd> Scan pulse (reveals wrecks)</div>
          <div><kbd>H</kbd> or <kbd>?</kbd> This manual</div>
        </div>
      </section>

      <section>
        <h3>Controls — Mobile</h3>
        <p>Use the d-pad to fly, <strong>⚡</strong> boost, <strong>⛏</strong> mine, <strong>E</strong> salvage, <strong>G</strong> dock, and <strong>⌖</strong> scan. <strong>R/F/Q</strong> pitch and ascend.</p>
      </section>

      <section>
        <h3>How to play</h3>
        <ol class="faq-steps">
          <li>Customize your ship in the Bay, pick a crew faction — each gives a permanent bonus.</li>
          <li>Press <kbd>Tab</kbd> to scan and reveal wreck signatures on your radar.</li>
          <li>Fly to colored blips on the <strong>radar</strong> (bottom right). Green = Outpost K-7.</li>
          <li>Mine asteroids with <kbd>Space</kbd> when nearby to collect <strong>ore</strong>.</li>
          <li>Hold <kbd>E</kbd> on a wreck to salvage <strong>scrap</strong> and <strong>components</strong>.</li>
          <li>Fly to the green beacon, press <kbd>G</kbd> to <strong>dock</strong>.</li>
          <li>Sell cargo, buy upgrades, claim completed contracts, then undock.</li>
        </ol>
      </section>

      <section>
        <h3>Radar</h3>
        <p>The circular radar shows POIs relative to your ship heading. Blips ahead appear at the top. Distance from center = how far away. After a scan pulse, all visible wrecks stay highlighted for a few seconds.</p>
      </section>

      <section>
        <h3>Factions</h3>
        <ul class="faq-list">${factions}</ul>
      </section>

      <section>
        <h3>Economy — Commodity Exchange</h3>
        <p>Outpost K-7 has a live market. Every commodity has <strong>buy</strong> and <strong>sell</strong> prices. Prices shift when you sell (floods the market) and drift each dock cycle.</p>
        <ul class="faq-list">
          <li><strong>Ore</strong> — mine from asteroids. Base ~6 CR sell.</li>
          <li><strong>Scrap</strong> — salvage from wrecks. Base ~10 CR sell.</li>
          <li><strong>Ship Parts</strong> — rare wreck loot. Base ~55 CR sell. Takes 3 cargo slots.</li>
          <li><strong>Refined Alloy</strong> — craft at refinery. Base ~38 CR sell. Takes 2 cargo slots.</li>
          <li>▲▼ arrows show price trend since last dock.</li>
          <li><strong>Syndicate</strong> faction gets +12% sell prices and -5% buy prices.</li>
        </ul>
      </section>

      <section>
        <h3>Economy — Refinery &amp; Services</h3>
        <ul class="faq-list">
          <li><strong>Ore → Alloy:</strong> 5 ore + 12 CR processing fee.</li>
          <li><strong>Scrap Fusion:</strong> 3 scrap + 1 ore + 18 CR → 1 alloy.</li>
          <li><strong>Fuel</strong> — buy at station (Void Walkers get -15% fuel costs). No free refuel.</li>
          <li><strong>Hull repair</strong> — buy per point (Iron Corps get -20%).</li>
          <li><strong>Dock fee</strong> — 15 CR each time you dock.</li>
        </ul>
      </section>

      <section>
        <h3>Ship upgrades</h3>
        <ul class="faq-list">
          <li><strong>Engine</strong> — faster thrust and top speed.</li>
          <li><strong>Hull</strong> — more max hull integrity.</li>
          <li><strong>Cargo</strong> — larger hold.</li>
          <li><strong>Scanner</strong> — reveals distant wrecks without scanning.</li>
          <li>Upgrades Lv2+ require <strong>1 ship part</strong> + credits (except Scanner).</li>
        </ul>
      </section>

      <section>
        <h3>Contracts</h3>
        <p>Your active contract shows top-left on the HUD. Complete the objective, then dock and claim the reward at Outpost K-7.</p>
        <ul class="faq-list">${contracts}</ul>
      </section>

      <section>
        <h3>Wrecks in Sector K-7</h3>
        <ul class="faq-list">${wrecks}</ul>
      </section>

      <section>
        <h3>Hazards &amp; survival</h3>
        <ul class="faq-list">
          <li><strong>Fuel</strong> drains when flying and boosting. Buy fuel at the station.</li>
          <li><strong>Hull</strong> takes radiation damage on certain wrecks. Buy repairs at the station.</li>
          <li>Some wrecks drain fuel <em>while</em> you salvage — finish fast or dock between runs.</li>
          <li>Other players (NPC scavengers) patrol the sector — they're not hostile, just atmosphere.</li>
        </ul>
      </section>

      <section>
        <h3>Tips</h3>
        <ul class="faq-list">
          <li>Do the scan contract first — it teaches you the sector layout.</li>
          <li>Upgrade Scanner early to find The Gilded Lie without burning TAB constantly.</li>
          <li>Sell ore in bulk at the station; save components until you need credits.</li>
          <li>Boost is great for crossing the sector but eats fuel — use it wisely.</li>
        </ul>
      </section>

      <p class="faq-footer">Fly safe. Salvage rights or die. — Outpost K-7 Dispatch</p>
    </div>`;
}
