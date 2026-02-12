# DIVERGIFY Website Rebuild

This folder contains a fresh scaffold for the site rebuild. Work is on a dedicated branch so we can iterate safely and push to GitHub when ready.

## Branching
- Primary working branch: `rebuild/site-refresh`

## Structure
- `index.html` — minimal page with header and mode toggles
- `assets/css/styles.css` — theme variables and layout
- `assets/js/main.js` — toggle logic and persistence

## Push to GitHub
1) Add your remote (replace with your repo URL):
   `git remote add origin https://github.com/OWNER/REPO.git`
2) Push the working branch:
   `git push -u origin rebuild/site-refresh`

If you prefer a different branch name, let me know and I’ll rename it before pushing.

## Ship filter (required)

All product-surface changes must pass the ship filter before commit.

- Policy: `governance/SHIP_FILTER.md`
- Template: `governance/ship-gates/000-template.json`
- Validator: `python3 scripts/verify_ship_filter.py`
- Create a new gate file: `python3 scripts/new_ship_gate.py "Feature title"`
- Enable local hooks once per clone: `bash scripts/setup-git-hooks.sh`
