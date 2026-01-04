/* Divergify site runtime: universal header/footer, modes, easter eggs, and Divergipedia rendering */

const STORAGE_KEYS = {
  shades: "divergify_mode_reduced_interference",
  tinfoil: "divergify_tinfoil_hat_mode"
};

const EASTER_EGGS = [
  "Reality check: your brain is not broken. Your environment is.",
  "Tin Foil Hat Mode: because consent is not a vibe, it is a rule.",
  "If you felt called out by the word 'friction,' that is data.",
  "Divergipedia entry unlocked: 'Procrastination' is often threat detection in a trench coat.",
  "We do not do shame loops here. Take that to a different website.",
  "Calm UI, sharp intent. Yes, both can exist at the same time.",
  "If you are waiting for permission, you are outsourcing agency again.",
  "This footer rotates so your brain gets a tiny novelty hit. You are welcome."
];

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function setSwitch(el, on) {
  el.dataset.on = on ? "true" : "false";
  el.setAttribute("aria-checked", on ? "true" : "false");
}

function applyModesFromStorage() {
  const shadesOn = localStorage.getItem(STORAGE_KEYS.shades) === "true";
  const tinfoilOn = localStorage.getItem(STORAGE_KEYS.tinfoil) === "true";
  document.body.classList.toggle("mode-reduced", shadesOn);

  const shadesSwitch = qs("[data-switch='shades']");
  const tinfoilSwitch = qs("[data-switch='tinfoil']");
  if (shadesSwitch) setSwitch(shadesSwitch, shadesOn);
  if (tinfoilSwitch) setSwitch(tinfoilSwitch, tinfoilOn);
}

function bindSwitches() {
  qsa(".switch").forEach(sw => {
    sw.addEventListener("click", () => {
      const key = sw.dataset.switch;
      if (!key) return;

      const storageKey = key === "shades" ? STORAGE_KEYS.shades : STORAGE_KEYS.tinfoil;
      const current = localStorage.getItem(storageKey) === "true";
      const next = !current;
      localStorage.setItem(storageKey, next ? "true" : "false");
      applyModesFromStorage();
    });
  });
}

async function injectPartials() {
  const headerSlot = qs("[data-partial='header']");
  const footerSlot = qs("[data-partial='footer']");
  if (!headerSlot || !footerSlot) return;

  const [headerHtml, footerHtml] = await Promise.all([
    fetch("/partials/header.html").then(r => r.text()),
    fetch("/partials/footer.html").then(r => r.text())
  ]);

  headerSlot.innerHTML = headerHtml;
  footerSlot.innerHTML = footerHtml;

  setActiveNav();
  setFooterEasterEgg();
  applyModesFromStorage();
  bindSwitches();
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
  const line = EASTER_EGGS[Math.floor(Math.random() * EASTER_EGGS.length)];
  el.textContent = line;
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
      const next = q ? entries.filter(e => e.term.toLowerCase().includes(q) || e.def.toLowerCase().includes(q)) : entries;
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

      const tag = document.createElement("div");
      tag.className = "dp-tag";
      tag.textContent = item.tag || "Divergipedia";

      top.appendChild(h);
      top.appendChild(tag);

      const d = document.createElement("p");
      d.className = "text-muted";
      d.textContent = item.def;

      const ex = document.createElement("p");
      ex.textContent = `Example: ${item.example}`;

      card.appendChild(top);
      card.appendChild(d);
      card.appendChild(ex);

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
  await injectPartials();
  renderDivergipedia();
});
