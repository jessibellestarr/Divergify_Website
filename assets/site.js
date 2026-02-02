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
  ensureFieldNotesStyles();

  const content = qs(".field-notes-body");
  const main = qs("main");
  if (content) {
    content.classList.add("field-notes-article");
  } else {
    const article = main?.querySelector(".card");
    if (article) article.classList.add("field-notes-article");
  }

  const dateLine = main?.querySelector("time")?.closest("p") || null;
  if (dateLine) dateLine.classList.add("field-notes-date");

  injectFieldNotesShare(main);
}

function injectFieldNotesShare(main) {
  if (!main) return;
  if (main.querySelector("[data-share-bar]")) return;

  const title = main.querySelector("h1")?.textContent?.trim() || document.title;
  const url = location.href;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(title);

  const share = document.createElement("div");
  share.className = "share-bar";
  share.dataset.shareBar = "true";
  share.innerHTML = `
    <div class="share-label">Share</div>
    <div class="share-buttons">
      <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}" rel="noopener" target="_blank">Social</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" rel="noopener" target="_blank">Facebook</a>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" rel="noopener" target="_blank">LinkedIn</a>
      <a href="mailto:?subject=${encodedText}&body=${encodedUrl}">Email</a>
      <button type="button" data-copy-link>Copy link</button>
      <button type="button" data-copy-text>Copy text</button>
    </div>
  `;

  const insertAfter = main.querySelector("h1") || main.firstElementChild;
  if (insertAfter?.nextSibling) {
    insertAfter.parentNode.insertBefore(share, insertAfter.nextSibling);
  } else {
    main.appendChild(share);
  }

  const copyLink = share.querySelector("[data-copy-link]");
  const copyText = share.querySelector("[data-copy-text]");
  if (copyLink) {
    copyLink.addEventListener("click", () => copyToClipboard(url, copyLink));
  }
  if (copyText) {
    copyText.addEventListener("click", () => copyToClipboard(`${title} — ${url}`, copyText));
  }
}

function copyToClipboard(text, button) {
  const done = () => {
    if (!button) return;
    const prev = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = prev; }, 1400);
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const temp = document.createElement("textarea");
  temp.value = text;
  temp.setAttribute("readonly", "true");
  temp.style.position = "absolute";
  temp.style.left = "-9999px";
  document.body.appendChild(temp);
  temp.select();
  try { document.execCommand("copy"); } catch {}
  document.body.removeChild(temp);
  done();
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
  await injectPartials();
  initFieldNotesLayout();
  renderDivergipedia();
});
