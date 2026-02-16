/* Divergify site runtime: universal header/footer, modes, easter eggs, and Divergipedia rendering */

const STORAGE_KEYS = {
  shades: "divergify_shades",
  tinfoil: "divergify_tinfoil",
  logic: "divergify_brain_mode"
};

const LEGACY_STORAGE_KEYS = {
  shades: ["divergify_interference", "divergify_mode_reduced_interference", "divergify_mode_shades"],
  tinfoil: ["divergify_tinfoil_hat_mode", "divergify_mode_tinfoil"],
  logic: []
};

const LOGIC_MODES = new Set(["sprint", "analytical"]);
const DEFAULT_LOGIC_MODE = "sprint";
const LOGIC_MODE_ALIASES = {
  creative: "sprint"
};

const COMPLIANCE_KEYS = {
  zeroTrackingBannerDismissed: "divergify_zero_tracking_banner_dismissed_v1"
};

const EASTER_EGGS = [
  "Your to-do list is ambitious. Your nervous system filed an appeal.",
  "Productivity tip: drink water before you emotionally unionize against your inbox.",
  "Shame is not a feature. We checked the roadmap twice.",
  "If your brain opened 14 tabs, congratulations, that is parallel processing.",
  "Reminder: existing while neurodivergent already counts as advanced operations.",
  "This app believes in tiny steps and dramatic comebacks.",
  "Doom scrolling is not research. Nice try though.",
  "Executive dysfunction is not laziness in a fake mustache.",
  "Tin Foil Hat Mode: for when your trust issues are fact-based.",
  "If you got distracted mid-task, welcome to the human speedrun."
];

let easterEggLastIndex = -1;
let easterEggRotationTimer = null;
let easterEggHandlersBound = false;

const INLINE_HEADER_PARTIAL = `
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header" role="banner">
  <div class="site-header-inner">
    <a class="brand" href="/" aria-label="Divergify home">
      <img class="brand-icon" src="/assets/brand/divergify-icon-braincompass.svg" alt="" aria-hidden="true" />
      <img class="wordmark wordmark-logo" src="/assets/wordmark.svg" alt="Divergify" />
    </a>
    <nav class="nav" aria-label="Primary">
      <a href="/">Divergify</a>
      <a href="/hub.html">The Hub</a>
      <a href="/guide.html">Guide</a>
      <a href="/field-notes/">Field Notes</a>
      <a href="/dopamine-depot.html">Dopamine Depot</a>
      <a href="/divergipedia.html">Divergipedia</a>
      <a href="/contact.html">Contact</a>
    </nav>
    <div class="header-right" aria-label="Modes">
      <div class="toggle">
        <span>Tin Foil Hat</span>
        <button class="switch" type="button" role="switch" aria-checked="false" data-switch="tinfoil" data-on="false"></button>
      </div>
      <div class="toggle">
        <span>Shades</span>
        <button class="switch" type="button" role="switch" aria-checked="false" data-switch="shades" data-on="false"></button>
      </div>
      <div class="toggle">
        <span data-brain-mode-label>Brain Mode: Sprint</span>
        <button class="switch" type="button" role="switch" aria-checked="false" data-switch="logic" data-on="false"></button>
      </div>
    </div>
  </div>
</header>
`;

