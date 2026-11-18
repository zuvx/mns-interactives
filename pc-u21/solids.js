/* ============================================================
   The Toy Box Workshop: 3D shapes drawn as inline SVG (Maths Unit 21)
   The same method as tools/unit-pipeline/u21_solids.py, which draws the deck
   and the printables, so a shape looks the same on the board, on paper and
   on the iPad. Each polyhedron is a list of corners and faces, turned to a
   view and projected flat. A face is in front when its outward normal points
   at the viewer; an edge is hidden (dashed) only when both of its faces are
   behind, which is exact for convex shapes, and every shape here is convex.
   The sphere, hemisphere and cylinder are drawn from ellipses.

   Pure geometry: no DOM, no network. Node can require it, which is how
   check-workshop.js counts every shape's faces, edges and vertices.
   ============================================================ */
(function (root) {
  'use strict';
  var PITCH = 22 * Math.PI / 180;

  function reg(n, r, rot) {
    var out = [];
    for (var k = 0; k < n; k++) {
      var a = rot + 2 * Math.PI * k / n;
      out.push([r * Math.sin(a), r * Math.cos(a)]);
    }
    return out;
  }
  function prism(n, h, r, rot) {
    var base = reg(n, r, rot), v = [], f = [[], []], k;
    base.forEach(function (p) { v.push([p[0], 0, p[1]]); });
    base.forEach(function (p) { v.push([p[0], h, p[1]]); });
    for (k = n - 1; k >= 0; k--) f[0].push(k);
    for (k = 0; k < n; k++) f[1].push(n + k);
    for (k = 0; k < n; k++) f.push([k, (k + 1) % n, n + (k + 1) % n, n + k]);
    return { v: v, f: f };
  }
  function box(w, h, d) {
    var v = [[-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, 0, d / 2], [-w / 2, 0, d / 2]];
    v = v.concat(v.map(function (p) { return [p[0], h, p[2]]; }));
    return { v: v, f: [[3, 2, 1, 0], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]] };
  }
  function pyramid(n, h, r, rot) {
    var base = reg(n, r, rot), v = base.map(function (p) { return [p[0], 0, p[1]]; }), f = [[]], k;
    v.push([0, h, 0]);
    for (k = n - 1; k >= 0; k--) f[0].push(k);
    for (k = 0; k < n; k++) f.push([k, (k + 1) % n, n]);
    return { v: v, f: f };
  }
  /** Lay a prism on its side (a tent): its length runs left to right. */
  function lie(s) {
    var ys = s.v.map(function (p) { return p[1]; });
    var mid = (Math.max.apply(null, ys) + Math.min.apply(null, ys)) / 2;
    return { v: s.v.map(function (p) { return [p[1] - mid, p[2], p[0]]; }), f: s.f };
  }
  function lift(s) {
    var low = Math.min.apply(null, s.v.map(function (p) { return p[1]; }));
    return { v: s.v.map(function (p) { return [p[0], p[1] - low, p[2]]; }), f: s.f };
  }
  function octahedron() {
    var sq = reg(4, 1, Math.PI / 4), v = sq.map(function (p) { return [p[0], 1.3, p[1]]; }), f = [], k;
    v.push([0, 2.6, 0], [0, 0, 0]);
    for (k = 0; k < 4; k++) f.push([k, (k + 1) % 4, 4], [(k + 1) % 4, k, 5]);
    return { v: v, f: f };
  }

  function view(p, yaw) {
    var x = p[0] * Math.cos(yaw) + p[2] * Math.sin(yaw), z = -p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw);
    var y = p[1] * Math.cos(PITCH) - z * Math.sin(PITCH);
    return [x, y, p[1] * Math.sin(PITCH) + z * Math.cos(PITCH)];
  }
  function outward(v, face) {
    var a = v[face[0]], b = v[face[1]], c = v[face[2]];
    var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    var n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    var m = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]) || 1;
    n = [n[0] / m, n[1] / m, n[2] / m];
    var ctr = [0, 1, 2].map(function (k) { return v.reduce(function (s, p) { return s + p[k]; }, 0) / v.length; });
    var fc = [0, 1, 2].map(function (k) { return face.reduce(function (s, i) { return s + v[i][k]; }, 0) / face.length; });
    if (n[0] * (fc[0] - ctr[0]) + n[1] * (fc[1] - ctr[1]) + n[2] * (fc[2] - ctr[2]) < 0) n = [-n[0], -n[1], -n[2]];
    return n;
  }
  /** Turn the base so no face is seen edge-on from this view: a sliver of a face reads as a mistake. */
  function auto(make, n) {
    return function (yaw) {
      var best = null, bestScore = -1;
      for (var d = 0; d < 360 / n; d++) {
        var s = make(d * Math.PI / 180), tv = s.v.map(function (p) { return view(p, yaw); });
        var worst = Math.min.apply(null, s.f.map(function (face) { return Math.abs(outward(tv, face)[2]); }));
        if (worst > bestScore) { bestScore = worst; best = s; }
      }
      return best;
    };
  }
  var fixed = function (s) { return function () { return s; }; };
  var SOLIDS = {
    cube: fixed(box(1.6, 1.6, 1.6)), cuboid: fixed(box(2.6, 1.3, 1.3)),
    tallcuboid: fixed(box(1.2, 2.4, 1.2)), flatcuboid: fixed(box(2.4, 0.7, 1.7)),
    triprism: auto(function (r) { return lift(lie(prism(3, 2.6, 0.95, r))); }, 3),
    triprism_up: auto(function (r) { return prism(3, 2.0, 1.0, r); }, 3),
    pentprism: auto(function (r) { return prism(5, 1.4, 1.0, r); }, 5),
    hexprism: auto(function (r) { return prism(6, 1.5, 1.0, r); }, 6),
    hexprism_lying: auto(function (r) { return lift(lie(prism(6, 2.4, 0.9, r))); }, 6),
    octprism: auto(function (r) { return prism(8, 1.2, 1.0, r); }, 8),
    tetrahedron: auto(function (r) { return pyramid(3, 1.5, 1.05, r); }, 3),
    sqpyramid: fixed(pyramid(4, 1.6, 1.15, Math.PI / 4)),
    pentpyramid: auto(function (r) { return pyramid(5, 1.6, 1.05, r); }, 5),
    hexpyramid: auto(function (r) { return pyramid(6, 1.6, 1.05, r); }, 6),
    octahedron: fixed(octahedron())
  };
  var CURVED = { sphere: [1, 0, 0], hemisphere: [2, 1, 0], cylinder: [3, 2, 0], cylinder_lying: [3, 2, 0] };
  var NAMES = {
    cube: 'cube', cuboid: 'cuboid', tallcuboid: 'cuboid', flatcuboid: 'cuboid',
    triprism: 'triangular prism', triprism_up: 'triangular prism', pentprism: 'pentagonal prism',
    hexprism: 'hexagonal prism', hexprism_lying: 'hexagonal prism', octprism: 'octagonal prism',
    tetrahedron: 'triangular-based pyramid', sqpyramid: 'square-based pyramid',
    pentpyramid: 'pentagonal-based pyramid', hexpyramid: 'hexagonal-based pyramid', octahedron: 'octahedron',
    sphere: 'sphere', hemisphere: 'hemisphere', cylinder: 'cylinder', cylinder_lying: 'cylinder'
  };
  function family(name) {
    if (CURVED[name]) return 'curved';
    return /pyramid|tetrahedron/.test(name) ? 'pyramid' : (name === 'octahedron' ? 'other' : 'prism');
  }

  /** [faces, edges, vertices], worked out from the shape itself (Collins' counts for the curved ones). */
  function counts(name) {
    if (CURVED[name]) return CURVED[name].slice();
    var s = SOLIDS[name](-32 * Math.PI / 180), edges = {};
    s.f.forEach(function (face) {
      face.forEach(function (a, i) {
        var b = face[(i + 1) % face.length];
        edges[Math.min(a, b) + '-' + Math.max(a, b)] = true;
      });
    });
    return [s.f.length, Object.keys(edges).length, s.v.length];
  }

  function ell(cx, cy, rx, ry, a0, a1, steps) {
    var out = [];
    for (var k = 0; k <= steps; k++) {
      var a = a0 + (a1 - a0) * k / steps;
      out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return out;
  }
  /** Flat drawing in view units: {faces: [[pts, light]], solid: [polyline], hidden: [polyline]}. */
  function flat(name, yaw) {
    var t = Math.sin(PITCH), PI = Math.PI;
    if (name === 'sphere') {
      var o = ell(0, 0, 1.2, 1.2, 0, 2 * PI, 96);
      return { faces: [[o, 0.75]], solid: [o, ell(0, 0, 1.2, 1.2 * t, PI, 2 * PI, 48)], hidden: [ell(0, 0, 1.2, 1.2 * t, 0, PI, 48)] };
    }
    if (name === 'hemisphere') {
      var dome = ell(0, 0, 1.25, 1.25, PI, 2 * PI, 64), rim = ell(0, 0, 1.25, 1.25 * t, 0, 2 * PI, 96);
      return { faces: [[dome.concat(ell(0, 0, 1.25, 1.25 * t, PI, 2 * PI, 48).reverse()), 0.7], [rim, 0.95]], solid: [dome, rim], hidden: [] };
    }
    if (name === 'cylinder') {
      var r = 0.95, h = 2.0, ry = r * t;
      var body = ell(0, 0, r, ry, PI, 2 * PI, 48).concat(ell(0, h, r, ry, 0, PI, 48));
      var top = ell(0, h, r, ry, 0, 2 * PI, 96);
      return { faces: [[body, 0.7], [top, 0.95]],
        solid: [top, ell(0, 0, r, ry, PI, 2 * PI, 48), [[-r, 0], [-r, h]], [[r, 0], [r, h]]],
        hidden: [ell(0, 0, r, ry, 0, PI, 48)] };
    }
    if (name === 'cylinder_lying') {
      var R = 0.95, L = 2.0, rx = R * 0.45;
      var end = ell(L / 2, 0, rx, R, 0, 2 * PI, 96);
      var b = [[-L / 2, R], [L / 2, R]].concat(ell(L / 2, 0, rx, R, PI / 2, -PI / 2, 48), ell(-L / 2, 0, rx, R, -PI / 2, -3 * PI / 2, 48));
      return { faces: [[b, 0.7], [end, 0.95]],
        solid: [end, [[-L / 2, R], [L / 2, R]], [[-L / 2, -R], [L / 2, -R]], ell(-L / 2, 0, rx, R, PI / 2, 3 * PI / 2, 48)],
        hidden: [ell(-L / 2, 0, rx, R, -PI / 2, PI / 2, 48)] };
    }
    var s = SOLIDS[name](yaw), tv = s.v.map(function (p) { return view(p, yaw); });
    var front = {}, faces = [], byEdge = {};
    s.f.forEach(function (face, i) {
      var n = outward(tv, face);
      if (n[2] > 1e-9) {
        front[i] = true;
        faces.push([face.map(function (k) { return [tv[k][0], tv[k][1]]; }), Math.max(0, 0.35 * n[0] + 0.75 * n[1] + 0.55 * n[2])]);
      }
      face.forEach(function (a, j) {
        var c = face[(j + 1) % face.length], key = Math.min(a, c) + '-' + Math.max(a, c);
        (byEdge[key] = byEdge[key] || { a: a, b: c, f: [] }).f.push(i);
      });
    });
    var solid = [], hidden = [];
    Object.keys(byEdge).forEach(function (k) {
      var e = byEdge[k], seg = [[tv[e.a][0], tv[e.a][1]], [tv[e.b][0], tv[e.b][1]]];
      (e.f.some(function (i) { return front[i]; }) ? solid : hidden).push(seg);
    });
    return { faces: faces, solid: solid, hidden: hidden };
  }

  var HUE = { prism: 212, pyramid: 28, curved: 262, other: 160 };
  /** The SVG. opts: {yaw (degrees, default -32), plain: one colour for every family, label}. */
  function svg(name, opts) {
    opts = opts || {};
    var yaw = (opts.yaw === undefined ? -32 : opts.yaw) * Math.PI / 180;
    var d = flat(name, yaw), all = [];
    d.faces.forEach(function (f) { all = all.concat(f[0]); });
    d.solid.forEach(function (l) { all = all.concat(l); });
    var xs = all.map(function (p) { return p[0]; }), ys = all.map(function (p) { return p[1]; });
    var span = Math.max(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys));
    var k = 96 / span, mx = (Math.max.apply(null, xs) + Math.min.apply(null, xs)) / 2, my = (Math.max.apply(null, ys) + Math.min.apply(null, ys)) / 2;
    var P = function (pl) { return pl.map(function (p) { return ((p[0] - mx) * k).toFixed(1) + ',' + (-(p[1] - my) * k).toFixed(1); }).join(' '); };
    var hue = opts.plain ? 200 : HUE[family(name)];
    var out = '<svg class="solid" viewBox="-60 -60 120 120" role="img" aria-label="' + (opts.label || 'a 3D shape') + '">';
    d.faces.forEach(function (f) {
      out += '<polygon points="' + P(f[0]) + '" fill="hsl(' + hue + ',62%,' + Math.round(86 - 18 * Math.min(1, f[1])) + '%)"/>';
    });
    d.hidden.forEach(function (l) { out += '<polyline class="hid" points="' + P(l) + '"/>'; });
    d.solid.forEach(function (l) { out += '<polyline class="edge" points="' + P(l) + '"/>'; });
    return out + '</svg>';
  }

  var api = { svg: svg, counts: counts, names: NAMES, family: family, list: Object.keys(SOLIDS).concat(Object.keys(CURVED)),
    curved: function (n) { return !!CURVED[n]; }, flat: flat, view: view, outward: outward, SOLIDS: SOLIDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Solids = api;
})(this);
