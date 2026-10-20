// Recomputes every derived physics number of a spec from its inputs with the page's own Sim module,
// so sheet 03, the simulation, the worst-case sheet and the test ladder all agree.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadSim() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'sim.js'), 'utf8') + '\nthis.Sim = Sim;', ctx);
  return ctx.Sim;
}
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const r0 = (n) => Math.round(n);

function recompute(spec) {
  const Sim = loadSim();
  const P = spec.physics, G = spec.geometry, g = Sim.G;
  const peakFactor = (spec.sim && spec.sim.pulse_shape === 'constant') ? 1 : Math.PI / 2;
  const tr = Sim.trajectory({ h0: P.design_height_m, m: P.mass_kg, cd: P.cd, area: P.drag_area_m2 });
  let i90 = tr.v.findIndex((v) => v >= 0.9 * tr.vt); if (i90 < 0) i90 = tr.t.length - 1;

  // stopping path, upright: the stages listed in the spec; the first stage is the cup crush the 3D model animates
  const stages = P.stopping_stages || [];
  const dUp = stages.length ? stages.reduce((a, b) => a + b.cm, 0) / 100 : P.stopping_distance_m;
  P.stopping_distance_m = r2(dUp * 1000) / 1000;
  const crush = stages.length ? stages[0].cm / 100 : G.cups_bottom.h * (1 - G.cups_bottom.crush_to) / 100;
  spec.sim = Object.assign({ static_sag_cm: 0.5, pulse_shape: 'half-sine' }, spec.sim || {}, { crumple_m: r2(crush * 1000) / 1000, suspension_m: r2((dUp - crush) * 1000) / 1000 });
  const stageText = stages.map((st) => st.name + ' ' + r1(st.cm) + ' cm').join(' + ');
  const ld = Sim.landing({ vImpact: tr.vImpact, crumple_m: spec.sim.crumple_m, suspension_m: spec.sim.suspension_m, shape: spec.sim.pulse_shape });

  P.no_drag_impact_speed_ms = r1(Sim.noDragSpeed(P.design_height_m));
  P.terminal_velocity_ms = r2(tr.vt);
  P.expected_impact_speed_ms = r1(tr.vImpact);
  P.time_to_impact_s = r1(tr.tImpact);
  const aAvg = tr.vImpact * tr.vImpact / (2 * dUp);
  P.peak_decel_g = r0(peakFactor * aAvg / g);
  P.safety_factor = r2(P.egg_tolerance_assumption_g / P.peak_decel_g);
  P.explanation = [
    'Free fall with no air from ' + P.design_height_m + ' m: v = √(2 × 9.81 × ' + P.design_height_m + ') = ' + P.no_drag_impact_speed_ms + ' m/s (' + r0(P.no_drag_impact_speed_ms * 3.6) + ' km/h).',
    'Inputs: mass m = ' + P.mass_kg + ' kg with the egg, drag area A = ' + P.drag_area_m2 + ' m² (' + G.canopy.w + ' × ' + G.canopy.d + ' cm canopy minus the vent), drag coefficient Cd = ' + P.cd + ' (flat plate face-on), air density ρ = 1.2 kg/m³.',
    'Terminal velocity v_t = √(2 m g / (ρ Cd A)) = √(2 × ' + P.mass_kg + ' × 9.81 / (1.2 × ' + P.cd + ' × ' + P.drag_area_m2 + ')) = ' + P.terminal_velocity_ms + ' m/s.',
    'Integrating m dv/dt = m g − ½ ρ Cd A v²: 90 % of v_t after ' + r1(tr.t[i90]) + ' s (' + r1(P.design_height_m - tr.y[i90]) + ' m down); impact after ' + P.time_to_impact_s + ' s at ' + P.expected_impact_speed_ms + ' m/s. Every drop from the 3rd floor up lands at this speed.',
    'Stopping distance for the egg, upright landing: ' + stageText + ' = ' + r1(dUp * 100) + ' cm. The pod sits in its socket, so the egg slows down with the frame through the whole path.',
    'Average deceleration a = v² / (2 d) = ' + P.expected_impact_speed_ms + '² / (2 × ' + dUp + ') = ' + r0(aAvg) + ' m/s² = ' + r0(aAvg / g) + ' g.',
    'Crushing cups and a sponge give a rounded (half-sine) pulse rather than a flat one, so the peak is taken as π/2 × average = ' + P.peak_decel_g + ' g, lasting about ' + r0(ld.tEgg * 1000) + ' ms.',
    'Assumed tolerance ' + P.egg_tolerance_assumption_g + ' g for an egg held by a conforming cradle (an assumption, not a measurement): safety factor ' + P.safety_factor + '.',
  ];

  // worst case: tumbling speed from the spec's assumption, worst-face stopping distance
  const vW = P.worst_case_impact_speed_ms, dW = P.worst_case_stopping_distance_m;
  const aW = vW * vW / (2 * dW);
  P.worst_case_peak_decel_g = r0(peakFactor * aW / g);
  P.worst_case_safety_factor = r2(P.egg_tolerance_assumption_g / P.worst_case_peak_decel_g);
  P.worst_case_explanation = [
    'Assume it clips the wall and tumbles in the last 4 m. Sideways the canopy stops working, the drag area drops to roughly the sleeve face, and the speed climbs from ' + P.expected_impact_speed_ms + ' to about ' + vW + ' m/s (' + r0(vW * 3.6) + ' km/h). This is the design input for every off-axis landing.',
    'Worst orientation: ' + P.worst_case_orientation + '.',
    'Stopping distance on that face: ' + r1(dW * 100) + ' cm of cup crush, folding cardboard and pad (see sheet 12 for every face).',
    'Average deceleration a = ' + vW + '² / (2 × ' + dW + ') = ' + r0(aW) + ' m/s² = ' + r0(aW / g) + ' g; spring-like peak π/2 × average = ' + P.worst_case_peak_decel_g + ' g.',
    'Against the assumed ' + P.egg_tolerance_assumption_g + ' g tolerance: safety factor ' + P.worst_case_safety_factor + (P.worst_case_safety_factor < 1.25 ? ' (thin: this is why the release must be level, spin-free and at least 1 m clear of the wall, and why the test ladder matters).' : '.'),
  ];

  // each face: recompute the peak from its stopping distance; upright faces use the designed impact speed
  (spec.protection_by_face || []).forEach((f) => {
    // f.speed: 'designed' (canopy still face-on: upright or flipped) or 'tumbling' (side, edge, corner after a wall clip)
    const upright = /^bottom|upright/i.test(f.face);
    if (upright) f.stopping_distance_cm = r1(dUp * 100);
    const designed = f.speed ? f.speed === 'designed' : upright;
    const v = designed ? tr.vImpact : vW;
    const d = f.stopping_distance_cm / 100;
    const peak = peakFactor * v * v / (2 * d) / g;
    f.peak_g = r0(peak);
    f.impact_speed_ms = r1(v);
    const ratio = peak / P.egg_tolerance_assumption_g;
    const word = ratio < 0.8 ? 'survives' : ratio < 1.0 ? 'marginal' : 'fails';
    f.panel_note = f.panel_note || f.verdict;
    f.verdict = word + ' (' + f.peak_g + ' g of ' + P.egg_tolerance_assumption_g + ' g assumed)';
  });

  // test ladder impact speeds from the same trajectory model
  (spec.test_ladder || []).forEach((d) => {
    const t2 = Sim.trajectory({ h0: d.height_m, m: P.mass_kg, cd: P.cd, area: P.drag_area_m2 });
    d.expected_impact_speed_ms = r1(t2.vImpact);
    d.fall_time_s = r1(t2.tImpact);
  });
  return { tr, ld };
}
module.exports = { recompute };
