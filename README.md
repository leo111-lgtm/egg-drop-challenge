# Egg Lander Build Sheet — Lantern Lander Mk2

School egg-drop challenge, 6 to 7 floors (designed for 25 m). Team: Léo Deromedi · Karina.

**Open the presentation:** https://leo111-lgtm.github.io/egg-drop-challenge/

**Download it to open offline:** https://leo111-lgtm.github.io/egg-drop-challenge/Egg-Lander-Build-Sheet.zip
(unzip, then double-click `Egg-Lander-Build-Sheet.html`; it needs no internet and no account).

Fifteen sheets: brief and rules, physics of the fall, the design in 3D, blueprint to sketch on paper,
measurements and volume, mass budget, materials and cost, build sequence, drop-day layout, drop
simulation, worst-case landings, test ladder and reset between drops, egg access and failure modes,
compliance and final checklist.

## Rebuild

`src/spec.final.json` is the design; `src/spec.extras.json` holds the geometry and page extras.

```
node tools/merge-spec.js   # recomputes every physics number into src/spec.json
node build.js              # emits index.html (offline) and dist/artifact.html
```
