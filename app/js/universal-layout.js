document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");
  const baseMeta = document.querySelector('meta[name="app-base"]');
  const rawBase = baseMeta ? baseMeta.getAttribute("content") : "/";
  const base = rawBase && rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
  const link = (path) => `${base}${path}`.replace(/\/+/g, "/");

  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <div class="site-shell">
        <a class="site-brand" href="${link("")}">Divergify</a>
        <nav class="site-nav" aria-label="Primary">
          <a href="${link("")}">Home</a>
          <a href="${link("tasks")}">Tasks</a>
          <a href="${link("settings")}">Settings</a>
          <a href="${link("legal/privacy")}">Privacy</a>
        </nav>
      </div>
    `;
  }

  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="site-shell">
        <div class="footer-meta">Productivity support only. Not medical advice.</div>
        <div class="footer-links">
          <a href="${link("legal/privacy")}">Privacy</a>
        </div>
      </div>
    `;
  }
});
