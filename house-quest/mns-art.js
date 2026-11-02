/* ============================================================
   MNS art: Wafi (the school mascot) and the MNS crest, drawn as SVG.

   Drawn in code from photos the class teacher supplied (2026-10-01),
   in the game's own style (flat fills, thick #2A2745 outline). Not the
   school's official artwork; swap in the official files if they arrive.

   Every function returns an SVG string with a viewBox and no size, so
   the page can scale it with CSS; game.js bakes Wafi's frames onto
   canvases once for the park. SIZE gives each viewBox's width and height.
   ============================================================ */
(function () {
  'use strict';

  var LINE = '#2A2745';
  var FUR = '#56657D', FUR_DARK = '#3F4B5F', WHITE = '#F6F4EF';
  var EYE = '#A6CE6E', NOSE = '#F3A1B2', SHIRT = '#1F2D6B', ORANGE = '#F2A33A';
  var NAVY = '#1C2C70', GOLD = '#F2C94C', GOLD_DEEP = '#9C7A1E', RIBBON = '#EED48A';

  var SIZE = { full: [120, 150], head: [116, 98], crest: [100, 112], facade: [320, 200], rival: [120, 120] };

  /* Icons on a 24 x 24 grid, drawn with a round 2.2 px stroke (no fill), the
     same way as the <symbol>s in index.html. The house ones are copied from there. */
  var ICONS = {
    fire: ['M12 2c1 3 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2 .8-3.4 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-9z'],
    water: ['M12 2.7s-6 6.3-6 11.3a6 6 0 0 0 12 0c0-5-6-11.3-6-11.3z'],
    air: ['M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2', 'M9.6 4.6A2 2 0 1 1 11 8H2', 'M12.6 19.4A2 2 0 1 0 14 16H2'],
    earth: ['m8 4 4 7 3-3 7 12H2z'],
    maths: ['M7 3v8M3 7h8', 'M13 7h8', 'M4 14l6 6M10 14l-6 6', 'M13 15.5h8M13 18.5h8'],
    computer: ['M3 4h18v12H3z', 'M8 20h8', 'M12 16v4'],
    book: ['M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z', 'M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z'],
    pencil: ['M17 3l4 4L8 20H4v-4z', 'M14 6l4 4'],
    globe: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M3 12h18', 'M12 3c3 3 3 15 0 18', 'M12 3c-3 3-3 15 0 18'],
    palette: ['M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z', 'M7.5 11.5h.01', 'M10 7.5h.01', 'M15 8h.01'],
    note: ['M9 18V5l11-2v13', 'M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0z', 'M20 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0z'],
    ball: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8', 'M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8'],
    sun: ['M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z', 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
    moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
    fork: ['M7 3v8a2 2 0 0 0 4 0V3', 'M9 3v18', 'M17 3c-2 0-3 3-3 6s1 4 3 4v8'],
    cup: ['M7 4h10v5a5 5 0 0 1-10 0z', 'M7 6H4a3 3 0 0 0 3 4', 'M17 6h3a3 3 0 0 1-3 4', 'M12 14v4', 'M8 21h8', 'M9 18h6']
  };
  var NS = 'xmlns="http://www.w3.org/2000/svg"';

  function svg(viewBox, body) {
    return '<svg ' + NS + ' viewBox="' + viewBox + '" aria-hidden="true">' + body + '</svg>';
  }
  function path(d, fill, stroke, sw) {
    return '<path d="' + d + '" fill="' + (fill || 'none') + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"' : '') + '/>';
  }
  /* A thick line with the dark outline round it (arms, tail, eyebrow tufts). */
  function outlined(d, w, col) {
    return path(d, null, LINE, w + 3.5) + path(d, null, col, w);
  }
  function paw(x, y, s, fill) {
    return '<ellipse cx="' + x + '" cy="' + (y + 2.6 * s) + '" rx="' + 5 * s + '" ry="' + 4 * s + '" fill="' + fill + '"/>' +
      [[-5.2, -2.8, 2], [-1.8, -6, 2.2], [1.8, -6, 2.2], [5.2, -2.8, 2]].map(function (t) {
        return '<circle cx="' + (x + t[0] * s) + '" cy="' + (y + t[1] * s) + '" r="' + t[2] * s + '" fill="' + fill + '"/>';
      }).join('');
  }

  /* Wafi's head from the front, about 112 wide with the whiskers; chin at y 94.
     f.look turns the face a little (0 = straight on); f.blink closes the eyes;
     f.ears 'droop' lowers them; f.mouth is 'smile', 'open', 'tongue' or 'frown';
     f.tilt leans the head (degrees); f.down drops the pupils. */
  function head(f) {
    f = f || {};
    var dx = f.look || 0, pd = f.down ? 2.5 : 0;
    var eyes = [[44, -8], [76, 8]].map(function (e) {
      var x = e[0];
      if (f.blink) return path('M' + (x - 8) + ',53 Q' + x + ',58 ' + (x + 8) + ',53', null, LINE, 3);
      return '<g transform="rotate(' + e[1] + ' ' + x + ' 53)">' +
        '<ellipse cx="' + x + '" cy="53" rx="9.5" ry="10.5" fill="' + EYE + '" stroke="' + LINE + '" stroke-width="2.8"/>' +
        '<ellipse cx="' + (x + dx * 0.6) + '" cy="' + (54 + pd) + '" rx="3.4" ry="7" fill="' + LINE + '"/>' +
        '<circle cx="' + (x + 3 + dx * 0.6) + '" cy="' + (48.5 + pd) + '" r="2.4" fill="#FFFFFF"/></g>';
    }).join('');
    var mouths = {
      smile: path('M60,71 L60,74 M52,74 Q56,78 60,74 Q64,78 68,74', null, LINE, 2.2),
      tongue: path('M57,76 Q60,83 63,76 Z', NOSE, LINE, 1.6) + path('M60,71 L60,74 M52,74 Q56,78 60,74 Q64,78 68,74', null, LINE, 2.2),
      open: '<ellipse cx="60" cy="79" rx="6.5" ry="8" fill="#5A2633" stroke="' + LINE + '" stroke-width="2.2"/>' +
        '<ellipse cx="60" cy="84" rx="4" ry="2.6" fill="' + NOSE + '"/>',
      frown: path('M60,71 L60,74 M53,78 Q60,73 67,78', null, LINE, 2.2)
    };
    var ear = function (side) {
      var droop = f.ears === 'droop', s = side < 0;
      var t = droop ? ' transform="rotate(' + (s ? -50 : 50) + ' ' + (s ? 40 : 80) + ' 38)"' : '';
      return '<g' + t + '>' + (s
        ? path('M27,50 L20,8 Q21,3 26,5 L56,28 Z', FUR, LINE, 3) + path('M30,42 L25,13 L47,30 Z', FUR_DARK) +
          path('M31,39 L28,22 M35,36 L31,25 M39,33 L34,27', null, WHITE, 2.6)
        : path('M93,50 L100,8 Q99,3 94,5 L64,28 Z', FUR, LINE, 3) + path('M90,42 L95,13 L73,30 Z', FUR_DARK) +
          path('M89,39 L92,22 M85,36 L89,25 M81,33 L86,27', null, WHITE, 2.6)) + '</g>';
    };
    return '<g transform="rotate(' + (f.tilt || 0) + ' 60 70)">' +
      ear(-1) + ear(1) +
      // head with fluffy cheeks
      path(HEAD, FUR, LINE, 3) +
      path('M53,24 Q55,29 54,33 M60,22 L60,31 M67,24 Q65,29 66,33', null, FUR_DARK, 2.5) +
      '<g transform="translate(' + dx + ' 0)">' +
      // white muzzle, cheeks and chin
      path('M25,70 L15,76 L27,77 C35,89 46,92 60,92 C74,92 85,89 93,77 L105,76 L95,70 ' +
        'C88,63 74,61 60,66 C46,61 32,63 25,70 Z', WHITE) +
      // the white tufts above the eyes
      outlined('M46,38 Q45,33 43,27 M41,38 Q39,34 36,31', 2.4, WHITE) +
      outlined('M74,38 Q75,33 77,27 M79,38 Q81,34 84,31', 2.4, WHITE) +
      eyes +
      path('M53,64 Q60,60 67,64 Q65,70 60,71 Q55,70 53,64 Z', NOSE, LINE, 2.2) +
      (mouths[f.mouth] || mouths.smile) +
      path('M38,72 L6,66 M38,76 L6,78 M40,80 L10,88 M82,72 L114,66 M82,76 L114,78 M80,80 L110,88', null, LINE, 1.6) +
      '</g></g>';
  }
  var HEAD = 'M60,20 C86,20 102,36 102,56 L111,63 L101,68 L107,76 L94,78 C86,90 74,94 60,94 ' +
    'C46,94 34,90 26,78 L13,76 L19,68 L9,63 L18,56 C18,36 34,20 60,20 Z';

  /* The back of the head: all fur, tabby stripes, whisker tips at the sides. */
  function backHead(droop) {
    var e = function (d, side) { return droop ? '<g transform="rotate(' + (side < 0 ? -50 : 50) + ' ' + (side < 0 ? 40 : 80) + ' 38)">' + path(d, FUR, LINE, 3) + '</g>' : path(d, FUR, LINE, 3); };
    return e('M27,50 L20,8 Q21,3 26,5 L56,28 Z', -1) +
      e('M93,50 L100,8 Q99,3 94,5 L64,28 Z', 1) +
      path(HEAD, FUR, LINE, 3) +
      path('M44,32 Q60,26 76,32 M38,44 Q60,37 82,44 M36,57 Q60,50 84,57 M42,70 Q60,64 78,70', null, FUR_DARK, 3) +
      path('M14,66 L5,63 M12,74 L4,76 M106,66 L115,63 M108,74 L116,76', null, LINE, 1.6);
  }

  /* Wafi in profile, facing left: muzzle to the left, tail to the right. */
  function sideHead(blink) {
    var eye = blink ? path('M30,50 Q36,55 42,50', null, LINE, 3)
      : '<ellipse cx="36" cy="49" rx="7" ry="9.5" fill="' + EYE + '" stroke="' + LINE + '" stroke-width="2.6"/>' +
        '<ellipse cx="33.5" cy="50" rx="2.8" ry="6.5" fill="' + LINE + '"/>' +
        '<circle cx="37" cy="45" r="2" fill="#FFFFFF"/>';
    return path('M72,26 L84,4 Q88,2 89,7 L90,36 Z', FUR_DARK, LINE, 3) +
      path('M50,28 L50,5 Q52,1 56,4 L72,24 Z', FUR, LINE, 3) +
      path('M53,24 L53,10 L66,23 Z', FUR_DARK) +
      path('M62,18 C82,18 96,32 96,52 C96,70 86,88 66,92 C48,95 32,90 24,80 L12,70 ' +
        'C8,64 12,58 18,56 C22,40 36,18 62,18 Z', FUR, LINE, 3) +
      path('M70,30 Q74,36 72,42 M80,34 Q84,42 82,48', null, FUR_DARK, 2.5) +
      path('M13,64 C20,60 34,62 42,70 C46,80 40,89 28,88 C20,86 14,79 12,72 Z', WHITE) +
      outlined('M38,38 Q36,32 33,27 M34,39 Q31,35 28,33', 2.2, WHITE) +
      eye +
      path('M9,58 Q13,55 16,60 Q13,64 9,62 Z', NOSE, LINE, 2) +
      path('M12,66 Q16,70 21,68', null, LINE, 2) +
      path('M20,64 L2,58 M20,68 L2,70 M22,72 L4,80', null, LINE, 1.5);
  }

  /* Each pose: where the two paws are, and how far each leg swings (degrees). */
  var POSES = {
    idle:  { hands: [[30, 118], [90, 118]], legs: [0, 0] },
    walkA: { hands: [[33, 119], [87, 115]], legs: [22, -22] },
    walkB: { hands: [[33, 115], [87, 119]], legs: [-22, 22] },
    jump:  { hands: [[10, 50], [110, 50]], legs: [18, -12] },
    cheer: { hands: [[10, 48], [110, 48]], legs: [0, 0] }
  };
  /* Front-only gestures: a pose for the body and a face for the head. */
  var GESTURES = {
    lick:  { pose: { hands: [[52, 84], [90, 118]], legs: [0, 0] }, face: { blink: true, mouth: 'tongue' }, pawUp: true },
    look:  { pose: POSES.idle, face: { tilt: 12, look: 0 } },
    yawn:  { pose: POSES.cheer, face: { blink: true, mouth: 'open' } },
    droop: { pose: POSES.idle, face: { ears: 'droop', mouth: 'frown', down: true } }
  };

  function legsSvg(ps, colourBack) {
    return [[44, 50], [63, 70]].map(function (l, i) {
      return '<g transform="rotate(' + ps.legs[i] + ' ' + l[1] + ' 122)">' +
        '<rect x="' + l[0] + '" y="120" width="13" height="20" rx="6" fill="' + (i && colourBack ? FUR_DARK : FUR) + '" stroke="' + LINE + '" stroke-width="3"/>' +
        '<ellipse cx="' + l[1] + '" cy="141" rx="9" ry="5" fill="' + WHITE + '" stroke="' + LINE + '" stroke-width="2.5"/></g>';
    }).join('');
  }
  function armsSvg(ps) {
    return [[38, 95], [82, 95]].map(function (s, i) {
      var h = ps.hands[i];
      return outlined('M' + s[0] + ',' + s[1] + ' L' + h[0] + ',' + h[1], 8, FUR) +
        '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="6" fill="' + FUR + '" stroke="' + LINE + '" stroke-width="2.5"/>';
    }).join('');
  }
  function sleevesSvg(shirt) {
    return [[38, 95], [82, 95]].map(function (s) {
      return '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="8.5" fill="' + shirt + '" stroke="' + LINE + '" stroke-width="3"/>';
    }).join('');
  }

  /* pose: 'head' (face only), a key of POSES, or a front gesture
     ('lick', 'look', 'yawn', 'droop').
     o.dir: 'down' (front, the default), 'up' (back) or 'side' (profile facing
     left; mirror it for right). o.blink closes the eyes; o.look turns the face;
     o.shirt and o.mark colour the T-shirt and its paw logo (Wafi's own navy and
     orange by default). */
  function wafi(pose, o) {
    o = o || {};
    if (pose === 'head') return svg('2 0 116 98', head({ blink: o.blink, look: o.look }));
    var shirt = o.shirt || SHIRT, mark = o.mark || ORANGE;
    var tail = outlined('M80,130 Q104,130 104,108 Q104,96 96,92', 8, FUR);
    if (o.dir === 'up') return svg('0 0 120 150', backSvg(POSES[pose] || POSES.idle, shirt, o.ears === 'droop'));
    if (o.dir === 'side') return svg('0 0 120 150', sideSvg(POSES[pose] || POSES.idle, shirt, o.blink));
    var g = GESTURES[pose], ps = g ? g.pose : (POSES[pose] || POSES.idle);
    var face = g ? g.face : { blink: o.blink, look: o.look };
    if (!g) face.look = o.look;
    return svg('0 0 120 150', '' +
      tail + legsSvg(ps) + armsSvg(ps) +
      '<rect x="34" y="86" width="52" height="42" rx="15" fill="' + shirt + '" stroke="' + LINE + '" stroke-width="3"/>' +
      paw(47, 108, 1, mark) +
      path('M68,101 H78 V106 Q78,111 73,113 Q68,111 68,106 Z', null, mark, 1.6) +
      sleevesSvg(shirt) +
      head(face) +
      (g && g.pawUp ? '<circle cx="52" cy="84" r="6.5" fill="' + FUR + '" stroke="' + LINE + '" stroke-width="2.5"/>' : ''));
  }

  /* From behind: the tail curls up in front of the shirt's back, arms at the sides. */
  function backSvg(ps, shirt, droop) {
    return legsSvg(ps) + armsSvg(ps) +
      '<rect x="34" y="86" width="52" height="42" rx="15" fill="' + shirt + '" stroke="' + LINE + '" stroke-width="3"/>' +
      path('M48,90 Q60,96 72,90', null, LINE, 2) +
      sleevesSvg(shirt) +
      outlined('M62,124 Q76,126 80,110 Q83,98 92,96', 8, FUR) +
      backHead(droop);
  }

  /* In profile: far leg and arm darker and behind, near ones in front. */
  function sideSvg(ps, shirt, blink) {
    var swing = ps.legs[0], up = ps.hands[0][1] < 90;
    var hand = up ? [38, 64] : swing > 0 ? [44, 116] : swing < 0 ? [70, 116] : [56, 118];
    var farHand = up ? [70, 62] : swing > 0 ? [70, 116] : swing < 0 ? [44, 116] : [62, 118];
    var limb = function (fromX, h, col) {
      return outlined('M' + fromX + ',96 L' + h[0] + ',' + h[1], 8, col) +
        '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="6" fill="' + col + '" stroke="' + LINE + '" stroke-width="2.5"/>';
    };
    var leg = function (x, a, col) {
      return '<g transform="rotate(' + a + ' ' + (x + 6) + ' 122)">' +
        '<rect x="' + x + '" y="120" width="13" height="20" rx="6" fill="' + col + '" stroke="' + LINE + '" stroke-width="3"/>' +
        '<ellipse cx="' + (x + 3) + '" cy="141" rx="9" ry="5" fill="' + WHITE + '" stroke="' + LINE + '" stroke-width="2.5"/></g>';
    };
    return outlined('M80,124 Q106,124 106,102 Q106,90 98,86', 8, FUR) +
      leg(58, -swing, FUR_DARK) + limb(64, farHand, FUR_DARK) +
      '<rect x="40" y="86" width="44" height="42" rx="15" fill="' + shirt + '" stroke="' + LINE + '" stroke-width="3"/>' +
      leg(46, swing, FUR) +
      sideHead(blink) +
      limb(56, hand, FUR) +
      '<circle cx="56" cy="96" r="8.5" fill="' + shirt + '" stroke="' + LINE + '" stroke-width="3"/>';
  }

  function star(cx, cy, r) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      pts.push((cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1));
    }
    return '<polygon points="' + pts.join(' ') + '" fill="' + GOLD + '" stroke="' + GOLD_DEEP + '" stroke-width="1"/>';
  }

  /* The crest: navy shield, five gold stars, the open book, the gold ribbon. */
  function crest() { return svg('0 0 100 112', crestBody()); }
  function crestBody() {
    var shield = 'M16,8 H84 V50 C84,74 68,88 50,96 C32,88 16,74 16,50 Z';
    return '' +
      path(shield, NAVY, LINE, 8) + path(shield, null, '#FFFFFF', 3.5) +
      [[30, 33], [39, 22], [50, 18], [61, 22], [70, 33]].map(function (s) { return star(s[0], s[1], 5.5); }).join('') +
      path('M28,58 Q39,51 50,57 Q61,51 72,58 V72 Q61,66 50,71 Q39,66 28,72 Z', '#FFFFFF', '#C9A23C', 2) +
      path('M50,57 V71', null, '#C9A23C', 2) +
      path('M42,74 H58 L55,80 H45 Z', '#C9A23C') +
      path('M4,86 L14,82 Q50,96 86,82 L96,86 L92,92 L96,98 Q50,112 4,98 L8,92 Z', RIBBON, GOLD_DEEP, 2);
  }

  /* The scalloped Arabian arch over an opening: a band whose lower edge is
     a row of small arcs, between x and x + w, hanging from y. */
  function scallop(x, y, w, n) {
    var r = w / n / 2, d = 'M' + x + ',' + y + ' H' + (x + w) + ' V' + (y + r * 1.6);
    for (var i = n - 1; i >= 0; i--) d += ' A' + r + ',' + r + ' 0 0 0 ' + (x + i * 2 * r) + ',' + (y + r * 1.6);
    return path(d + ' Z', '#EADBC0', LINE, 2.2);
  }
  function glass(x, y, w, h, panes) {
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#1F3170" stroke="#8A5F34" stroke-width="2.5"/>';
    for (var i = 1; i < panes; i++) s += path('M' + (x + i * w / panes) + ',' + y + ' V' + (y + h), null, '#8A5F34', 2);
    return s + path('M' + (x + 4) + ',' + (y + h - 6) + ' L' + (x + w * 0.4) + ',' + (y + 6), null, 'rgba(255,255,255,.18)', 3);
  }
  /* The MNS front, from the school's own video: cream walls, scalloped arches,
     blue glass in bronze frames, a porch on square pillars, light steps,
     terracotta paving and the navy sign under the crest. */
  function facade() {
    var CREAM = '#F1E6CF', CREAM_DEEP = '#DCCBA9', s = '';
    s += '<rect x="0" y="176" width="320" height="24" fill="#C8714A"/>';
    for (var bx = 0; bx < 320; bx += 16) s += path('M' + bx + ',176 V200', null, 'rgba(90,40,20,.25)', 1.2);
    s += path('M0,188 H320', null, 'rgba(90,40,20,.25)', 1.2);
    s += '<rect x="16" y="34" width="288" height="142" fill="' + CREAM + '" stroke="' + LINE + '" stroke-width="3"/>';
    s += '<rect x="10" y="24" width="300" height="14" rx="2" fill="' + CREAM_DEEP + '" stroke="' + LINE + '" stroke-width="3"/>';
    s += '<g transform="translate(148 40) scale(0.24)">' + crestBody() + '</g>';
    s += '<text x="160" y="80" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-weight="700" font-size="12" fill="#1C2C70">Multinational School - Bahrain</text>';
    [28, 254].forEach(function (x) { s += glass(x, 92, 40, 28, 3) + scallop(x - 2, 84, 44, 5); });
    s += glass(112, 132, 96, 42, 4);
    s += '<rect x="146" y="136" width="28" height="38" fill="#3A5BA8" stroke="#8A5F34" stroke-width="2.5"/>' + path('M160,136 V174', null, '#8A5F34', 2);
    [28, 254].forEach(function (x) { s += glass(x, 136, 40, 36, 3) + scallop(x - 2, 128, 44, 5); });
    [98, 140, 180, 222].forEach(function (x, i) {
      s += '<rect x="' + x + '" y="92" width="12" height="82" fill="' + CREAM + '" stroke="' + LINE + '" stroke-width="2.5"/>';
      if (i < 3) s += scallop(x + 12, 120, [140, 180, 222][i] - x - 12, 4);
    });
    s += '<rect x="90" y="172" width="140" height="6" fill="#F5F2EB" stroke="' + LINE + '" stroke-width="2"/>';
    s += '<rect x="82" y="178" width="156" height="6" fill="#EEEAE1" stroke="' + LINE + '" stroke-width="2"/>';
    s += '<rect x="74" y="184" width="172" height="6" fill="#E6E1D6" stroke="' + LINE + '" stroke-width="2"/>';
    return svg('0 0 320 200', s);
  }

  /* ---------- The four habit rivals (school mode) ----------
     120 x 120 each. 'before' is the habit; 'after' is the healthy change. */
  function eyesPair(x1, x2, y, r, look) {
    return [x1, x2].map(function (x) {
      return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#FFFFFF" stroke="' + LINE + '" stroke-width="2.4"/>' +
        '<circle cx="' + (x + (look || 0)) + '" cy="' + (y + 1) + '" r="' + r * 0.45 + '" fill="' + LINE + '"/>';
    }).join('');
  }
  function sleepy(x1, x2, y) { return path('M' + (x1 - 6) + ',' + y + ' Q' + x1 + ',' + (y + 5) + ' ' + (x1 + 6) + ',' + y + ' M' + (x2 - 6) + ',' + y + ' Q' + x2 + ',' + (y + 5) + ' ' + (x2 + 6) + ',' + y, null, LINE, 3); }
  var RIVAL_ART = {
    couch: {
      before: function () {
        return '<rect x="10" y="64" width="100" height="34" rx="12" fill="#C2410C" stroke="' + LINE + '" stroke-width="3"/>' +
          '<rect x="4" y="56" width="20" height="44" rx="9" fill="#9A3412" stroke="' + LINE + '" stroke-width="3"/>' +
          '<rect x="96" y="56" width="20" height="44" rx="9" fill="#9A3412" stroke="' + LINE + '" stroke-width="3"/>' +
          '<rect x="16" y="98" width="8" height="10" fill="' + LINE + '"/><rect x="96" y="98" width="8" height="10" fill="' + LINE + '"/>' +
          '<ellipse cx="60" cy="58" rx="32" ry="26" fill="#C8955A" stroke="' + LINE + '" stroke-width="3"/>' +
          '<circle cx="44" cy="46" r="2.5" fill="#8A5F34"/><circle cx="78" cy="66" r="2.5" fill="#8A5F34"/><circle cx="72" cy="40" r="2" fill="#8A5F34"/>' +
          sleepy(50, 70, 54) + path('M52,68 Q60,64 68,68', null, LINE, 2.6) +
          '<rect x="84" y="70" width="10" height="20" rx="3" fill="#495057" stroke="' + LINE + '" stroke-width="2" transform="rotate(20 89 80)"/>' +
          '<circle cx="88" cy="74" r="1.8" fill="#FF6B6B"/>';
      },
      after: function () {
        return path('M40,36 H82', null, '#FF6B6B', 6) +
          '<ellipse cx="60" cy="56" rx="26" ry="30" fill="#C8955A" stroke="' + LINE + '" stroke-width="3"/>' +
          path('M36,40 Q60,30 84,40', null, '#E5383B', 6) +
          '<circle cx="48" cy="70" r="2.5" fill="#8A5F34"/><circle cx="74" cy="48" r="2" fill="#8A5F34"/>' +
          eyesPair(51, 69, 54, 5.5) + path('M50,66 Q60,76 70,66', null, LINE, 2.8) +
          outlined('M44,84 L34,100', 5, '#C8955A') + outlined('M76,84 L88,98', 5, '#C8955A') +
          '<path d="M24,98 h18 a6,6 0 0 1 0,10 h-22 z" fill="#4DABF7" stroke="' + LINE + '" stroke-width="2.5"/>' +
          '<path d="M80,96 h18 a6,6 0 0 1 0,10 h-22 z" fill="#4DABF7" stroke="' + LINE + '" stroke-width="2.5"/>' +
          path('M100,30 Q106,38 100,44 Q94,38 100,30 Z', '#A5D8FF', LINE, 1.6);
      }
    },
    cloud: {
      before: function () {
        var drops = [30, 48, 66, 84].map(function (x, i) { return path('M' + x + ',' + (88 + i % 2 * 8) + ' q-4,8 0,12 q4,-4 0,-12 z', '#4DABF7', LINE, 1.6); }).join('');
        return drops + path('M22,74 C8,74 8,52 24,50 C24,30 48,24 58,38 C66,22 94,26 94,46 C112,46 114,74 96,74 Z', '#ADB5BD', LINE, 3) +
          path('M40,46 L52,50 M80,46 L68,50', null, LINE, 3) + eyesPair(48, 72, 56, 5, 0) + path('M50,68 Q60,62 70,68', null, LINE, 3);
      },
      after: function () {
        var bow = ['#E5383B', '#FD7E14', '#FAB005', '#40C057', '#1C7ED6'].map(function (c, i) {
          return path('M' + (14 + i * 5) + ',100 A' + (46 - i * 5) + ',' + (46 - i * 5) + ' 0 0 1 ' + (106 - i * 5) + ',100', null, c, 5);
        }).join('');
        return bow + '<circle cx="92" cy="26" r="13" fill="#FFD43B" stroke="' + LINE + '" stroke-width="2.5"/>' +
          path('M22,74 C8,74 8,52 24,50 C24,30 48,24 58,38 C66,22 94,26 94,46 C112,46 114,74 96,74 Z', '#FFFFFF', LINE, 3) +
          eyesPair(48, 72, 56, 5, 0) + path('M48,64 Q60,74 72,64', null, LINE, 3) +
          '<circle cx="40" cy="64" r="4" fill="#FFB3C1"/><circle cx="80" cy="64" r="4" fill="#FFB3C1"/>';
      }
    },
    owl: {
      before: function () {
        return '<ellipse cx="60" cy="66" rx="34" ry="38" fill="#7048E8" stroke="' + LINE + '" stroke-width="3"/>' +
          path('M30,36 L36,20 L46,34 Z M90,36 L84,20 L74,34 Z', '#7048E8', LINE, 3) +
          '<ellipse cx="60" cy="78" rx="20" ry="22" fill="#B197FC"/>' +
          '<circle cx="46" cy="52" r="13" fill="#FFFFFF" stroke="' + LINE + '" stroke-width="2.5"/><circle cx="74" cy="52" r="13" fill="#FFFFFF" stroke="' + LINE + '" stroke-width="2.5"/>' +
          '<circle cx="46" cy="54" r="6" fill="' + LINE + '"/><circle cx="74" cy="54" r="6" fill="' + LINE + '"/>' +
          path('M56,62 L60,70 L64,62 Z', '#FAB005', LINE, 2) +
          '<rect x="44" y="78" width="32" height="22" rx="4" fill="#2A2745"/><rect x="47" y="81" width="26" height="16" rx="2" fill="#74C0FC"/>' +
          '<ellipse cx="60" cy="70" rx="20" ry="6" fill="rgba(116,192,252,.35)"/>';
      },
      after: function () {
        return '<ellipse cx="60" cy="68" rx="34" ry="36" fill="#7048E8" stroke="' + LINE + '" stroke-width="3"/>' +
          path('M26,40 Q60,4 94,40 Z', '#4C6EF5', LINE, 3) + '<circle cx="98" cy="40" r="7" fill="#FFFFFF" stroke="' + LINE + '" stroke-width="2.5"/>' +
          '<ellipse cx="60" cy="80" rx="20" ry="20" fill="#B197FC"/>' +
          sleepy(46, 74, 56) + path('M56,64 L60,71 L64,64 Z', '#FAB005', LINE, 2) +
          '<text x="92" y="24" font-family="Arial, sans-serif" font-weight="700" font-size="14" fill="#4C6EF5">Zzz</text>';
      }
    },
    fizzy: {
      before: function () {
        var bubbles = [[40, 20, 4], [52, 12, 3], [66, 18, 5], [78, 8, 3]].map(function (b) {
          return '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + b[2] + '" fill="#FFFFFF" stroke="' + LINE + '" stroke-width="1.5"/>';
        }).join('');
        return bubbles + outlined('M70,30 L80,8 L90,6', 4, '#FF6B6B') +
          '<rect x="32" y="28" width="56" height="80" rx="12" fill="#7048E8" stroke="' + LINE + '" stroke-width="3"/>' +
          '<rect x="34" y="24" width="52" height="10" rx="4" fill="#DEE2E6" stroke="' + LINE + '" stroke-width="2.5"/>' +
          '<rect x="33" y="78" width="54" height="14" fill="#9775FA"/>' +
          path('M42,48 L54,52 M78,48 L66,52', null, LINE, 3) + eyesPair(50, 70, 58, 5.5, 1) +
          path('M46,70 Q60,80 74,68', null, LINE, 3) + path('M52,72 L54,77 M66,73 L64,78', null, '#FFFFFF', 2);
      },
      after: function () {
        return '<rect x="48" y="14" width="24" height="10" rx="3" fill="#1C7ED6" stroke="' + LINE + '" stroke-width="2.5"/>' +
          path('M46,24 H74 L80,40 V100 Q80,108 72,108 H48 Q40,108 40,100 V40 Z', 'rgba(165,216,255,.85)', LINE, 3) +
          '<rect x="41" y="62" width="38" height="44" rx="4" fill="#4DABF7"/>' +
          eyesPair(52, 68, 52, 5, 0) + path('M50,62 Q60,70 70,62', null, LINE, 2.8) +
          path('M88,30 Q94,40 88,46 Q82,40 88,30 Z', '#4DABF7', LINE, 1.6) +
          path('M46,32 L46,54', null, 'rgba(255,255,255,.7)', 3);
      }
    }
  };
  /* ---------- Teachers (school mode) ----------
     Each teacher at their classroom door: a drawn look for the figure
     by the door and what they say when Wafi comes by. No photos or portraits. Lines are greetings or jokes, never answers. */
  var TEACHERS = {};


  /* Wafi's healthy power against each rival, 60 x 60: a ball for Couch
     Potato, a splash of water for Fizzy Fiend, a lullaby moon for Night Owl,
     a heart and sunshine for Grumpy Cloud. */
  function power(kind) {
    var body;
    if (kind === 'fizzy') {
      body = path('M30,6 C30,6 12,28 12,38 A18,18 0 0 0 48,38 C48,28 30,6 30,6 Z', '#4DABF7', LINE, 3) +
        path('M22,36 Q22,44 30,46', null, '#FFFFFF', 3) +
        '<circle cx="8" cy="18" r="4" fill="#A5D8FF" stroke="' + LINE + '" stroke-width="1.5"/>' +
        '<circle cx="52" cy="16" r="3" fill="#A5D8FF" stroke="' + LINE + '" stroke-width="1.5"/>';
    } else if (kind === 'owl') {
      body = path('M40,8 A22,22 0 1 0 52,40 A17,17 0 1 1 40,8 Z', '#FFE066', LINE, 3) +
        [[12, 12, 4], [46, 50, 3.5], [8, 44, 3]].map(function (st) { return star(st[0], st[1], st[2] * 1.4); }).join('');
    } else if (kind === 'cloud') {
      body = [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) {
        var a = i * Math.PI / 4;
        return path('M' + (30 + Math.cos(a) * 21).toFixed(1) + ',' + (30 + Math.sin(a) * 21).toFixed(1) + ' L' + (30 + Math.cos(a) * 28).toFixed(1) + ',' + (30 + Math.sin(a) * 28).toFixed(1), null, '#FAB005', 3.5);
      }).join('') +
        path('M30,46 C10,34 10,18 21,16 C26,15 29,19 30,22 C31,19 34,15 39,16 C50,18 50,34 30,46 Z', '#FF8787', LINE, 3) +
        path('M20,24 Q21,20 25,20', null, 'rgba(255,255,255,.8)', 2.5);
    } else {
      body = '<circle cx="30" cy="30" r="22" fill="#FFFFFF" stroke="' + LINE + '" stroke-width="3"/>' +
        path('M30,19 L39,25 L36,36 L24,36 L21,25 Z', LINE) +
        path('M30,8 L30,19 M39,25 L50,21 M36,36 L43,46 M24,36 L17,46 M21,25 L10,21', null, LINE, 2.2);
    }
    return svg('0 0 60 60', body);
  }

  function rival(kind, state) {
    var art = RIVAL_ART[kind] || RIVAL_ART.couch;
    return svg('0 0 120 120', '<ellipse cx="60" cy="112" rx="38" ry="5" fill="rgba(36,33,59,.15)"/>' + (state === 'after' ? art.after() : art.before()));
  }

  var MNSArt = { wafi: wafi, crest: crest, facade: facade, rival: rival, power: power, TEACHERS: TEACHERS, ICONS: ICONS, SIZE: SIZE, POSES: POSES, GOLD: GOLD, GOLD_DEEP: GOLD_DEEP };
  if (typeof module !== 'undefined' && module.exports) { module.exports = MNSArt; return; }
  window.MNSArt = MNSArt;
})();
