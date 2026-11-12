/* ============================================================
   House Quest school mode: the school seen from above (demo)

   Wafi walks the MNS school tile by tile, one tile every 150 ms, on two
   floors joined by two stairs; one floor is on screen at a time.
   Doors in the pupil's house colour open on the first bump; doors of the
   other houses stay shut. Tap a tile and Wafi walks there by the shortest
   way; tap a door, chest, rival or the House Cup and he walks up to it and
   uses it. Everything is drawn in code on one canvas, tile by tile.

   The map and the rules that don't need a screen live in school-map.js.
   school-ui.js (sign-in, HUD, questions) listens through School.onBump.
   ============================================================ */
(function () {
  'use strict';

  var M = window.SchoolMap, ART = window.MNSArt, Q = window.Quest, SL = window.SchoolLines;
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };

  var T = 48, STEP_MS = 150, BUMP_GAP = 0.35;
  var LINE = '#2A2745';
  var FONT = "'Century Gothic','CenturyGothic',Futura,'Avenir Next',system-ui,sans-serif";
  var ORDER = ['FIRE', 'WATER', 'AIR', 'EARTH'];
  var PAINT = {
    FIRE:  { main: '#E5383B', dark: '#A4161A', light: '#FF9B9B', icon: 'fire' },
    WATER: { main: '#1C7ED6', dark: '#0B4F8A', light: '#8CCBFF', icon: 'water' },
    AIR:   { main: '#FAB005', dark: '#B07A00', light: '#FFE58A', icon: 'air' },
    EARTH: { main: '#2F9E44', dark: '#1B6B2C', light: '#9BE8A7', icon: 'earth' }
  };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var floor = 'ground', map = M.parse(floor), FD = M.FLOORS[floor];
  var MAP_W = map.w * T, MAP_H = map.h * T;
  var ZONE_BY_ID = {};
  M.ZONES.forEach(function (z) { ZONE_BY_ID[z.id] = z; });

  /* ---------- State ---------- */
  var house = null, year = null;
  var frozen = true, time = 0;
  var opened = {};        // door -> true once opened: own doors by digit, classrooms by room id
  var beaten = {};        // rival zone id -> true once its habit has changed
  var painted = {};       // zone id -> true once its question is answered
  var decoyHouse = {};    // "c,r" -> house of that decoy door
  var wafi = { c: map.start.c, r: map.start.r, fc: map.start.c, fr: map.start.r, t: 1, moving: false,
    dir: 'up', path: [], shake: 0, bumpWait: 0, walk: 0, hop: 0, air: 0, shield: 0, dance: 0, pose: 'idle' };
  var held = [];          // directions held down, newest last
  var notes = [], splats = [], bloom = {}, noteWait = 0, splatWait = 0;
  var parts = [], MAX_PARTS = 120, finale = null;
  var foods = [], fruit = [], floaters = [], told = {};
  var goldPaws = [], prints = [], quietFor = 0;
  var carrying = false, cupTaken = false, allOpenTold = false;   // the House Cup: on the stage, then with Wafi
  var delivered = false, handedIn = false;                        // the cup on the notice board; the game over
  var ROOM_IDS = M.ZONES.filter(function (z) { return z.kind === 'room'; }).map(function (z) { return z.id; });
  function chestsLeft() { return ROOM_IDS.filter(function (id) { return !painted[id]; }).length; }
  /* Once the six chests are open the foods fall asleep: the walk to the cup
     and on to the notice board is safe. */
  function asleep() { return chestsLeft() === 0; }

  /* ---------- Tiles and passability ---------- */
  var key = function (c, r) { return c + ',' + r; };
  function tile(c, r) { return map.tile(c, r); }
  function roomAt(c, r) { return M.ROOMS.filter(function (rm) { return rm.floor === floor && rm.at[0] === c && rm.at[1] === r; })[0]; }
  function zoneOfRival(ch) { return M.ZONES.filter(function (z) { return z.rival && z.rival.ch === ch; })[0]; }
  /* Can Wafi stand here right now? */
  function passable(c, r) {
    var ch = tile(c, r);
    if (/[1-6]/.test(ch)) return !!opened[ch];
    if (ch === 'd') { var cr = classroomAt(c, r); return !!(cr && opened[cr.id]); }
    if (/[EFNW]/.test(ch)) return !!beaten[zoneOfRival(ch).id];
    if (ch === 'C') return cupTaken;                    // the stage spot is free once the cup has gone
    if (FD.cook && c === FD.cook[0] && r === FD.cook[1]) return false;   // nobody walks through the cook
    return M.walkable(ch);
  }
  var blocked = function (c, r) { return !passable(c, r); };
  /* A classroom door: the room behind it has a rect, so Wafi can go in. */
  function classroomAt(c, r) { var rm = tile(c, r) === 'd' && roomAt(c, r); return rm && rm.rect ? rm : null; }
  /* For planning a tapped walk, shut doors that Wafi opens himself (his own
     and the classrooms') count as open: he opens them on the way. */
  function shutDoor(c, r) {
    var ch = tile(c, r), cr = classroomAt(c, r), k = /[1-6]/.test(ch) ? ch : cr && cr.id;
    return !!k && !opened[k];
  }
  var planBlocked = function (c, r) { return (!passable(c, r) && !shutDoor(c, r)) || !!foodAt(c, r); };   // tapped walks go round foods
  /* What a bump into (c, r) means: null when it's just a wall. */
  function thingAt(c, r) {
    var ch = tile(c, r);
    if (/[1-6]/.test(ch) && !opened[ch]) return { kind: 'door', digit: ch, zone: M.ZONES.filter(function (z) { return z.door === ch; })[0].id };
    if (ch === 'x') return { kind: 'decoy', house: decoyHouse[key(c, r)] };
    if (ch === 'd') {
      var rm = roomAt(c, r);
      if (rm.rect && opened[rm.id]) return null;          // an open classroom door is just a way in
      return { kind: 'room', room: rm.id, name: rm.name, teacher: rm.teacher, classroom: !!rm.rect };
    }
    if (ch === 'n') return { kind: 'board' };
    if (ch === 'k') return { kind: 'chest', zone: M.zoneAt(floor, c, r) };
    if (/[EFNW]/.test(ch) && !beaten[zoneOfRival(ch).id]) return { kind: 'rival', zone: zoneOfRival(ch).id, kind2: zoneOfRival(ch).rival.kind };
    if (ch === 'C' && !cupTaken) return { kind: 'cup' };
    return null;
  }

  /* ---------- Moving ---------- */
  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function dirTo(from, to) {
    if (to.c > from.c) return 'right';
    if (to.c < from.c) return 'left';
    return to.r > from.r ? 'down' : 'up';
  }
  function stepTo(c, r) {
    var food = foodAt(c, r);
    if (food && wafi.air > 0) squash(food);             // in the air onto a food: squash it
    else if (food) {
      if (wafi.shield <= 0 && !asleep()) bumpFood(food);
      wafi.path = [];
      return;                                           // a food in the way: no step
    }
    wafi.fc = wafi.c; wafi.fr = wafi.r;
    wafi.c = c; wafi.r = r;
    wafi.t = 0; wafi.moving = true;
    if (!reduce && wafi.air <= 0) {                     // paw prints that fade behind him
      prints.push({ c: wafi.fc, r: wafi.fr, dir: wafi.dir, life: 2.5 });
      if (prints.length > 14) prints.shift();
    }
    pickFruit(c, r);
    pickPaw(c, r);
    if (tile(c, r) === '^') takeStairs(c, r);
  }

  /* ---------- Stairs: a short fade to the same end of the other floor ----------
     Only stepping onto the stairs takes them, never arriving on them, so Wafi
     can't bounce between floors; held keys and a tapped path stop there. */
  var fade = null, FADE = 0.35;
  function takeStairs(c, r) {
    var s = M.STAIRS.filter(function (st) { return st[floor][0] === c && st[floor][1] === r; })[0];
    var other = floor === 'ground' ? 'up' : 'ground';
    var to = { floor: other, c: s[other][0], r: s[other][1] };
    releaseKeys();
    wafi.path = [];
    UI.sfx('stairs');
    if (reduce) { arrive(to); return; }
    frozen = true;
    fade = { t: 0, to: to, swapped: false };
  }
  function arrive(to) {
    setFloor(to.floor, to);
    var out = [[1, 0, 'right'], [-1, 0, 'left'], [0, 1, 'down'], [0, -1, 'up']]
      .filter(function (d) { return M.walkable(tile(to.c + d[0], to.r + d[1])); })[0];
    if (out) wafi.dir = out[2];                         // facing away from the stairs
  }
  function updateFade(dt) {
    fade.t += dt;
    if (!fade.swapped && fade.t >= FADE / 2) { fade.swapped = true; arrive(fade.to); }
    if (fade.t >= FADE) { fade = null; frozen = false; }
  }
  /* Put one floor on screen. Everything drawn from the floor's data starts
     afresh; what the pupil has done (doors, chests, rivals, fruit) stays. */
  function setFloor(id, at) {
    floor = id; map = M.parse(id); FD = M.FLOORS[id];
    MAP_W = map.w * T; MAP_H = map.h * T;
    floorCache = {};
    wallPieces = {};
    FD.decor.forEach(function (d) {
      if (!d.wall) return;
      for (var c = d.rect[0]; c <= d.rect[2]; c++) wallPieces[key(c, d.rect[1])] = true;
    });
    buildSigns();
    greeted = {};
    paintObjective();
    prints = []; notes = []; splats = []; bloom = {}; leaving = []; parts = []; floaters = []; dust = [];
    if (at) { wafi.c = wafi.fc = at.c; wafi.r = wafi.fr = at.r; wafi.t = 1; wafi.moving = false; wafi.path = []; }
    resize();
  }
  /* One step in a direction: walk, or bump whatever is there. */
  function tryStep(dir) {
    wafi.dir = dir;
    var c = wafi.c + DIRS[dir][0], r = wafi.r + DIRS[dir][1];
    if (passable(c, r)) { stepTo(c, r); return true; }
    bump(c, r);
    return false;
  }
  function bump(c, r) {
    wafi.path = [];
    if (wafi.bumpWait > 0) return;
    wafi.bumpWait = BUMP_GAP;
    use(c, r);
  }
  /* Whatever is at (c, r) reacts: a door opens, the UI asks or tells. */
  function use(c, r) {
    var thing = thingAt(c, r);
    if (!thing) return;
    if (thing.kind === 'door') {
      openDoor(thing.digit);
      paintObjective();
    }
    if (thing.classroom) { openDoor(thing.room); UI.sfx('door'); }
    if (School.onBump) School.onBump(thing.kind, { c: c, r: r, zone: thing.zone, house: thing.house, kind: thing.kind2, room: thing.room, name: thing.name, teacher: thing.teacher });
  }

  /* A door opens with a quarter-second swing (at once with reduced motion).
     k is the own door's digit or the classroom's id. */
  var doorAt = {};
  function openDoor(k) { opened[k] = true; doorAt[k] = reduce ? -1 : time; }
  function doorSwing(k) {
    if (!opened[k]) return 0;
    var t0 = doorAt[k];
    return t0 === undefined || t0 < 0 ? 1 : Math.min(1, (time - t0) / 0.25);
  }
  /* Tap on a tile: walk there, or up to the thing on it and use it. */
  function tapTile(c, r) {
    quietFor = 0;
    if (frozen) return;
    var from = { c: wafi.c, r: wafi.r };
    var thing = thingAt(c, r);
    if (thing) {
      if (Math.abs(from.c - c) + Math.abs(from.r - r) === 1) { wafi.path = [{ c: c, r: r, use: true }]; return; }
      var best = null;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var n = { c: c + d[0], r: r + d[1] };
        if (!passable(n.c, n.r)) return;
        var p = M.findPath(from, n, planBlocked);
        if (p && (!best || p.length < best.length)) best = p;
      });
      if (best) { wafi.path = best.concat([{ c: c, r: r, use: true }]); return; }
    } else if (passable(c, r)) {
      var path = M.findPath(from, { c: c, r: r }, planBlocked);
      if (path) { wafi.path = path; return; }
    }
    wafi.path = [];
    wafi.shake = 0.35;
  }

  /* ---------- The living school (spec 6.4) ----------
     Each room shows what it is from the corridor. Only rooms near Wafi move;
     requestAnimationFrame stops when the page is hidden, and so does all of it. */
  function near(zoneId, d) {
    if (ZONE_BY_ID[zoneId].floor !== floor) return false;
    var z = ZONE_BY_ID[zoneId].rect;
    var dc = Math.max(z[0] - wafi.c, 0, wafi.c - z[2]), dr = Math.max(z[1] - wafi.r, 0, wafi.r - z[3]);
    return dc + dr <= d;
  }
  function updateAmbient(dt) {
    notes.forEach(function (n) { n.y -= 26 * dt; n.x += Math.sin(time * 2 + n.s) * 12 * dt; n.life -= dt; });
    notes = notes.filter(function (n) { return n.life > 0; });
    splats.forEach(function (s) { s.life -= dt; });
    splats = splats.filter(function (s) { return s.life > 0; });
    Object.keys(bloom).forEach(function (k) { bloom[k].v += (bloom[k].to - bloom[k].v) * Math.min(1, dt * 5); });
    if (reduce) return;
    noteWait -= dt; splatWait -= dt;
    if (noteWait <= 0 && near('music', 8) && notes.length < 6) {
      var door = map.doors.filter(function (d) { return d.zone === 'music'; })[0];
      notes.push({ x: door.c * T + T / 2 + (Math.random() - 0.5) * 16, y: door.r * T, s: Math.random() * 6, life: 2 });
      noteWait = 0.7;
    }
    if (splatWait <= 0 && near('art', 8) && splats.length < 8) {
      var a = ZONE_BY_ID.art.rect;
      splats.push({ x: (a[0] + Math.random() * (a[2] - a[0] + 1)) * T, y: (a[1] + 0.6 + Math.random() * (a[3] - a[1])) * T,
        r: 6 + Math.random() * 7, c: BOOKS[Math.floor(Math.random() * BOOKS.length)], life: 3 });
      splatWait = 1.1;
    }
  }

  function update(dt) {
    time += dt;
    if (fade) updateFade(dt);
    moveWalkers(dt);
    greetTeachers();
    updateAmbient(dt);
    if (wafi.shake > 0) wafi.shake -= dt;
    if (wafi.hop > 0) wafi.hop -= dt;
    if (wafi.dance > 0) wafi.dance -= dt;
    prints.forEach(function (p) { p.life -= dt; });
    prints = prints.filter(function (p) { return p.life > 0; });
    quietFor = wafi.moving || held.length || wafi.path.length || frozen ? 0 : quietFor + dt;
    if (wafi.shield > 0) wafi.shield -= dt;
    if (wafi.air > 0) { wafi.air -= dt; if (wafi.air <= 0) land(); }
    floaters.forEach(function (f) { f.y -= 40 * dt; f.life -= dt; });
    dust.forEach(function (d) { d.life -= dt; });
    dust = dust.filter(function (d) { return d.life > 0; });
    floaters = floaters.filter(function (f) { return f.life > 0; });
    foods.forEach(function (f) { if (f.dead > 0) { f.dead -= dt; if (f.dead <= 0) f.gone = true; } if (f.t < 1) f.t = Math.min(1, f.t + dt / 0.22); });
    foods = foods.filter(function (f) { return !f.gone; });
    if (!frozen && !finale) moveFoods(dt);
    updateParts(dt);
    leaving.forEach(function (l) { l.t += dt; });
    leaving = leaving.filter(function (l) { return l.t < 1.4; });
    if (finale) { updateFinale(dt); return; }
    if (wafi.bumpWait > 0) wafi.bumpWait -= dt;
    if (wafi.moving) {
      wafi.t = Math.min(1, wafi.t + dt * 1000 / STEP_MS);
      wafi.walk += dt;
      if (wafi.t >= 1) {
        wafi.moving = false;
        if (!held.length && !wafi.path.length && !reduce) puff();   // a little dust as he stops
      }
    }
    if (frozen || wafi.moving) return;
    if (held.length) {
      wafi.path = [];
      tryStep(held[held.length - 1]);
      return;
    }
    if (wafi.path.length) {
      var next = wafi.path[0];
      var dir = dirTo(wafi, next);
      if (next.use) { wafi.path = []; wafi.dir = dir; bump(next.c, next.r); return; }
      if (foodAt(next.c, next.r) && wafi.air <= 0) {    // a food stepped into a tapped path: stop, no penalty
        wafi.path = []; wafi.dir = dir; wafi.shake = 0.35;
        return;
      }
      if (passable(next.c, next.r)) { wafi.path.shift(); wafi.dir = dir; stepTo(next.c, next.r); }
      else if (shutDoor(next.c, next.r)) {             // open it and carry on along the path
        wafi.dir = dir;
        use(next.c, next.r);
      } else { wafi.path = []; wafi.dir = dir; bump(next.c, next.r); }
    }
  }

  /* ---------- Healthy choices: fruit to collect, unhealthy foods to avoid ----------
     Same rules as the park: every 2 fruit and veg win a point; bumping a food
     costs a point (never below 0) and gives 2 s of shield; jumping onto one
     squashes it. Foods are slower than Wafi and only chase from close by. */
  function foodAt(c, r) {
    if (floor !== 'ground') return null;               // fruit, foods and paws are all downstairs
    for (var i = 0; i < foods.length; i++) if (!foods[i].dead && foods[i].c === c && foods[i].r === r) return foods[i];
    return null;
  }
  function setupFoods() {
    var d = M.DIFF[year] || M.DIFF[3];
    foods = map.foodHomes.slice(0, d.foods).map(function (h, i) {
      return { c: h.c, r: h.r, fc: h.c, fr: h.r, t: 1, home: { c: h.c, r: h.r }, chase: d.chase, stepMs: d.stepMs,
        wait: (i * 137) % d.stepMs, kind: Q.THEME.avoid[i % Q.THEME.avoid.length], dead: 0 };
    });
    fruit = map.fruit.map(function (f, i) { return { c: f.c, r: f.r, kind: Q.THEME.collect[i % Q.THEME.collect.length], got: false }; });
    goldPaws = map.paws.map(function (w) { return { c: w.c, r: w.r, got: false }; });
  }
  function moveFoods(dt) {
    if (floor !== 'ground' || asleep()) return;
    var foodBlocked = function (c, r) { return !passable(c, r) || !!foodAt(c, r); };
    foods.forEach(function (f) {
      if (f.dead) return;
      if (f.calm > 0) f.calm -= dt;
      if (f.calmAt && f.calmAt !== key(wafi.c, wafi.r) && f.calm <= 0) f.calmAt = null;
      var chasing = !(f.calm > 0 || f.calmAt) && Math.abs(f.c - wafi.c) + Math.abs(f.r - wafi.r) <= f.chase;
      f.wait += dt * 1000;
      if (f.wait < f.stepMs) return;
      f.wait = 0;
      var n = M.foodStep(chasing ? f : { c: f.c, r: f.r, home: f.home, chase: 0 }, wafi, foodBlocked, Math.random);
      if (n.c === f.c && n.r === f.r) return;
      if (n.c === wafi.c && n.r === wafi.r) {
        if (wafi.air > 0) { move(f, n); squash(f); return; }   // under a jumping Wafi: squashed
        if (!chasing) return;                           // wandering never walks into Wafi
        if (wafi.shield <= 0) bumpFood(f);
        return;
      }
      move(f, n);
    });
    function move(f, n) { f.fc = f.c; f.fr = f.r; f.c = n.c; f.r = n.r; f.t = 0; }
  }
  /* After a bump the food backs off and stops chasing for a while, so a
     pupil who stands still isn't bumped again and again (spec 3.6). */
  function bumpFood(f) {
    var st = UI.state;
    wafi.shield = 2;
    f.calm = 2;
    f.calmAt = key(wafi.c, wafi.r);                   // ...and won't chase again until Wafi moves
    var away = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (d) { return { c: f.c + d[0], r: f.r + d[1] }; })
      .filter(function (n) { return passable(n.c, n.r) && !foodAt(n.c, n.r) && !(n.c === wafi.c && n.r === wafi.r); })
      .sort(function (a, b) { return (Math.abs(b.c - wafi.c) + Math.abs(b.r - wafi.r)) - (Math.abs(a.c - wafi.c) + Math.abs(a.r - wafi.r)); })[0];
    if (away) { f.fc = f.c; f.fr = f.r; f.c = away.c; f.r = away.r; f.t = 0; }
    UI.sfx('bump');
    if (st.gems > 0) {
      st.gems--; st.bumps++;
      UI.paintGems(true);
      floaters.push({ x: wafi.c * T + T / 2, y: wafi.r * T - 10, text: '-1', col: '#C92A2A', life: 1.1 });
      if (!told.bump) { told.bump = true; UI.toast(SL.bump); }
    } else if (!told.bumpFree) {
      told.bumpFree = true;
      UI.toast(SL.bumpFree);
    }
  }
  function jump() {
    quietFor = 0;
    if (frozen || finale || wafi.air > 0) return;
    wafi.air = 0.5;
    UI.sfx('jump');
  }
  function land() {
    var f = foodAt(wafi.c, wafi.r);
    if (f) squash(f);
  }
  /* ---------- Golden paws (spec 6.7): three, high and out of the way ---------- */
  function pickPaw(c, r) {
    if (floor !== 'ground') return;
    goldPaws.forEach(function (w) {
      if (w.got || w.c !== c || w.r !== r) return;
      w.got = true;
      UI.state.paws++;
      UI.paintHud();
      UI.sfx('paw');
      wafi.dance = 1;
      burstHouse(c * T + T / 2, r * T + T / 2, house, 14);
      UI.toast(SL.paw(UI.state.paws, goldPaws.length));
    });
  }
  function drawGoldPaw(w) {
    var x = w.c * T + T / 2, y = w.r * T + T / 2 + (reduce ? 0 : Math.sin(time * 2.5 + w.c) * 3);
    circle(x, y, 20); ctx.fillStyle = 'rgba(255,212,59,.35)'; ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(reduce ? 0 : Math.sin(time * 2 + w.r) * 0.2); ctx.scale(1.25, 1.25);
    ctx.beginPath(); ctx.ellipse(0, 4, 8, 6.5, 0, 0, Math.PI * 2); fillStroke(ART.GOLD, 2.5);
    [[-8, -3, 3.2], [-3, -9, 3.4], [3, -9, 3.4], [8, -3, 3.2]].forEach(function (t) { circle(t[0], t[1], t[2]); fillStroke(ART.GOLD, 2.5); });
    ctx.restore();
  }
  function drawPrint(p) {
    var x = p.c * T + T / 2, y = p.r * T + T / 2, side = (p.c + p.r) % 2 ? 6 : -6;
    var a = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[p.dir] || 0;
    ctx.save(); ctx.globalAlpha = Math.min(0.35, p.life / 2.5 * 0.35);
    ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.translate(side, 0);
    ctx.fillStyle = '#3F4B5F';
    ctx.beginPath(); ctx.ellipse(0, 3, 4, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    [[-4, -2], [-1.4, -4.5], [1.4, -4.5], [4, -2]].forEach(function (t) { circle(t[0], t[1], 1.6); ctx.fill(); });
    ctx.restore();
  }

  /* Kinder than the park's timing for 7-year-olds: touching a food while in
     the air squashes it, not only landing exactly on it. */
  function squash(f) {
    f.dead = 0.35;
    burstHouse(f.c * T + T / 2, f.r * T + T / 2, house, 10);
    UI.sfx('squash');
    if (!told.squash) { told.squash = true; UI.toast(SL.squash); }
  }
  function pickFruit(c, r) {
    if (floor !== 'ground') return;
    var st = UI.state;
    fruit.forEach(function (f) {
      if (f.got || f.c !== c || f.r !== r) return;
      f.got = true;
      st.foods++;
      var point = st.foods % Q.THEME.perPoint === 0;
      UI.sfx(point ? 'point' : 'fruit');
      if (point) {
        st.gems++; st.bonus++;
        UI.paintGems();
        floaters.push({ x: c * T + T / 2, y: r * T - 10, text: '+1', col: '#2B8A3E', life: 1.1 });
      }
      UI.paintHud();
      if (!told.fruit) { told.fruit = true; UI.toast(SL.fruit(Q.THEME.perPoint)); }
    });
  }
  /* ---------- The park's fruit and food sprites ----------
     ponytail: copied from game.js (blob, drawFood, foeEyes, drawFoe) so both modes look the
     same; move to a shared file if school mode stays. */
  function blob(parts, fill) {          // overlapping circles with one outline round the lot
    parts.forEach(function (c) { circle(c[0], c[1], c[2] + 1.3); ctx.fillStyle = LINE; ctx.fill(); });
    parts.forEach(function (c) { circle(c[0], c[1], c[2] - 1.2); ctx.fillStyle = fill; ctx.fill(); });
  }
  function parkFood(kind, x, y) {
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
  function parkFoe(e) {
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

  var FOE_H = { burger: 40, doughnut: 36, fizzy: 42, cupcake: 46 };
  function drawFoodItem(f) {
    parkFood(f.kind, f.c * T + T / 2, f.r * T + T / 2 + (reduce ? 0 : Math.sin(time * 3 + f.c) * 2));
  }
  function drawFoe(f) {
    var k = ease(f.t), x = (f.fc + (f.c - f.fc) * k) * T + T / 2, y = (f.fr + (f.r - f.fr) * k) * T + T - 6;
    var h = FOE_H[f.kind] || 40;
    parkFoe({ kind: f.kind, x: x - 18, y: y - h, w: 36, h: h, t: time * 1.2 + f.home.c, dir: f.c >= f.fc ? 1 : -1,
      dead: f.dead > 0 ? f.dead : 0, lift: 0 });
    if (asleep() && !f.dead) {                          // fast asleep
      ctx.font = '700 14px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 4; ctx.strokeStyle = '#FFFFFF'; ctx.strokeText('z z', x + 10, y - h - 2);
      ctx.fillStyle = '#5C5F99'; ctx.fillText('z z', x + 10, y - h - 2);
    }
  }
  function drawFloater(f) {
    ctx.globalAlpha = Math.min(1, f.life * 2);
    ctx.font = '700 24px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = '#FFFFFF'; ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  /* ---------- Screen and camera ---------- */
  var canvas = $('#world'), ctx = canvas.getContext('2d');
  var scale = 1, dpr = 1, viewW = 800, viewH = 480, camX = 0, camY = 0;
  function resize() {
    var stage = $('#stage');
    var cssW = stage.clientWidth;
    var pad = $('.pad'), overlaid = getComputedStyle(pad).position === 'fixed';   // landscape iPads: controls sit on the map
    var room = window.innerHeight - stage.getBoundingClientRect().top - window.scrollY -
      (overlaid ? 0 : pad.offsetHeight) - (overlaid ? 16 : 36);
    var tall = cssW < 600 ? cssW * 1.3 : cssW * 0.8;
    var cssH = Math.max(260, Math.min(tall, room, 760));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scale = Math.max(0.75, Math.min(1.5, cssH / (10 * T)));
    viewW = cssW / scale;
    viewH = cssH / scale;
  }
  function wafiPixel() {
    var k = ease(wafi.t);
    return { x: (wafi.fc + (wafi.c - wafi.fc) * k) * T + T / 2, y: (wafi.fr + (wafi.r - wafi.fr) * k) * T + T / 2 };
  }
  function ease(t) { return 1 - (1 - t) * (1 - t); }
  function follow() {
    var p = wafiPixel();
    camX = MAP_W <= viewW ? (MAP_W - viewW) / 2 : Math.max(0, Math.min(MAP_W - viewW, p.x - viewW / 2));
    camY = MAP_H <= viewH ? (MAP_H - viewH) / 2 : Math.max(0, Math.min(MAP_H - viewH, p.y - viewH / 2));
  }

  /* ---------- Drawing helpers ---------- */
  function rrect(x, y, w, h, r) {                    // r: one radius or [tl, tr, br, bl], as in game.js
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
  var hash = function (c, r) { return (((c * 73856093) ^ (r * 19349663)) >>> 0) % 100; };
  /* An icon from MNSArt.ICONS, centred on (x, y), `size` px across. */
  var iconPaths = {};
  function drawIcon(name, x, y, size, colour, lw) {
    if (!iconPaths[name]) iconPaths[name] = ART.ICONS[name].map(function (d) { return new Path2D(d); });
    ctx.save();
    ctx.translate(x - size / 2, y - size / 2);
    ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = colour; ctx.lineWidth = lw || 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    iconPaths[name].forEach(function (p) { ctx.stroke(p); });
    ctx.restore();
  }

  /* SVG art baked once onto canvases (as game.js does). */
  function bake(svg, size, k) {
    var cv = document.createElement('canvas'), img = new Image();
    cv.width = Math.round(size[0] * k);
    cv.height = Math.round(size[1] * k);
    img.onload = function () { cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); cv.ready = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(svg.replace('<svg ', '<svg width="' + cv.width + '" height="' + cv.height + '" '));
    return cv;
  }
  var CREST = bake(ART.crest(), ART.SIZE.crest, 2);
  var FRAMES = {};
  function bakeWafi() {
    var col = PAINT[house];
    var o = function (dir, blink) {
      return { dir: dir, shirt: col.main, mark: house === 'AIR' ? LINE : '#FFFFFF', look: dir === 'down' ? 0 : -3, blink: blink };
    };
    FRAMES = {};
    ['down', 'up', 'side'].forEach(function (dir) {
      ['idle', 'walkA', 'walkB', 'jump'].forEach(function (pose) {
        FRAMES[dir + '-' + pose] = bake(ART.wafi(pose, o(dir)), ART.SIZE.full, 2);
      });
    });
    FRAMES['down-blink'] = bake(ART.wafi('idle', o('down', true)), ART.SIZE.full, 2);
    FRAMES['down-cheer'] = bake(ART.wafi('cheer', o('down')), ART.SIZE.full, 2);
    ['lick', 'look', 'yawn'].forEach(function (g) { FRAMES['down-' + g] = bake(ART.wafi(g, o('down')), ART.SIZE.full, 2); });
  }

  /* ---------- Floors (spec 12): a material per place, no grid ---------- */
  /* The floor under anything that isn't floor: the nearest floor within 3
     tiles (big furniture can be 3 tiles across). */
  var floorCache = {};
  function floorOf(c, r) {
    var ch = tile(c, r);
    if (ch === '^') return '=';
    if (/[.,=_"]/.test(ch)) return ch;
    var k = key(c, r);
    if (floorCache[k]) return floorCache[k];
    // along the row first (rooms are wider than their walls), then the column, then corners
    var order = [];
    for (var d = 1; d <= 3; d++) order.push([-d, 0], [d, 0]);
    for (d = 1; d <= 3; d++) order.push([0, d], [0, -d]);
    for (d = 1; d <= 2; d++) order.push([-d, -d], [d, -d], [-d, d], [d, d]);
    for (var i = 0; i < order.length; i++) {
      var n = tile(c + order[i][0], r + order[i][1]);
      if (/[.,=_"]/.test(n)) return (floorCache[k] = n);
    }
    return (floorCache[k] = '.');
  }
  /* A tile's material: the first of the floor's areas that holds it.
     Outdoor areas (the stage, the pitch, the court, the jungle gym) are drawn
     by OUTDOOR; indoor ones by drawFloor; the rest keep their tile's look. */
  var FLAT_FLOORS = { checker: 1, carpet: 1, lino: 1, mint: 1 };   // drawn in drawFloor's chain
  function drawn(m) { return !!(OUTDOOR[m] || WOOD[m] || FLAT_FLOORS[m]); }
  function areaOf(c, r) {
    for (var i = 0; i < FD.areas.length; i++) {
      var rc = FD.areas[i].rect;
      if (c >= rc[0] && c <= rc[2] && r >= rc[1] && r <= rc[3]) return FD.areas[i];
    }
    return null;
  }
  function materialOf(c, r) { var a = areaOf(c, r); return a && drawn(a.m) ? a.m : 'corridor'; }
  /* Lines along an area's edges, inset a little. */
  function edgeLines(a, c, r, x, y, col, inset) {
    var rc = a.rect;
    ctx.fillStyle = col;
    if (c === rc[0]) ctx.fillRect(x + inset, y, 3, T);
    if (c === rc[2]) ctx.fillRect(x + T - inset - 3, y, 3, T);
    if (r === rc[1]) ctx.fillRect(x, y + inset, T, 3);
    if (r === rc[3]) ctx.fillRect(x, y + T - inset - 3, T, 3);
  }
  var OUTDOOR = {
    stage: function (a, c, r, x, y, h) {                // pale stone, as in the photo
      ctx.fillStyle = '#EFE8D8'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(42,39,69,.07)'; ctx.fillRect(x, y + T - 2, T, 2); ctx.fillRect(x + (r % 2 ? T / 2 : 0), y, 2, T);
    },
    pitch: function (a, c, r, x, y) {                   // mown stripes and white lines (halfway: drawPitchMarks)
      var rc = a.rect, midC = (rc[0] + rc[2] + 1) / 2;
      ctx.fillStyle = Math.floor(r / 2) % 2 ? '#79C47C' : '#6CB870'; ctx.fillRect(x, y, T, T);
      edgeLines(a, c, r, x, y, 'rgba(255,255,255,.85)', 4);
      [rc[1], rc[3]].forEach(function (endR, k) {        // a box in front of each goal
        var inBox = c >= midC - 2 && c < midC + 2 && (k ? r >= endR - 2 : r <= endR + 2);
        if (!inBox) return;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        if (c === Math.floor(midC - 2)) ctx.fillRect(x, y, 3, T);
        if (c === Math.ceil(midC + 2) - 1) ctx.fillRect(x + T - 3, y, 3, T);
        if (k ? r === endR - 2 : r === endR + 2) ctx.fillRect(x, k ? y : y + T - 3, T, 3);
      });
    },
    blueCourt: function (a, c, r, x, y) {               // blue with the yellow keys under the hoops
      var rc = a.rect;
      ctx.fillStyle = '#3F7FCF'; ctx.fillRect(x, y, T, T);
      var key = (c <= rc[0] + 1 || c >= rc[2] - 1) && r > rc[1] && r < rc[3];
      if (key) { ctx.fillStyle = '#F4C534'; ctx.fillRect(x, y, T, T); }
      edgeLines(a, c, r, x, y, 'rgba(255,255,255,.9)', 3);
      if (c === Math.floor((rc[0] + rc[2]) / 2)) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(x + T - 2, y, 3, T); }
    },
    rubber: function (a, c, r, x, y, h) {               // the jungle gym's soft red floor
      ctx.fillStyle = '#D9785A'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      for (var k = 0; k < 7; k++) ctx.fillRect(x + (h * (k + 2) * 11) % 44 + 2, y + (h * (k + 4) * 7) % 44 + 2, 3, 3);
    }
  };
  var WOOD = { wood: ['#EBD2A6', '#CDA571'], woodDark: ['#D8AE78', '#B4834F'] };
  function planks(x, y, c, r, cols) {
    ctx.fillStyle = cols[0]; ctx.fillRect(x, y, T, T);
    for (var k = 0; k < 4; k++) {
      var v = hash(c * 5 + k, r * 3 + k) % 10 - 5;
      ctx.fillStyle = v > 0 ? 'rgba(255,255,255,' + v * 0.03 + ')' : 'rgba(90,50,10,' + -v * 0.025 + ')';
      ctx.fillRect(x, y + k * 12, T, 12);
      ctx.fillStyle = cols[1];
      ctx.fillRect(x, y + k * 12 + 11, T, 1.2);
      ctx.fillRect(x + (hash(c + k * 7, r) % 40) + 4, y + k * 12, 1.2, 11);
    }
  }
  function squares(x, y, c, r, a, b) {
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j + c + r) % 2 ? a : b;
      ctx.fillRect(x + i * 24, y + j * 24, 24, 24);
    }
    ctx.fillStyle = 'rgba(42,39,69,.06)';
    ctx.fillRect(x, y + 23.5, T, 1); ctx.fillRect(x + 23.5, y, 1, T);
  }
  function drawFloor(c, r) {
    var x = c * T, y = r * T, f = floorOf(c, r), h = hash(c, r), area = areaOf(c, r);
    if (tile(c, r) === '^') drawStairs(c, r);
    else if (area && OUTDOOR[area.m]) OUTDOOR[area.m](area, c, r, x, y, h);
    else if (f === ',') {
      ctx.fillStyle = '#C8714A'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = h % 3 ? 'rgba(255,255,255,.05)' : 'rgba(90,40,20,.06)'; ctx.fillRect(x, y, T, T / 2);
      ctx.strokeStyle = 'rgba(90,40,20,.3)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y + T / 2); ctx.lineTo(x + T, y + T / 2);
      ctx.moveTo(x + (r % 2 ? T / 2 : 0), y); ctx.lineTo(x + (r % 2 ? T / 2 : 0), y + T / 2);
      ctx.moveTo(x + (r % 2 ? 0 : T / 2), y + T / 2); ctx.lineTo(x + (r % 2 ? 0 : T / 2), y + T);
      ctx.stroke();
    } else if (f === '=') {
      ctx.fillStyle = '#F4F0E6'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(42,39,69,.14)';
      ctx.fillRect(x, y + 14, T, 3); ctx.fillRect(x, y + 30, T, 3); ctx.fillRect(x, y + 45, T, 3);
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x, y + 17, T, 2); ctx.fillRect(x, y + 33, T, 2);
    } else if (f === '_') {                            // artificial grass
      ctx.fillStyle = '#8FD394'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(40,120,50,.18)';
      for (var g = 0; g < 6; g++) ctx.fillRect(x + (h * (g + 3) * 7) % 44 + 2, y + (h * (g + 1) * 11) % 40 + 4, 2, 5);
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      if (h < 40) ctx.fillRect(x + 10 + h % 20, y + 12, 2, 5);
    } else if (f === '"') {
      ctx.fillStyle = '#76C46B'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(30,90,30,.25)';
      for (var t2 = 0; t2 < 4; t2++) ctx.fillRect(x + (h * (t2 + 2) * 13) % 42 + 3, y + (h * (t2 + 5) * 7) % 38 + 5, 3, 7);
      if (h < 38 && tile(c, r) === '"') drawFlower(c, r, x + 12 + h % 24, y + 14 + (h * 7) % 22, h);
    } else {
      var m = materialOf(c, r), z = M.zoneAt(floor, c, r);
      if (WOOD[m]) planks(x, y, c, r, WOOD[m]);
      else if (m === 'checker') squares(x, y, c, r, '#F8F1E3', '#E9DCC2');
      else if (m === 'carpet') {
        ctx.fillStyle = '#CDBDEA'; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = 'rgba(112,72,232,.16)';
        for (var dx = 6; dx < T; dx += 12) for (var dy = 6; dy < T; dy += 12) ctx.fillRect(x + dx, y + dy, 2, 2);
      } else if (m === 'lino' || m === 'mint') {
        ctx.fillStyle = m === 'lino' ? '#F6E6E2' : '#DDF2EE'; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = 'rgba(42,39,69,.05)';
        for (var s2 = 0; s2 < 5; s2++) ctx.fillRect(x + (h * (s2 + 1) * 9) % 44, y + (h * (s2 + 3) * 5) % 44, 2, 2);
      } else {                                          // corridor: large bevelled tiles
        ctx.fillStyle = '#EFE8DC'; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x, y, T, 2); ctx.fillRect(x, y, 2, T);
        ctx.fillStyle = 'rgba(42,39,69,.08)'; ctx.fillRect(x, y + T - 2, T, 2); ctx.fillRect(x + T - 2, y, 2, T);
      }
      if (painted[z] && house) { ctx.fillStyle = PAINT[house].light; ctx.globalAlpha = 0.2; ctx.fillRect(x, y, T, T); ctx.globalAlpha = 1; }
    }
    shadeByWalls(c, r, x, y);
  }
  /* The pitch's halfway line and centre circle, once over the whole floor. */
  function drawPitchMarks() {
    FD.areas.forEach(function (a) {
      if (a.m !== 'pitch') return;
      var rc = a.rect, x0 = rc[0] * T + 4, x1 = (rc[2] + 1) * T - 4, my = (rc[1] + rc[3] + 1) / 2 * T, mx = (x0 + x1) / 2;
      if (!inView(mx, my)) return;
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, my); ctx.lineTo(x1, my); ctx.stroke();
      ctx.beginPath(); ctx.arc(mx, my, 60, 0, Math.PI * 2); ctx.stroke();
    });
  }
  /* Stairs: light treads going up into the wall, a rail on each side. */
  function drawStairs(c, r) {
    var x = c * T, y = r * T;
    ctx.fillStyle = '#E9E4DA'; ctx.fillRect(x, y, T, T);
    for (var k = 0; k < 5; k++) {
      ctx.fillStyle = k % 2 ? '#DCD5C7' : '#F4F0E8'; ctx.fillRect(x, y + k * 9.6, T, 9.6);
      ctx.fillStyle = 'rgba(42,39,69,.18)'; ctx.fillRect(x, y + k * 9.6 + 8.4, T, 1.6);
    }
    ctx.fillStyle = '#8A5F34'; ctx.fillRect(x + 2, y, 4, T); ctx.fillRect(x + T - 6, y, 4, T);
  }
  /* Roofs: sand by default, white or navy where the map says so. */
  var ROOF = { sand: ['#C7B08A', '#B49C76'], white: ['#EEEAE1', '#CFC8BA'], navy: ['#4A5A99', '#34437A'] };
  function roofAt(c, r) {
    var rf = (FD.roofs || []).filter(function (o) { return c >= o.rect[0] && c <= o.rect[2] && r >= o.rect[1] && r <= o.rect[3]; })[0];
    return rf ? rf.style : 'sand';
  }
  /* A name painted on a roof, once per roof, big enough to read from above. */
  function drawRoofLabels() {
    (FD.roofs || []).forEach(function (o) {
      if (!o.label) return;
      var cx = (o.rect[0] + o.rect[2] + 1) / 2 * T, cy = (o.rect[1] + o.rect[3] + 1) / 2 * T;
      if (!inView(cx, cy)) return;
      ctx.save(); ctx.translate(cx, cy);
      var tall = o.rect[3] - o.rect[1] > o.rect[2] - o.rect[0];
      if (tall) ctx.rotate(-Math.PI / 2);
      ctx.font = '700 30px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = o.style === 'white' ? 'rgba(42,39,69,.28)' : 'rgba(255,255,255,.55)';
      ctx.fillText(o.label, 0, 0);
      ctx.restore();
    });
  }
  /* Soft shadow on a floor tile from the walls around it, so walls stand up.
     Outside, buildings also cast a firmer shadow to the south-east. */
  function shadeByWalls(c, r, x, y) {
    var g;
    if (/[,=_"]/.test(floorOf(c, r)) && tile(c, r) !== '^') {
      ctx.fillStyle = 'rgba(42,39,69,.22)';
      if (isWall(c - 1, r)) ctx.fillRect(x, y, 22, T);
      if (isWall(c, r - 1)) ctx.fillRect(x + (isWall(c - 1, r) ? 22 : 0), y, T - (isWall(c - 1, r) ? 22 : 0), 22);
      if (isWall(c - 1, r - 1) && !isWall(c - 1, r) && !isWall(c, r - 1)) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 22, y); ctx.lineTo(x, y + 22); ctx.closePath(); ctx.fill();
      }
      return;
    }
    if (isWall(c, r - 1)) {
      g = ctx.createLinearGradient(0, y, 0, y + 16);
      g.addColorStop(0, 'rgba(42,39,69,.22)'); g.addColorStop(1, 'rgba(42,39,69,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, T, 16);
    }
    if (isWall(c - 1, r)) {
      g = ctx.createLinearGradient(x, 0, x + 9, 0);
      g.addColorStop(0, 'rgba(42,39,69,.14)'); g.addColorStop(1, 'rgba(42,39,69,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, 9, T);
    }
    if (isWall(c + 1, r)) {
      g = ctx.createLinearGradient(x + T, 0, x + T - 9, 0);
      g.addColorStop(0, 'rgba(42,39,69,.14)'); g.addColorStop(1, 'rgba(42,39,69,0)');
      ctx.fillStyle = g; ctx.fillRect(x + T - 9, y, 9, T);
    }
  }
  /* Window light falling across the rooms and the hall from their top wall. */
  function drawLight() {
    var rooms = M.ZONES.filter(function (z) { return z.floor === floor && floorOf(z.rect[0], z.rect[1]) === '.'; }).map(function (z) { return z.rect; });
    ctx.fillStyle = 'rgba(255,246,214,.28)';
    rooms.forEach(function (rc) {
      var x0 = rc[0] * T, y0 = rc[1] * T, w = (rc[2] - rc[0] + 1) * T;
      if (!inView(x0 + w / 2, y0)) return;
      for (var x = x0 + 18; x < x0 + w - 40; x += 3 * T) {
        ctx.beginPath();
        ctx.moveTo(x, y0); ctx.lineTo(x + 30, y0); ctx.lineTo(x + 66, y0 + 80); ctx.lineTo(x + 36, y0 + 80);
        ctx.closePath(); ctx.fill();
      }
    });
  }

  /* ---------- Walls with height (spec 12) ----------
     The top of the wall, then a tall face wherever floor is in front of it,
     with a wooden skirting inside and a stone base and blue glass outside. */
  function isWall(c, r) { return tile(c, r) === '#'; }
  function scallopRow(x, y, w, n) {
    var rr = w / n / 2;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + rr * 1.5);
    for (var i = n - 1; i >= 0; i--) ctx.arc(x + i * 2 * rr + rr, y + rr * 1.5, rr, 0, Math.PI, false);
    ctx.closePath();
    fillStroke('#EADBC0', 1.6);
  }
  var POSTER = ['#FFD43B', '#74C0FC', '#FF8787', '#8CE99A', '#B197FC'];
  function drawWall(c, r) {
    var x = c * T, y = r * T, h = hash(c, r);
    var below = tile(c, r + 1), faceShows = !isWall(c, r + 1) && r < map.h - 1;
    var roof = ROOF[roofAt(c, r)];
    ctx.fillStyle = roof[0]; ctx.fillRect(x, y, T, T);                        // the top of the wall: one roof, rimmed where it ends
    ctx.fillStyle = roof[1];
    if (!isWall(c, r - 1)) ctx.fillRect(x, y, T, 3);
    if (!isWall(c, r + 1)) ctx.fillRect(x, y + T - 3, T, 3);
    if (!isWall(c - 1, r)) ctx.fillRect(x, y, 3, T);
    if (!isWall(c + 1, r)) ctx.fillRect(x + T - 3, y, 3, T);
    ctx.fillStyle = 'rgba(42,39,69,.05)'; if (r % 2 === 0) ctx.fillRect(x, y + T / 2, T, 1);
    if (faceShows) {
      var outside = /[,=_"]/.test(floorOf(c, r + 1)) && !/[1-6xdnEFNW]/.test(below), top = y + 12;
      ctx.fillStyle = outside ? '#F1E6CF' : '#F6EEDF'; ctx.fillRect(x, top, T, T - 12);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, top, T, 3);
      ctx.strokeStyle = LINE; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + T, top); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + T); ctx.lineTo(x + T, y + T); ctx.stroke();
      if (outside) {
        ctx.fillStyle = '#D9C6A3'; ctx.fillRect(x, y + T - 6, T, 5);          // stone base
        if (c % 2 === 0 && hash(c, r) % 3 === 0) {       // a mashrabiya screen: carved wooden lattice
          ctx.fillStyle = '#B98552'; ctx.fillRect(x + 9, top + 10, T - 18, T - 30);
          ctx.strokeStyle = '#7A5230'; ctx.lineWidth = 1.4;
          ctx.save(); ctx.beginPath(); ctx.rect(x + 9, top + 10, T - 18, T - 30); ctx.clip();
          ctx.beginPath();
          for (var lk = -T; lk < T; lk += 7) { ctx.moveTo(x + 9 + lk, top + 10); ctx.lineTo(x + 9 + lk + T, top + 10 + T); ctx.moveTo(x + 9 + lk + T, top + 10); ctx.lineTo(x + 9 + lk, top + 10 + T); }
          ctx.stroke(); ctx.restore();
          ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.strokeRect(x + 9, top + 10, T - 18, T - 30);
          scallopRow(x + 7, top + 3, T - 14, 3);
        } else if (c % 2 === 0) {                       // the MNS front: blue glass under an arch
          ctx.fillStyle = '#1F3170'; ctx.fillRect(x + 9, top + 12, T - 18, T - 32);
          ctx.strokeStyle = '#8A5F34'; ctx.lineWidth = 2; ctx.strokeRect(x + 9, top + 12, T - 18, T - 32);
          ctx.beginPath(); ctx.moveTo(x + T / 2, top + 12); ctx.lineTo(x + T / 2, y + T - 8); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x + 12, top + 15, 4, T - 38);
          scallopRow(x + 7, top + 5, T - 14, 3);
        }
      } else {
        ctx.fillStyle = '#A57A4E'; ctx.fillRect(x, y + T - 7, T, 6);          // wooden skirting
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x, y + T - 7, T, 1.5);
        if (wallPieces[key(c, r)]) { /* a piece of furniture hangs here */ }
        else if (h < 14 && !/[1-6xdnEFNW]/.test(tile(c - 1, r) + tile(c + 1, r))) {   // a pupil's poster
          rrect(x + 14, top + 6, 20, 16, 2); fillStroke(POSTER[h % POSTER.length], 1.5);
          ctx.fillStyle = 'rgba(42,39,69,.35)'; ctx.fillRect(x + 18, top + 10, 12, 2); ctx.fillRect(x + 18, top + 15, 8, 2);
        }
      }
    }
    // outline where wall meets floor on the sides
    ctx.strokeStyle = LINE; ctx.lineWidth = 2;
    if (!isWall(c - 1, r) && c > 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + T); ctx.stroke(); }
    if (!isWall(c + 1, r) && c < map.w - 1) { ctx.beginPath(); ctx.moveTo(x + T, y); ctx.lineTo(x + T, y + T); ctx.stroke(); }
    if (!isWall(c, r - 1) && r > 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + T, y); ctx.stroke(); }
  }
  var wallPieces = {};   // wall tiles that carry a piece of furniture: no poster there
  var DRAW = {};         // DECOR type -> drawer


  /* ---------- Room details: what each room shows from the corridor ---------- */
  function drawFlower(c, r, x, y, h) {
    var k = key(c, r), close = Math.abs(wafi.c - c) + Math.abs(wafi.r - r) <= 2;
    if (!bloom[k]) bloom[k] = { v: 0, to: 0 };
    bloom[k].to = close ? 1 : 0;
    if (reduce) bloom[k].v = bloom[k].to;
    var o = bloom[k].v, col = ['#F783AC', '#FFD43B', '#FFFFFF', '#FF922B'][h % 4];
    ctx.strokeStyle = '#2B8A3E'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x, y + 2); ctx.stroke();
    if (o < 0.15) { circle(x, y, 3.5); fillStroke('#69DB7C', 1.5); return; }
    for (var i = 0; i < 5; i++) {
      var a = i / 5 * Math.PI * 2;
      circle(x + Math.cos(a) * 4.5 * o, y + Math.sin(a) * 4.5 * o, 3.2 * o); ctx.fillStyle = col; ctx.fill();
    }
    circle(x, y, 2.4); ctx.fillStyle = '#F59F00'; ctx.fill();
  }
  function drawGlobe(x, y) {
    var cx = x + T / 2, cy = y + 12, spin = reduce ? 0 : time * 1.5;
    circle(cx, cy, 10); fillStroke('#4DABF7', 2);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#51CF66';
    for (var i = 0; i < 3; i++) {
      var px = cx - 14 + ((i * 11 + spin * 8) % 28);
      ctx.beginPath(); ctx.ellipse(px, cy - 3 + i * 3, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = LINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy + 18); ctx.moveTo(cx - 6, cy + 19); ctx.lineTo(cx + 6, cy + 19); ctx.stroke();
  }
  function drawWorldMap(x, y) {
    rrect(x + 5, y + 3, T - 10, 22, 2); fillStroke('#D0EBFF', 2);
    ctx.fillStyle = '#69DB7C';
    [[12, 10, 6, 4], [24, 12, 5, 6], [33, 9, 5, 3], [30, 18, 4, 3]].forEach(function (b) {
      ctx.beginPath(); ctx.ellipse(x + b[0], y + b[1], b[2], b[3], 0, 0, Math.PI * 2); ctx.fill();
    });
  }
  /* A ball bouncing in the middle of the basketball court. */
  function drawBall() {
    var z = ZONE_BY_ID.court.rect, x = (z[0] + z[2] + 1) / 2 * T, base = (z[1] + z[3] + 1) / 2 * T + T / 2 - 8;
    var b = reduce || !near('court', 8) ? 0 : Math.abs(Math.sin(time * 4)) * 26;
    ctx.fillStyle = 'rgba(36,33,59,.18)';
    ctx.beginPath(); ctx.ellipse(x, base + 4, 12 - b / 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    circle(x, base - 10 - b, 10); fillStroke('#FF922B', 2.5);
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x - 10, base - 10 - b); ctx.lineTo(x + 10, base - 10 - b);
    ctx.moveTo(x, base - 20 - b); ctx.lineTo(x, base - b); ctx.stroke();
  }
  function drawNote(n) {
    ctx.globalAlpha = Math.min(1, n.life);
    ctx.fillStyle = '#7048E8'; ctx.strokeStyle = '#7048E8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(n.x, n.y, 5, 4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(n.x + 4.5, n.y - 1); ctx.lineTo(n.x + 4.5, n.y - 16); ctx.lineTo(n.x + 11, n.y - 12); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function drawSplat(s) {
    ctx.globalAlpha = Math.min(0.85, s.life / 1.5);
    ctx.fillStyle = s.c;
    circle(s.x, s.y, s.r); ctx.fill();
    circle(s.x + s.r * 0.9, s.y - s.r * 0.5, s.r * 0.35); ctx.fill();
    circle(s.x - s.r * 0.8, s.y + s.r * 0.6, s.r * 0.3); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* ---------- Furniture (spec 12) ----------
     One drawer per DECOR type: (x, y, w, h) is the piece's rectangle in
     pixels. Flat pieces go on the floor, wall pieces on a wall's face, the
     rest stand up in the row pass so Wafi walks behind or in front of them. */
  var WOOD_TOP = '#D9A066', WOOD_SIDE = '#A9713E', SEAT = ['#4DABF7', '#FF922B', '#69DB7C', '#F783AC'];
  function shadowRect(x, y, w, h) { ctx.fillStyle = 'rgba(36,33,59,.16)'; rrect(x + 3, y + h - 8, w - 6, 10, 5); ctx.fill(); }
  function table(x, y, w, h, top) {
    shadowRect(x, y, w, h);
    rrect(x + 3, y + h * 0.35, w - 6, h * 0.55, 5); fillStroke(WOOD_SIDE, 2.5);
    rrect(x + 2, y + 4, w - 4, h * 0.5, 6); fillStroke(top || WOOD_TOP, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 8, y + 8, w - 16, 3);
  }
  function chairAt(cx, cy, col) {
    rrect(cx - 9, cy - 10, 18, 8, 3); fillStroke(col, 2);
    rrect(cx - 8, cy - 3, 16, 10, 3); fillStroke(col, 2);
  }
  DRAW.computers = function (x, y, w, h) {
    table(x, y + 10, w, h - 10, '#E9ECEF');
    for (var cx = x + T / 2; cx < x + w; cx += T) {
      rrect(cx - 14, y + 2, 28, 20, 3); fillStroke('#2A2745', 2);
      ctx.fillStyle = reduce ? '#4DABF7' : (Math.floor(time * 2 + cx) % 3 ? '#4DABF7' : '#74C0FC'); ctx.fillRect(cx - 11, y + 5, 22, 13);
      ctx.fillStyle = '#2A2745'; ctx.fillRect(cx - 2, y + 22, 4, 5);
      rrect(cx - 12, y + 30, 24, 6, 2); fillStroke('#CED4DA', 1.5);
    }
  };
  DRAW.desks = function (x, y, w, h) {
    for (var ty = y; ty < y + h; ty += T) for (var tx = x; tx < x + w; tx += T) {
      shadowRect(tx + 4, ty + 6, T - 8, 26);
      rrect(tx + 5, ty + 4, T - 10, 22, 4); fillStroke('#EBC58E', 2.2);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(tx + 11, ty + 9, 12, 9);
      ctx.fillStyle = '#E5383B'; ctx.fillRect(tx + 28, ty + 10, 9, 3);
      chairAt(tx + T / 2, ty + 40, SEAT[(tx / T + ty / T) % SEAT.length | 0]);
    }
  };
  DRAW.teacherDesk = function (x, y, w, h) {
    chairAt(x + w / 2, y + 12, '#495057');
    table(x, y + 10, w, h - 6);
    circle(x + 18, y + 20, 5); fillStroke('#E5383B', 1.5);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + w - 34, y + 15, 20, 12);
  };
  DRAW.bigTable = function (x, y, w, h) {
    table(x, y + 8, w, h - 12);
    rrect(x + 14, y + 18, w - 28, h * 0.32, 3); fillStroke('#D0EBFF', 1.5);
    ctx.fillStyle = '#69DB7C';
    ctx.beginPath(); ctx.ellipse(x + w / 2 - 10, y + 30, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w / 2 + 14, y + 34, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  };
  DRAW.beanbags = function (x, y, w) {
    ['#FF8787', '#74C0FC'].forEach(function (col, i) {
      var cx = x + T / 2 + i * T;
      ctx.fillStyle = 'rgba(36,33,59,.15)'; ctx.beginPath(); ctx.ellipse(cx, y + 40, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, y + 28, 18, 15, 0, 0, Math.PI * 2); fillStroke(col, 2.5);
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(cx - 5, y + 22, 7, 4, -0.4, 0, Math.PI * 2); ctx.fill();
    });
  };
  DRAW.rug = function (x, y, w, h) {
    rrect(x + 4, y + 6, w - 8, h - 12, 10); fillStroke('#FFC9C9', 2);
    rrect(x + 10, y + 12, w - 20, h - 24, 6); ctx.strokeStyle = '#F783AC'; ctx.lineWidth = 3; ctx.stroke();
  };
  DRAW.easels = function (x, y, w, h) {
    for (var ty = y; ty < y + h; ty += T) {
      ctx.strokeStyle = '#8A5F34'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + 12, ty + 44); ctx.lineTo(x + T / 2, ty + 2); ctx.lineTo(x + T - 12, ty + 44); ctx.stroke();
      rrect(x + 8, ty + 6, T - 16, 26, 2); fillStroke('#FFFFFF', 2);
      ctx.fillStyle = BOOKS[(ty / T | 0) % BOOKS.length]; circle(x + 18, ty + 17, 5); ctx.fill();
      ctx.fillStyle = BOOKS[((ty / T | 0) + 2) % BOOKS.length]; ctx.fillRect(x + 24, ty + 20, 12, 6);
    }
  };
  DRAW.paintTable = function (x, y, w, h) {
    table(x, y + 6, w, h - 4);
    BOOKS.forEach(function (col, i) {
      var px = x + 12 + i * ((w - 24) / BOOKS.length);
      rrect(px, y + 12, 9, 11, 2); fillStroke(col, 1.5);
    });
  };
  DRAW.piano = function (x, y, w, h) {
    shadowRect(x, y, w, h);
    rrect(x + 3, y - 6, w - 6, h - 4, 4); fillStroke('#3B2A20', 2.5);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + 8, y + 22, w - 16, 14);
    ctx.fillStyle = '#2A2745';
    for (var k = x + 12; k < x + w - 12; k += 9) ctx.fillRect(k, y + 22, 4, 8);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.strokeRect(x + 10, y - 1, w - 20, 16);
  };
  DRAW.drums = function (x, y, w) {
    ctx.fillStyle = 'rgba(36,33,59,.15)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 42, w / 2 - 6, 7, 0, 0, Math.PI * 2); ctx.fill();
    circle(x + w / 2, y + 26, 16); fillStroke('#E5383B', 2.5); circle(x + w / 2, y + 26, 10); fillStroke('#FFFFFF', 2);
    circle(x + 14, y + 14, 9); fillStroke('#FFD43B', 2); circle(x + w - 14, y + 14, 9); fillStroke('#FFD43B', 2);
    ctx.beginPath(); ctx.ellipse(x + w - 10, y + 2, 12, 4, 0, 0, Math.PI * 2); fillStroke('#FAB005', 1.5);
  };
  DRAW.stands = function (x, y, w, h) {
    for (var ty = y; ty < y + h; ty += T) {
      ctx.strokeStyle = LINE; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + T / 2, ty + 18); ctx.lineTo(x + T / 2, ty + 42); ctx.moveTo(x + 14, ty + 44); ctx.lineTo(x + T - 14, ty + 44); ctx.stroke();
      rrect(x + 10, ty + 4, T - 20, 16, 2); fillStroke('#FFFFFF', 2);
      ctx.fillStyle = LINE; ctx.fillRect(x + 14, ty + 9, 10, 1.5); ctx.fillRect(x + 14, ty + 13, 16, 1.5);
    }
  };
  DRAW.mats = function (x, y, w, h) {
    for (var tx = x; tx < x + w; tx += T * 2.5) {
      rrect(tx + 4, y + 6, Math.min(T * 2.5, x + w - tx) - 8, h - 12, 6); fillStroke('#4C6EF5', 2.5);
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx + 10, y + h / 2); ctx.lineTo(tx + Math.min(T * 2.5, x + w - tx) - 10, y + h / 2); ctx.stroke();
    }
  };
  DRAW.benches = DRAW.bench = function (x, y, w) {
    shadowRect(x, y + 10, w, 30);
    rrect(x + 3, y + 18, w - 6, 12, 4); fillStroke('#C27A3A', 2.5);
    ctx.fillStyle = WOOD_SIDE; ctx.fillRect(x + 8, y + 30, 5, 10); ctx.fillRect(x + w - 13, y + 30, 5, 10);
  };
  DRAW.counter = function (x, y, w, h) {
    table(x, y, w, h, '#DEE2E6');
    ['#E5383B', '#FFD43B', '#FF922B', '#69DB7C'].forEach(function (col, i) {
      var px = x + 16 + i * ((w - 32) / 3);
      rrect(px - 9, y + 10, 18, 12, 3); fillStroke('#FFFFFF', 1.5);
      circle(px, y + 16, 4); ctx.fillStyle = col; ctx.fill();
    });
  };
  DRAW.longTables = function (x, y, w, h) {
    ctx.fillStyle = WOOD_SIDE; rrect(x + 2, y - 4, w - 4, 7, 3); ctx.fill();
    table(x, y + 4, w, h - 8, '#F1E3C8');
    for (var px = x + 16; px < x + w - 10; px += 30) { rrect(px - 8, y + 12, 16, 10, 2); fillStroke('#CED4DA', 1.2); }
    ctx.fillStyle = WOOD_SIDE; rrect(x + 2, y + h - 6, w - 4, 7, 3); ctx.fill();
  };
  DRAW.beds = function (x, y, w, h) {
    shadowRect(x, y, w, h);
    rrect(x + 3, y + 4, w - 6, h - 10, 6); fillStroke('#FFFFFF', 2.5);
    rrect(x + 6, y + 8, 18, h - 18, 4); fillStroke('#F8F9FA', 1.5);
    rrect(x + 26, y + 6, w - 32, h - 14, 5); fillStroke('#A5D8FF', 2);
  };
  DRAW.cabinet = function (x, y, w, h) {
    shadowRect(x, y, w, h);
    rrect(x + 6, y - 4, w - 12, h, 4); fillStroke('#F8F9FA', 2.5);
    ctx.fillStyle = '#2F9E44'; ctx.fillRect(x + w / 2 - 3, y + 6, 6, 18); ctx.fillRect(x + w / 2 - 9, y + 12, 18, 6);
  };
  DRAW.chairs = function (x, y, w, h) {
    for (var ty = y; ty < y + h; ty += T) for (var tx = x; tx < x + w; tx += T) {
      chairAt(tx + 14, ty + 30, '#4C6EF5'); chairAt(tx + 34, ty + 30, '#4C6EF5');
    }
  };
  DRAW.reception = function (x, y, w, h) {
    table(x, y, w, h, '#E9D8BD');
    rrect(x + 10, y + 12, 26, 18, 3); fillStroke('#2A2745', 1.5); ctx.fillStyle = '#4DABF7'; ctx.fillRect(x + 13, y + 15, 20, 11);
    circle(x + w / 2, y + 60, 6); fillStroke('#F2C94C', 2);
  };
  DRAW.plant = function (x, y) {
    ctx.fillStyle = 'rgba(36,33,59,.16)'; ctx.beginPath(); ctx.ellipse(x + T / 2, y + 42, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    [[-10, -6], [10, -6], [0, -14], [-6, 2], [6, 2]].forEach(function (l) {
      ctx.beginPath(); ctx.ellipse(x + T / 2 + l[0], y + 18 + l[1], 9, 13, l[0] * 0.05, 0, Math.PI * 2); fillStroke('#40C057', 2);
    });
    rrect(x + 13, y + 26, 22, 16, 4); fillStroke('#E8590C', 2.5);
  };
  DRAW.lockers = function (x, y, w) { for (var tx = x; tx < x + w; tx += T) drawLockers(tx / T, y / T); };
  DRAW.veggieBed = function (x, y, w, h) {
    shadowRect(x, y, w, h);
    rrect(x + 2, y + 4, w - 4, h - 8, 4); fillStroke('#A9713E', 2.5);
    ctx.fillStyle = '#7A5230'; ctx.fillRect(x + 7, y + 9, w - 14, h - 18);
    for (var px = x + 14; px < x + w - 8; px += 18) {
      ctx.beginPath(); ctx.ellipse(px, y + 20, 6, 8, 0, 0, Math.PI * 2); fillStroke(px % 36 < 18 ? '#69DB7C' : '#40C057', 1.5);
      if (px % 36 < 18) { ctx.fillStyle = '#FD7E14'; ctx.fillRect(px - 1.5, y + 28, 3, 6); }
    }
  };
  DRAW.slide = function (x, y, w, h) {
    ctx.fillStyle = 'rgba(36,33,59,.16)'; rrect(x + 4, y + h - 10, w - 8, 10, 5); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 14, y + h - 6); ctx.lineTo(x + 14, y + 10); ctx.moveTo(x + 30, y + h - 6); ctx.lineTo(x + 30, y + 10); ctx.stroke();
    for (var ry = y + 18; ry < y + h - 10; ry += 10) { ctx.beginPath(); ctx.moveTo(x + 14, ry); ctx.lineTo(x + 30, ry); ctx.stroke(); }
    rrect(x + 10, y + 4, 26, 10, 3); fillStroke('#FFD43B', 2.5);
    ctx.beginPath(); ctx.moveTo(x + 34, y + 10); ctx.quadraticCurveTo(x + w - 4, y + h / 2, x + w - 6, y + h - 8);
    ctx.lineTo(x + w - 20, y + h - 8); ctx.quadraticCurveTo(x + w - 18, y + h / 2, x + 34, y + 22); ctx.closePath();
    fillStroke('#E5383B', 2.5);
  };
  DRAW.climber = function (x, y, w, h) {
    ctx.fillStyle = 'rgba(36,33,59,.14)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 8, w / 2 - 6, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(x + w / 2, y + h - 10, w / 2 - 10, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = '#4DABF7'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(x + w / 2, y + h - 10, w / 2 - 10, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + w / 2, y + h - 10, w / 2 - 30, Math.PI, 0); ctx.stroke();
    for (var a = 1; a < 6; a++) {
      var ang = Math.PI + a * Math.PI / 6;
      ctx.beginPath(); ctx.moveTo(x + w / 2 + Math.cos(ang) * (w / 2 - 10), y + h - 10 + Math.sin(ang) * (w / 2 - 10));
      ctx.lineTo(x + w / 2, y + h - 10); ctx.stroke();
    }
  };
  DRAW.hopscotch = function (x, y, w, h) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '700 16px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var k = 0; k < 5; k++) {
      ctx.strokeRect(x + k * (w / 5) + 4, y + 6, w / 5 - 8, h - 12);
      ctx.fillText(String(k + 1), x + k * (w / 5) + w / 10, y + h / 2);
    }
  };
  DRAW.shade = function (x, y, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(x + 6, y + 8); ctx.lineTo(x + w - 6, y + 20); ctx.lineTo(x + w / 2, y + h - 10); ctx.closePath();
    fillStroke('#FFF4E6', 2);
    ctx.restore();
    ctx.fillStyle = LINE; [[x + 6, y + 8], [x + w - 6, y + 20], [x + w / 2, y + h - 10]].forEach(function (p) { circle(p[0], p[1], 3.5); ctx.fill(); });
  };
  /* Wall pieces: y is the top of the wall's face. */
  DRAW.whiteboard = function (x, y, w) {
    rrect(x + 6, y + 2, w - 12, 24, 3); fillStroke('#FFFFFF', 2.5);
    ctx.strokeStyle = '#1C7ED6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 18, y + 10); ctx.lineTo(x + 60, y + 10); ctx.moveTo(x + 18, y + 17); ctx.lineTo(x + 44, y + 17); ctx.stroke();
    ctx.strokeStyle = '#E5383B'; ctx.beginPath(); ctx.moveTo(x + w - 60, y + 14); ctx.lineTo(x + w - 30, y + 14); ctx.stroke();
    ctx.fillStyle = '#ADB5BD'; ctx.fillRect(x + 10, y + 26, w - 20, 3);
  };
  DRAW.noticeboard = function (x, y, w) {
    rrect(x + 6, y + 2, w - 12, 22, 3); fillStroke('#D9A066', 2.5);
    ['#FFF3BF', '#D0EBFF', '#FFE3E3', '#D3F9D8'].forEach(function (col, i) {
      ctx.fillStyle = col; ctx.fillRect(x + 12 + i * ((w - 30) / 4), y + 6 + (i % 2) * 3, 14, 11);
    });
  };
  DRAW.clock = function (x, y) {
    circle(x + T / 2, y + 13, 11); fillStroke('#FFFFFF', 2.5);
    ctx.strokeStyle = LINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + T / 2, y + 13); ctx.lineTo(x + T / 2, y + 6); ctx.moveTo(x + T / 2, y + 13); ctx.lineTo(x + T / 2 + 6, y + 15); ctx.stroke();
  };
  DRAW.hoop = function (x, y) {
    rrect(x + 8, y - 2, T - 16, 20, 2); fillStroke('#FFFFFF', 2.5);
    ctx.strokeStyle = '#E8590C'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x + T / 2, y + 22, 10, 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + T / 2 - 9, y + 23); ctx.lineTo(x + T / 2 - 5, y + 32); ctx.moveTo(x + T / 2 + 9, y + 23); ctx.lineTo(x + T / 2 + 5, y + 32); ctx.stroke();
  };
  /* The real school's pieces: the reception stage from the photo, the
     garden hedges, the court and the pitch, the exit's blue roof. */
  DRAW.facadeSign = function (x, y, w) {
    rrect(x - 2, y - 4, w + 4, T - 18, 3); fillStroke('#1F3170', 2.5);
    ctx.fillStyle = '#F2C94C'; ctx.font = '700 15px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('MULTINATIONAL SCHOOL BAHRAIN', x + w / 2, y + 11);
  };
  DRAW.pillar = function (x, y) {
    shadowRect(x + 8, y, T - 16, T);
    rrect(x + 13, y - 30, T - 26, T + 24, 4); fillStroke('#FFFFFF', 2.5);
    ctx.fillStyle = 'rgba(42,39,69,.08)'; ctx.fillRect(x + 16, y - 27, 4, T + 18);
  };
  DRAW.backdrop = function (x, y, w, h) {
    rrect(x + 4, y - 10, w - 8, h + 2, 6); fillStroke('#3F3FB0', 2.5);
    if (!CREST.ready) return;
    for (var cx = x + 16; cx < x + w - 20; cx += 26) for (var cy = y - 4; cy < y + h - 18; cy += 20) ctx.drawImage(CREST, cx, cy, 13, 15);
  };
  DRAW.lectern = function (x, y) {
    shadowRect(x + 10, y, T - 20, T);
    ctx.beginPath(); ctx.moveTo(x + 12, y - 4); ctx.lineTo(x + T - 12, y - 4); ctx.lineTo(x + T - 15, y + T - 6); ctx.lineTo(x + 15, y + T - 6); ctx.closePath();
    fillStroke('#B07A45', 2.5);
    rrect(x + 9, y - 10, T - 18, 8, 2); fillStroke('#8A5A2B', 2.5);
    if (CREST.ready) ctx.drawImage(CREST, x + T / 2 - 8, y + 6, 16, 18);
  };
  DRAW.hedge = function (x, y, w, h) {
    for (var tx = x; tx < x + w; tx += T) for (var ty = y; ty < y + h; ty += T) {
      [[12, 26, 13], [28, 22, 14], [36, 32, 11], [20, 36, 12]].forEach(function (b) { circle(tx + b[0], ty + b[1], b[2]); fillStroke('#3FA34D', 2); });
    }
  };
  DRAW.fence = function (x, y, w, h) {
    ctx.strokeStyle = 'rgba(42,39,69,.45)'; ctx.lineWidth = 1.2;
    for (var tx = x; tx < x + w; tx += T) for (var ty = y; ty < y + h; ty += T) {
      ctx.beginPath();
      for (var k = 0; k < T; k += 8) { ctx.moveTo(tx + k, ty + 6); ctx.lineTo(tx + k + 8, ty + T - 6); ctx.moveTo(tx + k + 8, ty + 6); ctx.lineTo(tx + k, ty + T - 6); }
      ctx.stroke();
      circle(tx + 4, ty + T / 2, 4); fillStroke('#ADB5BD', 2);
    }
  };
  DRAW.hoopPost = function (x, y) {
    ctx.fillStyle = '#495057'; ctx.fillRect(x + T / 2 - 3, y - 26, 6, T + 18);
    DRAW.hoop(x, y - 40);
  };
  DRAW.goal = function (x, y, w) {
    rrect(x + 4, y + 8, w - 8, T - 16, 3); fillStroke('rgba(255,255,255,.35)', 3);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (var k = x + 10; k < x + w - 6; k += 8) { ctx.moveTo(k, y + 10); ctx.lineTo(k, y + T - 10); } ctx.stroke();
  };
  DRAW.canopy = function (x, y, w, h) {
    ctx.globalAlpha = 0.5;
    rrect(x, y, w, h, 6); ctx.fillStyle = '#74C0FC'; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = LINE; ctx.lineWidth = 2.5; rrect(x, y, w, h, 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); for (var k = x + 24; k < x + w; k += 48) { ctx.moveTo(k, y + 4); ctx.lineTo(k, y + h - 4); } ctx.stroke();
  };
  DRAW.globe = function (x, y) { drawGlobe(x, y); };
  DRAW.worldMap = function (x, y) { drawWorldMap(x, y); };
  var FLAT = { rug: 1, mats: 1, hopscotch: 1 }, OVER = { shade: 1, canopy: 1 };
  function decorBox(d) {
    return { x: d.rect[0] * T, y: d.rect[1] * T, w: (d.rect[2] - d.rect[0] + 1) * T, h: (d.rect[3] - d.rect[1] + 1) * T };
  }
  function drawDecor(which) {
    FD.decor.forEach(function (d) {
      var b = decorBox(d);
      if (!inView(b.x + b.w / 2, b.y + b.h / 2) && !OVER[d.type]) return;
      if (which === 'flat' && FLAT[d.type]) DRAW[d.type](b.x, b.y, b.w, b.h, d);
      if (which === 'wall' && d.wall) DRAW[d.type](b.x, b.y + 16, b.w, b.h, d);
      if (which === 'over' && OVER[d.type]) DRAW[d.type](b.x, b.y, b.w, b.h, d);
    });
  }
  function drawDecorRow(r) {
    FD.decor.forEach(function (d) {
      if (d.rect[3] !== r || !d.block) return;
      var b = decorBox(d);
      if (inView(b.x + b.w / 2, b.y + b.h / 2)) DRAW[d.type](b.x, b.y, b.w, b.h, d);
    });
  }

  /* ---------- Furniture and things ---------- */
  function drawLockers(c, r) {
    var x = c * T, y = r * T;
    rrect(x + 3, y + 2, T - 6, T - 4, 4); fillStroke('#4D8FA8', 2.5);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + T / 2, y + 4); ctx.lineTo(x + T / 2, y + T - 4); ctx.stroke();
    [10, 16, 22].forEach(function (dy) {
      ctx.beginPath(); ctx.moveTo(x + 9, y + dy); ctx.lineTo(x + 19, y + dy);
      ctx.moveTo(x + 29, y + dy); ctx.lineTo(x + 39, y + dy); ctx.stroke();
    });
  }
  var BOOKS = ['#E5383B', '#1C7ED6', '#FAB005', '#2F9E44', '#7048E8', '#F783AC'];
  function drawShelf(c, r, wiggle) {
    var x = c * T, y = r * T;
    rrect(x + 2, y + 2, T - 4, T - 4, 4); fillStroke('#9A6B3C', 2.5);
    for (var row = 0; row < 2; row++) {
      for (var b = 0; b < 6; b++) {
        var bh = 13 + (hash(c * 7 + b, r + row) % 5), lift = wiggle ? Math.sin(time * 6 + b + c) * 1.2 : 0;
        ctx.fillStyle = BOOKS[(b + c + row) % BOOKS.length];
        ctx.fillRect(x + 6 + b * 6, y + 6 + row * 20 + (18 - bh) + lift, 5, bh);
      }
    }
  }
  function drawPalm(c, r) {
    var x = c * T + T / 2, y = r * T + T - 6, sway = reduce ? 0 : Math.sin(time * 1.2 + c) * 2;
    ctx.fillStyle = 'rgba(36,33,59,.18)';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'round';
    ctx.strokeStyle = LINE; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4, y - 26, x + sway, y - 48); ctx.stroke();
    ctx.strokeStyle = '#A0743F'; ctx.lineWidth = 5.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4, y - 26, x + sway, y - 48); ctx.stroke();
    var top = { x: x + sway, y: y - 48 };
    [[-1, -0.3], [1, -0.3], [-0.8, 0.5], [0.8, 0.5], [0, -1]].forEach(function (d) {
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.quadraticCurveTo(top.x + d[0] * 22, top.y + d[1] * 22 - 8, top.x + d[0] * 30, top.y + d[1] * 26 + 8);
      ctx.quadraticCurveTo(top.x + d[0] * 14, top.y + d[1] * 12, top.x, top.y);
      fillStroke('#2F9E44', 2);
    });
    if (isDatePalm(c, r)) {                             // a date palm: clusters of dates under the crown
      [[-9, 6], [8, 7], [0, 11]].forEach(function (d) {
        [[0, 0], [4, 2], [-3, 3], [1, 5]].forEach(function (e) { circle(top.x + d[0] + e[0], top.y + d[1] + e[1], 2.6); fillStroke('#C2591B', 1); });
      });
    }
  }
  function isDatePalm(c, r) { return hash(c, r) % 2 === 0; }
  /* The flag of Bahrain on its pole by the reception stage: white at the
     hoist, red beyond a five-point zigzag. */
  DRAW.flagpole = function (x, y) {
    var px = x + T / 2, top = y - 52;
    ctx.fillStyle = 'rgba(36,33,59,.18)'; ctx.beginPath(); ctx.ellipse(px, y + T - 6, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, y + T - 6); ctx.lineTo(px, top); ctx.stroke();
    ctx.strokeStyle = '#DEE2E6'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px, y + T - 7); ctx.lineTo(px, top + 1); ctx.stroke();
    var fx = px + 2, fw = 46, fh = 28;
    ctx.beginPath(); ctx.rect(fx, top, fw, fh); ctx.fillStyle = '#CE1126'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(fx, top);
    var zx = fx + 12, step = fh / 5;
    ctx.lineTo(zx, top);
    for (var k = 0; k < 5; k++) { ctx.lineTo(zx + 7, top + step * k + step / 2); ctx.lineTo(zx, top + step * (k + 1)); }
    ctx.lineTo(fx, top + fh); ctx.closePath(); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.strokeRect(fx, top, fw, fh);
    circle(px, top - 3, 3.5); fillStroke(ART.GOLD, 1.5);
  };
  /* The house banner over the reception stage, during the cup moment. */
  function drawBanner(k) {
    var s = M.FLOORS.ground.spots.stage, half = (s[2] - s[0] + 1) * T / 2, x = s[0] * T + half, y = s[1] * T + 4;
    if (!house || k <= 0) return;
    ctx.globalAlpha = Math.min(1, k);
    rrect(x - 120, y, 240, 44, 10); fillStroke(PAINT[house].main, 3);
    ctx.fillStyle = house === 'AIR' ? LINE : '#FFFFFF'; ctx.font = '700 22px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Well done, ' + Q.HOUSES[house].name + '!', x, y + 23);
    ctx.globalAlpha = 1;
  }
  function drawChest(c, r, open) {
    var x = c * T + 6, y = r * T + 12, w = T - 12, h = T - 18;
    ctx.fillStyle = 'rgba(36,33,59,.15)';
    ctx.beginPath(); ctx.ellipse(c * T + T / 2, r * T + T - 4, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
    rrect(x, y + 8, w, h - 8, 4); fillStroke('#B76A2D', 2.5);
    if (open) { rrect(x, y - 6, w, 12, 4); fillStroke('#6E3A15', 2.5); }
    else { rrect(x, y, w, 12, 5); fillStroke('#C27A3A', 2.5); }
    ctx.fillStyle = house ? PAINT[house].main : '#3D3F91'; ctx.fillRect(x, y + 13, w, 5);
    if (!open) { rrect(x + w / 2 - 5, y + 9, 10, 11, 2); fillStroke('#F2B233', 2); }
  }
  function drawCup(c, r) {
    var x = c * T + T / 2, y = r * T + T / 2;
    drawCupAt(x, y, 1);
    if (!cupSparkles()) return;
    for (var i = 0; i < 4; i++) {                         // glints: the cup can be taken
      var a = (reduce ? 0 : time * 1.6) + i * Math.PI / 2, gx = x + Math.cos(a) * 30, gy = y - 4 + Math.sin(a) * 22, s = 5;
      ctx.beginPath(); ctx.moveTo(gx, gy - s); ctx.lineTo(gx + 1.6, gy - 1.6); ctx.lineTo(gx + s, gy); ctx.lineTo(gx + 1.6, gy + 1.6);
      ctx.lineTo(gx, gy + s); ctx.lineTo(gx - 1.6, gy + 1.6); ctx.lineTo(gx - s, gy); ctx.lineTo(gx - 1.6, gy - 1.6); ctx.closePath();
      ctx.fillStyle = '#FFF3BF'; ctx.fill(); ctx.strokeStyle = ART.GOLD_DEEP; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }
  function cupSparkles() { return asleep() && !cupTaken; }
  /* Dust when Wafi stops. */
  var dust = [];
  function puff() {
    var p = wafiPixel();
    for (var i = 0; i < 3; i++) dust.push({ x: p.x - 10 + i * 10, y: p.y + T / 2 - 8, r: 3 + i % 2, life: 0.4 });
  }
  function drawDust() {
    dust.forEach(function (d) {
      ctx.globalAlpha = Math.max(0, d.life / 0.4) * 0.5;
      circle(d.x, d.y - (0.4 - d.life) * 14, d.r + (0.4 - d.life) * 8); ctx.fillStyle = '#E9DFC9'; ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function drawCupAt(x, y, k, held) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y);
    drawCupShape(x, y, held);
    ctx.restore();
  }
  function drawCupShape(x, y, held) {
    var glow = reduce ? 0.5 : 0.4 + Math.sin(time * 3) * 0.15;
    if (finale && house) { ctx.fillStyle = PAINT[house].light; ctx.globalAlpha = 0.6; circle(x, y - 2, 34); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = 'rgba(242,201,76,' + glow + ')'; circle(x, y - 2, 26); ctx.fill();
    if (!held) { rrect(x - 13, y + 12, 26, 9, 2); fillStroke('#7A5230', 2.5); }
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 16); ctx.lineTo(x + 12, y - 16); ctx.quadraticCurveTo(x + 11, y + 2, x, y + 4);
    ctx.quadraticCurveTo(x - 11, y + 2, x - 12, y - 16); ctx.closePath();
    fillStroke('#F2C94C', 2.5);
    ctx.strokeStyle = LINE; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x - 13, y - 9, 6, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 13, y - 9, 6, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.fillRect(x - 2, y + 4, 4, 8);
  }
  function drawDoor(c, r, h, open, mine, swing) {
    var x = c * T, y = r * T, col = PAINT[h];
    if (!col) return;                                   // decoys get their houses in start()
    ctx.fillStyle = '#5B3A20'; ctx.fillRect(x + 2, y, T - 4, T);
    if (open) {
      var k = swing === undefined ? 1 : ease(swing), dw = (T - 8) + (7 - (T - 8)) * k;
      ctx.fillStyle = col.light; ctx.fillRect(x + 6, y + 4, T - 12, T - 8);    // the doormat in the house colour
      rrect(x + 2, y + 2, dw, T - 4, 2); fillStroke(col.main, 2);              // the door, swinging back
      return;
    }
    rrect(x + 4, y + 2, T - 8, T - 4, 5); fillStroke(col.main, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x + 8, y + 6, 8, T - 12);
    drawIcon(col.icon, x + T / 2, y + T / 2 - 2, 24, h === 'AIR' ? LINE : '#FFFFFF', 2.8);
    circle(x + T - 11, y + T / 2 + 10, 2.5); ctx.fillStyle = '#F2B233'; ctx.fill();
    if (mine) {
      var bob = reduce ? 0 : Math.sin(time * 5 + c) * 4;
      drawArrow(x + T / 2, y - 16 + bob);
    }
  }
  /* A classroom or office door, in wood with a little window; a classroom's
     swings back once Wafi opens it (swing: 0 shut, 1 open). */
  function drawClassDoor(c, r, swing) {
    var x = c * T, y = r * T;
    ctx.fillStyle = '#5B3A20'; ctx.fillRect(x + 2, y, T - 4, T);
    if (swing > 0) {
      ctx.fillStyle = '#E3CFA8'; ctx.fillRect(x + 6, y + 4, T - 12, T - 8);    // the floor through the doorway
      rrect(x + 2, y + 2, (T - 8) + (7 - (T - 8)) * ease(swing), T - 4, 2); fillStroke('#B5835A', 2);
      return;
    }
    rrect(x + 4, y + 2, T - 8, T - 4, 5); fillStroke('#B5835A', 2.5);
    rrect(x + 13, y + 7, T - 26, 12, 3); fillStroke('#CFE8FF', 2);
    circle(x + T - 11, y + T / 2 + 6, 2.5); ctx.fillStyle = '#F2B233'; ctx.fill();
  }
  /* The house points notice board, across its two tiles. */
  function drawBoard(c, r) {
    if (tile(c - 1, r) === 'n') return;
    var x = c * T, y = r * T, w = 2 * T;
    ctx.fillStyle = '#5B3A20'; ctx.fillRect(x, y, w, T);
    rrect(x + 3, y + 3, w - 6, T - 8, 4); fillStroke('#D9A066', 2.5);
    ORDER.forEach(function (h, i) {
      rrect(x + 12 + i * 19, y + 11 + (i % 2) * 6, 14, 17, 2); fillStroke(PAINT[h].main, 1.5);
      circle(x + 19 + i * 19, y + 11 + (i % 2) * 6, 2.2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    });
    if (delivered && house) {                           // the pupil's card, with the cup above it
      rrect(x + w / 2 - 22, y + 6, 44, 28, 4); fillStroke(PAINT[house].main, 2.5);
      ctx.fillStyle = house === 'AIR' ? LINE : '#FFFFFF'; ctx.font = '700 15px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(UI.state.gems), x + w / 2, y + 21);
      drawCupAt(x + w / 2, y - 14, 0.8, true);
    }
  }
  /* ---------- The guide, once the six chests are open ----------
     Points at the cup, then at the board, or at the stairs that lead there by
     the shortest walk overall. Recomputed only when Wafi changes tile. */
  var guideKey = '', guideAt = null, otherLeg = {};
  var CUP_AT = M.parse('ground').cup, BOARD_AT = M.parse('up').board[0];
  function guideGoal() {
    if (handedIn || finale) return null;
    if (!asleep()) return hintGoal();
    if (carrying) return { kind: 'board', key: 'board', floor: 'up', c: BOARD_AT.c, r: BOARD_AT.r };
    if (!cupTaken) return { kind: 'cup', key: 'cup', floor: 'ground', c: CUP_AT.c, r: CUP_AT.r };
    return null;
  }
  /* Before the sixth chest: after 8 s without moving (the world not frozen),
     point at the nearest closed door of the pupil's house, and keep pointing
     at it until it is opened. */
  var DOOR_AT = {}, hintZone = null;
  ['ground', 'up'].forEach(function (f) { M.parse(f).doors.forEach(function (d) { DOOR_AT[d.zone] = { floor: f, c: d.c, r: d.r }; }); });
  function doorGoal(id) { var d = DOOR_AT[id]; return { kind: 'door', key: 'door:' + id, zone: id, floor: d.floor, c: d.c, r: d.r }; }
  function hintGoal() {
    if (hintZone && painted[hintZone]) { hintZone = null; quietFor = 0; }   // done: wait for the next 8 s stop
    if (!hintZone && quietFor >= 8 && !frozen) {
      var bestCost = Infinity;
      ROOM_IDS.forEach(function (id) {
        if (painted[id]) return;
        var cost = routeTo(doorGoal(id)).cost;
        if (cost < bestCost) { bestCost = cost; hintZone = id; }
      });
    }
    return hintZone ? doorGoal(hintZone) : null;
  }
  function stepsTo(m, from, to, blockedFn) {          // steps to stand next to `to`
    var best = Infinity;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      var n = { c: to.c + d[0], r: to.r + d[1] };
      if (!M.walkable(m.tile(n.c, n.r))) return;
      var p = M.findPath(from, n, blockedFn);
      if (p && p.length < best) best = p.length;
    });
    return best;
  }
  var STAIRS_COST = 10;                                // a floor change counts as ten more steps: harder for a 7-year-old
  /* The walk to a goal: its length, and where to head first (the goal, or
     the stairs whose walk there and on from the far end is shortest). */
  function routeTo(goal) {
    if (goal.floor === floor) return { cost: stepsTo(map, { c: wafi.c, r: wafi.r }, goal, blocked), target: goal };
    var other = goal.floor, best = null, bestCost = Infinity;
    M.STAIRS.forEach(function (st) {
      var ok = st.id + ':' + goal.key;
      if (otherLeg[ok] === undefined) {               // from the far end of these stairs to the goal
        var om = M.parse(other);
        otherLeg[ok] = stepsTo(om, { c: st[other][0], r: st[other][1] }, goal, function (c, r) { return !M.walkable(om.tile(c, r)); });
      }
      var here = { c: st[floor][0], r: st[floor][1] };
      var p = M.findPath({ c: wafi.c, r: wafi.r }, here, blocked);
      var cost = (p ? p.length : Infinity) + otherLeg[ok] + STAIRS_COST;
      if (cost < bestCost) { bestCost = cost; best = { kind: 'stairs', id: st.id, floor: floor, c: here.c, r: here.r }; }
    });
    return { cost: bestCost, target: best };
  }
  function guide() {
    var goal = guideGoal();
    if (!goal) return null;
    if (goal.floor === floor) return goal;
    var k = floor + ':' + wafi.c + ',' + wafi.r + ':' + goal.key;
    if (k !== guideKey) { guideKey = k; guideAt = routeTo(goal).target; }
    return guideAt;
  }
  /* A bobbing arrow over the target when it is on screen, else a little way
     out from Wafi pointing to it: near him it stays clear of the arrows and
     the jump button on the map. */
  function drawGuide() {
    var g = guide();
    if (!g) return;
    var x = g.c * T + T / 2, y = g.r * T, bob = reduce ? 0 : Math.sin(time * 5) * 4;
    if (x > camX + 10 && x < camX + viewW - 10 && y + T / 2 > camY + 10 && y + T / 2 < camY + viewH - 10) {   // its middle is on screen
      ctx.save(); ctx.translate(x - Math.round(camX), y - 26 + bob - Math.round(camY)); ctx.scale(1.5, 1.5);
      drawArrow(0, 0, ART.GOLD);
      ctx.restore();
      return;
    }
    var p = wafiPixel(), cx = p.x - camX, cy = p.y - camY - 20, a = Math.atan2(y + T / 2 - camY - cy, x - camX - cx);
    var ex = cx + Math.cos(a) * 78, ey = cy + Math.sin(a) * 78;
    ctx.save(); ctx.translate(ex + Math.cos(a) * bob, ey + Math.sin(a) * bob); ctx.rotate(a - Math.PI / 2); ctx.scale(1.6, 1.6);
    drawArrow(0, 0, ART.GOLD);
    ctx.restore();
  }
  function drawArrow(x, y, fill) {
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 11); ctx.lineTo(x + 7, y - 11); ctx.lineTo(x + 7, y - 2); ctx.lineTo(x + 13, y - 2);
    ctx.lineTo(x, y + 10); ctx.lineTo(x - 13, y - 2); ctx.lineTo(x - 7, y - 2); ctx.closePath();
    fillStroke(fill || '#FFFFFF', 2.5);
  }
  /* A sign on the wall beside a door: on its left, or on its right when
     the wall on the left is too short for the words. */
  function drawSign(s) {
    var h = 28, y = s.r * T + 10, pad = s.icon ? 28 : 10;
    ctx.font = '700 ' + (s.label.length > 8 ? 11 : 13) + 'px ' + FONT;
    var w = Math.max(2 * T - 8, Math.ceil(ctx.measureText(s.label).width) + pad + 10);
    var room = 0;
    while (room < 6 && tile(s.c - room - 1, s.r) === '#' && tile(s.c - room - 1, s.r + 1) !== '^') room++;   // not over a stairs sign
    var x = room * T >= w + 4 ? s.c * T - 4 - w : (s.c + 1) * T + 4;
    if (s.centred) x = Math.max(4, Math.min(MAP_W - 4 - w, s.c * T + T / 2 - w / 2));
    rrect(x, y, w, h, 7); fillStroke('#FFFFFF', 2.5);
    if (s.icon) drawIcon(s.icon, x + 16, y + h / 2, 18, '#1C2C70', 2.4);
    ctx.fillStyle = '#1C2C70'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(s.label, x + pad, y + h / 2 + 1);
  }
  /* A rival stands in its doorway, bobbing; once its habit has changed it
     walks off as its new self and fades. */
  var RIVAL_ART = {}, leaving = [], rainbow = false;
  ['couch', 'cloud', 'owl', 'fizzy'].forEach(function (k) {
    RIVAL_ART[k] = { before: bake(ART.rival(k, 'before'), ART.SIZE.rival, 1.5), after: bake(ART.rival(k, 'after'), ART.SIZE.rival, 1.5) };
  });
  function drawRival(kind, x, y, which, alpha) {
    var cv = RIVAL_ART[kind][which];
    if (!cv.ready) return;
    var bob = reduce ? 0 : Math.abs(Math.sin(time * 3 + x)) * 3, s = 62;
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.drawImage(cv, x - s / 2, y - s + T / 2 - 2 - bob, s, s);
    ctx.globalAlpha = 1;
  }
  function drawRainbow() {
    var g = ZONE_BY_ID.garden.rect, cx = (g[0] + g[2] + 1) / 2 * T, cy = (g[3] + 1) * T, cols = ['#E5383B', '#FD7E14', '#FAB005', '#40C057', '#1C7ED6', '#7048E8'];
    ctx.globalAlpha = 0.55; ctx.lineWidth = 12;
    cols.forEach(function (c, i) { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(cx, cy, 300 - i * 12, Math.PI, 0); ctx.stroke(); });
    ctx.globalAlpha = 1;
  }

  /* ---------- Wafi ---------- */
  var WAFI_H = 66;
  function drawWafi() {
    var p = wafiPixel(), side = wafi.dir === 'left' || wafi.dir === 'right';
    var d = wafi.dir === 'up' ? 'up' : side ? 'side' : 'down';
    var pose = wafi.moving ? (Math.floor(wafi.walk * 7) % 2 ? 'walkA' : 'walkB')
      : d === 'down' && time % 3.4 < 0.13 ? 'blink' : 'idle';
    if (wafi.air > 0) pose = 'jump';
    if (wafi.dance > 0 || finale) { d = 'down'; pose = 'cheer'; }
    else if (quietFor > 5 && !wafi.moving) { d = 'down'; pose = ['lick', 'look', 'yawn'][Math.floor((quietFor - 5) / 3) % 3]; }
    wafi.pose = pose;
    var cv = FRAMES[d + '-' + pose] || FRAMES[d + '-idle'];
    if (!cv || !cv.ready) return;
    var shake = wafi.shake > 0 && !reduce ? Math.sin(wafi.shake * 70) * 4 : 0;
    if (wafi.shield > 0 && Math.floor(wafi.shield * 10) % 2 === 0) return;     // flashing shield
    var lift = wafi.hop > 0 && !reduce ? Math.sin(Math.PI * wafi.hop / 0.4) * 14 : 0;
    if (wafi.air > 0) lift = Math.sin(Math.PI * wafi.air / 0.5) * 26;
    if (finale && !reduce) lift = Math.abs(Math.sin(finale.t * 6)) * 12;
    if (wafi.dance > 0 && !reduce) lift = Math.abs(Math.sin(wafi.dance * 12)) * 10;
    var w = WAFI_H * cv.width / cv.height, feet = p.y + T / 2 - 6 - lift;
    ctx.fillStyle = 'rgba(36,33,59,.18)';
    ctx.beginPath(); ctx.ellipse(p.x + shake, feet, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(p.x + shake, feet);
    var sy = !reduce && wafi.moving && wafi.air <= 0 ? 1 + 0.07 * Math.sin(Math.PI * wafi.t) : 1;   // a little stretch as he steps
    wafi.scaleY = sy;
    ctx.scale(1 / sy, sy);
    if (wafi.dir === 'right') ctx.scale(-1, 1);
    ctx.drawImage(cv, -w / 2, -WAFI_H * 146 / 150, w, WAFI_H);
    ctx.restore();
    if (finale || carrying) drawCupAt(p.x, feet - WAFI_H - 22, finale ? 1.1 : 0.85, true);   // Wafi lifts, then carries, the House Cup
  }

  /* ---------- One frame ---------- */
  function draw() {
    follow();
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.fillStyle = '#86CCFF'; ctx.fillRect(0, 0, viewW + 2, viewH + 2);
    ctx.save();
    ctx.translate(-Math.round(camX), -Math.round(camY));
    var c0 = Math.max(0, Math.floor(camX / T) - 1), c1 = Math.min(map.w - 1, Math.ceil((camX + viewW) / T) + 1);
    var r0 = Math.max(0, Math.floor(camY / T) - 1), r1 = Math.min(map.h - 1, Math.ceil((camY + viewH) / T) + 2);
    var c, r, ch;
    for (r = r0; r <= r1; r++) {
      for (c = c0; c <= c1; c++) {
        ch = tile(c, r);
        if (ch === '#') drawWall(c, r);
        else drawFloor(c, r);
      }
    }
    drawPitchMarks();
    drawRoofLabels();
    drawDecor('flat');
    prints.forEach(drawPrint);
    drawDecor('wall');
    drawLight();
    var crest = FD.spots.crest;
    if (crest && CREST.ready && inView(crest[0] * T, crest[1] * T)) {   // the crest on the ground before the stage
      ctx.globalAlpha = 0.9;
      ctx.drawImage(CREST, crest[0] * T - T + 10, crest[1] * T - T / 2, 3 * T - 20, (3 * T - 20) * 112 / 100);
      ctx.globalAlpha = 1;
    }
    splats.forEach(drawSplat);
    M.ZONES.forEach(function (z) { if (painted[z.id] && z.floor === floor) drawBunting(z); });
    if (rainbow && floor === 'ground') drawRainbow();
    if (floor === 'ground') drawBall();
    var wr = Math.max(wafi.r, wafi.fr), staff = teacherFigures();
    for (r = r0; r <= r1; r++) {
      for (c = c0; c <= c1; c++) {
        ch = tile(c, r);
        if (ch === 'L') drawLockers(c, r);
        else if (ch === 'B') drawShelf(c, r, !reduce && near('library', 8));
        else if (ch === 'k') drawChest(c, r, painted[M.zoneAt(floor, c, r)]);
        else if (ch === 'd') drawClassDoor(c, r, classroomAt(c, r) ? doorSwing(classroomAt(c, r).id) : 0);
        else if (ch === 'n') drawBoard(c, r);
        else if (ch === 'C' && !finale && !cupTaken) drawCup(c, r);
        else if (ch === 'x') drawDoor(c, r, decoyHouse[key(c, r)], false, false);
        else if (/[1-6]/.test(ch)) drawDoor(c, r, house || 'FIRE', !!opened[ch], !!house, doorSwing(ch));
        else if (/[EFNW]/.test(ch) && !beaten[zoneOfRival(ch).id]) drawRival(zoneOfRival(ch).rival.kind, c * T + T / 2, r * T + T / 2, 'before');
      }
      drawDecorRow(r);
      walkers.forEach(function (w) { if (w.floor === floor && Math.max(w.r, w.fr) === r) drawWalker(w); });
      drawCook(r);
      staff.forEach(function (f) { if (f.r === r) drawTeacher(f); });
      if (floor === 'ground') {
        fruit.forEach(function (f) { if (!f.got && f.r === r) drawFoodItem(f); });
        goldPaws.forEach(function (w) { if (!w.got && w.r === r) drawGoldPaw(w); });
        foods.forEach(function (f) { if (Math.max(f.r, f.fr) === r) drawFoe(f); });
      }
      for (c = c0; c <= c1; c++) if (tile(c, r) === 'T') drawPalm(c, r);
      if (r === wr) { drawDust(); drawWafi(); }
    }
    drawDecor('over');
    signs.forEach(function (s) { if (inView(s.c * T, s.r * T)) drawSign(s); });
    notes.forEach(drawNote);
    floaters.forEach(drawFloater);
    if (finale) drawFinale();
    leaving.forEach(function (l) { drawRival(l.kind, l.x, l.y - l.t * 60, 'after', Math.max(0, 1 - l.t / 1.4)); });
    parts.forEach(drawPart);
    ctx.restore();
    drawGuide();
    if (fade) {                                         // through the stairs: dark, then the other floor
      ctx.fillStyle = 'rgba(42,39,69,' + (1 - Math.abs(fade.t / FADE * 2 - 1)).toFixed(3) + ')';
      ctx.fillRect(0, 0, viewW + 2, viewH + 2);
    }
  }
  function inView(x, y) { return x > camX - 3 * T && x < camX + viewW + 3 * T && y > camY - 3 * T && y < camY + viewH + 3 * T; }
  /* ---------- Pupils about the school (polish spec 2.2) ----------
     Generic children drawn in code, in the four house T-shirts, walking set
     routes. They never step onto Wafi and never block him; with reduced
     motion they stand still. Not real pupils. */
  var walkers = [], WALK_MS = 520;
  var SKINS = ['#F2C6A4', '#D9A07A', '#A86F4C', '#7A4E33'], HAIRS = ['#2A1B18', '#5B3A24', '#C68B4A', '#1E1E1E'];
  function routeTiles(w) {
    var pts = w.path, legs = [], out = [];
    for (var k = 0; k < pts.length - 1; k++) legs.push([pts[k], pts[k + 1]]);
    if (w.loop) legs.push([pts[pts.length - 1], pts[0]]);
    else for (k = pts.length - 1; k > 0; k--) legs.push([pts[k], pts[k - 1]]);
    legs.forEach(function (leg) {
      var c = leg[0][0], r = leg[0][1], dc = Math.sign(leg[1][0] - c), dr = Math.sign(leg[1][1] - r);
      while (c !== leg[1][0] || r !== leg[1][1]) { out.push({ c: c, r: r }); c += dc; r += dr; }
    });
    return out;
  }
  function setupWalkers() {
    walkers = [];
    ['ground', 'up'].forEach(function (f) {
      (M.FLOORS[f].walkers || []).forEach(function (w) {
        var n = walkers.length, tiles = routeTiles(w), k = (n * 7) % tiles.length;
        walkers.push({ floor: f, tiles: tiles, k: k, c: tiles[k].c, r: tiles[k].r, fc: tiles[k].c, fr: tiles[k].r, t: 1, look: n });
      });
    });
  }
  function moveWalkers(dt) {
    if (reduce || frozen) return;
    walkers.forEach(function (w) {
      w.t = Math.min(1, w.t + dt * 1000 / WALK_MS);
      if (w.t < 1) return;
      var next = w.tiles[(w.k + 1) % w.tiles.length];
      if (w.floor === floor && ((next.c === wafi.c && next.r === wafi.r) || (next.c === wafi.fc && next.r === wafi.fr && wafi.moving))) return;   // wait for Wafi
      w.k = (w.k + 1) % w.tiles.length;
      w.fc = w.c; w.fr = w.r; w.c = next.c; w.r = next.r; w.t = 0;
    });
  }
  /* Skin, hair and shirt mixed independently, so no skin tone goes with one house. */
  function lookOf(n) {
    return { skin: n % 4, hair: (n * 3 + (n >> 2)) % 4, style: (n + 2 * (n >> 2)) % 4, shirt: (n * 3 + 1 + (n >> 2)) % 4 };
  }
  function drawPupil(x, feet, look, shirt, dir, step, cook) {
    ctx.fillStyle = 'rgba(36,33,59,.18)';
    ctx.beginPath(); ctx.ellipse(x, feet, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    var sw = step ? 3 : -3;
    ctx.fillStyle = '#3B3F66';                           // legs
    rrect(x - 7, feet - 12 + (step ? -1 : 0), 6, 12, 2); ctx.fill();
    rrect(x + 1, feet - 12 + (step ? 0 : -1), 6, 12, 2); ctx.fill();
    rrect(x - 11, feet - 30, 22, 19, 6); fillStroke(shirt, 2);          // T-shirt
    var L = lookOf(look), skin = SKINS[L.skin];
    circle(x - 12 + (dir === 'left' ? sw : 0), feet - 22, 3.5); fillStroke(skin, 1.5);
    circle(x + 12 + (dir === 'right' ? -sw : 0), feet - 22, 3.5); fillStroke(skin, 1.5);
    circle(x, feet - 40, 10); fillStroke(skin, 2);                     // head
    var hair = HAIRS[L.hair], style = L.style;
    ctx.fillStyle = hair; ctx.strokeStyle = LINE; ctx.lineWidth = 2;
    if (cook) {                                          // the cook's tall white hat
      rrect(x - 9, feet - 64, 18, 16, 6); fillStroke('#FFFFFF', 2);
    } else if (dir === 'up') { circle(x, feet - 41, 10); fillStroke(hair, 2); }
    else {
      ctx.beginPath(); ctx.arc(x, feet - 41, 10, Math.PI, 0); ctx.closePath(); fillStroke(hair, 2);
      if (style === 1) { circle(x, feet - 53, 5); fillStroke(hair, 2); }            // a bun
      if (style === 2) { rrect(x - 11, feet - 42, 4, 14, 2); fillStroke(hair, 1.5); rrect(x + 7, feet - 42, 4, 14, 2); fillStroke(hair, 1.5); }
      if (style === 3) [[-8, -46], [0, -50], [8, -46]].forEach(function (p) { circle(x + p[0], feet + p[1], 4); fillStroke(hair, 1.5); });
    }
    if (dir !== 'up') {                                  // eyes
      ctx.fillStyle = LINE;
      circle(x - 3.5, feet - 38, 1.6); ctx.fill(); circle(x + 3.5, feet - 38, 1.6); ctx.fill();
    }
  }
  function drawWalker(w) {
    var k = ease(w.t), x = (w.fc + (w.c - w.fc) * k) * T + T / 2, y = (w.fr + (w.r - w.fr) * k) * T + T - 6;
    var dir = w.c > w.fc ? 'right' : w.c < w.fc ? 'left' : w.r < w.fr ? 'up' : 'down';
    drawPupil(x, y, w.look, PAINT[ORDER[lookOf(w.look).shirt]].main, dir, w.t < 1 && w.t > 0.5);
  }
  function drawCook(r) {
    var ck = FD.cook;
    if (ck && ck[1] === r) drawPupil(ck[0] * T + T / 2, ck[1] * T + T - 6, 1, '#FFFFFF', 'down', false, true);
  }

  /* ---------- Teachers at their doors ----------
     Within 2 tiles of a teacher's door, the teacher says their line once;
     again only after Wafi has been more than 4 tiles away. */
  var greeted = {}, greetings = 0;
  function teacherDoors() {
    return signs.filter(function (s) { return s.face; });
  }
  function greetTeachers() {
    if (frozen || !house) return;
    var near = null, nearD = 3;
    teacherDoors().forEach(function (s) {
      var d = Math.abs(wafi.c - s.c) + Math.abs(wafi.r - s.r);
      if (d > 4) greeted[s.face] = false;
      else if (d <= 2 && !greeted[s.face] && d < nearD) { near = s; nearD = d; }
    });
    if (!near) return;
    teacherDoors().forEach(function (s) {              // only the nearest speaks; the others wait their turn
      if (Math.abs(wafi.c - s.c) + Math.abs(wafi.r - s.r) <= 2) greeted[s.face] = true;
    });
    greetings++;
    UI.teacherSay(near.face);
  }
  /* Each teacher as a little figure against the wall beside her door, drawn
     in the same flat style as the pupils but taller, with her own hair,
     glasses and clothes (look in mns-art.js); there is no photo of her
     anywhere. She waves while Wafi is within 2 tiles of
     her door.
     ponytail: always on the door's right, where no sign is today; a door
     whose sign falls on the right would need the figure on the left. */
  function teacherFigures() {
    return teacherDoors().map(function (s) {
      return { id: s.face, c: s.c + 1, r: s.r, waving: Math.abs(wafi.c - s.c) + Math.abs(wafi.r - s.r) <= 2 };
    });
  }
  /* Long hair over one shoulder, from the crown down to the chest: straight
     is one lock, wavy a stack of curls. The face and fringe go on top. */
  function hairLock(x, top, bottom, L) {
    if (L.hairStyle === 'wavy') {
      for (var y = bottom - 4, k = 0; y >= top + 4; y -= 5, k++) { circle(x + (k % 2 ? 1.5 : -1.5), y, 5.2); fillStroke(L.hair, 1.6); }
    } else { rrect(x - 4.5, top, 9, bottom - top, [4, 4, 3, 3]); fillStroke(L.hair, 1.8); }
  }
  function arm(x, y, turn, L) {                        // from the shoulder at (x, y), hanging down when turn is 0
    ctx.save(); ctx.translate(x, y); ctx.rotate(turn);
    rrect(-3, -2, 6, 21, 3); fillStroke(L.top, 2);
    circle(0, 20, 3.6); fillStroke(L.skin, 1.6);
    ctx.restore();
  }
  function drawTeacher(f) {
    var L = ART.TEACHERS[f.id].look, x = f.c * T + T / 2, feet = (f.r + 1) * T + 4;
    var bob = reduce ? 0 : Math.sin(time * 2 + f.c) * 0.8, hy = feet - 56 + bob;   // hy: the middle of the face
    ctx.fillStyle = 'rgba(36,33,59,.18)';
    ctx.beginPath(); ctx.ellipse(x, feet, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    rrect(x - 8, feet - 19, 7, 19, 2); fillStroke(L.legs, 2);          // legs and shoes
    rrect(x + 1, feet - 19, 7, 19, 2); fillStroke(L.legs, 2);
    ctx.fillStyle = LINE;
    rrect(x - 9, feet - 4, 9, 5, 2); ctx.fill(); rrect(x, feet - 4, 9, 5, 2); ctx.fill();
    arm(x - 15, feet - 41, 0.12, L);
    if (!f.waving) arm(x + 15, feet - 41, -0.12, L);
    rrect(x - 13, feet - 45, 26, 28, [9, 9, 5, 5]); fillStroke(L.top, 2);   // jumper
    ctx.strokeStyle = 'rgba(42,39,69,.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 12, feet - 21); ctx.lineTo(x + 12, feet - 21); ctx.stroke();   // its ribbed hem
    hairLock(x - 10, hy - 9, feet - 30, L);
    hairLock(x + 10, hy - 9, feet - 30, L);
    circle(x, hy, 11); fillStroke(L.skin, 2);           // face
    ctx.beginPath(); ctx.arc(x, hy - 1, 12.5, Math.PI * 0.97, Math.PI * 2.03); ctx.lineTo(x + 2, hy - 7); ctx.lineTo(x - 2, hy - 7); ctx.closePath();
    fillStroke(L.hair, 2);                               // the top of the hair, parted in the middle
    ctx.fillStyle = 'rgba(240,120,120,.45)';             // rosy cheeks, as in the portraits
    circle(x - 6.5, hy + 4, 2.4); ctx.fill(); circle(x + 6.5, hy + 4, 2.4); ctx.fill();
    ctx.fillStyle = LINE;
    circle(x - 4, hy + 1, 1.7); ctx.fill(); circle(x + 4, hy + 1, 1.7); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, hy + 4.5, 3.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();   // smile
    if (L.glasses) {
      ctx.lineWidth = 1.3;
      circle(x - 4, hy + 1, 3.6); ctx.stroke(); circle(x + 4, hy + 1, 3.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 0.6, hy + 1); ctx.lineTo(x + 0.6, hy + 1); ctx.stroke();
    }
    if (f.waving) arm(x + 14, feet - 41, -(Math.PI - 0.55) + (reduce ? 0 : Math.sin(time * 9) * 0.3), L);   // up, beside the head
  }
  /* Signs on this floor: own rooms at their door, rival zones at their
     entrance, and every other named door. */
  var signs = [];
  function buildSigns() {
    signs = [];
    map.doors.forEach(function (d) { var z = ZONE_BY_ID[d.zone]; signs.push({ label: z.name, icon: z.icon, face: z.teacher, c: d.c, r: d.r }); });
    map.rivals.forEach(function (v) { var z = ZONE_BY_ID[v.zone]; signs.push({ label: z.name, icon: z.icon, c: v.c, r: v.r }); });
    map.rooms.forEach(function (rm) { var o = roomAt(rm.c, rm.r); signs.push({ label: o.sign, face: o.teacher, c: rm.c, r: rm.r }); });
    map.stairs.forEach(function (st) {                  // on the wall above the stairs
      signs.push(floor === 'ground' ? { label: 'Junior school \u2191', c: st.c, r: st.r - 1, centred: true }
        : { label: 'Downstairs \u2193', c: st.c, r: st.r - 1, centred: true });
    });
  }

  /* What the pupil should do now: said by "What now?" and read aloud. */
  function objectiveText() {
    if (!house) return '';
    var left = chestsLeft();
    if (handedIn) return SL.handedIn;
    if (carrying) return SL.takeCup;
    if (!left) return SL.getCup;
    var text = SL.find(Q.HOUSES[house].colour, left);
    var here = ROOM_IDS.filter(function (id) { return !painted[id] && ZONE_BY_ID[id].floor === floor; }).length;
    if (!here) text += floor === 'ground' ? SL.goUpstairs : SL.goDownstairs;
    return text;
  }
  function paintObjective() { if (house && window.SchoolUI && window.SchoolUI.paintHud) window.SchoolUI.paintHud(); }


  var last = 0;
  function frame(ts) {
    var dt = Math.min((ts - (last || ts)) / 1000, 1 / 20);
    last = ts;
    update(dt);
    draw();
    drawHudMap();
    window.requestAnimationFrame(frame);
  }

  /* ---------- Controls ---------- */
  function press(k, on) {
    quietFor = 0;
    if (!DIRS[k]) return;
    held = held.filter(function (h) { return h !== k; });
    if (on && !frozen) held.push(k);
  }
  function releaseKeys() {
    held = [];
    $$('.ctl').forEach(function (b) { b.classList.remove('held'); });
  }
  $$('.dpad .ctl').forEach(function (b) {
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
  $('#jumpBtn').addEventListener('pointerdown', function (e) { e.preventDefault(); jump(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === ' ' && !e.repeat && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); jump(); }
  });
  var KEYMAP = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
  document.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.key];
    if (!k || frozen || (document.activeElement && document.activeElement.tagName === 'INPUT')) return;
    e.preventDefault();
    if (!e.repeat) press(k, true);
  });
  document.addEventListener('keyup', function (e) { var k = KEYMAP[e.key]; if (k) press(k, false); });
  canvas.addEventListener('pointerdown', function (e) {
    var box = canvas.getBoundingClientRect();
    var wx = (e.clientX - box.left) / scale + camX, wy = (e.clientY - box.top) / scale + camY;
    tapTile(Math.floor(wx / T), Math.floor(wy / T));
  });
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });

  /* ---------- Each house celebrates its own way (spec 6.2) ----------
     Fire sparks rise, Water drops fall, Air swirls spin out, Earth throws
     leaves and pebbles. Never more than MAX_PARTS alive. */
  function burstHouse(x, y, h, n) {
    if (reduce) return;
    for (var i = 0; i < n && parts.length < MAX_PARTS; i++) {
      var a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 160;
      var pt = { x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.9 + Math.random() * 0.5,
        rot: Math.random() * 6, spin: (Math.random() - 0.5) * 10, size: 4 + Math.random() * 4, h: h, k: i % 2 };
      if (h === 'FIRE') pt.vy = -60 - Math.random() * 160;
      if (h === 'WATER') pt.vy = -160 - Math.random() * 120;
      parts.push(pt);
    }
  }
  function updateParts(dt) {
    parts.forEach(function (pt) {
      pt.life -= dt; pt.rot += pt.spin * dt;
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      if (pt.h === 'FIRE') { pt.vy -= 30 * dt; pt.vx *= 0.96; }
      else if (pt.h === 'AIR') { pt.vx *= 0.94; pt.vy *= 0.94; }
      else pt.vy += 520 * dt;
    });
    parts = parts.filter(function (pt) { return pt.life > 0; });
  }
  function drawPart(pt) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, pt.life * 1.6);
    ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot);
    if (pt.h === 'FIRE') {
      ctx.fillStyle = pt.k ? '#FFD43B' : '#FF922B';
      ctx.beginPath(); ctx.moveTo(0, -pt.size * 1.6); ctx.lineTo(pt.size * 0.6, 0); ctx.lineTo(0, pt.size * 0.8); ctx.lineTo(-pt.size * 0.6, 0); ctx.closePath(); ctx.fill();
    } else if (pt.h === 'WATER') {
      ctx.rotate(-pt.rot);
      ctx.fillStyle = pt.k ? '#4DABF7' : '#A5D8FF';
      ctx.beginPath(); ctx.moveTo(0, -pt.size * 1.4); ctx.quadraticCurveTo(pt.size, pt.size * 0.4, 0, pt.size);
      ctx.quadraticCurveTo(-pt.size, pt.size * 0.4, 0, -pt.size * 1.4); ctx.fill();
    } else if (pt.h === 'AIR') {
      ctx.strokeStyle = pt.k ? '#FFFFFF' : '#FFE58A'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, pt.size * 1.4, 0, Math.PI * 1.3); ctx.stroke();
    } else if (pt.k) {
      ctx.fillStyle = '#51CF66';
      ctx.beginPath(); ctx.ellipse(0, 0, pt.size * 1.3, pt.size * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#9A6B3C'; circle(0, 0, pt.size * 0.6); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- The school takes your colour (spec 6.1) ---------- */
  function drawBunting(z) {
    if (!house) return;
    var col = PAINT[house], x0 = z.rect[0] * T + 4, x1 = (z.rect[2] + 1) * T - 4, y = z.rect[1] * T + 6;
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo((x0 + x1) / 2, y + 10, x1, y); ctx.stroke();
    for (var x = x0 + 6, k = 0; x < x1 - 10; x += 22, k++) {
      var t = (x - x0) / (x1 - x0), sag = 4 * t * (1 - t) * 10;
      ctx.beginPath(); ctx.moveTo(x, y + sag); ctx.lineTo(x + 14, y + sag); ctx.lineTo(x + 7, y + sag + 16); ctx.closePath();
      fillStroke(k % 2 ? col.light : col.main, 1.5);
    }
  }
  function hop() { wafi.hop = 0.4; }

  /* ---------- The Hall finale (spec 6.5) ----------
     Curtains open, the cup glows in the house colour, Wafi lifts it. At most
     3 s; a tap or a key skips it; with reduced motion it goes straight on. */
  var skipFinale = null;
  function startFinale() {
    frozen = true;
    releaseKeys();
    wafi.path = [];
    UI.sfx('fanfare');
    if (reduce) { stillCup(); return; }
    finale = { t: 0, burst: 0 };
    skipFinale = function (e) { if (finale && !(e && e.repeat)) finale.t = 99; };   // a held key's auto-repeat isn't a skip
    setTimeout(function () {                             // after the tap that bumped the cup
      if (!finale) return;
      document.addEventListener('pointerdown', skipFinale);
      document.addEventListener('keydown', skipFinale);
    }, 0);
  }
  function updateFinale(dt) {
    finale.t += dt;
    finale.burst -= dt;
    var p = wafiPixel();
    if (finale.burst <= 0 && finale.t < 2.6) { burstHouse(p.x, p.y - WAFI_H, house, 16); finale.burst = 0.45; }
    if (finale.t >= 3) {
      finale = null;
      document.removeEventListener('pointerdown', skipFinale);
      document.removeEventListener('keydown', skipFinale);
      takeCup();
    }
  }
  /* Hand in without the cup: from the board, or from the HUD when the bell goes. */
  function offerHandIn() {
    if (handedIn || frozen) return;                     // not under a panel, the cup moment, the stairs or the delivery
    var n = chestsLeft();
    UI.askHandIn(carrying ? SL.handInCarrying : n ? SL.handInLeft(n) : SL.handInNoCup, function (now) { if (now) handIn(); });
  }
  /* The cup goes on the notice board with the house's points, then the receipt. */
  function deliver() {
    carrying = false; delivered = true;
    frozen = true; releaseKeys(); wafi.path = [];
    var b = map.board[0];
    burstHouse((b.c + 1) * T, b.r * T + T / 2, house, 24);
    UI.sfx('flag');
    if (reduce) handIn();
    else setTimeout(handIn, 900);
  }
  function handIn() {
    if (handedIn) return;
    handedIn = true;
    frozen = true;
    paintObjective();
    UI.handIn(drawMiniMap);
  }
  /* With reduced motion the cup moment is a still picture: Wafi holding the
     cup and the house banner, for 2 s or until a tap or a key. */
  function stillCup() {
    var still = $('#cupStill'), over = false, timer;
    $('#cupStillArt').innerHTML = UI.wafiWithCup(house);
    $('#cupStillText').textContent = 'Well done, ' + Q.HOUSES[house].name + '!';
    still.hidden = false;
    var end = function (e) {
      if (over || (e && e.repeat)) return;
      over = true;
      clearTimeout(timer);
      still.hidden = true;
      document.removeEventListener('pointerdown', end);
      document.removeEventListener('keydown', end);
      takeCup();
    };
    setTimeout(function () {                            // after the key or tap that bumped the cup
      if (over) return;
      document.addEventListener('pointerdown', end);
      document.addEventListener('keydown', end);
    }, 0);
    timer = setTimeout(end, 2000);
  }
  /* After the cup moment Wafi keeps the cup and takes it to the notice board. */
  function takeCup() {
    finale = null;
    cupTaken = true; carrying = true;
    frozen = false;
    paintObjective();
    UI.toast(SL.takeCup);
  }
  function drawFinale() { drawBanner(finale.t / 0.6); }

  /* ---------- Minimaps ----------
     Flat plans of a floor: walls, gardens and courts, floors, and the zones
     won in the house colour. The HUD map shows the floor Wafi is on, with a
     dot for him and a star for the guide's target; the final map shows both
     floors, upstairs on top. */
  function miniColour(f, c, r) {
    var rows = M.FLOORS[f].rows, ch = rows[r][c], z = M.zoneAt(f, c, r);
    if (/[#LBdnx]/.test(ch)) return '#C9B38A';
    if (house && painted[z]) return PAINT[house].main;
    if (!/[.,=_"^]/.test(ch)) ch = M.groundUnder(rows, c, r);
    return /[_"]/.test(ch) ? '#B2E2B5' : /[,=^]/.test(ch) ? '#E0A080' : '#F6F1E8';
  }
  function paintFloorMap(g, f, ox, oy, k) {
    var rows = M.FLOORS[f].rows;
    for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[0].length; c++) {
      g.fillStyle = miniColour(f, c, r); g.fillRect(ox + c * k, oy + r * k, k, k);
    }
    (DOORS_ON[f] || []).forEach(function (d) {          // the pupil's doors: a ring, filled once answered
      var cx = ox + d.c * k + k / 2, cy = oy + d.r * k + k / 2, col = house ? PAINT[house].main : LINE;
      g.beginPath(); g.arc(cx, cy, Math.max(k * 0.9, 3.5), 0, Math.PI * 2);
      g.fillStyle = painted[d.zone] ? col : '#FFFFFF'; g.fill();
      g.lineWidth = 2; g.strokeStyle = col; g.stroke();
    });
    if (k < 8) return;
    var save = ctx; ctx = g;                            // drawIcon draws on ctx
    M.ZONES.forEach(function (z) {
      if (!painted[z.id] || z.floor !== f) return;
      drawIcon(z.icon, ox + (z.rect[0] + z.rect[2] + 1) / 2 * k, oy + (z.rect[1] + z.rect[3] + 1) / 2 * k, 18, house === 'AIR' ? LINE : '#FFFFFF', 2.8);
    });
    ctx = save;
  }
  var DOORS_ON = { ground: M.parse('ground').doors, up: M.parse('up').doors };
  var UP_W = M.FLOORS.up.rows[0].length, UP_H = M.FLOORS.up.rows.length;
  var GROUND_W = M.FLOORS.ground.rows[0].length, GROUND_H = M.FLOORS.ground.rows.length;
  function drawMiniMap(cv) {
    var k = 10, r2 = Math.min(window.devicePixelRatio || 1, 2), g = cv.getContext('2d');
    cv.width = GROUND_W * k * r2; cv.height = (UP_H + 2 + GROUND_H) * k * r2;
    g.setTransform(r2, 0, 0, r2, 0, 0);
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, GROUND_W * k, (UP_H + 2 + GROUND_H) * k);
    paintFloorMap(g, 'up', (GROUND_W - UP_W) / 2 * k, 0, k);
    paintFloorMap(g, 'ground', 0, (UP_H + 2) * k, k);
    cv.classList.add('drawn');
  }
  var hudCv = $('#hudMap'), hudBase = document.createElement('canvas'), hudKey = '', hudShown = { floor: null, star: null };
  function drawHudMap() {
    var k = 4, key = floor + '|' + house + '|' + Object.keys(painted).join(',');
    if (key !== hudKey) {
      hudKey = key;
      hudBase.width = map.w * k; hudBase.height = map.h * k;
      paintFloorMap(hudBase.getContext('2d'), floor, 0, 0, k);
      hudCv.width = map.w * k * 2; hudCv.height = map.h * k * 2;
      hudShown.floor = floor;                           // what is really on the canvas, for the tests
    }
    var g = hudCv.getContext('2d'), goal = guide();
    g.setTransform(2, 0, 0, 2, 0, 0);
    g.drawImage(hudBase, 0, 0);
    hudShown.star = null;
    if (goal) {                                         // a gold star on the target
      var sx = goal.c * k + k / 2, sy = goal.r * k + k / 2;
      hudShown.star = { c: goal.c, r: goal.r };
      g.beginPath();
      for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 4 : 9; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = ART.GOLD; g.fill(); g.strokeStyle = LINE; g.lineWidth = 1.5; g.stroke();
    }
    g.beginPath(); g.arc(wafi.c * k + k / 2, wafi.r * k + k / 2, 5, 0, Math.PI * 2);
    g.fillStyle = house ? PAINT[house].main : '#FFFFFF'; g.fill(); g.strokeStyle = LINE; g.lineWidth = 2; g.stroke();
  }

  /* ---------- Bumps that open something ---------- */
  function worldBump(kind, info) {
    if (kind === 'chest') {
      var z = ZONE_BY_ID[info.zone];
      UI.openQuestion(z.pipe, function (pts) {
        if (pts === undefined || painted[z.id]) return;
        School.paintZone(z.id);
        burstHouse(info.c * T + T / 2, info.r * T + T / 2, house, 24);
        if (pts > 0) hop();
      });
    }
    if (kind === 'rival') {
      var rz = ZONE_BY_ID[info.zone];
      UI.openBattle(rz.pipe, info.kind, function (pts) {
        if (beaten[rz.id]) return;
        beaten[rz.id] = true;
        School.paintZone(rz.id);
        if (!reduce) leaving.push({ kind: info.kind, x: info.c * T + T / 2, y: info.r * T + T / 2, t: 0 });
        burstHouse(info.c * T + T / 2, info.r * T + T / 2, house, 24);
        if (rz.id === 'garden') rainbow = true;
        if (pts > 0) hop();
      });
    }
    if (kind === 'board' && !handedIn) {
      if (carrying) deliver();
      else offerHandIn();
    }
    if (kind === 'cup') {
      var left = chestsLeft();
      if (left) UI.toast(SL.openAllFirst(left));
      else startFinale();
    }
  }

  /* ---------- Arrival (spec 6.5): the MNS front, Wafi up the steps, doors open ----------
     At most 3.5 s; a tap or a key skips it; with reduced motion it doesn't play. */
  function playIntro(done) {
    if (reduce) { done(); return; }
    var box = $('#intro'), finished = false, timer;
    $('#introFacade').innerHTML = ART.facade();
    var col = PAINT[house || 'FIRE'], o = { dir: 'up', shirt: col.main, mark: '#FFFFFF' };
    $('#introWafi').innerHTML = '<span class="a">' + ART.wafi('walkA', o) + '</span><span class="b">' + ART.wafi('walkB', o) + '</span>';
    frozen = true;
    box.hidden = false;
    box.classList.remove('play'); void box.offsetWidth; box.classList.add('play');
    var finish = function (e) {
      if (finished || (e && e.repeat)) return;
      finished = true;
      clearTimeout(timer);
      box.hidden = true;
      box.removeEventListener('pointerdown', finish);
      document.removeEventListener('keydown', finish);
      done();
    };
    box.addEventListener('pointerdown', finish);
    document.addEventListener('keydown', finish);
    timer = setTimeout(finish, 3500);
  }

  /* ---------- The world's API ---------- */
  var School = {
    onBump: null,
    start: function (opts) {
      house = opts.house; year = opts.year;
      document.documentElement.dataset.house = house;
      fade = null;
      setFloor('ground', M.parse('ground').start);
      setupWalkers();
      var others = ORDER.filter(function (h) { return h !== house; }), k = 0;
      map.decoys.forEach(function (d) { decoyHouse[key(d.c, d.r)] = others[k++ % others.length]; });
      bakeWafi();
      wafi.dir = 'down';                                // at the street gate, facing the toilets
      setupFoods();
      frozen = false;
      paintObjective();
      resize();
    },
    freeze: function (on) { frozen = !!on; if (frozen) { releaseKeys(); wafi.path = []; } },
    isFrozen: function () { return frozen; },
    floor: function () { return floor; },
    wafiTile: function () { return { c: wafi.c, r: wafi.r }; },
    paintZone: function (id) {
      painted[id] = true;
      paintObjective();
      if (!chestsLeft() && !allOpenTold) { allOpenTold = true; UI.toast(SL.allOpen); }
    },
    chestsLeft: chestsLeft,
    objectiveText: objectiveText,
    offerHandIn: offerHandIn,
    carrying: function () { return carrying; },
    playIntro: playIntro,
    isPainted: function (id) { return !!painted[id]; },
    beat: function (id) { beaten[id] = true; },
    releaseKeys: releaseKeys,
    map: map, T: T, PAINT: PAINT
  };
  window.School = School;

  /* Test hooks: only with #test in the address. #test-HOUSE-YEAR starts play. */
  if (/^#test/.test(location.hash)) {
    window.SchoolTest = {
      where: function () {
        var p = wafiPixel();
        return { c: wafi.c, r: wafi.r, dir: wafi.dir, moving: wafi.moving, shaking: wafi.shake > 0, pose: wafi.pose, scaleY: wafi.scaleY === undefined ? 1 : wafi.scaleY,
          sx: (p.x - camX) * scale, sy: (p.y - camY) * scale };
      },
      teleport: function (c, r) { wafi.c = wafi.fc = c; wafi.r = wafi.fr = r; wafi.t = 1; wafi.moving = false; wafi.path = []; },
      tap: tapTile,
      placeFood: function (c, r) { foods.push({ c: c, r: r, fc: c, fr: r, t: 1, home: { c: c, r: r }, chase: 0, stepMs: 99999, wait: 0, kind: 'burger', dead: 0 }); },
      foods: function () { return foods.map(function (f) { return { c: f.c, r: f.r, dead: !!f.dead }; }); },
      clearFoods: function () { foods = []; },
      decorTypes: function () {
        var seen = {};
        ['ground', 'up'].forEach(function (f) { M.FLOORS[f].decor.forEach(function (d) { if (!DRAW[d.type]) seen[d.type] = true; }); });
        return Object.keys(seen);
      },
      greetings: function () { return greetings; },
      inFinale: function () { return !!finale; },
      hudMap: function () { drawHudMap(); return hudShown; },
      guide: function () {
        var g = guide();
        return !g ? null : g.kind === 'stairs' ? { kind: 'stairs', id: g.id } : g.kind === 'door' ? { kind: 'door', zone: g.zone } : { kind: g.kind };
      },
      openAll: function () { ROOM_IDS.forEach(function (id) { School.paintZone(id); }); },
      roofAt: roofAt,
      doorSwing: doorSwing,
      cupSparkles: cupSparkles,
      walkerLooks: function () { return walkers.map(function (w) { var L = lookOf(w.look); return { skin: L.skin, shirt: L.shirt }; }); },
      walkers: function () { return walkers.filter(function (w) { return w.floor === floor; }).map(function (w) { return { c: w.c, r: w.r }; }); },
      cook: function () { return FD.cook ? { c: FD.cook[0], r: FD.cook[1] } : null; },
      signs: function () { return signs.map(function (s) { return { label: s.label }; }); },
      teachers: teacherFigures,
      datePalms: function () { var n = 0; FD.rows.forEach(function (row, r) { row.split('').forEach(function (ch, c) { if (ch === 'T' && isDatePalm(c, r)) n++; }); }); return n; },
      px: function (x, y) {                              // the colour on screen at a point of the map
        var d = ctx.getImageData(Math.round((x - Math.round(camX)) * scale * dpr), Math.round((y - Math.round(camY)) * scale * dpr), 1, 1).data;
        return [d[0], d[1], d[2]];
      },
      camera: function () { return { x: camX, y: camY, w: viewW, h: viewH, mapW: MAP_W, mapH: MAP_H }; },
      materials: function () {
        var seen = {};
        ['ground', 'up'].forEach(function (f) { M.FLOORS[f].areas.forEach(function (a) { if (!drawn(a.m)) seen[a.m] = true; }); });
        return Object.keys(seen);
      },
      press: press,
      tile: tile,
      floor: function () { return floor; },
      inFade: function () { return !!fade; },
      go: function (f, c, r) { if (f !== floor) setFloor(f, { c: c, r: r }); else SchoolTest.teleport(c, r); },
      find: function (ch) {
        var out = [];
        FD.rows.forEach(function (row, r) { row.split('').forEach(function (x, c) { if (x === ch) out.push({ c: c, r: r }); }); });
        return out;
      },
      doorOf: function (id) {
        var z = ZONE_BY_ID[id], m = M.parse(z.floor), d = m.doors.filter(function (x) { return x.zone === id; })[0] || m.rivals.filter(function (x) { return x.zone === id; })[0];
        return { floor: z.floor, c: d.c, r: d.r };
      },
      roomDoor: function (id) { var rm = M.ROOMS.filter(function (x) { return x.id === id; })[0]; return { floor: rm.floor, c: rm.at[0], r: rm.at[1] }; },
      stairs: function (id) { var s = M.STAIRS.filter(function (x) { return x.id === id; })[0]; return { ground: { c: s.ground[0], r: s.ground[1] }, up: { c: s.up[0], r: s.up[1] } }; }
    };
  }

  /* Sign-in (the QR address, or the teacher's code), then the arrival, then play (or straight in with #test-HOUSE-YEAR). */
  var UI = window.SchoolUI;
  UI.onBump = worldBump;
  var begin = function (s) {
    house = s.house;
    playIntro(function () {
      School.start(s);
      UI.toast(SL.letsFind(Q.HOUSES[s.house].colour));
    });
  };
  UI.init(begin);
  var m = /^#test-([A-Z]+)-(\d)(-intro)?/.exec(location.hash);
  var qr = window.HQPoints.entryFromUrl(location.search);   // the house QR: ?h=WATER&y=3&c=NNNN
  if (m) {
    UI.showPanel(null);
    UI.signInAs(m[1], Number(m[2]), qr && qr.code);
    if (m[3]) begin({ house: m[1], year: Number(m[2]) });
    else School.start({ house: m[1], year: Number(m[2]) });
  } else if (qr) UI.enter(qr);

  setFloor('ground');
  window.requestAnimationFrame(frame);
})();
