// Drop physics. v is positive downward. m dv/dt = m g - 1/2 rho Cd A v^2.
const Sim = {
  G: 9.81,
  RHO: 1.2,
  terminalVelocity(p) {
    const rho = p.rho || Sim.RHO, g = p.g || Sim.G;
    return Math.sqrt(2 * p.m * g / (rho * p.cd * p.area));
  },
  noDragSpeed(h, g) { return Math.sqrt(2 * (g || Sim.G) * h); },
  // Returns a sampled trajectory {t[], y[], v[], tImpact, vImpact, vt}. y is height above ground.
  trajectory(p) {
    const rho = p.rho || Sim.RHO, g = p.g || Sim.G, dt = p.dt || 0.0005;
    const k = 0.5 * rho * p.cd * p.area / p.m;
    let y = p.h0, v = 0, t = 0, n = 0;
    const T = [0], Y = [p.h0], V = [0];
    while (y > 0 && t < 60) {
      const a = g - k * v * v;
      v += a * dt;
      y -= v * dt;
      t += dt; n++;
      if (n % 20 === 0) { T.push(t); Y.push(Math.max(0, y)); V.push(v); }
    }
    // land exactly on the ground
    const over = -y; const tBack = over / v; t -= tBack; v -= (g - k * v * v) * tBack;
    T.push(t); Y.push(0); V.push(v);
    return { t: T, y: Y, v: V, tImpact: t, vImpact: v, vt: Sim.terminalVelocity({ m: p.m, cd: p.cd, area: p.area, rho: rho, g: g }) };
  },
  sample(tr, t) {
    const T = tr.t;
    if (t <= 0) return { y: tr.y[0], v: tr.v[0] };
    if (t >= tr.tImpact) return { y: 0, v: tr.vImpact };
    let lo = 0, hi = T.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= t) lo = mid; else hi = mid; }
    const f = (t - T[lo]) / Math.max(1e-9, T[hi] - T[lo]);
    return { y: tr.y[lo] + (tr.y[hi] - tr.y[lo]) * f, v: tr.v[lo] + (tr.v[hi] - tr.v[lo]) * f };
  },
  // Half-sine deceleration pulse that stops speed v over distance d. T = 2d/v, peak a = (pi/2) v^2/(2d).
  pulse(v, d, tau, shape) {
    const T = 2 * d / Math.max(1e-6, v);
    if (tau >= T) return { s: d, vel: 0, a: 0, T: T, done: true };
    if (shape === 'constant') { const a = v * v / (2 * d); return { s: v * tau - 0.5 * a * tau * tau, vel: v - a * tau, a: a, T: T, done: false }; }
    const w = Math.PI / T;
    return { s: v * (tau / 2 + Math.sin(w * tau) / (2 * w)), vel: v * (1 + Math.cos(w * tau)) / 2, a: (Math.PI * v / (2 * T)) * Math.sin(w * tau), T: T, done: false };
  },
  // Landing model: the body stops over the crumple depth; the egg, on its elastic suspension,
  // stops over crumple + suspension travel. Constant deceleration gives the average; an elastic
  // (half-sine) stop peaks at pi/2 times the average.
  landing(p) {
    const g = p.g || Sim.G, v = p.vImpact;
    const dBody = Math.max(0.001, p.crumple_m);
    const dEgg = dBody + Math.max(0, p.suspension_m);
    const aBody = v * v / (2 * dBody), aEgg = v * v / (2 * dEgg);
    return {
      dBody, dEgg,
      aBody, aEgg,
      gBody: aBody / g,
      gEggAvg: aEgg / g,
      gEggPeak: (p.shape === 'constant' ? 1 : Math.PI / 2) * aEgg / g,
      tBody: 2 * dBody / v,
      tEgg: 2 * dEgg / v,
    };
  },
};
