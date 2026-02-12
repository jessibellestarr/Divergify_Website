# Divergify Ship Filter

This gate is required for every product-surface change before commit.

## Pillars (all required)

1. Legal and regulatory  
2. Privacy + local-first promise  
3. Medical scope and claims boundary  
4. Behavioral science alignment  
5. Neurodivergence research alignment  
6. User benefit and harm check  
7. Brand voice and claim integrity  
8. Accessibility and inclusion  
9. Security and reliability  
10. Monetization and dark-pattern check

## Process

1. Copy `governance/ship-gates/000-template.json` to a new file in `governance/ship-gates/`.
2. Fill every filter with `pass`, `n_a`, or `blocked`.
3. Add evidence for every `pass`.
4. Set `ship_decision.ready=true` only when all blockers are cleared.
5. Stage product changes and the gate file together.
6. Run `python3 scripts/verify_ship_filter.py`.
7. Commit only if it passes.

## Hard blockers

- Any `blocked` status
- Missing legal/privacy evidence for user-data changes
- Missing medical + research review for health-related context
- `ship_decision.ready=false`

## Notes

- This filter enforces process, not legal advice.
- If scope changes into regulated healthcare, update legal controls before release.
