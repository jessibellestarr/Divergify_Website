(() => {
  const PARTIALS = {
    header: "/partials/header.html",
    footer: "/partials/footer.html",
  };

  const CSS_HREF = "/css/universal-layout.css";

  const STORAGE_KEYS = {
    shades: "divergify_mode_shades",
    tinfoil: "divergify_mode_tinfoil",
  };

  const FUNNY_LINES = [
    "© 2025 Divergify. Stealing this activates the caffeinated gremlin response team.",
    "© 2025 Divergify. Original work. Unauthorized copying releases the gremlins. They do not sleep.",
    "© 2025 Divergify. This was built deliberately. Please do not make it weird by stealing it.",
  ];

  const SHADES_LINE = "© 2025 Divergify. Original work. Please respect it.";

  function ensureCss() {
    if (document.querySelector('link[data-universal-layout="1"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    link.setAttribute("data-universal-layout", "1");
    document.head.appendChild(link);
  }

  function getMode(key) {
    try {
      return localStorage.getItem(key) === "on";
    } catch {
      return false;
    }
  }

  function setMode(key, on) {
    try {
      localStorage.setItem(key, on ? "on" : "off");
    } catch {}
  }

  function applyBodyModes() {
    const shadesOn = getMode(STORAGE_KEYS.shades);
    const tinfoilOn = getMode(STORAGE_KEYS.tinfoil);

    document.body.classList.toggle("mode-shades", shadesOn);
    document.body.classList.toggle("mode-tinfoil", tinfoilOn);

    // Hook for analytics or embeds. Do not claim blocking. Just provide a switch.
    document.documentElement.dataset.divergifyTinfoil = tinfoilOn ? "on" : "off";
    document.documentElement.dataset.divergifyShades = shadesOn ? "on" : "off";
    try { window.__dgTinFoilHatOn = tinfoilOn; } catch {}
  }

  function ensurePlaceholder(id, position) {
    let el = document.getElementById(id);
    if (el) return el;

    el = document.createElement("div");
    el.id = id;

    if (position === "top") {
      document.body.insertAdjacentElement("afterbegin", el);
    } else {
      document.body.insertAdjacentElement("beforeend", el);
    }
    return el;
  }

  async function injectPartial(targetEl, url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    const html = await res.text();
    targetEl.innerHTML = html;
  }

  function normalizePath(pathname) {
    if (!pathname) return "/";
    if (pathname.endsWith("/index.html")) return pathname.replace(/index\.html$/, "");
    if (pathname.endsWith("index.html")) return "/";
    return pathname;
  }

  function setActiveNav() {
    const nav = document.querySelector(".site-nav");
    if (!nav) return;

    const current = normalizePath(window.location.pathname);
    const links = nav.querySelectorAll("a[href]");

    links.forEach((a) => {
      a.removeAttribute("aria-current");
      const href = a.getAttribute("href") || "";
      const abs = href.startsWith("http")
        ? href
        : normalizePath(new URL(href, window.location.origin).pathname);

      if (abs === current) {
        a.setAttribute("aria-current", "page");
      }
    });
  }

  function pickLegalLine() {
    const shadesOn = getMode(STORAGE_KEYS.shades);
    if (shadesOn) return SHADES_LINE;

    const i = Math.floor(Math.random() * FUNNY_LINES.length);
    return FUNNY_LINES[i];
  }

  function setFooterLine() {
    const el = document.getElementById("footer-legal-line");
    if (!el) return;
    el.textContent = pickLegalLine();
  }

  function syncSwitches() {
    const shadesOn = getMode(STORAGE_KEYS.shades);
    const tinfoilOn = getMode(STORAGE_KEYS.tinfoil);

    const shadesBtn = document.querySelector('[data-switch="shades"][role="switch"]');
    const tinfoilBtn = document.querySelector('[data-switch="tinfoil"][role="switch"]');

    if (shadesBtn) shadesBtn.setAttribute("aria-checked", shadesOn ? "true" : "false");
    if (tinfoilBtn) tinfoilBtn.setAttribute("aria-checked", tinfoilOn ? "true" : "false");
  }

  function toggleSwitch(which) {
    const key = which === "shades" ? STORAGE_KEYS.shades : STORAGE_KEYS.tinfoil;
    const next = !getMode(key);
    setMode(key, next);

    applyBodyModes();
    syncSwitches();
    setFooterLine();
  }

  function bindSwitches() {
    const switches = document.querySelectorAll('[role="switch"][data-switch]');
    switches.forEach((btn) => {
      const which = btn.getAttribute("data-switch");

      const handler = (e) => {
        if (e.type === "keydown") {
          const k = e.key;
          if (k !== "Enter" && k !== " ") return;
          e.preventDefault();
        }
        toggleSwitch(which);
      };

      btn.addEventListener("click", handler);
      btn.addEventListener("keydown", handler);
    });
  }

  function applyLinkOverridesFromExistingSite() {
    // Codex should replace these placeholders with real URLs.
    // This keeps the runtime safe if a placeholder slips through.
    const kofi = document.querySelector("[data-kofi-link]");
    if (kofi && (kofi.getAttribute("href") || "").trim() === "#") {
      kofi.setAttribute("href", "https://ko-fi.com/divergify");
    }

    const socialMap = {
      facebook: "https://www.facebook.com/",
      instagram: "https://www.instagram.com/divergify.app/",
    };

    Object.keys(socialMap).forEach((k) => {
      const a = document.querySelector(`[data-social="${k}"]`);
      if (a && (a.getAttribute("href") || "").trim() === "#") {
        a.setAttribute("href", socialMap[k]);
      }
    });
  }

  async function main() {
    ensureCss();

    // Apply modes as early as possible after parse.
    applyBodyModes();

    const headerMount = ensurePlaceholder("site-header", "top");
    const footerMount = ensurePlaceholder("site-footer", "bottom");

    await Promise.all([
      injectPartial(headerMount, PARTIALS.header),
      injectPartial(footerMount, PARTIALS.footer),
    ]);

    applyLinkOverridesFromExistingSite();

    setActiveNav();
    syncSwitches();
    bindSwitches();
    setFooterLine();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      main().catch(() => {});
    });
  } else {
    main().catch(() => {});
  }
})();
