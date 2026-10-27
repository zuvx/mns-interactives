/* ============================================================
   The Bakery — the cakes, cut into parts (Maths Unit 16)

   Every shape is a list of polygons in a 100 x 100 box, one per part.
   Circles are polygons too (many points), so a single shoelace formula
   measures every part. check-bakery.js loads this same file and proves
   that each cut sold as "equal parts" really is equal, and that each
   non-example really is not. The pages and the check can never disagree
   about what a shape looks like.

   Shape spec used in the lesson data:  "kind/shaded"  or  "kind/shaded/r90"
     circle8/3    a circle in 8 equal slices, 3 iced
     grid2-4/5    a rectangle in 2 rows of 4, 5 iced
     z4/3/r90     the Z of four squares, 3 iced, turned a quarter turn
   ============================================================ */
(function (root) {
  'use strict';

  /* Points along an arc, angles in degrees clockwise from the top. */
  function arc(r, a0, a1) {
    var pts = [], steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 3));
    for (var i = 0; i <= steps; i++) {
      var a = (a0 + (a1 - a0) * i / steps) * Math.PI / 180;
      pts.push([50 + r * Math.sin(a), 50 - r * Math.cos(a)]);
    }
    return pts;
  }

  function sectors(angles) {
    var parts = [], a = 0;
    angles.forEach(function (w) {
      parts.push([[50, 50]].concat(arc(46, a, a + w)));
      a += w;
    });
    return parts;
  }

  /* A rectangle cut into upright strips of the given relative widths. */
  function cols(x0, y0, w, h, widths) {
    var sum = widths.reduce(function (s, v) { return s + v; }, 0), x = x0, parts = [];
    widths.forEach(function (v) {
      var dw = w * v / sum;
      parts.push([[x, y0], [x + dw, y0], [x + dw, y0 + h], [x, y0 + h]]);
      x += dw;
    });
    return parts;
  }

  function grid(x0, y0, w, h, rows, columns) {
    var parts = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < columns; c++) {
        var x = x0 + w * c / columns, y = y0 + h * r / rows;
        parts.push([[x, y], [x + w / columns, y], [x + w / columns, y + h / rows], [x, y + h / rows]]);
      }
    }
    return parts;
  }

  function ones(n) { var a = []; for (var i = 0; i < n; i++) a.push(1); return a; }

  /* Centre to each edge of a regular polygon: n equal triangles. */
  function fan(n, r) {
    var corners = [];
    for (var i = 0; i < n; i++) {
      var a = (360 * i / n) * Math.PI / 180;
      corners.push([50 + r * Math.sin(a), 52 - r * Math.cos(a)]);
    }
    return corners.map(function (p, i) { return [[50, 52], p, corners[(i + 1) % n]]; });
  }

  /* Triangles: 4 from the midpoints, 3 from the centre, 2 down the middle. */
  var A = [50, 8], B = [94, 88], C = [6, 88], G = [50, 61.333];
  var TRI = {
    4: [[A, [72, 48], [28, 48]], [[72, 48], B, [50, 88]], [[28, 48], [50, 88], C], [[72, 48], [50, 88], [28, 48]]],
    3: [[A, B, G], [B, C, G], [C, A, G]],
    2: [[A, [50, 88], C], [A, B, [50, 88]]]
  };

  function four(a, b, c, d, m) { return [[a, b, m], [b, c, m], [c, d, m], [d, a, m]]; }

  /* A square cut by a cross that is not in the middle. */
  function offCross(x, y) {
    return [
      [[12, 12], [x, 12], [x, y], [12, y]], [[x, 12], [88, 12], [88, y], [x, y]],
      [[x, y], [88, y], [88, 88], [x, 88]], [[12, y], [x, y], [x, 88], [12, 88]]
    ];
  }

  /* Each kind returns { parts: [...], equal: true|false }. */
  var KINDS = {
    circle: function (n) { return { parts: sectors(ones(n).map(function () { return 360 / n; })), equal: true }; },
    strip:  function (n) { return { parts: cols(4, 34, 92, 32, ones(n)), equal: true }; },
    // rect, band, grid2-2, rectX, halfX and stripU share one outline, so the
    // four quarters challenge really is the same cake cut different ways.
    rect:   function (n) { return { parts: cols(6, 22, 88, 56, ones(n)), equal: true }; },
    band:   function (n) { return { parts: grid(6, 22, 88, 56, n, 1), equal: true }; },
    hstrip: function (n) { return { parts: grid(20, 6, 60, 88, n, 1), equal: true }; },
    grid:   function (r, c) {
      return { parts: c >= r ? grid(6, 22, 88, 56, r, c) : grid(20, 6, 60, 88, r, c), equal: true };
    },
    square:  function () { return { parts: grid(12, 12, 76, 76, 2, 2), equal: true }; },
    squareX: function () { return { parts: four([12, 12], [88, 12], [88, 88], [12, 88], [50, 50]), equal: true }; },
    // A rectangle's diagonals give two pairs of different triangles, all the
    // same area. Equal parts that do not look alike: 3Nf.02 exactly.
    rectX:   function () { return { parts: four([6, 22], [94, 22], [94, 78], [6, 78], [50, 50]), equal: true }; },
    // Cut in half, then each half corner to corner.
    halfX: function () {
      return { parts: [
        [[6, 22], [50, 22], [6, 78]], [[50, 22], [50, 78], [6, 78]],
        [[50, 22], [94, 22], [50, 78]], [[94, 22], [94, 78], [50, 78]]
      ], equal: true };
    },
    diamond: function () { return { parts: four([50, 4], [80, 50], [50, 96], [20, 50], [50, 50]), equal: true }; },
    hex:  function () { return { parts: fan(6, 46), equal: true }; },
    pent: function () { return { parts: fan(5, 47), equal: true }; },
    tri:  function (n) { return { parts: TRI[n], equal: true }; },
    // Four points, each a kite from the centre out to one tip.
    star: function () {
      var m = [50, 50], tip = [[50, 2], [98, 50], [50, 98], [2, 50]];
      var dip = [[64, 36], [64, 64], [36, 64], [36, 36]];
      return { parts: [0, 1, 2, 3].map(function (k) { return [m, dip[(k + 3) % 4], tip[k], dip[k]]; }), equal: true };
    },
    // Four squares in a Z.
    z: function () {
      return { parts: [
        [[8, 26], [36, 26], [36, 50], [8, 50]], [[36, 26], [64, 26], [64, 50], [36, 50]],
        [[36, 50], [64, 50], [64, 74], [36, 74]], [[64, 50], [92, 50], [92, 74], [64, 74]]
      ], equal: true };
    },

    // ---- Non-examples: parts that are not equal ----
    stripU:  function (n) { return { parts: cols(6, 22, 88, 56, n === 3 ? [1, 1, 2] : [1, 2, 2, 3]), equal: false }; },
    crossU:  function () { return { parts: offCross(38, 40), equal: false }; },
    circleU: function () { return { parts: sectors([60, 80, 100, 120]), equal: false }; },
    // Three cuts across a triangle at equal steps: the parts are not equal.
    triU: function () {
      function at(y) { var t = (y - 8) / 80; return [50 - 44 * t, 50 + 44 * t]; }
      var ys = [8, 28, 48, 68, 88], p = [];
      for (var i = 0; i < 4; i++) {
        var a = at(ys[i]), b = at(ys[i + 1]);
        p.push(i === 0 ? [[50, 8], [b[1], ys[1]], [b[0], ys[1]]]
                       : [[a[0], ys[i]], [a[1], ys[i]], [b[1], ys[i + 1]], [b[0], ys[i + 1]]]);
      }
      return { parts: p, equal: false };
    }
  };

  /** "grid2-4" -> KINDS.grid(2, 4); "circle8" -> KINDS.circle(8); "tri4" -> KINDS.tri(4). */
  function make(name) {
    var m = /^([a-zA-Z]+?)(\d+)?(?:-(\d+))?$/.exec(name);
    if (!m || !KINDS[m[1]]) throw new Error('Unknown shape ' + name);
    var s = KINDS[m[1]](m[2] ? +m[2] : undefined, m[3] ? +m[3] : undefined);
    if (!s.parts) throw new Error('Unknown shape ' + name);
    return s;
  }

  function rotate(parts, deg) {
    if (!deg) return parts;
    var a = deg * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
    return parts.map(function (poly) {
      return poly.map(function (p) {
        var x = p[0] - 50, y = p[1] - 50;
        return [50 + x * cos - y * sin, 50 + x * sin + y * cos];
      });
    });
  }

  /** Parse "kind/shaded[/rDEG]". */
  function parse(spec) {
    var bits = String(spec).split('/');
    var s = make(bits[0]);
    var rot = bits[2] ? parseInt(bits[2].replace(/^r/, ''), 10) : 0;
    return { kind: bits[0], parts: rotate(s.parts, rot), equal: s.equal,
             shaded: bits[1] === undefined ? 0 : parseInt(bits[1], 10), rot: rot };
  }

  function area(poly) {
    var s = 0;
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s) / 2;
  }

  /** Largest part over smallest. 1 means equal parts. */
  function spread(parts) {
    var areas = parts.map(area);
    return Math.max.apply(null, areas) / Math.min.apply(null, areas);
  }

  root.BakeryShapes = { make: make, parse: parse, area: area, spread: spread };
})(typeof module !== 'undefined' ? module.exports : window);
