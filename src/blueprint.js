// Engineering drawing of the Lantern Lander Mk2: top, front (door side), side, isometric, pod section and
// section A-A, to scale on a 1 cm grid. Reads the same SPEC.geometry as the 3D model.
const Blueprint = (function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = (n) => (Math.round(n * 10) / 10).toString();

  function render(S) {
    const G = S.geometry, D = S.dims_cm, L = buildLayout(G);
    const sc = 7.2;
    const cellW = 380, cellH = 330, W = cellW * 3, H = cellH * 2 + 26;
    let out = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Six-view engineering drawing of the device with dimensions">';
    for (let x = 0; x <= W; x += sc) out += '<line class="' + ((Math.round(x / sc) % 5) ? 'bp-grid' : 'bp-grid-major') + '" x1="' + x.toFixed(1) + '" y1="0" x2="' + x.toFixed(1) + '" y2="' + H + '"/>';
    for (let y = 0; y <= H; y += sc) out += '<line class="' + ((Math.round(y / sc) % 5) ? 'bp-grid' : 'bp-grid-major') + '" x1="0" y1="' + y.toFixed(1) + '" x2="' + W + '" y2="' + y.toFixed(1) + '"/>';
    out += '<line class="bp-line" x1="' + cellW + '" y1="0" x2="' + cellW + '" y2="' + (H - 26) + '" stroke-width="0.8"/>';
    out += '<line class="bp-line" x1="' + (cellW * 2) + '" y1="0" x2="' + (cellW * 2) + '" y2="' + (H - 26) + '" stroke-width="0.8"/>';
    out += '<line class="bp-line" x1="0" y1="' + cellH + '" x2="' + W + '" y2="' + cellH + '" stroke-width="0.8"/>';

    const dimH = (x1, x2, y, label, above) => '<line class="bp-dim" x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '"/>' +
      '<path class="bp-dim" d="M' + x1 + ',' + y + ' l6,-3 m-6,3 l6,3"/><path class="bp-dim" d="M' + x2 + ',' + y + ' l-6,-3 m6,3 l-6,3"/>' +
      '<text class="bp-dim-text" x="' + ((x1 + x2) / 2) + '" y="' + (above ? y - 5 : y + 13) + '" text-anchor="middle">' + esc(label) + '</text>';
    const dimV = (x, y1, y2, label, left) => '<line class="bp-dim" x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '"/>' +
      '<path class="bp-dim" d="M' + x + ',' + y1 + ' l-3,6 m3,-6 l3,6"/><path class="bp-dim" d="M' + x + ',' + y2 + ' l-3,-6 m3,6 l3,-6"/>' +
      '<text class="bp-dim-text" transform="translate(' + (left ? x - 5 : x + 12) + ',' + ((y1 + y2) / 2) + ') rotate(-90)" text-anchor="middle">' + esc(label) + '</text>';
    const ext = (x1, y1, x2, y2) => '<line class="bp-dim" stroke-dasharray="2 2" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
    const title = (x, y, t, sub) => '<text class="bp-title" x="' + x + '" y="' + y + '">' + esc(t) + '</text><text class="bp-sub" x="' + x + '" y="' + (y + 14) + '">' + esc(sub) + '</text>';
    const label = (x, y, t, anchor) => '<text class="bp-label" x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'start') + '">' + esc(t) + '</text>';

    const C = G.canopy, SL = G.sleeve, CB = G.cups_bottom, CT = G.cups_top, CS = G.cups_side, PD = G.pads, PO = G.pod, E = G.egg, SO = G.socket;
    const half = SL.w / 2, corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    // cup seen from the side: base at (bx, by), mouth at distance h along the axis
    const cupSide = (X, Y, cx, cy, dirx, diry, c, cls) => {
      const px = -diry, py = dirx; // perpendicular
      const b1 = [cx + px * c.r_base, cy + py * c.r_base], b2 = [cx - px * c.r_base, cy - py * c.r_base];
      const mx = cx + dirx * c.h, my = cy + diry * c.h;
      const m1 = [mx - px * c.r_mouth, my - py * c.r_mouth], m2 = [mx + px * c.r_mouth, my + py * c.r_mouth];
      return '<polygon class="' + cls + '" points="' + [b1, m2, m1, b2].map((p) => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ') + '"/>';
    };

    // ---------- TOP VIEW ----------
    {
      const ox = cellW / 2 - 10, oy = cellH / 2 + 10;
      const X = (x) => ox + x * sc, Y = (z) => oy + z * sc;
      out += title(14, 24, 'Top view', 'LOOKING DOWN ON THE CANOPY · BUMPER CUPS ON TOP');
      out += '<rect class="bp-fill" x="' + X(-C.w / 2) + '" y="' + Y(-C.d / 2) + '" width="' + (C.w * sc) + '" height="' + (C.d * sc) + '"/>';
      out += '<circle class="bp-fill" cx="' + X(0) + '" cy="' + Y(0) + '" r="' + (C.vent_r * sc) + '"/>';
      out += '<rect class="bp-hidden" x="' + X(-half) + '" y="' + Y(-half) + '" width="' + (SL.w * sc) + '" height="' + (SL.d * sc) + '"/>';
      // side cups under the canopy, dashed
      [-CS.dx, CS.dx].forEach((x) => {
        out += '<rect class="bp-hidden" x="' + X(x - CS.r_mouth) + '" y="' + Y(half) + '" width="' + (2 * CS.r_mouth * sc) + '" height="' + (CS.h * sc) + '"/>';
        out += '<rect class="bp-hidden" x="' + X(x - CS.r_mouth) + '" y="' + Y(-half - CS.h) + '" width="' + (2 * CS.r_mouth * sc) + '" height="' + (CS.h * sc) + '"/>';
        out += '<rect class="bp-hidden" x="' + X(half) + '" y="' + Y(x - CS.r_mouth) + '" width="' + (CS.h * sc) + '" height="' + (2 * CS.r_mouth * sc) + '"/>';
        out += '<rect class="bp-hidden" x="' + X(-half - CS.h) + '" y="' + Y(x - CS.r_mouth) + '" width="' + (CS.h * sc) + '" height="' + (2 * CS.r_mouth * sc) + '"/>';
      });
      corners.forEach(([sx, sz]) => {
        out += '<circle class="bp-soft" cx="' + X(sx * (C.w / 2 - CT.inset)) + '" cy="' + Y(sz * (C.d / 2 - CT.inset)) + '" r="' + (CT.r_mouth * sc) + '"/>';
        out += '<circle class="bp-hidden" cx="' + X(sx * (half - CB.inset)) + '" cy="' + Y(sz * (half - CB.inset)) + '" r="' + (CB.r_mouth * sc) + '"/>';
      });
      out += '<circle class="bp-hidden" cx="' + X(0) + '" cy="' + Y(0) + '" r="' + (PO.w / 2 * sc) + '"/>';
      out += '<line class="bp-center" x1="' + X(-C.w / 2 - 2) + '" y1="' + Y(0) + '" x2="' + X(C.w / 2 + 2) + '" y2="' + Y(0) + '"/><line class="bp-center" x1="' + X(0) + '" y1="' + Y(-C.d / 2 - 2) + '" x2="' + X(0) + '" y2="' + Y(C.d / 2 + 2) + '"/>';
      out += ext(X(-C.w / 2), Y(-C.d / 2), X(-C.w / 2), Y(-C.d / 2) - 22) + ext(X(C.w / 2), Y(-C.d / 2), X(C.w / 2), Y(-C.d / 2) - 22);
      out += dimH(X(-C.w / 2), X(C.w / 2), Y(-C.d / 2) - 16, 'L = ' + C.w + ' cm', true);
      out += ext(X(C.w / 2), Y(-C.d / 2), X(C.w / 2) + 28, Y(-C.d / 2)) + ext(X(C.w / 2), Y(C.d / 2), X(C.w / 2) + 28, Y(C.d / 2));
      out += dimV(X(C.w / 2) + 22, Y(-C.d / 2), Y(C.d / 2), 'W = ' + C.d + ' cm');
      out += ext(X(-half), Y(half), X(-half), Y(C.d / 2) + 20) + ext(X(half), Y(half), X(half), Y(C.d / 2) + 20);
      out += dimH(X(-half), X(half), Y(C.d / 2) + 16, 'sleeve ' + SL.w + ' cm', false);
      out += label(cellW / 2, cellH - 24, 'vent Ø ' + (C.vent_r * 2) + ' cm · solid circles = bumper cups', 'middle');
      out += label(cellW / 2, cellH - 10, 'dashed = sleeve, cups and pod underneath', 'middle');
    }

    // ---------- FRONT / SIDE VIEWS ----------
    const elevation = (ox, oy, showDoor, name, sub) => {
      const X = (x) => ox + x * sc, Y = (y) => oy - y * sc;
      let s = title(14, 24, name, sub);
      // bottom cups: mouth down, wide at the ground
      [-1, 1].forEach((sx) => s += cupSide(X, Y, sx * (half - CB.inset), L.floorBottom, 0, -1, CB, 'bp-soft'));
      // cups on the left/right walls seen edge-on
      [-1, 1].forEach((sx) => CS.rows.forEach((row) => s += cupSide(X, Y, sx * half, L.floorBottom + row, sx, 0, CS, 'bp-soft')));
      // sleeve wall
      s += '<rect class="bp-fill" x="' + X(-half) + '" y="' + Y(L.sleeveTop) + '" width="' + (SL.w * sc) + '" height="' + (SL.h * sc) + '"/>';
      // cups on this wall, facing the viewer: outer mouth circle and inner base circle
      [-CS.dx, CS.dx].forEach((x) => CS.rows.forEach((row) => {
        s += '<circle class="bp-soft" cx="' + X(x) + '" cy="' + Y(L.floorBottom + row) + '" r="' + (CS.r_mouth * sc) + '"/>';
        s += '<circle class="bp-line" cx="' + X(x) + '" cy="' + Y(L.floorBottom + row) + '" r="' + (CS.r_base * sc) + '" fill="none"/>';
      }));
      // toggle at the top centre of the wall
      s += '<rect class="bp-fill" x="' + X(-G.anchors.toggle_len / 2) + '" y="' + (Y(L.anchorY) - 2) + '" width="' + (G.anchors.toggle_len * sc) + '" height="4"/>';
      if (showDoor) {
        const dy0 = L.floorBottom + SL.door.bottom_offset;
        s += '<rect class="bp-fill" x="' + X(-SL.door.w / 2) + '" y="' + Y(dy0 + SL.door.h) + '" width="' + (SL.door.w * sc) + '" height="' + (SL.door.h * sc) + '" fill="var(--bg)"/>';
        s += '<rect class="bp-fill" x="' + X(-PO.w / 2) + '" y="' + Y(L.podTop) + '" width="' + (PO.w * sc) + '" height="' + (PO.h * sc) + '" rx="8"/>';
        s += '<ellipse class="bp-egg" cx="' + X(0) + '" cy="' + Y(L.podCenterY) + '" rx="' + (E.dia / 2 * sc) + '" ry="' + (E.len / 2 * sc) + '"/>';
        s += '<line class="bp-elastic" x1="' + X(-SL.door.w / 2) + '" y1="' + Y(dy0 - 0.4) + '" x2="' + X(SL.door.w / 2) + '" y2="' + Y(dy0 - 0.4) + '"/>';
        s += label(X(0), Y(dy0 + SL.door.h) - 5, 'door ' + SL.door.w + ' × ' + SL.door.h + ' cm, hinge at the top', 'middle');
      }
      // canopy + top cups
      s += '<rect class="bp-fill" x="' + X(-C.w / 2) + '" y="' + Y(L.canopyTop) + '" width="' + (C.w * sc) + '" height="' + (C.t * sc) + '"/>';
      [-1, 1].forEach((sx) => s += cupSide(X, Y, sx * (C.w / 2 - CT.inset), L.canopyTop, 0, 1, CT, 'bp-soft'));
      s += '<line class="bp-center" x1="' + X(0) + '" y1="' + (Y(L.total) - 8) + '" x2="' + X(0) + '" y2="' + (Y(0) + 8) + '"/>';
      s += '<line class="bp-line" x1="' + X(-C.w / 2 - 3) + '" y1="' + Y(0) + '" x2="' + X(C.w / 2 + 3) + '" y2="' + Y(0) + '" stroke-width="2.2"/>';
      // dims
      s += ext(X(C.w / 2), Y(L.total), X(C.w / 2) + 32, Y(L.total)) + ext(X(C.w / 2), Y(0), X(C.w / 2) + 32, Y(0));
      s += dimV(X(C.w / 2) + 26, Y(L.total), Y(0), 'H = ' + f1(L.total) + ' cm');
      s += ext(X(-C.w / 2), Y(L.canopyTop), X(-C.w / 2), Y(L.total) - 20) + ext(X(C.w / 2), Y(L.canopyTop), X(C.w / 2), Y(L.total) - 20);
      s += dimH(X(-C.w / 2), X(C.w / 2), Y(L.total) - 14, C.w + ' cm', true);
      s += ext(X(-half - CS.h), Y(L.sleeveTop), X(-C.w / 2) - 30, Y(L.sleeveTop)) + ext(X(-half - CS.h), Y(L.floorBottom), X(-C.w / 2) - 30, Y(L.floorBottom));
      s += dimV(X(-C.w / 2) - 24, Y(L.sleeveTop), Y(L.floorBottom), 'sleeve ' + SL.h + ' cm', true);
      s += ext(X(-half + CB.inset - CB.r_mouth), Y(0), X(-C.w / 2) - 30, Y(0));
      s += dimV(X(-C.w / 2) - 24, Y(L.floorBottom), Y(0), 'cups ' + CB.h + ' cm', true);
      s += label(X(0), Y(0) + 20, '9 oz cups below · 3 oz cups on walls and canopy', 'middle');
      return s;
    };
    out += '<g transform="translate(' + cellW + ',0)">' + elevation(cellW / 2 - 8, cellH - 48, true, 'Front view', 'DOOR SIDE · POD AND EGG VISIBLE THROUGH THE DOOR') + '</g>';
    out += '<g transform="translate(' + (cellW * 2) + ',0)">' + elevation(cellW / 2 - 8, cellH - 48, false, 'Side view', 'SAME OUTLINE · CUPS OF THE FRONT AND BACK WALLS EDGE-ON') + '</g>';

    // ---------- ISOMETRIC ----------
    {
      const ox = cellW / 2 + 18, oy = cellH * 2 - 34;
      const k = sc * 0.78;
      const I = (x, y, z) => [ox + (x - z) * Math.cos(Math.PI / 6) * k, oy - y * k + (x + z) * Math.sin(Math.PI / 6) * k];
      const P = (pts, cls) => '<polygon class="' + cls + '" points="' + pts.map((p) => I(p[0], p[1], p[2]).map((v) => v.toFixed(1)).join(',')).join(' ') + '"/>';
      const cupIso = (cx, cy, cz, ax, ay, az, c, cls) => {
        const b = I(cx, cy, cz), m = I(cx + ax * c.h, cy + ay * c.h, cz + az * c.h);
        const rb = c.r_base * k * 1.05, rm = c.r_mouth * k * 1.05;
        return '<polygon class="' + cls + '" points="' + [[b[0] - rb, b[1]], [b[0] + rb, b[1]], [m[0] + rm, m[1]], [m[0] - rm, m[1]]].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ') + '"/>';
      };
      out += title(14, cellH + 24, 'Isometric', 'WHAT IT LOOKS LIKE READY TO DROP');
      corners.forEach(([sx, sz]) => out += cupIso(sx * (half - CB.inset), L.floorBottom, sz * (half - CB.inset), 0, -1, 0, CB, 'bp-soft'));
      // back-side cups first (behind), then faces, then front cups
      [-CS.dx, CS.dx].forEach((x) => CS.rows.forEach((row) => out += cupIso(-half, L.floorBottom + row, x, -1, 0, 0, CS, 'bp-soft')));
      out += P([[-half, L.floorBottom, half], [half, L.floorBottom, half], [half, L.sleeveTop, half], [-half, L.sleeveTop, half]], 'bp-fill');
      out += P([[half, L.floorBottom, half], [half, L.floorBottom, -half], [half, L.sleeveTop, -half], [half, L.sleeveTop, half]], 'bp-fill');
      const dy0 = L.floorBottom + SL.door.bottom_offset;
      out += P([[-SL.door.w / 2, dy0, half], [SL.door.w / 2, dy0, half], [SL.door.w / 2, dy0 + SL.door.h, half], [-SL.door.w / 2, dy0 + SL.door.h, half]], 'bp-soft');
      [-CS.dx, CS.dx].forEach((x) => CS.rows.forEach((row) => { out += cupIso(x, L.floorBottom + row, half, 0, 0, 1, CS, 'bp-soft'); out += cupIso(half, L.floorBottom + row, x, 1, 0, 0, CS, 'bp-soft'); }));
      out += P([[-C.w / 2, L.canopyTop, -C.d / 2], [C.w / 2, L.canopyTop, -C.d / 2], [C.w / 2, L.canopyTop, C.d / 2], [-C.w / 2, L.canopyTop, C.d / 2]], 'bp-fill');
      out += P([[-C.w / 2, L.canopyTop, C.d / 2], [C.w / 2, L.canopyTop, C.d / 2], [C.w / 2, L.canopyBottom, C.d / 2], [-C.w / 2, L.canopyBottom, C.d / 2]], 'bp-fill');
      out += P([[C.w / 2, L.canopyTop, -C.d / 2], [C.w / 2, L.canopyTop, C.d / 2], [C.w / 2, L.canopyBottom, C.d / 2], [C.w / 2, L.canopyBottom, -C.d / 2]], 'bp-fill');
      const v = I(0, L.canopyTop, 0);
      out += '<ellipse class="bp-fill" cx="' + v[0].toFixed(1) + '" cy="' + v[1].toFixed(1) + '" rx="' + (C.vent_r * k * 1.2).toFixed(1) + '" ry="' + (C.vent_r * k * 0.55).toFixed(1) + '"/>';
      corners.forEach(([sx, sz]) => out += cupIso(sx * (C.w / 2 - CT.inset), L.canopyTop, sz * (C.d / 2 - CT.inset), 0, 1, 0, CT, 'bp-soft'));
      out += label(cellW / 2, cellH * 2 - 10, D.L + ' × ' + D.W + ' × ' + D.H + ' cm envelope · every side under 30 cm', 'middle');
    }

    // ---------- POD DETAIL (section) ----------
    {
      const sc2 = sc * 2;
      const ox = cellW + 112, oy = cellH * 2 - 62;
      const X = (x) => ox + x * sc2, Y = (y) => oy - y * sc2;
      out += '<g>' + title(cellW + 14, cellH + 24, 'Pod detail · section', 'WHAT THE EGG SITS IN · SCALE ×2') + '</g>';
      const pw = PO.w, ph = PO.h, cellH2 = PO.cell_h, st = G.sponge_t;
      // socket ring under the pod
      out += '<rect class="bp-fill" x="' + X(-SO.r) + '" y="' + Y(-ph / 2 + SO.h) + '" width="' + (SO.t * sc2) + '" height="' + (SO.h * sc2) + '"/>';
      out += '<rect class="bp-fill" x="' + X(SO.r - SO.t) + '" y="' + Y(-ph / 2 + SO.h) + '" width="' + (SO.t * sc2) + '" height="' + (SO.h * sc2) + '"/>';
      out += '<rect class="bp-soft" x="' + X(-PD.floor / 4) + '" y="' + Y(-ph / 2) + '" width="' + (PD.floor / 2 * sc2) + '" height="' + (PD.t * 0.5 * sc2) + '"/>';
      out += '<path class="bp-fill" d="M' + X(-pw / 2) + ',' + Y(-ph / 2 + cellH2) + ' L' + X(-pw * 0.4) + ',' + Y(-ph / 2) + ' L' + X(pw * 0.4) + ',' + Y(-ph / 2) + ' L' + X(pw / 2) + ',' + Y(-ph / 2 + cellH2) + '" fill="none"/>';
      out += '<path class="bp-fill" d="M' + X(-pw / 2) + ',' + Y(-ph / 2 + cellH2) + ' Q' + X(-pw / 2) + ',' + Y(ph / 2) + ' ' + X(0) + ',' + Y(ph / 2) + ' Q' + X(pw / 2) + ',' + Y(ph / 2) + ' ' + X(pw / 2) + ',' + Y(-ph / 2 + cellH2) + '" fill="none"/>';
      out += '<rect x="' + X(-pw * 0.4) + '" y="' + Y(-ph / 2 + st) + '" width="' + (pw * 0.8 * sc2) + '" height="' + (st * sc2) + '" fill="var(--accent-soft)" stroke="var(--ink)" stroke-width="1.2"/>';
      out += '<rect x="' + X(-pw * 0.3) + '" y="' + Y(ph / 2 - 0.4) + '" width="' + (pw * 0.6 * sc2) + '" height="' + (st * sc2) + '" fill="var(--accent-soft)" stroke="var(--ink)" stroke-width="1.2"/>';
      out += '<ellipse class="bp-egg" cx="' + X(0) + '" cy="' + Y(-ph / 2 + st + E.len / 2) + '" rx="' + (E.dia / 2 * sc2) + '" ry="' + (E.len / 2 * sc2) + '"/>';
      // retaining band over the lid
      out += '<path class="bp-elastic" d="M' + X(-pw / 2 - 2.2) + ',' + Y(ph / 2 + 1.6) + ' Q' + X(0) + ',' + Y(ph / 2 + 0.2) + ' ' + X(pw / 2 + 2.2) + ',' + Y(ph / 2 + 1.6) + '"/>';
      out += label(X(pw / 2 + 1.4), Y(-ph / 2 + st / 2) + 4, 'sponge disc, pocket traced from the egg, N at the narrow end');
      out += label(X(pw / 2 + 1.4), Y(0) + 4, 'egg, wide end DOWN');
      out += label(X(pw / 2 + 1.4), Y(ph / 2 - 0.2) + 4, 'sponge disc in the lid');
      out += label(X(pw / 2 + 1.4), Y(-ph / 2 + cellH2 / 2) + 4, 'egg-carton cell, lid hinge kept');
      out += label(X(pw / 2 + 1.4), Y(ph / 2 + 1.6) + 4, 'orange = retaining band over the lid');
      out += label(X(pw / 2 + 1.4), Y(-ph / 2 + 0.3) + 4, 'socket ring Ø ' + (SO.r * 2) + ' cm on the floor pad');
      out += ext(X(-pw / 2), Y(-ph / 2), X(-pw / 2) - 26, Y(-ph / 2)) + ext(X(-pw / 2), Y(ph / 2), X(-pw / 2) - 26, Y(ph / 2));
      out += dimV(X(-pw / 2) - 20, Y(ph / 2), Y(-ph / 2), 'pod ' + ph + ' cm', true);
      out += ext(X(-pw / 2), Y(-ph / 2), X(-pw / 2), Y(-ph / 2) + 22) + ext(X(pw / 2), Y(-ph / 2), X(pw / 2), Y(-ph / 2) + 22);
      out += dimH(X(-pw / 2), X(pw / 2), Y(-ph / 2) + 16, pw + ' cm', false);
    }

    // ---------- SECTION A-A ----------
    {
      const ox = cellW * 2 + cellW / 2 - 10, oy = cellH * 2 - 44;
      const X = (x) => ox + x * sc, Y = (y) => oy - y * sc;
      out += '<g>' + title(cellW * 2 + 14, cellH + 24, 'Section A-A', 'CUT THROUGH THE MIDDLE · PADS, SOCKET, POD, BANDS') + '</g>';
      out += '<rect class="bp-fill" x="' + X(-half) + '" y="' + Y(L.sleeveTop) + '" width="' + (SL.t * sc) + '" height="' + (SL.h * sc) + '"/>';
      out += '<rect class="bp-fill" x="' + X(half - SL.t) + '" y="' + Y(L.sleeveTop) + '" width="' + (SL.t * sc) + '" height="' + (SL.h * sc) + '"/>';
      out += '<rect class="bp-fill" x="' + X(-half) + '" y="' + Y(L.floorTop) + '" width="' + (SL.w * sc) + '" height="' + (SL.t * sc) + '"/>';
      out += '<rect class="bp-fill" x="' + X(-C.w / 2) + '" y="' + Y(L.canopyTop) + '" width="' + (C.w * sc) + '" height="' + (C.t * sc) + '"/>';
      // pads: floor, ceiling, both walls
      out += '<rect class="bp-soft" x="' + X(-PD.floor / 2) + '" y="' + Y(L.padFloorTop) + '" width="' + (PD.floor * sc) + '" height="' + (PD.t * sc) + '"/>';
      out += '<rect class="bp-soft" x="' + X(-PD.floor / 2) + '" y="' + Y(L.sleeveTop) + '" width="' + (PD.floor * sc) + '" height="' + (PD.t * sc) + '"/>';
      const padY0 = L.floorBottom + SL.h / 2 - PD.wall_h / 2;
      out += '<rect class="bp-soft" x="' + X(-half + SL.t) + '" y="' + Y(padY0 + PD.wall_h) + '" width="' + (PD.t * sc) + '" height="' + (PD.wall_h * sc) + '"/>';
      out += '<rect class="bp-soft" x="' + X(half - SL.t - PD.t) + '" y="' + Y(padY0 + PD.wall_h) + '" width="' + (PD.t * sc) + '" height="' + (PD.wall_h * sc) + '"/>';
      // cups
      [-1, 1].forEach((sx) => out += cupSide(X, Y, sx * (half - CB.inset), L.floorBottom, 0, -1, CB, 'bp-soft'));
      [-1, 1].forEach((sx) => CS.rows.forEach((row) => out += cupSide(X, Y, sx * half, L.floorBottom + row, sx, 0, CS, 'bp-soft')));
      [-1, 1].forEach((sx) => out += cupSide(X, Y, sx * (C.w / 2 - CT.inset), L.canopyTop, 0, 1, CT, 'bp-soft'));
      // socket + pod + egg
      out += '<rect class="bp-fill" x="' + X(-SO.r) + '" y="' + Y(L.padFloorTop + SO.h) + '" width="' + (SO.t * sc) + '" height="' + (SO.h * sc) + '"/>';
      out += '<rect class="bp-fill" x="' + X(SO.r - SO.t) + '" y="' + Y(L.padFloorTop + SO.h) + '" width="' + (SO.t * sc) + '" height="' + (SO.h * sc) + '"/>';
      out += '<rect class="bp-fill" x="' + X(-PO.w / 2) + '" y="' + Y(L.podTop) + '" width="' + (PO.w * sc) + '" height="' + (PO.h * sc) + '" rx="8"/>';
      out += '<ellipse class="bp-egg" cx="' + X(0) + '" cy="' + Y(L.podCenterY) + '" rx="' + (E.dia / 2 * sc) + '" ry="' + (E.len / 2 * sc) + '"/>';
      // bands from the wall anchors over the lid
      [-1, 1].forEach((sx) => {
        out += '<line class="bp-elastic" x1="' + X(sx * (half - SL.t)) + '" y1="' + Y(L.anchorY) + '" x2="' + X(0) + '" y2="' + Y(L.podTop + 0.2) + '"/>';
        out += '<circle class="bp-line" cx="' + X(sx * (half - SL.t)) + '" cy="' + Y(L.anchorY) + '" r="2" fill="var(--ink)"/>';
      });
      // dims
      out += dimH(X(PO.w / 2), X(half - SL.t - PD.t), Y(L.podCenterY) + 2, f1(L.clearSide) + ' cm', true);
      out += dimV(X(-half - 2), Y(L.padFloorTop), Y(L.floorTop), 'pad ' + PD.t, true);
      out += ext(X(C.w / 2), Y(L.anchorY), X(C.w / 2) + 26, Y(L.anchorY)) + ext(X(C.w / 2), Y(L.floorTop), X(C.w / 2) + 26, Y(L.floorTop));
      out += dimV(X(C.w / 2) + 20, Y(L.anchorY), Y(L.floorTop), 'anchors ' + f1(L.anchorY - L.floorTop) + ' cm above the floor');
      out += label(X(-C.w / 2), Y(0) + 20, 'pads ' + PD.t + ' cm on all six inner faces · pod ' + f1(L.clearSide) + ' cm from each wall pad');
      out += label(X(-C.w / 2), Y(0) + 33, 'upright: cups crush ' + f1(CB.h * (1 - CB.crush_to)) + ' cm, then floor pad and sponge');
    }

    out += '<text class="bp-sub" x="' + (W - 10) + '" y="' + (H - 8) + '" text-anchor="end">SCALE: 1 GRID SQUARE = 1 cm (POD DETAIL ×2) · THIRD-ANGLE PROJECTION · ' + esc(S.name).toUpperCase() + '</text>';
    out += '</svg>';
    return out;
  }
  return { render };
})();