const INLINE_FOOTER_PARTIAL = `
<footer class="site-footer" role="contentinfo">
  <div class="site-footer-inner">
    <div class="footer-row footer-social">
      <div class="footer-links footer-actions">
        <a href="https://www.facebook.com/profile.php?id=61579035562612" rel="noopener" target="_blank">Facebook</a>
        <a href="https://www.instagram.com/divergify.app/" rel="noopener" target="_blank">Instagram</a>
        <a href="https://www.tiktok.com/@divergify.app" rel="noopener" target="_blank">TikTok</a>
        <a href="mailto:chaoscontrol@divergify.app">Email</a>
      </div>
      <div class="footer-links footer-actions footer-tipjar">
        <a href="https://ko-fi.com/divergify" rel="noopener" target="_blank">Tip jar</a>
      </div>
    </div>
    <div class="footer-row footer-legal">
      <div class="footer-links footer-legal-links">
        <a href="/data-controls.html">Data Controls</a>
        <a href="/privacy.html">Privacy Policy</a>
        <a href="/terms.html">Terms of Service</a>
      </div>
    </div>
    <div class="easter-egg" data-easter-egg></div>
    <div class="footer-small">
      © <span id="year"></span> Divergify. All rights reserved. Divergify is a trademark of its owner. No medical or legal advice.
    </div>
  </div>
</footer>
`;

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function ensurePartialSlots() {
  if (!document.body) return;

  const existingSiteHeader = qs(".site-header, #site-header");
  const existingSiteFooter = qs(".site-footer, #site-footer");

  let headerSlot = qs("[data-partial='header']");
  let footerSlot = qs("[data-partial='footer']");

  if (!headerSlot && !existingSiteHeader) {
    headerSlot = document.createElement("div");
    headerSlot.setAttribute("data-partial", "header");
    document.body.insertAdjacentElement("afterbegin", headerSlot);
  }

  if (!footerSlot && !existingSiteFooter) {
    footerSlot = document.createElement("div");
    footerSlot.setAttribute("data-partial", "footer");
    const siteScript = qs("script[src='/assets/site.js']");
    if (siteScript?.parentNode) {
      siteScript.parentNode.insertBefore(footerSlot, siteScript);
    } else {
      document.body.appendChild(footerSlot);
    }
  }
}

function getPartialCandidates(partialName) {
  const path = location.pathname || "/";
  const directory = path.endsWith("/") ? path : path.replace(/[^/]*$/, "");
  const depth = directory.split("/").filter(Boolean).length;
  const relativeUp = depth > 0 ? "../".repeat(depth) : "";
  return [
    `/partials/${partialName}.html`,
    `${relativeUp}partials/${partialName}.html`,
    `partials/${partialName}.html`
  ];
}

async function loadPartialHtml(partialName) {
  const candidates = getPartialCandidates(partialName);
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { cache: "no-store" });
      if (!response.ok) continue;
      const html = await response.text();
      if (html && html.trim()) return html;
    } catch {}
  }
  return partialName === "header" ? INLINE_HEADER_PARTIAL : INLINE_FOOTER_PARTIAL;
}

function syncFooterYear() {
  qsa("#year").forEach(node => {
    node.textContent = String(new Date().getFullYear());
  });
}

function getRawModeValue(key) {
  const primary = readLocalStorage(key);
  if (primary !== null) return primary;

  const legacyKeys = LEGACY_STORAGE_KEYS[key] || [];
  for (const legacyKey of legacyKeys) {
    const legacyValue = readLocalStorage(legacyKey);
    if (legacyValue !== null) {
      return legacyValue;
    }
  }
  return null;
}

function parseBooleanMode(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "active" || normalized === "true" || normalized === "1" || normalized === "on";
}

function normalizeLogicMode(value) {
  const normalized = String(value || DEFAULT_LOGIC_MODE).trim().toLowerCase();
  const canonical = LOGIC_MODE_ALIASES[normalized] || normalized;
  return LOGIC_MODES.has(canonical) ? canonical : DEFAULT_LOGIC_MODE;
}

function formatBrainMode(mode) {
  return mode === "analytical" ? "Analytical" : "Sprint";
}

function getMode(key) {
  const rawValue = getRawModeValue(key);
  if (key === STORAGE_KEYS.logic) {
    return normalizeLogicMode(rawValue);
  }
  return parseBooleanMode(rawValue);
}

function setMode(key, value) {
  try {
    const normalizedValue =
      typeof value === "boolean"
        ? (value ? "active" : "inactive")
        : key === STORAGE_KEYS.logic
          ? normalizeLogicMode(value)
          : String(value);
    writeLocalStorage(key, normalizedValue);
    applyModesFromStorage();
  } catch (error) {
    console.error("Divergify: Storage locked.", error);
  }
}

function setSwitch(el, on) {
  el.dataset.on = on ? "true" : "false";
  el.setAttribute("aria-checked", on ? "true" : "false");
}

