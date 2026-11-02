/* ============================================================
   House Quest: the pipe park (demo)

   A side-scrolling park with pipes in the four house colours. The pupil
   plays as Wafi, the school mascot, in a T-shirt of their house colour,
   and looks for pipes of that colour.
   Standing on one and pressing "Go in" drops them into a chest room with a
   question; the answer opens the chest and wins a gem for the house.
   Pipes of other colours belong to other houses and stay shut.

   Theme of the month (Quest.THEME): fruit and veg float about to collect,
   every 2 win a bonus point; unhealthy foods walk up and down and are
   squashed by jumping on them. Bumping into one costs a point (never below
   zero) and gives 2 seconds of shield so it can't happen twice in a row.

   The flag at the end opens the treasure room, which shows exactly what the
   real version would send (code, week, gems). Nothing is sent or stored
   here, not even in the browser: everything is kept in memory only.

   Wafi and the MNS crest come from mns-art.js as SVG and are baked onto
   small canvases once. Three golden paw prints hide high above other
   houses' pipes: no points, just for the pupils who climb up there.

   Drawn on a canvas with plain shapes, so there are no image files and no
   network requests. The level is a grid of 48 px tiles.
   ============================================================ */
(function () {
  'use strict';

  var T = 48, ROWS = 10, COLS = 150;
  var G = 2300, JUMP = 900, SPEED = 250, MAX_FALL = 1300;
  var TAP_CAP = 640;   // letting go of Jump early caps the rise here; a quick tap still clears 2 tiles
  var EMPTY = 0, GROUND = 1, BLOCK = 2, PIPE = 3;
  var FLAG_C = 142;

  /* The level gets a little harder each year. Year 2 is the gentle version;
     speed is how fast the unhealthy foods walk, extra adds walkers in more
     places, hop makes some of them jump, gap is how wide the three ground
     gaps are. */
  var DIFF = {
    2: { speed: 55, extra: 0, hop: 0, gap: 2 },
    3: { speed: 65, extra: 2, hop: 0, gap: 2 },
    4: { speed: 75, extra: 2, hop: 2, gap: 2 },
    5: { speed: 85, extra: 3, hop: 3, gap: 3 },
    6: { speed: 95, extra: 4, hop: 4, gap: 3 }
  };

  /* ---------- The level ----------
     Row 8 is the top of the ground. A jump climbs 3 tiles at most, so every
     pipe top and platform is at most 3 tiles above where you take off
     (check-quest.js walks the level to prove it). */
  function buildLevel(year) {
    var d = DIFF[year] || DIFF[2];
    var grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid.push([]);
      for (var c = 0; c < COLS; c++) grid[r].push(EMPTY);
    }
    var pipes = [];
    var own = 0;
    function ground(from, to) { for (var c = from; c <= to; c++) { grid[8][c] = GROUND; grid[9][c] = GROUND; } }
    function gap(c, n) { for (var i = 0; i < n; i++) { grid[8][c + i] = EMPTY; grid[9][c + i] = EMPTY; } }
    function blocks(c, r, n) { for (var i = 0; i < n; i++) grid[r][c + i] = BLOCK; }
    function step(c, h) { for (var i = 1; i <= h; i++) grid[8 - i][c] = GROUND; }
    /* A pipe is 2 tiles wide and reaches down to whatever it stands on.
       isOwn: true means "the pupil's house colour"; those carry a question each. */
    function pipe(c, top, isOwn) {
      var bottom = top;
      while (bottom + 1 < ROWS && !grid[bottom + 1][c]) bottom++;
      for (var r = top; r <= bottom; r++) { grid[r][c] = PIPE; grid[r][c + 1] = PIPE; }
      pipes.push({ c: c, top: top, bottom: bottom, own: isOwn, q: isOwn ? own++ : -1 });
    }

    var enemies = [], foods = [];
    /* An unhealthy food walks between columns c0 and c1 on the ground. */
    function walker(kind, c0, c1) { enemies.push({ kind: kind, c0: c0, c1: c1 }); }
    function food(c, r) { foods.push({ c: c, r: r }); }

    ground(0, COLS - 1);
    pipe(6, 6, true);
    blocks(9, 5, 3); food(9, 4); food(11, 4);
    walker(0, 9, 13);
    pipe(14, 5, false);
    gap(18, d.gap); food(18, 4); food(19, 4);
    pipe(22, 6, true);
    blocks(26, 6, 4);
    pipe(27, 4, true);
    pipe(33, 6, false);
    step(37, 1); step(38, 2); step(39, 3);
    gap(40, 2); food(39, 4); food(42, 4);
    step(42, 3); step(43, 2); step(44, 1);
    walker(1, 45, 48);
    pipe(49, 6, true);
    pipe(53, 5, false);
    blocks(57, 6, 3);
    blocks(61, 4, 4); food(61, 3);
    pipe(63, 2, true);
    walker(2, 61, 67);
    pipe(68, 6, false);
    gap(72, d.gap); food(72, 4); food(73, 4);
    pipe(76, 5, true);
    blocks(80, 5, 2); food(80, 4); food(81, 4);
    walker(0, 78, 83);
    pipe(84, 6, false);
    pipe(88, 5, false);
    walker(3, 90, 92);
    pipe(93, 6, true);
    pipe(98, 5, false);
    walker(1, 100, 106);
    blocks(102, 5, 3); food(102, 4); food(104, 4);
    pipe(109, 6, true);
    blocks(113, 6, 2);
    blocks(116, 4, 5);      // wide enough to catch you walking off the pipe
    pipe(117, 2, true);
    gap(121, 2); food(121, 4); food(122, 4);   // stays 2 wide: you drop here from the high pipe
    pipe(125, 6, false);
    walker(2, 127, 131);
    pipe(132, 6, true);
    step(135, 1); step(136, 2); step(137, 3); step(138, 4); food(136, 5);

    // golden paws: each sits 4 rows above another house's pipe, out of
    // reach from the ground, so you only find it by climbing that pipe
    var paws = [{ c: 34, r: 2 }, { c: 89, r: 2 }, { c: 126, r: 2 }];

    // older years: more walkers, and some of them hop
    [[1, 30, 32], [3, 95, 97], [0, 117, 119], [2, 139, 141]].slice(0, d.extra)
      .forEach(function (w) { walker(w[0], w[1], w[2]); });
    [2, 3, 6, 1].slice(0, d.hop).forEach(function (i) { enemies[i].hop = true; });

    return { grid: grid, pipes: pipes, enemies: enemies, foods: foods, paws: paws, speed: d.speed,
      start: { c: 2, r: 8 }, flag: { c: FLAG_C, r: 8 } };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildLevel: buildLevel, DIFF: DIFF, T: T, ROWS: ROWS, COLS: COLS, G: G, JUMP: JUMP, SPEED: SPEED, TAP_CAP: TAP_CAP };
    return;
  }

  /* ============================================================
     Browser from here on
     ============================================================ */
  var Q = window.Quest;
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };

  var LINE = '#2A2745';
  var FONT = "'Century Gothic','CenturyGothic',Futura,'Avenir Next',system-ui,sans-serif";
  var ORDER = ['FIRE', 'WATER', 'AIR', 'EARTH'];
  var PAINT = {
    FIRE:  { main: '#E5383B', dark: '#A4161A', light: '#FF9B9B' },
    WATER: { main: '#1C7ED6', dark: '#0B4F8A', light: '#8CCBFF' },
    AIR:   { main: '#FAB005', dark: '#B07A00', light: '#FFE58A' },
    EARTH: { main: '#2F9E44', dark: '#1B6B2C', light: '#9BE8A7' }
  };
  /* ---------- MNS art, baked once onto small canvases ---------- */
  var ART = window.MNSArt;
  function bake(svg, size, k) {
    var cv = document.createElement('canvas'), img = new Image();
    cv.width = Math.round(size[0] * k);
    cv.height = Math.round(size[1] * k);
    img.onload = function () { cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); cv.ready = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(svg.replace('<svg ', '<svg width="' + cv.width + '" height="' + cv.height + '" '));
    return cv;
  }
  /* cx: centre; bottom: where the bottom of the picture goes; h: height. */
  function drawBaked(cv, cx, bottom, h) {
    if (!cv || !cv.ready) return;
    var w = h * cv.width / cv.height;
    ctx.drawImage(cv, cx - w / 2, bottom - h, w, h);
  }
  var CREST = bake(ART.crest(), ART.SIZE.crest, 2);
  var WAFI = {};
  var WAFI_H = 70;       // drawn height in the park; the 46 px hitbox is his body, the ears stick up like hair
  /* Wafi wears the pupil's house colour, so he matches the pipes to look for.
     The face turns left (look -3) and the tail is on his right: drawn mirrored
     when he walks right, the tail trails behind him. */
  function wafiLook(house, blink) {
    return { shirt: PAINT[house].main, mark: house === 'AIR' ? LINE : '#FFFFFF', look: -3, blink: blink };
  }
  function bakeWafi(house) {
    WAFI = { blink: bake(ART.wafi('idle', wafiLook(house, true)), ART.SIZE.full, 2.4) };
    Object.keys(ART.POSES).forEach(function (k) { WAFI[k] = bake(ART.wafi(k, wafiLook(house)), ART.SIZE.full, 2.4); });
  }

  var LEVEL, grid, OWN_COUNT;
  var state = { house: null, year: null, gems: 0, chestPts: 0, foods: 0, bonus: 0, bumps: 0, paws: 0 };
  /* Each pipe has a pool of questions; every game picks one from each pool. */
  var picks = {};        // year -> [the question picked for each pipe in this game]
  var got = {};          // year -> [pipe] -> [question] -> points won, once answered
  function pickOf(i, year) { return (picks[year || state.year] || [])[i] || 0; }
  function done(i) { return !!got[state.year] && got[state.year][i][pickOf(i)] !== undefined; }
  function chests() { return Q.YEARS[state.year || 3].map(function (pool, i) { return pool[pickOf(i)]; }); }

  var canvas = $('#game');
  var ctx = canvas.getContext('2d');
  var scale = 1, dpr = 1, viewW = 800, camX = 0, time = 0;
  var keys = { left: false, right: false, jump: false, down: false };
  var p = {
    x: 0, y: 0, w: 30, h: 46, vx: 0, vy: 0,
    onGround: false, facing: 1, coyote: 0, buffer: 0, downBuf: 0, walk: 0, squash: 0,
    state: 'frozen', pipe: null, exitY: 0, sink: 0, safeX: 0, safeY: 0, onPipe: null, hurt: 0, knock: 0
  };
  var flagArmed = true;
  var confetti = [];
  var floaters = [];     // "+1" and "-1" drifting up
  var told = {};         // one-off tips already shown
  var THEME = Q.THEME;
  var FOE_H = { burger: 40, doughnut: 36, fizzy: 42, cupcake: 46 };   // hitbox matches the drawing
  var foes = [], fruit = [], paws = [];
  var cheerT = 0;        // Wafi cheering at the flag
  function solvedCount() { return chests().filter(function (c, i) { return done(i); }).length; }

  function setupLevel(year) {
    LEVEL = buildLevel(year);
    grid = LEVEL.grid;
    OWN_COUNT = LEVEL.pipes.filter(function (pp) { return pp.own; }).length;
    foes = LEVEL.enemies.map(function (e, i) {
      var kind = THEME.avoid[e.kind % THEME.avoid.length], h = FOE_H[kind] || 36;
      return { kind: kind, x0: e.c0 * T, x1: (e.c1 + 1) * T, x: (e.c0 + e.c1) / 2 * T,
        base: 8 * T - h, y: 8 * T - h, w: 36, h: h, dir: i % 2 ? 1 : -1, dead: 0, gone: false, t: i,
        hop: !!e.hop, lift: 0, hv: 0, hopT: 0.6 + (i * 0.37) % 1 };
    });
    fruit = LEVEL.foods.map(function (f, i) {
      return { kind: THEME.collect[i % THEME.collect.length], x: f.c * T + T / 2, y: f.r * T + T / 2, got: false };
    });
    paws = LEVEL.paws.map(function (w) { return { x: w.c * T + T / 2, y: w.r * T + T / 2, got: false }; });
    p.x = p.safeX = LEVEL.start.c * T;
    p.y = p.safeY = LEVEL.start.r * T - p.h;
    p.vx = p.vy = 0;
    camX = 0;
    flagArmed = true;
    paintPipes();
  }

  /* ---------- Colours on the pipes ---------- */
  function paintPipes() {
    var me = state.house || 'FIRE';
    var others = ORDER.filter(function (h) { return h !== me; });
    var k = 0;
    LEVEL.pipes.forEach(function (pp) { pp.house = pp.own ? me : others[k++ % others.length]; });
  }

  /* ---------- Tiles ---------- */
  function solid(c, r) {
    if (c < 0 || c >= COLS) return true;
    if (r < 0 || r >= ROWS) return false;
    return grid[r][c] !== EMPTY;
  }
  function hits(x, y, w, h) {
    var c0 = Math.floor(x / T), c1 = Math.floor((x + w - 0.001) / T);
    var r0 = Math.floor(y / T), r1 = Math.floor((y + h - 0.001) / T);
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (solid(c, r)) return true;
    return false;
  }
  function pipeUnder() {
    var r = Math.round((p.y + p.h) / T);
    for (var i = 0; i < LEVEL.pipes.length; i++) {
      var pp = LEVEL.pipes[i];
      if (pp.top === r && p.x + p.w > pp.c * T + 4 && p.x < (pp.c + 2) * T - 4) return pp;
    }
    return null;
  }

  /* ---------- Update ---------- */
  function update(dt) {
    LEVEL.pipes.forEach(function (pp) { if (pp.shake > 0) pp.shake -= dt; });
    confetti.forEach(function (b) { b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.spin * dt; b.life -= dt; });
    confetti = confetti.filter(function (b) { return b.life > 0; });
    floaters.forEach(function (f) { f.y -= 40 * dt; f.life -= dt; });
    floaters = floaters.filter(function (f) { return f.life > 0; });
    foes.forEach(function (e) { if (e.dead > 0) { e.dead -= dt; if (e.dead <= 0) e.gone = true; } });
    if (p.hurt > 0) p.hurt -= dt;
    if (cheerT > 0) cheerT -= dt;
    if (p.squash > 0) p.squash = Math.max(0, p.squash - dt);

    if (p.state === 'enter') {            // ease in: slow start, then gone
      p.sink = Math.min(p.sink + dt / 0.45, 1);
      p.y = p.exitY + 64 * p.sink * p.sink;
      if (p.sink >= 1) { p.state = 'inside'; openQuestion(p.pipe.q); }
      return;
    }
    if (p.state === 'exit') {             // pop out with a little overshoot
      p.sink = Math.min(p.sink + dt / 0.4, 1);
      var k = p.sink - 1;
      p.y = p.exitY + 64 * (1 - (1 + 2.2 * k * k * k + 1.2 * k * k));
      if (p.sink >= 1) { p.y = p.exitY; p.state = 'play'; p.squash = 0.14; }
      return;
    }
    if (p.state !== 'play') return;

    var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (p.knock > 0) { p.knock -= dt; dir = 0; }
    else {
      if (dir) p.facing = dir;
      var accel = p.onGround ? 2400 : 1600;
      var target = dir * SPEED;
      if (p.vx < target) p.vx = Math.min(target, p.vx + accel * dt);
      else if (p.vx > target) p.vx = Math.max(target, p.vx - accel * dt);
    }

    // Forgiving jumps: a moment of grace after walking off an edge, and a
    // press just before landing still counts.
    p.coyote = p.onGround ? 0.1 : p.coyote - dt;
    p.buffer -= dt;
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -JUMP; p.buffer = 0; p.coyote = 0; p.onGround = false;
      sfx('jump');
    }
    if (!keys.jump && p.vy < -TAP_CAP) p.vy = -TAP_CAP;   // let go early, hop lower

    p.x += p.vx * dt;
    if (hits(p.x, p.y, p.w, p.h)) {
      p.x = p.vx > 0 ? Math.floor((p.x + p.w) / T) * T - p.w : (Math.floor(p.x / T) + 1) * T;
      p.vx = 0;
      p.push = p.onGround && dir ? (p.push || 0) + dt : 0;
      if (p.push > 0.9 && !p.toldHold) { p.toldHold = true; toast('Hold Jump down to jump higher!'); }
    } else {
      p.push = 0;
    }
    var falling = p.vy;
    var prevBottom = p.y + p.h;
    p.vy = Math.min(p.vy + G * dt, MAX_FALL);
    p.y += p.vy * dt;
    var was = p.onGround;
    p.onGround = false;
    if (hits(p.x, p.y, p.w, p.h)) {
      if (p.vy > 0) {
        p.y = Math.floor((p.y + p.h) / T) * T - p.h;
        p.onGround = true;
        if (!was && falling > 500) p.squash = 0.14;
      } else {
        p.y = (Math.floor(p.y / T) + 1) * T;
      }
      p.vy = 0;
    }
    if (dir && p.onGround) p.walk += Math.abs(p.vx) * dt * 0.06;

    moveFoes(dt);
    touchFoes(prevBottom);
    collectFruit();
    collectPaws();

    if (p.onGround) { p.safeX = p.x; p.safeY = p.y; }
    if (p.y > ROWS * T + 80) {
      p.x = p.safeX - p.facing * 24; p.y = p.safeY; p.vx = 0; p.vy = 0;
      if (hits(p.x, p.y, p.w, p.h)) p.x = p.safeX;
      p.hurt = 1.2;
      toast('Whoops! Try that jump again.');
    }

    p.onPipe = p.onGround ? pipeUnder() : null;
    var ready = !!(p.onPipe && p.onPipe.own && !done(p.onPipe.q));
    $('#goIn').classList.toggle('ready', ready);
    if (ready && !told.goIn) { told.goIn = true; toast('Tap Go in to open the chest!'); }
    if (!told.foe && $('#toast').hidden && foes.some(function (e) {
      return !e.gone && e.x > p.x && e.x - p.x < 5 * T;
    })) { told.foe = true; toast('Watch out! Jump on top to squash it.'); }
    p.downBuf -= dt;
    if (p.downBuf > 0 && p.onPipe) { p.downBuf = 0; tryPipe(p.onPipe); }

    var flagX = LEVEL.flag.c * T + T / 2;
    if (!flagArmed && p.x < flagX - 2.5 * T) flagArmed = true;
    if (flagArmed && p.x + p.w > flagX) { flagArmed = false; celebrate(flagX); }
  }

  /* ---------- Theme: fruit to collect, unhealthy foods to squash ---------- */
  function moveFoes(dt) {
    foes.forEach(function (e) {
      if (e.gone || e.dead > 0) return;
      e.t += dt;
      e.x += e.dir * LEVEL.speed * dt;
      if (e.hop) {                                     // a small hop every second or so
        e.hopT -= dt;
        if (e.lift <= 0 && e.hopT <= 0) { e.hv = 430; e.hopT = 1.1 + (e.t * 7) % 0.8; }
        if (e.hv || e.lift > 0) {
          e.lift += e.hv * dt; e.hv -= G * dt;
          if (e.lift <= 0) { e.lift = 0; e.hv = 0; }
        }
        e.y = e.base - e.lift;
      }
      if (e.x < e.x0) { e.x = e.x0; e.dir = 1; }
      if (e.x + e.w > e.x1) { e.x = e.x1 - e.w; e.dir = -1; }
    });
  }
  function touchFoes(prevBottom) {
    foes.forEach(function (e) {
      if (e.gone || e.dead > 0) return;
      if (p.x >= e.x + e.w || p.x + p.w <= e.x || p.y >= e.y + e.h || p.y + p.h <= e.y) return;
      if (p.vy > 0 && prevBottom <= e.y + 12) {          // landed on top: squash
        e.dead = 0.4;
        p.vy = keys.jump ? -760 : -520;
        p.onGround = false;
        burst(e.x + e.w / 2, e.y + e.h / 2, ['#FFFFFF', '#FFD43B', '#DEE2E6'], 14);
        sfx('squash');
        if (!told.squash) { told.squash = true; toast('Squash! That got rid of it.'); }
        return;
      }
      if (p.hurt > 0) return;                            // shield after a bump
      e.dir = e.x + e.w / 2 > p.x + p.w / 2 ? 1 : -1;    // it walks away, so a pit can't trap anyone
      p.hurt = 2;
      p.knock = 0.3;
      p.vx = (p.x + p.w / 2 < e.x + e.w / 2 ? -1 : 1) * 260;
      p.vy = -420;
      sfx('bump');
      if (state.gems > 0) {
        state.gems--;
        state.bumps++;
        paintGems(true);
        float(p.x + p.w / 2, p.y - 12, '-1', '#C92A2A');
        toast('Ouch! You lost a point. Jump on top instead!');
      } else {
        toast('Oops! Jump on top to squash it.');
      }
    });
  }
  function collectFruit() {
    fruit.forEach(function (f) {
      if (f.got) return;
      if (f.x < p.x - 14 || f.x > p.x + p.w + 14 || f.y < p.y - 14 || f.y > p.y + p.h + 14) return;
      f.got = true;
      state.foods++;
      $('#foodNum').textContent = String(state.foods);
      burst(f.x, f.y, ['#FFD43B', '#FFFFFF', '#69DB7C'], 10);
      var point = state.foods % THEME.perPoint === 0;
      sfx(point ? 'point' : 'fruit');
      if (point) {
        state.gems++;
        state.bonus++;
        paintGems();
        float(f.x, f.y - 22, '+1', '#2B8A3E');
      }
      if (!told.fruit) {
        told.fruit = true;
        toast('Yum! ' + THEME.perPoint + ' fruit and veg win 1 point.');
      }
    });
  }
  function collectPaws() {
    paws.forEach(function (w) {
      if (w.got) return;
      if (w.x < p.x - 14 || w.x > p.x + p.w + 14 || w.y < p.y - 14 || w.y > p.y + p.h + 14) return;
      w.got = true;
      state.paws++;
      burst(w.x, w.y, [ART.GOLD, '#FFFFFF', '#FFD43B'], 16);
      sfx('paw');
      toast('A golden paw! ' + state.paws + ' of ' + paws.length + ' found.');
    });
  }
  function burst(x, y, cols, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 200;
      confetti.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, a: 0, spin: 0,
        life: 0.45 + Math.random() * 0.3, c: cols[i % cols.length], round: true });
    }
  }
  function float(x, y, text, col) { floaters.push({ x: x, y: y, text: text, col: col, life: 1.1 }); }

  function tryPipe(pp) {
    var mine = Q.HOUSES[state.house];
    if (!pp.own) {
      pp.shake = 0.4;
      toast('That pipe is ' + Q.HOUSES[pp.house].colour + '. Find a ' + mine.colour + ' one!');
      return;
    }
    if (done(pp.q)) {
      toast('Done already! Find another ' + mine.colour + ' pipe.');
      return;
    }
    p.state = 'enter';
    p.pipe = pp;
    p.sink = 0;
    p.vx = 0;
    p.exitY = p.y;
    p.x = pp.c * T + T - p.w / 2;
    releaseKeys();
  }

  /* ---------- Drawing ---------- */
  function rrect(x, y, w, h, r) {
    var tl = r, tr = r, br = r, bl = r;
    if (typeof r === 'object') { tl = r[0]; tr = r[1]; br = r[2]; bl = r[3]; }
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br); ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl); ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function fillStroke(fill, lw) {
    ctx.fillStyle = fill; ctx.fill();
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = LINE; ctx.stroke(); }
  }

  function drawSky(vh) {
    var g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, '#86CCFF');
    g.addColorStop(1, '#E2F4FF');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW + 2, vh);

    // far away: our school on the horizon, every 1500 px
    var fx = camX * 0.25;
    for (var k = Math.floor((fx - 400) / 1500); k <= Math.floor((fx + viewW) / 1500) + 1; k++) {
      drawSchool(k * 1500 + 500 - fx, 8 * T - 8);
    }
    // clouds
    var cx = camX * 0.12;
    for (var j = Math.floor((cx - 300) / 380); j <= Math.floor((cx + viewW) / 380) + 1; j++) {
      var seed = Math.abs(Math.sin(j * 12.9898) * 43758.5453) % 1;
      drawCloud(j * 380 + seed * 120 - cx, 40 + seed * 90, 0.8 + seed * 0.5);
    }
    // hills
    var hx = camX * 0.45;
    for (var i = Math.floor((hx - 400) / 460); i <= Math.floor((hx + viewW) / 460) + 1; i++) {
      var s2 = Math.abs(Math.sin(i * 78.233) * 12543.21) % 1;
      ctx.beginPath();
      ctx.ellipse(i * 460 - hx, 8 * T + 10, 190 + s2 * 70, 90 + s2 * 60, 0, Math.PI, 0);
      ctx.fillStyle = i % 2 ? '#B6E7A9' : '#A5DE97';
      ctx.fill();
    }
  }
  function drawCloud(x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    circle(x, y, 22 * s); ctx.fill();
    circle(x + 26 * s, y - 10 * s, 28 * s); ctx.fill();
    circle(x + 56 * s, y, 22 * s); ctx.fill();
    rrect(x - 8 * s, y, 84 * s, 22 * s, 11 * s); ctx.fill();
  }
  function drawSchool(x, base) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#C9D3F0';
    rrect(x - 150, base - 130, 300, 130, [14, 14, 0, 0]); ctx.fill();
    // tower with the MNS crest
    rrect(x - 36, base - 200, 72, 90, [12, 12, 0, 0]); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 46, base - 196); ctx.lineTo(x, base - 236); ctx.lineTo(x + 46, base - 196); ctx.closePath();
    ctx.fillStyle = '#B3BFE6'; ctx.fill();
    drawBaked(CREST, x, base - 134, 54);
    ctx.fillStyle = '#EEF2FF';
    for (var w = 0; w < 4; w++) {
      rrect(x - 128 + w * 30, base - 104, 20, 24, 5); ctx.fill();
      rrect(x + 48 + w * 22, base - 104, 14, 24, 5); ctx.fill();
    }
    ctx.fillStyle = '#9AA7D6';
    rrect(x - 16, base - 52, 32, 52, [14, 14, 0, 0]); ctx.fill();
    ctx.restore();
  }

  function drawTiles(c0, c1) {
    for (var r = 0; r < ROWS; r++) {
      for (var c = c0; c <= c1; c++) {
        var v = grid[r][c];
        if (v === GROUND) drawGround(c, r);
        else if (v === BLOCK) drawBlock(c, r);
      }
    }
  }
  function isGround(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS && grid[r][c] === GROUND; }
  function drawGround(c, r) {
    var x = c * T, y = r * T;
    var top = !isGround(c, r - 1);
    ctx.fillStyle = '#D9A066';
    ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    ctx.fillStyle = 'rgba(110,58,21,.22)';
    circle(x + (c % 2 ? 12 : 30), y + 30, 4); ctx.fill();
    circle(x + (c % 2 ? 34 : 14), y + (r % 2 ? 14 : 38), 3); ctx.fill();
    ctx.strokeStyle = '#7A4A1F'; ctx.lineWidth = 3;
    if (!isGround(c - 1, r)) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + T); ctx.stroke(); }
    if (!isGround(c + 1, r)) { ctx.beginPath(); ctx.moveTo(x + T, y); ctx.lineTo(x + T, y + T); ctx.stroke(); }
    if (top) {
      var l = !isGround(c - 1, r) || isGround(c - 1, r - 1);
      var rt = !isGround(c + 1, r) || isGround(c + 1, r - 1);
      rrect(x - (l ? 2 : 0), y - 4, T + (l ? 2 : 0) + (rt ? 2 : 0), 17, [l ? 9 : 0, rt ? 9 : 0, rt ? 9 : 0, l ? 9 : 0]);
      ctx.fillStyle = '#5FCB68'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#2B8A3E'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      rrect(x + 6, y - 1, T - 16, 4, 2); ctx.fill();
    }
  }
  function drawBlock(c, r) {
    var x = c * T, y = r * T;
    rrect(x + 2, y + 2, T - 4, T - 4, 11);
    fillStroke('#FFC46B', 3);
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    rrect(x + 9, y + 8, 14, 6, 3); ctx.fill();
    ctx.fillStyle = 'rgba(122,74,31,.35)';
    circle(x + T - 13, y + T - 13, 3.5); ctx.fill();
  }

  function drawPipe(pp) {
    var col = PAINT[pp.house];
    var wob = pp.shake > 0 ? Math.sin(time * 70) * 3 : 0;
    var x = pp.c * T + wob, y = pp.top * T, w = 2 * T, h = (pp.bottom - pp.top + 1) * T;
    var rim = 26;
    rrect(x + 6, y + rim - 6, w - 12, h - rim + 6, [0, 0, 4, 4]);
    fillStroke(col.main, 3);
    ctx.fillStyle = col.light;
    ctx.fillRect(x + 15, y + rim, 9, h - rim - 3);
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    ctx.fillRect(x + w - 26, y + rim, 12, h - rim - 3);
    rrect(x, y, w, rim, 10);
    fillStroke(col.main, 3);
    ctx.fillStyle = col.light;
    rrect(x + 9, y + 5, 11, rim - 10, 4); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    rrect(x + w - 22, y + 5, 12, rim - 10, 4); ctx.fill();
  }

  function drawGem(x, y, s, fill) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-10, -6); ctx.lineTo(-5, -12); ctx.lineTo(5, -12); ctx.lineTo(10, -6); ctx.lineTo(0, 10); ctx.closePath();
    fillStroke(fill, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(-2, -6); ctx.lineTo(0, 10); ctx.lineTo(-10, -6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawFlag() {
    var x = LEVEL.flag.c * T + T / 2, top = 2 * T, base = 8 * T;
    var col = PAINT[state.house || 'FIRE'];
    rrect(x - 4, top, 8, base - top, 4);
    fillStroke('#F1F3F5', 2.5);
    var wave = Math.sin(time * 4) * 4;
    ctx.beginPath();
    ctx.moveTo(x + 4, top + 8);
    ctx.quadraticCurveTo(x + 40, top + 4 + wave, x + 70, top + 22);
    ctx.quadraticCurveTo(x + 40, top + 40 - wave, x + 4, top + 44);
    ctx.closePath();
    fillStroke(col.main, 3);
    drawBaked(CREST, x + 32, top + 42, 32);
    circle(x, top - 6, 9); fillStroke('#FFD43B', 2.5);
    rrect(x - 20, base - 16, 40, 16, [8, 8, 0, 0]); fillStroke('#FFC46B', 3);
  }

  /* ---------- Theme sprites: about 30 units across, centred on (x, y) ---------- */
  function blob(parts, fill) {          // overlapping circles with one outline round the lot
    parts.forEach(function (c) { circle(c[0], c[1], c[2] + 1.3); ctx.fillStyle = LINE; ctx.fill(); });
    parts.forEach(function (c) { circle(c[0], c[1], c[2] - 1.2); ctx.fillStyle = fill; ctx.fill(); });
  }
  function drawFood(kind, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    circle(0, 0, 19); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
    if (kind === 'apple') {
      ctx.beginPath(); ctx.moveTo(0, -7);
      ctx.bezierCurveTo(-6, -13, -15, -8, -13, 2); ctx.bezierCurveTo(-11, 11, -4, 14, 0, 11);
      ctx.bezierCurveTo(4, 14, 11, 11, 13, 2); ctx.bezierCurveTo(15, -8, 6, -13, 0, -7);
      ctx.closePath(); fillStroke('#E5383B', 2.5);
      ctx.strokeStyle = '#6E3A15'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(1, -13); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(6, -13, 5, 2.6, -0.5, 0, Math.PI * 2); fillStroke('#51CF66', 2);
    } else if (kind === 'carrot') {
      [-5, 0, 5].forEach(function (dx) {
        ctx.beginPath(); ctx.ellipse(dx, -13, 2.4, 5.5, dx * 0.09, 0, Math.PI * 2); fillStroke('#51CF66', 2);
      });
      ctx.beginPath(); ctx.moveTo(-8, -8); ctx.quadraticCurveTo(0, -11, 8, -8);
      ctx.lineTo(1.5, 13); ctx.quadraticCurveTo(0, 15, -1.5, 13); ctx.closePath();
      fillStroke('#FD7E14', 2.5);
      ctx.strokeStyle = 'rgba(122,58,0,.55)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(-1, -2); ctx.moveTo(1, 4); ctx.lineTo(4, 4); ctx.stroke();
    } else if (kind === 'banana') {
      ctx.beginPath(); ctx.moveTo(-11, -10);
      ctx.quadraticCurveTo(-11, 12, 13, 8); ctx.quadraticCurveTo(-1, 5, -5, -11);
      ctx.closePath(); fillStroke('#FFD43B', 2.5);
      ctx.fillStyle = '#6E3A15'; circle(-8, -11, 2.2); ctx.fill(); circle(13, 8, 1.8); ctx.fill();
    } else if (kind === 'broccoli') {
      rrect(-4, 0, 8, 13, 3); fillStroke('#A9E34B', 2.5);
      blob([[-7, -3, 7], [7, -3, 7], [0, -8, 8], [-2, 1, 6], [3, 1, 6]], '#2F9E44');
      ctx.fillStyle = 'rgba(255,255,255,.3)'; circle(-3, -9, 2.5); ctx.fill();
    } else if (kind === 'strawberry') {
      ctx.beginPath(); ctx.moveTo(0, 13);
      ctx.bezierCurveTo(-14, 2, -13, -9, -5, -9); ctx.lineTo(5, -9); ctx.bezierCurveTo(13, -9, 14, 2, 0, 13);
      ctx.closePath(); fillStroke('#F03E3E', 2.5);
      ctx.fillStyle = '#FFE066';
      [[-5, -3], [3, -4], [-1, 2], [5, 3], [-4, 6], [1, 8]].forEach(function (d) { circle(d[0], d[1], 1.1); ctx.fill(); });
      ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(-3, -12); ctx.lineTo(0, -16); ctx.lineTo(3, -12);
      ctx.lineTo(8, -9); ctx.lineTo(0, -7); ctx.closePath(); fillStroke('#51CF66', 2);
    } else {
      circle(0, 1, 12); fillStroke('#FF922B', 2.5);
      ctx.fillStyle = 'rgba(255,255,255,.45)'; circle(-4, -3, 3); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4, -12, 4.5, 2.4, -0.4, 0, Math.PI * 2); fillStroke('#51CF66', 2);
    }
    ctx.restore();
  }

  function foeEyes(y, dir) {
    [-6, 6].forEach(function (x) {
      ctx.beginPath(); ctx.ellipse(x, y, 4, 4.6, 0, 0, Math.PI * 2); fillStroke('#FFFFFF', 2);
      ctx.fillStyle = LINE; circle(x + dir * 1.6, y + 0.8, 2); ctx.fill();
    });
    ctx.strokeStyle = LINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, y + 5, 3, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  }
  /* Feet on the ground at (0, 0), about 40 wide and 36 tall. */
  function drawFoe(e) {
    var dying = e.dead > 0;
    var bob = dying ? 0 : Math.abs(Math.sin(e.t * 8)) * 2;
    var step = dying ? 0 : Math.sin(e.t * 8) * 3;
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h);
    if (e.lift > 0) {                                  // shadow left on the ground by a hopper
      ctx.fillStyle = 'rgba(36,33,59,.18)';
      ctx.beginPath(); ctx.ellipse(0, e.lift, Math.max(8, 18 - e.lift / 6), 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (dying) ctx.scale(1.15, 0.35);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = LINE;
    ctx.beginPath(); ctx.ellipse(-8 + step, -2.5, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8 - step, -2.5, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, -bob);
    var k = e.kind;
    if (k === 'burger') {
      rrect(-18, -12, 36, 9, [2, 2, 6, 6]); fillStroke('#E8A33D', 2.5);
      rrect(-19, -18, 38, 7, 3); fillStroke('#7A3E1B', 2.5);
      ctx.beginPath(); ctx.moveTo(-20, -19);
      for (var i = 0; i < 5; i++) ctx.quadraticCurveTo(-16 + i * 8, -14, -12 + i * 8, -19);
      ctx.lineTo(20, -21); ctx.lineTo(-20, -21); ctx.closePath(); fillStroke('#69DB7C', 2);
      ctx.beginPath(); ctx.moveTo(-16, -21); ctx.lineTo(16, -21); ctx.lineTo(8, -16); ctx.lineTo(2, -20);
      ctx.lineTo(-6, -15); ctx.closePath(); fillStroke('#FFD43B', 2);
      ctx.beginPath(); ctx.moveTo(-19, -21); ctx.quadraticCurveTo(-19, -39, 0, -39);
      ctx.quadraticCurveTo(19, -39, 19, -21); ctx.closePath(); fillStroke('#F0B04A', 2.5);
      ctx.fillStyle = '#FFF3D6';
      [[-12, -30], [-1, -36], [12, -31], [9, -24]].forEach(function (d) {
        ctx.beginPath(); ctx.ellipse(d[0], d[1], 1.8, 1, 0.4, 0, Math.PI * 2); ctx.fill();
      });
      foeEyes(-30.5, e.dir);
    } else if (k === 'doughnut') {
      circle(0, -19, 17); fillStroke('#D9974E', 2.5);
      ctx.beginPath();
      for (var a = 0; a <= 64; a++) {
        var ang = a / 64 * Math.PI * 2, r = 13.5 + Math.sin(ang * 7) * 1.4;
        ctx.lineTo(Math.cos(ang) * r, -19 + Math.sin(ang) * r);
      }
      ctx.closePath(); fillStroke('#F783AC', 2);
      circle(0, -16, 4.5); fillStroke('#B8753A', 2);
      var cols = ['#FFFFFF', '#FFD43B', '#4DABF7', '#69DB7C'];
      [[-11, -16, 0.5], [10, -15, -0.6], [-7, -8, 1.2], [6, -8, 0.2], [0, -30, 1.5], [-12, -24, -0.3], [12, -23, 0.8]].forEach(function (d, i) {
        ctx.save(); ctx.translate(d[0], d[1]); ctx.rotate(d[2]);
        ctx.fillStyle = cols[i % cols.length]; rrect(-2.5, -1, 5, 2, 1); ctx.fill(); ctx.restore();
      });
      foeEyes(-25, e.dir);
    } else if (k === 'fizzy') {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      [[-6, -46, 2.2], [-2, -51, 1.8], [-6, -55, 1.4]].forEach(function (b) { circle(b[0], b[1], b[2]); ctx.fill(); });
      ctx.lineCap = 'round';
      ctx.strokeStyle = LINE; ctx.lineWidth = 6.5;
      ctx.beginPath(); ctx.moveTo(3, -40); ctx.lineTo(8, -55); ctx.lineTo(13, -57); ctx.stroke();
      ctx.strokeStyle = '#FF6B6B'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(3, -40); ctx.lineTo(8, -55); ctx.lineTo(13, -57); ctx.stroke();
      rrect(-12, -38, 24, 36, 6); fillStroke('#7048E8', 2.5);
      rrect(-10, -41, 20, 5, 2); fillStroke('#DEE2E6', 2);
      ctx.fillStyle = '#9775FA'; ctx.fillRect(-10.5, -15, 21, 7);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; rrect(-8, -34, 4, 16, 2); ctx.fill();
      foeEyes(-27, e.dir);
    } else {
      ctx.beginPath(); ctx.moveTo(-14, -17); ctx.lineTo(14, -17); ctx.lineTo(10, -2); ctx.lineTo(-10, -2);
      ctx.closePath(); fillStroke('#4DABF7', 2.5);
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -15); ctx.lineTo(-5, -4); ctx.moveTo(0, -15); ctx.lineTo(0, -4);
      ctx.moveTo(6, -15); ctx.lineTo(5, -4); ctx.stroke();
      blob([[-10, -21, 7], [0, -22, 8], [10, -21, 7], [-5, -29, 7], [5, -29, 7], [0, -35, 6]], '#FFC9DE');
      ctx.strokeStyle = '#2B8A3E'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(2, -44); ctx.quadraticCurveTo(4, -50, 8, -51); ctx.stroke();
      circle(2, -43, 4); fillStroke('#E03131', 2);
      foeEyes(-25, e.dir);
    }
    ctx.restore();
  }

  function drawPlayer() {
    if (p.hurt > 0 && Math.floor(p.hurt * 12) % 2 === 0) return;   // flashing shield
    var moving = p.onGround && Math.abs(p.vx) > 20;
    var pose = cheerT > 0 ? 'cheer'
      : !p.onGround && p.state === 'play' ? 'jump'
      : moving ? (Math.sin(p.walk) > 0 ? 'walkA' : 'walkB')
      : time % 3.4 < 0.13 ? 'blink' : 'idle';
    var cv = WAFI[pose];
    if (!cv || !cv.ready) return;
    var hop = cheerT > 0 ? Math.abs(Math.sin(cheerT * 9)) * 18 : 0;
    var sq = p.squash, h = WAFI_H, w = h * cv.width / cv.height;
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h - hop);
    ctx.scale(-p.facing * (1 + sq), 1 - sq * 1.2);
    ctx.drawImage(cv, -w / 2, -h * 146 / 150, w, h);    // feet sit at y 146 of the 150 viewBox
    ctx.restore();
  }

  function drawPaw(x, y, spin) {
    ctx.save();
    ctx.translate(x, y);
    circle(0, 0, 21); ctx.fillStyle = 'rgba(255,212,59,.35)'; ctx.fill();
    ctx.rotate(spin);
    ctx.scale(1.25, 1.25);
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(0, 4, 8, 6.5, 0, 0, Math.PI * 2); fillStroke(ART.GOLD, 2.5);
    [[-8, -3, 3.2], [-3, -9, 3.4], [3, -9, 3.4], [8, -3, 3.2]].forEach(function (t) {
      circle(t[0], t[1], t[2]); fillStroke(ART.GOLD, 2.5);
    });
    ctx.restore();
  }

  function drawArrow(x, y) {
    var b = Math.sin(time * 6) * 4;
    ctx.save();
    ctx.translate(x, y + b);
    ctx.beginPath();
    ctx.moveTo(-9, -14); ctx.lineTo(9, -14); ctx.lineTo(9, -2); ctx.lineTo(16, -2);
    ctx.lineTo(0, 12); ctx.lineTo(-16, -2); ctx.lineTo(-9, -2); ctx.closePath();
    fillStroke('#FFFFFF', 3);
    ctx.restore();
  }

  function draw() {
    var vh = ROWS * T;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    drawSky(vh);
    ctx.save();
    ctx.translate(-Math.round(camX), 0);
    var c0 = Math.max(0, Math.floor(camX / T) - 1), c1 = Math.min(COLS - 1, Math.ceil((camX + viewW) / T) + 1);
    drawTiles(c0, c1);
    drawFlag();
    fruit.forEach(function (f, i) {
      if (!f.got && f.x > camX - T && f.x < camX + viewW + T) drawFood(f.kind, f.x, f.y + Math.sin(time * 3 + i) * 3);
    });
    paws.forEach(function (w, i) {
      if (!w.got && w.x > camX - T && w.x < camX + viewW + T) drawPaw(w.x, w.y + Math.sin(time * 2.5 + i) * 3, Math.sin(time * 2 + i) * 0.2);
    });
    foes.forEach(function (e) {
      if (!e.gone && e.x > camX - 2 * T && e.x < camX + viewW + T) drawFoe(e);
    });
    drawPlayer();
    LEVEL.pipes.forEach(function (pp) {
      if ((pp.c + 2) * T < camX - T || pp.c * T > camX + viewW + T) return;
      drawPipe(pp);
      if (pp.own && done(pp.q)) {
        drawGem(pp.c * T + T, pp.top * T - 74 + Math.sin(time * 3 + pp.c) * 4, 1.1, PAINT[pp.house].main);
      }
    });
    confetti.forEach(function (b) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.fillStyle = b.c;
      if (b.round) { circle(0, 0, 3.5); ctx.fill(); } else { rrect(-6, -4, 12, 8, 2.5); ctx.fill(); }
      ctx.restore();
    });
    ctx.font = '700 26px ' + FONT;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    floaters.forEach(function (f) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.lineWidth = 6; ctx.strokeStyle = '#FFFFFF'; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;
    if (p.state === 'play' && p.onPipe && p.onPipe.own && !done(p.onPipe.q)) {
      drawArrow(p.x + p.w / 2, p.y - 30);
    }
    ctx.restore();
  }

  function frame(ts) {
    var dt = Math.min((ts - (frame.last || ts)) / 1000, 1 / 30);
    frame.last = ts;
    time += dt;
    update(dt);
    var target = p.x + p.w / 2 - viewW * 0.4;
    camX = Math.max(0, Math.min(COLS * T - viewW, target));
    draw();
    window.requestAnimationFrame(frame);
  }

  function resize() {
    var stage = $('#stage');
    var cssW = stage.clientWidth;
    var room = window.innerHeight - stage.getBoundingClientRect().top - window.scrollY -
      $('.pad').offsetHeight - 40;
    var tall = cssW < 600 ? cssW * 1.3 : cssW * 0.85;   // phones are narrow: give the game height instead
    var cssH = Math.max(240, Math.min(tall, room, 720));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scale = cssH / (ROWS * T);
    viewW = cssW / scale;
  }

  /* ---------- Controls ---------- */
  function releaseKeys() {
    keys.left = keys.right = keys.jump = keys.down = false;
    $$('.ctl').forEach(function (b) { b.classList.remove('held'); });
  }
  function press(k, on) {
    if (on && !$('#toast').hidden && Date.now() - toastAt > 1500) $('#toast').hidden = true;
    if (on && !keys[k]) {
      if (k === 'jump') p.buffer = 0.13;
      if (k === 'down') p.downBuf = 0.15;
    }
    keys[k] = on;
  }
  $$('.ctl').forEach(function (b) {
    var k = b.dataset.k;
    var down = function (e) {
      e.preventDefault();
      if (b.setPointerCapture && e.pointerId !== undefined) { try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      b.classList.add('held');
      press(k, true);
    };
    var up = function () { b.classList.remove('held'); press(k, false); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });
  var KEYMAP = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
    ArrowUp: 'jump', w: 'jump', ' ': 'jump', ArrowDown: 'down', s: 'down' };
  document.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.key];
    if (!k || p.state !== 'play' || document.activeElement.tagName === 'INPUT') return;
    e.preventDefault();
    press(k, true);
  });
  document.addEventListener('keyup', function (e) {
    var k = KEYMAP[e.key];
    if (k) press(k, false);
  });

  /* ---------- Messages ---------- */
  var toastTimer = null, toastAt = 0;
  function toast(text, ms) {
    toastAt = Date.now();
    $('#toastText').textContent = text;
    $('#toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('#toast').hidden = true; }, ms || 5500);
  }
  $('#toastSay').addEventListener('click', function () { Q.speak($('#toastText').textContent); });

  /* ---------- Panels ---------- */
  var PANELS = ['#startPanel', '#pipeModal', '#treasurePanel'];
  function showPanel(id) {
    PANELS.forEach(function (s) { $(s).hidden = s !== id; });
    releaseKeys();
    if (id) {
      var h = $(id + ' h2');
      if (h) h.focus({ preventScroll: true });
    }
  }

  function paintGems(lost) {
    $('#gemCount').textContent = String(state.gems);
    var pill = $('#gemPill');
    pill.classList.remove('pop', 'lose');
    void pill.offsetWidth;
    pill.classList.add(lost ? 'lose' : 'pop');
  }

  function paintChests() {
    $('#chestNum').textContent = solvedCount() + '/' + OWN_COUNT;
  }

  /* ---------- Sound effects: off until the pupil turns them on ----------
     Short notes made with the Web Audio API, so there are no sound files.
     Each entry: oscillator type, then [frequency, start, length] notes. */
  var SFX = {
    jump:   ['square',   [[392, 0, 0.07], [587, 0.05, 0.08]]],
    fruit:  ['triangle', [[880, 0, 0.08], [1319, 0.06, 0.1]]],
    point:  ['triangle', [[659, 0, 0.08], [880, 0.07, 0.08], [1175, 0.14, 0.14]]],
    squash: ['square',   [[220, 0, 0.06], [147, 0.05, 0.1]]],
    bump:   ['sawtooth', [[196, 0, 0.12], [131, 0.1, 0.2]]],
    wrong:  ['triangle', [[330, 0, 0.12], [262, 0.11, 0.18]]],
    chest:  ['triangle', [[523, 0, 0.1], [659, 0.09, 0.1], [784, 0.18, 0.1], [1047, 0.27, 0.3]]],
    paw:    ['sine',     [[988, 0, 0.1], [1319, 0.08, 0.1], [1568, 0.16, 0.22]]],
    flag:   ['triangle', [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.14], [784, 0.52, 0.1], [1047, 0.62, 0.45]]]
  };
  var audio = null, soundOn = false;
  function sfx(name) {
    if (!soundOn || !audio || !SFX[name]) return;
    var type = SFX[name][0], peak = type === 'square' || type === 'sawtooth' ? 0.05 : 0.14, t0 = audio.currentTime;
    SFX[name][1].forEach(function (n) {
      var o = audio.createOscillator(), g = audio.createGain(), t = t0 + n[1];
      o.type = type;
      o.frequency.value = n[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + n[2]);
      o.connect(g); g.connect(audio.destination);
      o.start(t); o.stop(t + n[2] + 0.02);
    });
  }
  function toggleSound() {
    var AC = window.AudioContext || window.webkitAudioContext;
    soundOn = !soundOn;
    if (soundOn && !audio) audio = new AC();     // made on a tap, so iPads allow it
    if (soundOn && audio.state === 'suspended') audio.resume();
    var b = $('#soundBtn');
    b.setAttribute('aria-pressed', String(soundOn));
    b.querySelector('use').setAttribute('href', soundOn ? '#i-music' : '#i-music-off');
    sfx('point');
  }

  /* ---------- Sign in: house, year, class code ---------- */
  var pick = { house: null, year: null };
  function signIn() {
    var msg = $('#codeMsg');
    if (!pick.house) { msg.textContent = 'Tap your house first.'; return; }
    if (!pick.year) { msg.textContent = 'Now tap your year.'; return; }
    if (!Q.checkCode(pick.house, pick.year, $('#code').value)) {
      msg.textContent = 'That isn\'t the code for ' + Q.HOUSES[pick.house].name + ', Year ' + pick.year +
        '. Check the card in your classroom.';
      $('#code').select();
      return;
    }
    msg.textContent = '';
    state.house = pick.house;
    state.year = pick.year;
    picks[state.year] = Q.YEARS[state.year].map(function (pool) { return Math.floor(Math.random() * pool.length); });
    document.documentElement.dataset.house = state.house;
    $('#houseBadge').innerHTML = Q.icon(Q.HOUSES[state.house].icon) + '<span class="sr-only">' +
      Q.HOUSES[state.house].name + ', </span><span>Year ' + state.year + '</span>';
    $('#houseBadge').hidden = false;
    resize();              // the HUD has grown: give the park the height that is left
    setupLevel(state.year);
    bakeWafi(state.house);
    $('#tWafi').innerHTML = ART.wafi('cheer', wafiLook(state.house));
    paintChests();
    play();
  }

  function play(message) {
    showPanel(null);
    p.state = 'play';
    toast(message || ('Let\'s find the ' + Q.HOUSES[state.house].colour + ' pipes!'), 8000);
  }

  function choiceRow(host, items, key, label) {
    items.forEach(function (value) {
      var b = Q.el('button', 'pick-btn');
      b.type = 'button';
      b.dataset.value = value;
      b.setAttribute('aria-pressed', 'false');
      label(b, value);
      b.addEventListener('click', function () {
        pick[key] = value;
        $$('button', host).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        $('#codeMsg').textContent = '';
        paintDemoHint();
      });
      host.appendChild(b);
    });
  }
  /* Demo only: the real cards are in the classrooms, so SLT need the code here. */
  function paintDemoHint() {
    var ok = pick.house && pick.year;
    $('#demoHint').hidden = !ok;
    if (ok) $('#demoCode').textContent = Q.CODES[pick.house][pick.year];
  }
  function buildStart() {
    choiceRow($('#housePick'), ORDER, 'house', function (b, h) {
      b.dataset.house = h;
      b.innerHTML = Q.icon(Q.HOUSES[h].icon, 'icon-lg') + '<span>' + Q.HOUSES[h].name + '</span>';
    });
    choiceRow($('#yearPick'), Q.YEAR_LIST, 'year', function (b, y) {
      b.innerHTML = '<span class="yr-small">Year</span><span class="yr-num">' + y + '</span>';
      b.setAttribute('aria-label', 'Year ' + y);
    });
    $('#codeForm').addEventListener('submit', function (e) { e.preventDefault(); signIn(); });
    $('#useDemo').addEventListener('click', function () {
      $('#code').value = Q.CODES[pick.house][pick.year];
      signIn();
    });
  }

  /* ---------- Inside a pipe ----------
     Every year's questions are built up front (hidden), so the scanner can
     check all of them; the game only ever opens the pupil's own year. */
  var cur = { year: null, i: -1, v: 0 };
  var boxes = {};        // year -> [pipe] -> [question box]
  function buildQuestions() {
    var host = $('#qHost');
    $('#pipeChest').innerHTML = Q.chestSvg();
    Q.YEAR_LIST.forEach(function (year) {
      boxes[year] = [];
      got[year] = [];
      Q.YEARS[year].forEach(function (pool, i) {
        boxes[year][i] = [];
        got[year][i] = [];
        pool.forEach(function (chest, v) { addQuestion(host, year, i, v, chest); });
      });
    });
  }
  function addQuestion(host, year, i, v, chest) {
    var cfg = {};
    Object.keys(chest.cfg).forEach(function (k) { cfg[k] = chest.cfg[k]; });
    cfg.onWrong = function () {
      sfx('wrong');
      var svg = $('#pipeModal .chest');
      svg.classList.remove('wobble');
      void svg.getBoundingClientRect();
      svg.classList.add('wobble');
    };
    cfg.onSolve = function (pts) {
      if (got[year][i][v] !== undefined) return;
      got[year][i][v] = pts;
      state.gems += pts;
      state.chestPts += pts;
      sfx('chest');
      if (year === state.year) paintChests();
      if (cur.year === year && cur.i === i && cur.v === v) paintModal();
      if (pts) flyGem();
    };
    var handle = window.Quest.ask(host, cfg);
    handle.el.hidden = true;
    boxes[year][i].push(handle.el);
  }
  /* The gem leaves the chest and lands in the counter, which then ticks up. */
  function flyGem() {
    var from = $('#pipeModal .gem-in'), to = $('#gemPill');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!from || !to || reduce || !from.getBoundingClientRect().width) { paintGems(); return; }
    setTimeout(function () {
      var a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      if (!a.width) { paintGems(); return; }   // pipe already left
      var gem = Q.el('div', 'flying-gem');
      gem.innerHTML = '<svg viewBox="40 16 40 44" aria-hidden="true"><polygon points="60,18 76,34 60,58 44,34" class="gem-body"/>' +
        '<polygon points="60,18 66,34 60,58 54,34" class="gem-shine"/><path d="M44 34 H76" class="gem-line"/></svg>';
      to.classList.add('lift');
      gem.style.left = (a.left + a.width / 2 - 22) + 'px';
      gem.style.top = (a.top + a.height / 2 - 22) + 'px';
      document.body.appendChild(gem);
      var dx = b.left + 24 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      gem.getBoundingClientRect();
      gem.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.55)';
      setTimeout(function () { gem.remove(); paintGems(); }, 650);
      setTimeout(function () { to.classList.remove('lift'); }, 1500);
    }, 650);
  }
  function paintModal() {
    var pts = got[cur.year][cur.i][cur.v], solved = pts !== undefined;
    $('#pipeModal .chest').classList.toggle('open', solved);
    $('#pipeModal .chest').classList.toggle('empty', pts === 0);     // opened, but no gem this time
    var leave = $('#leavePipe');
    leave.innerHTML = solved ? 'Back up the pipe' + Q.icon('i-up') : 'Leave it for now';
    leave.classList.toggle('ghost', !solved);
  }
  function openQuestion(i, year, v) {
    year = year || state.year;
    cur = { year: year, i: i, v: v === undefined ? pickOf(i, year) : v };
    Q.YEAR_LIST.forEach(function (y) {
      boxes[y].forEach(function (pool, j) {
        pool.forEach(function (b, k) { b.hidden = !(y === cur.year && j === i && k === cur.v); });
      });
    });
    var subj = Q.YEARS[cur.year][i][cur.v].subject;
    $('#pipeTitle').textContent = 'You found ' + (/^[AEIOU]/.test(subj) ? 'an ' : 'a ') + subj + ' chest!';
    $('#pipeModal .chest').classList.remove('wobble');
    paintModal();
    showPanel('#pipeModal');
  }
  function leavePipe() {
    showPanel(null);
    if (p.state === 'inside') {
      p.state = 'exit';
      p.sink = 0;
      var left = OWN_COUNT - solvedCount();
      if (done(cur.i)) {
        toast(left ? 'Brilliant! ' + left + ' more ' + Q.HOUSES[state.house].colour + ' ' +
          (left === 1 ? 'pipe' : 'pipes') + ' to find.' : 'You\'ve opened every pipe! Head for the flag.');
      }
    } else if (state.house) {
      p.state = 'play';
    }
  }

  /* The scanner (and nothing else) opens a question without the walk. */
  window.Quest.reveal = function (box) {
    Q.YEAR_LIST.forEach(function (y) {
      boxes[y].forEach(function (pool, i) {
        var v = pool.indexOf(box);
        if (v !== -1) { p.state = 'frozen'; openQuestion(i, y, v); }
      });
    });
  };

  /* ---------- Flag and treasure room ---------- */
  function celebrate(x) {
    p.state = 'frozen';
    p.vx = 0;
    cheerT = 1.1;
    sfx('flag');
    releaseKeys();
    var cols = [PAINT[state.house].main, PAINT[state.house].light, '#FFD43B', '#FFFFFF'];
    for (var i = 0; i < 90; i++) {
      confetti.push({ x: x + 30, y: 2.5 * T, vx: (Math.random() - 0.5) * 520, vy: -300 - Math.random() * 420,
        a: Math.random() * 6, spin: (Math.random() - 0.5) * 14, life: 1.4 + Math.random() * 0.6, c: cols[i % 4] });
    }
    setTimeout(finish, 1100);
  }
  function finish() {
    p.state = 'frozen';
    $('#tGems').textContent = String(state.gems);
    $('#bOpened').textContent = String(solvedCount());
    $('#bQ').textContent = '+' + state.chestPts;
    $('#bBonus').textContent = '+' + state.bonus;
    $('#bBumps').textContent = state.bumps ? '−' + state.bumps : '0';
    var list = $('#tList');
    list.innerHTML = '';
    chests().forEach(function (c, i) {
      var li = Q.el('li', done(i) ? 'got' : '');
      li.innerHTML = Q.icon(done(i) ? 'i-gem' : 'i-lock') + '<span>' + c.subject + '</span>';
      li.setAttribute('aria-label', c.subject + ': ' + (done(i) ? 'answered' : 'still locked'));
      list.appendChild(li);
    });
    $('#tPaws').textContent = state.paws
      ? 'You found ' + state.paws + ' of the ' + paws.length + ' golden paws!'
      : 'There are ' + paws.length + ' golden paws hidden up high. Can you find them?';
    $('#receipt').hidden = true;
    var left = chests().length - solvedCount();
    $('#sendMsg').textContent = left
      ? 'There ' + (left === 1 ? 'is still 1 pipe' : 'are still ' + left + ' pipes') + ' to find. You can keep exploring or send your points now.'
      : '';
    showPanel('#treasurePanel');
  }
  function send() {
    if (!state.house) { $('#sendMsg').textContent = 'Choose your house and year first.'; return; }
    $('#rHouse').textContent = Q.HOUSES[state.house].name;
    $('#rYear').textContent = 'Year ' + state.year;
    $('#rWeek').textContent = '—';
    $('#rGems').textContent = String(state.gems);
    $('#receipt').hidden = false;
    $('#sendMsg').textContent = state.gems + (state.gems === 1 ? ' point' : ' points') + ' for ' + Q.HOUSES[state.house].name + ' house. Well done!';
  }

  /* ---------- Go ---------- */
  $('#hudCrest').innerHTML = ART.crest();
  $('#greetWafi').innerHTML = ART.wafi('head');
  $('#toastWafi').innerHTML = ART.wafi('head');
  if (window.AudioContext || window.webkitAudioContext) $('#soundBtn').addEventListener('click', toggleSound);
  else $('#soundBtn').hidden = true;
  setupLevel(2);          // the park behind the start screen; redone for the pupil's year
  buildStart();
  buildQuestions();
  $('#leavePipe').addEventListener('click', leavePipe);
  $('#sendBtn').addEventListener('click', send);
  $('#keepGoing').addEventListener('click', function () {
    showPanel(null);
    if (state.house) p.state = 'play';
  });
  window.addEventListener('resize', resize);
  resize();
  showPanel('#startPanel');
  window.requestAnimationFrame(frame);
})();
