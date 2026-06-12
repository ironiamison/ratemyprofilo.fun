import { tierLabel } from "../chain/holderPerks";
import { getQuotes } from "../game/economy";
import { FACTIONS, WRECK_DEFS, type PlayerSave } from "../game/types";
import { X_HANDLE, X_URL } from "../social";
import { HOME_ICONS } from "./homeIcons";
import { buildHomeTokenView, renderTokenPanel, type HomeTokenView } from "./homeTokenPanel";

function buildNews(save: PlayerSave): { title: string; time: string }[] {
  const items: { title: string; time: string }[] = [];
  const wrecksLeft = WRECK_DEFS.length - save.wrecksSalvaged;

  if (!save.tutorialComplete) {
    items.push({ title: "Flight school required before sector deploy", time: "mission" });
  }
  if (save.oreMined > 0) {
    items.push({ title: `Career total: ${save.oreMined} ore mined`, time: "your stats" });
  }
  if (save.wrecksSalvaged > 0) {
    items.push({ title: `${save.wrecksSalvaged} wrecks salvaged · ${wrecksLeft} remain in K-7`, time: "your stats" });
  }
  if (save.totalEarned > 0) {
    items.push({ title: `Lifetime earnings: ${save.totalEarned.toLocaleString()} CR`, time: "your stats" });
  }

  const quotes = getQuotes(save);
  const hot = quotes.reduce((a, b) => (b.sell > a.sell ? b : a));
  items.push({ title: `Market cycle ${save.market.tick} · best sell: ${hot.name} @ ${hot.sell} CR`, time: "live" });

  if (save.market.recentTrades.length > 0) {
    const last = save.market.recentTrades[0];
    items.push({
      title: `Last trade: ${last.side} ${last.label} ×${last.qty} (${last.total} CR)`,
      time: `cycle ${last.tick}`,
    });
  }

  if (items.length < 3) {
    items.push({ title: "Sector K-7 has 28 asteroids and 5 wrecks", time: "sector intel" });
  }

  return items.slice(0, 4);
}

export function renderHomeHtml(save: PlayerSave, tokenView?: HomeTokenView): string {
  const news = buildNews(save);
  const f = FACTIONS[save.faction];
  const needsTraining = !save.tutorialComplete;
  const freshDeploy = save.tutorialComplete && save.wrecksSalvaged === 0 && save.oreMined < 5;
  const playLabel = needsTraining ? "START TRAINING" : "PLAY";
  const token = tokenView ?? buildHomeTokenView();
  const holderBadge = token.tier !== "none" ? ` · <span class="holder-badge">${tierLabel(token.tier)}</span>` : "";

  const onboardBanner = needsTraining
    ? `<aside class="home-onboard interactive" role="note">
        <span class="home-onboard-tag">NEW CAPTAIN</span>
        <p class="home-onboard-text">Start with <strong>Flight School</strong> — learn to fly, scan, mine, salvage, and dock in about five minutes.</p>
      </aside>`
    : freshDeploy
      ? `<aside class="home-onboard home-onboard--deploy interactive" role="note">
          <span class="home-onboard-tag">CLEARED FOR SECTOR</span>
          <p class="home-onboard-text">Hit <strong>PLAY</strong> to deploy. <kbd>TAB</kbd> scan · mine rocks · strip wrecks · dock at K-7 with <kbd>G</kbd>.</p>
        </aside>`
      : "";

  return `
    <div class="home-screen interactive">
      <div class="home-bg" aria-hidden="true"></div>
      <div class="home-vignette" aria-hidden="true"></div>

      ${onboardBanner}

      <header class="home-brand">
        <h1 class="home-title">
          <span class="title-space">SPACE</span>
          <span class="title-salvagers">SALVAGERS</span>
        </h1>
        <div class="home-title-rule">
          <span class="rule-line"></span>
          <span class="rule-icon">${HOME_ICONS.chain}</span>
          <span class="rule-line"></span>
        </div>
      </header>

      <nav class="home-menu">
        <button class="menu-btn menu-play interactive" data-nav="${needsTraining ? "training" : "play"}">
          <span class="menu-ico">${HOME_ICONS.playLg}</span>
          <span class="menu-label">${playLabel}</span>
        </button>
        <button class="menu-btn interactive" data-nav="hangar">
          <span class="menu-ico">${HOME_ICONS.wrench}</span>
          <span class="menu-label">HANGAR</span>
        </button>
        <button class="menu-btn interactive" data-nav="market">
          <span class="menu-ico">${HOME_ICONS.cube}</span>
          <span class="menu-label">MARKET</span>
        </button>
        <button class="menu-btn interactive" data-nav="factions">
          <span class="menu-ico">${HOME_ICONS.people}</span>
          <span class="menu-label">FACTIONS</span>
        </button>
        <button class="menu-btn menu-multiplayer interactive" data-nav="multiplayer">
          <span class="menu-ico">${HOME_ICONS.crew}</span>
          <span class="menu-label">CO-OP <span class="menu-soon">BETA</span></span>
        </button>
        <button class="menu-btn menu-race interactive" data-nav="race">
          <span class="menu-ico">${HOME_ICONS.race}</span>
          <span class="menu-label">RACE <span class="menu-soon menu-new">NEW</span></span>
        </button>
        <button class="menu-btn interactive" data-nav="settings">
          <span class="menu-ico">${HOME_ICONS.gear}</span>
          <span class="menu-label">SETTINGS</span>
        </button>
        <p class="home-online">CAPTAIN <span>${save.name || "VoxelHero"}</span> · ${f.name}${holderBadge}</p>
      </nav>

      ${renderTokenPanel(token)}

      <aside class="home-news interactive">
        <h2 class="news-heading">YOUR STATUS</h2>
        <ul class="news-items">
          ${news.map((n) => `<li><strong>${n.title}</strong><small>${n.time}</small></li>`).join("")}
        </ul>
        <button class="news-all interactive" id="btn-news-all">FIELD MANUAL</button>
      </aside>

      <footer class="home-social interactive">
        <button class="social-btn interactive" title="Discord (coming soon)" id="btn-social-discord">${HOME_ICONS.discord}</button>
        <a class="social-btn interactive" href="${X_URL}" target="_blank" rel="noopener noreferrer" title="Follow ${X_HANDLE} on X" id="btn-social-x">${HOME_ICONS.twitter}</a>
        <button class="social-btn interactive" id="btn-faq-footer" title="Field Manual">${HOME_ICONS.book}</button>
      </footer>
    </div>`;
}

export function nextDailyCountdown(): string {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const rem = Math.max(0, next.getTime() - now.getTime());
  const h = Math.floor(rem / 3_600_000);
  const m = Math.floor((rem % 3_600_000) / 60_000);
  const s = Math.floor((rem % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