function applyModesFromStorage() {
  const root = document.documentElement;
  const body = document.body;
  if (!root || !body) return;

  const shadesOn = getMode(STORAGE_KEYS.shades);
  const tinfoilOn = getMode(STORAGE_KEYS.tinfoil);
  const brainMode = getMode(STORAGE_KEYS.logic);

  root.classList.toggle("reduced-interference", shadesOn);
  root.classList.toggle("tin-foil-mode", tinfoilOn);

  body.classList.toggle("mode-reduced", shadesOn);
  body.classList.toggle("mode-tinfoil", tinfoilOn);
  body.classList.remove("brain-sprint", "brain-creative", "brain-analytical");
  body.classList.add(`brain-${brainMode}`);

  root.dataset.brainMode = brainMode;

  const shadesSwitch = qs("[data-switch='shades']");
  const tinfoilSwitch = qs("[data-switch='tinfoil']");
  const logicSwitch = qs("[data-switch='logic']");
  if (shadesSwitch) setSwitch(shadesSwitch, shadesOn);
  if (tinfoilSwitch) setSwitch(tinfoilSwitch, tinfoilOn);
  if (logicSwitch) {
    const analyticalOn = brainMode === "analytical";
    setSwitch(logicSwitch, analyticalOn);
    logicSwitch.setAttribute("aria-label", `Brain mode: ${formatBrainMode(brainMode)}`);
  }
  qsa("[data-brain-mode-label]").forEach(el => {
    el.textContent = `Brain Mode: ${formatBrainMode(brainMode)}`;
  });

  const speech = qs("#TAKOTA-speech");
  if (speech) {
    const energyRaw = qs("#energy-slider")?.value;
    const energy = Number.parseInt(energyRaw ?? "50", 10);
    updateTakotaSpeech(Number.isFinite(energy) ? energy : 50, brainMode, speech);
  }
}

function updateTakotaSpeech(energy, mode, element) {
  const scripts = {
    sprint: {
      low: "Sprint energy is low. Keep it tiny and gentle.",
      mid: "Sprint mode stable. Start with one visible anchor task.",
      high: "Sprint surge detected. Channel that momentum into one useful outcome."
    },
    analytical: {
      low: "Energy reserves <30%. Priority: Sensory regulation. Suspend high-load tasks.",
      mid: "System optimal for sequential processing. Identifying next logical step...",
      high: "High arousal state. Best utilized for technical deep-dives or data structure."
    }
  };

  const selectedMode = normalizeLogicMode(mode);
  const level = energy < 30 ? "low" : (energy < 70 ? "mid" : "high");
  element.textContent = scripts[selectedMode][level];
}

function bindSwitches() {
  qsa(".switch").forEach(sw => {
    sw.addEventListener("click", () => {
      const switchType = sw.dataset.switch;
      if (!switchType) return;

      if (switchType === "logic") {
        const current = getMode(STORAGE_KEYS.logic);
        const next = current === "sprint" ? "analytical" : "sprint";
        setMode(STORAGE_KEYS.logic, next);
        return;
      }

      if (switchType === "shades") {
        setMode(STORAGE_KEYS.shades, !getMode(STORAGE_KEYS.shades));
        return;
      }

      if (switchType === "tinfoil") {
        setMode(STORAGE_KEYS.tinfoil, !getMode(STORAGE_KEYS.tinfoil));
      }
    });
  });
}

function bindTakotaEnergySync() {
  const slider = qs("#energy-slider");
  const speech = qs("#TAKOTA-speech");
  if (!slider || !speech) return;
  if (slider.dataset.brainSyncBound === "1") return;
  slider.dataset.brainSyncBound = "1";
  slider.addEventListener("input", () => {
    const energy = Number.parseInt(slider.value || "50", 10);
    updateTakotaSpeech(Number.isFinite(energy) ? energy : 50, getMode(STORAGE_KEYS.logic), speech);
  });
}

async function injectPartials() {
  const headerSlot = qs("[data-partial='header']");
  const footerSlot = qs("[data-partial='footer']");
  if (!headerSlot && !footerSlot) {
    if (qs(".site-header")) setActiveNav();
    if (qs(".site-footer")) setFooterEasterEgg();
    syncFooterYear();
    applyModesFromStorage();
    bindSwitches();
    bindTakotaEnergySync();
    return;
  }

  if (headerSlot) {
    headerSlot.innerHTML = await loadPartialHtml("header");
  }

  if (footerSlot) {
    footerSlot.innerHTML = await loadPartialHtml("footer");
  }

  if (headerSlot) setActiveNav();
  if (footerSlot) setFooterEasterEgg();
  syncFooterYear();
  applyModesFromStorage();
  bindSwitches();
  bindTakotaEnergySync();
}

