# Divergify System Map

## Repos
- jessibellestarr/Divergify_Website
  - Local: /home/jessibelle/Projects/divergify-website
  - Purpose: Live deploy website (Netlify publishes this repo root).

- jessibellestarr/divergify-hub
  - Local: /home/jessibelle/Projects/divergify-hub
  - Purpose: Hub app source + assets.

- jessibellestarr/dopamine-depot-shopify
  - Local: /home/jessibelle/Projects/dopamine-depot-shopify
  - Purpose: Dopamine Depot Shopify theme and assets.

## Wiring
- The live site serves the app at `/app/`.
- `/app/` is built from the hub app and copied into this repo at `app/`.
