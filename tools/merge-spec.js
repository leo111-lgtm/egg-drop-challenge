#!/usr/bin/env node
// Merges the design panel's output (src/panel-output.json) with hand-authored page extras
// (src/spec.extras.json: geometry, labels, site, sim, checklists) into src/spec.json.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const panel = read('src/panel-output.json');
const extras = read('src/spec.extras.json');
const spec = Object.assign({}, panel.spec);

// Alternatives: every ranked concept except the winner, with the panel score and the reason it lost.
const winnerName = panel.ranking[0].name;
const byName = {};
(panel.alternatives || []).forEach((a) => { byName[a.name] = a; });
spec.alternatives = panel.ranking.filter((r) => r.name !== winnerName).map((r) => {
  const a = byName[r.name] || {};
  const lenses = Object.entries(r.per_lens || {}).sort((x, y) => x[1] - y[1]);
  const weakest = lenses.length ? lenses[0] : null;
  const whyNot = r.fatal && r.fatal.length ? r.fatal[0].replace(/^\[[^\]]+\]\s*/, '') : (weakest ? 'Scored lowest on the ' + weakest[0] + ' lens (' + weakest[1] + '/10).' : 'Lower aggregate score.');
  return {
    name: r.name, approach: r.approach, total_mass_g: a.total_mass_g, total_cost_usd: a.total_cost_usd,
    worst_case_peak_decel_g: a.worst_case_peak_decel_g, panel_score: r.total, why_not: whyNot,
  };
});
spec.panel = {
  winner_score: panel.ranking[0].total, per_lens: panel.ranking[0].per_lens,
  verification: panel.verification, repaired: panel.repaired, unresolved: panel.unresolved,
};

// Extras override nothing from the panel except where the panel left a field empty.
for (const k of Object.keys(extras)) {
  if (spec[k] == null || (Array.isArray(spec[k]) && spec[k].length === 0)) spec[k] = extras[k];
  else if (extras.__force && extras.__force.includes(k)) spec[k] = extras[k];
}
delete spec.__force;

// Every derived physics number comes from the page's own model (tools/physics.js), from the spec's inputs.
if (spec.geometry && spec.physics) require('./physics').recompute(spec);

// Consistency checks that would otherwise show up as wrong numbers on the sheets.
const warn = [];
const D = spec.dims_cm;
const vol = D.L * D.W * D.H;
if (Math.abs(vol - spec.volume_cm3) > 1) { warn.push('volume_cm3 ' + spec.volume_cm3 + ' != L*W*H ' + vol + ' (fixed)'); spec.volume_cm3 = vol; }
const massSum = spec.mass_budget_g.reduce((a, b) => a + b.grams, 0);
if (Math.abs(massSum - spec.total_mass_g) > 0.5) { warn.push('total_mass_g ' + spec.total_mass_g + ' != sum ' + massSum + ' (fixed)'); spec.total_mass_g = Math.round(massSum); }
const costSum = spec.materials.reduce((a, b) => a + (b.est_cost_usd || 0), 0);
if (Math.abs(costSum - spec.total_cost_usd) > 0.01) { warn.push('total_cost_usd ' + spec.total_cost_usd + ' != sum ' + costSum.toFixed(2) + ' (fixed)'); spec.total_cost_usd = Math.round(costSum * 100) / 100; }
if (Math.max(D.L, D.W, D.H) >= spec.limits.max_side_cm) warn.push('a side is not under the limit');
if (spec.total_mass_g > spec.limits.max_mass_g) warn.push('mass over the limit');
const ids = new Set(Object.keys(extras.geometry_part_ids || {}));
spec.build_steps.forEach((s) => (s.component_ids || []).forEach((id) => { if (ids.size && !ids.has(id)) warn.push('step ' + s.n + ' references unknown part id ' + id); }));

fs.writeFileSync(path.join(root, 'src/spec.json'), JSON.stringify(spec, null, 2));
console.log('spec.json written: ' + spec.name + ' | ' + D.L + 'x' + D.W + 'x' + D.H + ' cm | ' + spec.total_mass_g + ' g | $' + spec.total_cost_usd);
warn.forEach((w) => console.log('WARN ' + w));