function ensureLegalFooterFallback() {
  if (qs(".site-footer")) return;
  if (!document.body) return;

  const year = String(new Date().getFullYear());
  const footer = document.createElement("footer");
  footer.className = "site-footer site-footer-fallback";
  footer.setAttribute("role", "contentinfo");
  footer.innerHTML = `
    <div style="max-width:1120px;margin:0 auto;padding:24px 20px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <a href="/data-controls.html">Data Controls</a>
        <a href="/privacy.html">Privacy Policy</a>
        <a href="/terms.html">Terms of Service</a>
      </div>
      <div style="font-size:12px;opacity:.85;">
        © ${year} Divergify. No tracking cookies.
      </div>
    </div>
  `;
  document.body.appendChild(footer);
}

function readLocalStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function renderZeroTrackingBanner() {
  const path = (location.pathname || "").toLowerCase();
  const isHubSurface =
    path === "/hub" ||
    path === "/hub/" ||
    path === "/hub.html" ||
    path.startsWith("/hub/beta");
  if (isHubSurface) return;
  if (readLocalStorage(COMPLIANCE_KEYS.zeroTrackingBannerDismissed) === "1") return;
  if (qs("[data-zero-tracking-banner]")) return;
  if (!document.body) return;

  const banner = document.createElement("aside");
  banner.dataset.zeroTrackingBanner = "true";
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");
  banner.style.cssText = [
    "position:fixed",
    "left:16px",
    "right:16px",
    "bottom:16px",
    "z-index:2500",
    "background:#232147",
    "color:#f9eed2",
    "border:1px solid rgba(249,238,210,0.25)",
    "border-radius:12px",
    "box-shadow:0 10px 30px rgba(35,33,71,0.3)"
  ].join(";");

  banner.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px 14px;">
      <div style="font-size:14px;line-height:1.45;flex:1 1 420px;">
        <strong>Zero-Tracking:</strong> No ad tracking. Workspace data stays local unless you explicitly enable integrations.
      </div>
      <a href="/data-controls.html" style="color:#cda977;font-size:13px;white-space:nowrap;">Data controls</a>
      <button type="button" data-zero-tracking-dismiss style="border:1px solid rgba(249,238,210,0.25);background:#151426;color:#f9eed2;border-radius:999px;padding:6px 12px;cursor:pointer;">
        Got it
      </button>
    </div>
  `;

  document.body.appendChild(banner);

  const dismiss = banner.querySelector("[data-zero-tracking-dismiss]");
  dismiss?.addEventListener("click", () => {
    writeLocalStorage(COMPLIANCE_KEYS.zeroTrackingBannerDismissed, "1");
    banner.remove();
  });
}

function setActiveNav() {
  const path = (location.pathname || "/").toLowerCase();
  const links = qsa(".nav a");
  links.forEach(a => a.classList.remove("active"));

  // Home and /index.html are the same tab
  const candidates = links.filter(a => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href === "/" && (path === "/" || path.endsWith("/index.html"))) return true;
    return href && path.endsWith(href);
  });

  (candidates[0] || null)?.classList.add("active");
}

function setFooterEasterEgg() {
  const el = qs("[data-easter-egg]");
  if (!el) return;
  if (!EASTER_EGGS.length) return;

  let nextIndex = 0;
  if (EASTER_EGGS.length === 1) {
    nextIndex = 0;
  } else {
    do {
      nextIndex = Math.floor(Math.random() * EASTER_EGGS.length);
    } while (nextIndex === easterEggLastIndex);
  }

  easterEggLastIndex = nextIndex;
  el.textContent = EASTER_EGGS[nextIndex];

  if (easterEggRotationTimer === null) {
    easterEggRotationTimer = window.setInterval(() => {
      if (!document.hidden) setFooterEasterEgg();
    }, 12000);
  }

  if (!easterEggHandlersBound) {
    const rotate = () => setFooterEasterEgg();
    document.addEventListener("visibilitychange", rotate);
    window.addEventListener("focus", rotate);
    easterEggHandlersBound = true;
  }
}

function ensureFieldNotesStyles() {
  const head = document.head;
  if (!head) return;
  const existing = qs("link[href='/assets/field-notes.css']", head);
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/assets/field-notes.css";
  head.appendChild(link);
}

function initFieldNotesLayout() {
  const path = (location.pathname || "").toLowerCase();
  if (!path.includes("/field-notes")) return;

  document.body.dataset.fieldNotes = "true";
  const isFieldNotesIndex =
    path === "/field-notes" ||
    path === "/field-notes/" ||
    path === "/field-notes/index.html" ||
    path === "/field-notes.html";
  document.body.dataset.fieldNotesView = isFieldNotesIndex ? "index" : "article";
  ensureFieldNotesStyles();
  if (isFieldNotesIndex) return;

  const content = qs(".field-notes-body");
  const main = qs("main");
  const article = content || main?.querySelector("article") || main?.querySelector(".card");
  if (article) article.classList.add("field-notes-article");

  const dateLine = main?.querySelector("time")?.closest("p") || null;
  if (dateLine) dateLine.classList.add("field-notes-date");
}

/* Divergipedia rendering ---------------------------------------- */

function renderDivergipedia() {
  const mount = qs("[data-divergipedia-mount]");
  const indexMount = qs("[data-divergipedia-index]");
  if (!mount || !indexMount || !window.DIVERGIPEDIA) return;

  const entries = window.DIVERGIPEDIA.slice().sort((a,b) => a.term.localeCompare(b.term));
  let filtered = entries;

  function buildIndex(items) {
    indexMount.innerHTML = "";
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Search terms…";
    search.setAttribute("aria-label", "Search Divergipedia");
    indexMount.appendChild(search);

    const list = document.createElement("div");
    list.style.marginTop = "12px";
    indexMount.appendChild(list);

    function draw(listItems) {
      list.innerHTML = "";
      listItems.forEach(item => {
        const a = document.createElement("a");
        a.href = `#${item.slug}`;
        a.textContent = item.term;
        a.dataset.slug = item.slug;
        list.appendChild(a);
      });
    }

    draw(items);

    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      const next = q
        ? entries.filter(e =>
            e.term.toLowerCase().includes(q) ||
            e.definition.toLowerCase().includes(q) ||
            e.mechanism.toLowerCase().includes(q) ||
            e.usage.toLowerCase().includes(q) ||
            e.phonetic.toLowerCase().includes(q) ||
            e.pos.toLowerCase().includes(q)
          )
        : entries;
      filtered = next;
      draw(next);
      buildEntries(next);
    });
  }

  function buildEntries(items) {
    mount.innerHTML = "";
    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "dp-entry";
      card.id = item.slug;

      const top = document.createElement("div");
      top.className = "dp-term";

      const h = document.createElement("h2");
      h.textContent = item.term;

      top.appendChild(h);

      const meta = document.createElement("p");
      meta.className = "dp-meta";
      meta.textContent = `${item.pos} • /${item.phonetic}/`;

      const d = document.createElement("p");
      d.className = "dp-definition";
      d.textContent = item.definition;

      const mech = document.createElement("p");
      mech.className = "dp-mechanism";
      const mechLabel = document.createElement("strong");
      mechLabel.textContent = "Mechanism:";
      mech.appendChild(mechLabel);
      const mechText = item.mechanism.startsWith(" ") ? item.mechanism : ` ${item.mechanism}`;
      mech.appendChild(document.createTextNode(mechText));

      const usage = document.createElement("p");
      usage.className = "dp-usage";
      const usageLabel = document.createElement("strong");
      usageLabel.textContent = "Usage:";
      usage.appendChild(usageLabel);
      const usageGap = item.usage.startsWith(" ") ? "" : " ";
      usage.appendChild(document.createTextNode(usageGap));
      const usageText = document.createElement("em");
      usageText.textContent = item.usage;
      usage.appendChild(usageText);

      card.appendChild(top);
      card.appendChild(meta);
      card.appendChild(d);
      card.appendChild(mech);
      card.appendChild(usage);

      mount.appendChild(card);
    });
  }

  buildIndex(entries);
  buildEntries(entries);

  // Highlight active index link on scroll
  const observer = new IntersectionObserver((ents) => {
    ents.forEach(en => {
      if (!en.isIntersecting) return;
      const slug = en.target.id;
      qsa("[data-divergipedia-index] a").forEach(a => a.classList.toggle("active", a.dataset.slug === slug));
    });
  }, { rootMargin: "-40% 0px -55% 0px", threshold: 0.01 });

  qsa(".dp-entry", mount).forEach(el => observer.observe(el));
}

document.addEventListener("DOMContentLoaded", async () => {
  ensurePartialSlots();
  await injectPartials();
  ensureLegalFooterFallback();
  initFieldNotesLayout();
  renderDivergipedia();
  renderZeroTrackingBanner();
});
