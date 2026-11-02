/* ============================================================
   House Quest results page (demo): who took each zone of the school.

   For the classroom screen once the points close, at 3pm on Thursday. The
   file keeps its old name, assembly. Each zone goes to the house with the
   most points per pupil on that zone's question this week; a tie shares it.
   The House Cup goes to the most points per pupil overall, as on the staff
   page. Both floors are drawn flat from SchoolMap, upstairs on top. Every
   number is made up for the demo.
   ============================================================ */
(function () {
  'use strict';

  var ORDER = ['FIRE', 'WATER', 'AIR', 'EARTH'];

  /* Pupils and totals are staff.html's; zone question points are made up,
     with a tie in the garden (Fire and Air both have 52 pupils). */
  var MOCK = {
    pupils: { FIRE: 52, WATER: 51, AIR: 52, EARTH: 51 },
    totals: { FIRE: 550, WATER: 555, AIR: 617, EARTH: 519 },
    zones: {
      y6m:     { FIRE: 70, WATER: 66, AIR: 74, EARTH: 60 },
      court:   { FIRE: 64, WATER: 70, AIR: 66, EARTH: 58 },
      library: { FIRE: 80, WATER: 62, AIR: 70, EARTH: 72 },
      y3m:     { FIRE: 58, WATER: 60, AIR: 72, EARTH: 66 },
      garden:  { FIRE: 66, WATER: 64, AIR: 66, EARTH: 60 },
      y5:      { FIRE: 54, WATER: 70, AIR: 60, EARTH: 62 },
      nurse:   { FIRE: 60, WATER: 58, AIR: 70, EARTH: 74 },
      art:     { FIRE: 72, WATER: 66, AIR: 68, EARTH: 56 },
      cantina: { FIRE: 62, WATER: 60, AIR: 74, EARTH: 64 },
      music:   { FIRE: 58, WATER: 72, AIR: 70, EARTH: 60 }
    }
  };

  /* zone id -> the houses with the most points per pupil, in house order. */
  function zoneWinners(mock) {
    var out = {};
    Object.keys(mock.zones).forEach(function (id) {
      var per = ORDER.map(function (h) { return mock.zones[id][h] / mock.pupils[h]; });
      var best = Math.max.apply(null, per);
      out[id] = ORDER.filter(function (h, i) { return Math.abs(per[i] - best) < 1e-9; });
    });
    return out;
  }
  function cupRanking(mock) {
    return ORDER.slice().sort(function (a, b) { return mock.totals[b] / mock.pupils[b] - mock.totals[a] / mock.pupils[a]; });
  }

  var Assembly = { MOCK: MOCK, zoneWinners: zoneWinners, cupRanking: cupRanking };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Assembly; return; }
  window.Assembly = Assembly;

  /* ============================================================
     Browser from here on
     ============================================================ */
  var M = window.SchoolMap, ART = window.MNSArt;
  var $ = function (s) { return document.querySelector(s); };
  var LINE = '#2A2745';
  var FONT = "'Century Gothic','CenturyGothic',Futura,'Avenir Next',system-ui,sans-serif";
  var HOUSE = {
    FIRE:  { name: 'Fire',  main: '#E5383B', icon: 'fire' },
    WATER: { name: 'Water', main: '#1C7ED6', icon: 'water' },
    AIR:   { name: 'Air',   main: '#FAB005', icon: 'air' },
    EARTH: { name: 'Earth', main: '#2F9E44', icon: 'earth' }
  };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var winners = zoneWinners(MOCK), shown = 0, grow = {}, K = 20;
  /* Where each floor sits on the plan, in tiles: upstairs on top, each with
     its name above it. */
  var FW = M.FLOORS.ground.rows[0].length, UPW = M.FLOORS.up.rows[0].length, UPH = M.FLOORS.up.rows.length;
  var AT = { up: { x: (FW - UPW) / 2, y: 1.5 }, ground: { x: 0, y: 1.5 + UPH + 1.5 } };
  var PLAN_W = FW, PLAN_H = AT.ground.y + M.FLOORS.ground.rows.length;
  var canvas = $('#plan'), ctx = canvas.getContext('2d');

  function drawIcon(name, x, y, size, colour) {
    ctx.save();
    ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = colour; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ART.ICONS[name].forEach(function (d) { ctx.stroke(new Path2D(d)); });
    ctx.restore();
  }
  function fillZone(z, houses, k) {
    var r = z.rect, x = (AT[z.floor].x + r[0]) * K, y = (AT[z.floor].y + r[1]) * K, w = (r[2] - r[0] + 1) * K, h = (r[3] - r[1] + 1) * K;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.globalAlpha = 0.9 * k;
    if (houses.length === 1) { ctx.fillStyle = HOUSE[houses[0]].main; ctx.fillRect(x, y, w, h); }
    else {                                              // a tie: diagonal stripes of each tied house
      for (var s = -h, i = 0; s < w + h; s += 14, i++) {
        ctx.fillStyle = HOUSE[houses[i % houses.length]].main;
        ctx.beginPath(); ctx.moveTo(x + s, y); ctx.lineTo(x + s + 14, y); ctx.lineTo(x + s + 14 - h, y + h); ctx.lineTo(x + s - h, y + h); ctx.fill();
      }
    }
    ctx.restore();
  }
  /* The whole plan fits the projector: as wide as its column, no taller than the screen. */
  function fit() {
    var col = canvas.parentNode.clientWidth - (window.innerWidth > 860 ? 358 : 0);
    var room = window.innerHeight - canvas.getBoundingClientRect().top - window.scrollY - 16;
    var w = Math.max(300, Math.min(col, room * PLAN_W / PLAN_H));
    canvas.style.width = Math.floor(w) + 'px';
  }
  function draw() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), cssW = canvas.clientWidth;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssW * PLAN_H / PLAN_W * dpr);
    var s = cssW / (PLAN_W * K);
    ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, PLAN_W * K, PLAN_H * K);
    ['up', 'ground'].forEach(function (f) {
      var o = AT[f];
      M.FLOORS[f].rows.forEach(function (row, r) {
        row.split('').forEach(function (ch, c) {
          if (/[oTfpuSkC]/.test(ch)) ch = M.groundUnder(M.FLOORS[f].rows, c, r);   // things take the floor they stand on
          ctx.fillStyle = /[#LBdnx]/.test(ch) ? '#C9B38A' : /[_"]/.test(ch) ? '#C3E8C6' : /[,=^]/.test(ch) ? '#E8B496' : '#F6F1E8';
          ctx.fillRect((o.x + c) * K, (o.y + r) * K, K, K);
        });
      });
      ctx.font = '700 22px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = LINE;
      ctx.fillText(M.FLOORS[f].name + (f === 'up' ? ' (upstairs)' : ''), o.x * K, (o.y - 0.75) * K);
    });
    M.ZONES.forEach(function (z, i) {
      var o = AT[z.floor], r = z.rect, cx = (o.x + (r[0] + r[2] + 1) / 2) * K, cy = (o.y + (r[1] + r[3] + 1) / 2) * K, taken = i < shown;
      if (taken) fillZone(z, winners[z.id], grow[z.id] === undefined ? 1 : grow[z.id]);
      ctx.setLineDash(taken ? [] : [8, 6]);
      ctx.strokeStyle = LINE; ctx.lineWidth = taken ? 4 : 2.5;
      ctx.strokeRect((o.x + r[0]) * K + 2, (o.y + r[1]) * K + 2, (r[2] - r[0] + 1) * K - 4, (r[3] - r[1] + 1) * K - 4);
      ctx.setLineDash([]);
      var light = taken && !(winners[z.id].length === 1 && winners[z.id][0] === 'AIR');
      drawIcon(taken && winners[z.id].length === 1 ? HOUSE[winners[z.id][0]].icon : z.icon, cx, cy - 14, 30, light ? '#FFFFFF' : LINE);
      ctx.font = '700 17px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.strokeText(z.name, cx, cy + 16);
      ctx.fillStyle = LINE; ctx.fillText(z.name, cx, cy + 16);
    });
  }

  /* How each zone reads in a sentence ("Fire takes the Music room!"). */
  var PLACE = { y6m: 'Year 6M classroom', court: 'basketball court', library: 'Library', y3m: 'Year 3M classroom',
    garden: 'Inner School Garden', y5: 'Year 5 classroom', nurse: 'nurse\'s room', art: 'Art room', cantina: 'canteen', music: 'Music room' };
  function says(houses, zone) {
    var names = houses.map(function (h) { return HOUSE[h].name; }), place = PLACE[zone.id] || zone.name;
    if (names.length === 1) return names[0] + ' takes the ' + place + '!';
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] + ' share the ' + place + '!';
  }
  function reveal() {
    if (shown < M.ZONES.length) {
      var z = M.ZONES[shown];
      shown++;
      $('#revealText').textContent = says(winners[z.id], z);
      $('#revealBtn').textContent = shown < M.ZONES.length ? 'Reveal the next zone' : 'Show the House Cup';
      if (reduce) { draw(); return; }
      grow[z.id] = 0;
      var t0 = performance.now();
      var step = function (now) {
        grow[z.id] = Math.min(1, (now - t0) / 450);
        draw();
        if (grow[z.id] < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      return;
    }
    showCup();
  }
  function showCup() {
    var rank = cupRanking(MOCK), win = rank[0];
    $('#cupWinner').textContent = HOUSE[win].name + ' wins the House Cup!';
    $('#cupWafi').innerHTML = ART.wafi('cheer', { shirt: HOUSE[win].main, mark: win === 'AIR' ? LINE : '#FFFFFF' });
    $('#cupList').innerHTML = rank.map(function (h) {
      return '<li><span class="c-' + h.toLowerCase() + '">' + HOUSE[h].name + '</span><b>' +
        (MOCK.totals[h] / MOCK.pupils[h]).toFixed(1) + '</b><span class="cell-sub">points per pupil</span></li>';
    }).join('');
    $('#cupPanel').hidden = false;
    $('#revealBtn').hidden = true;
  }

  $('#crest').innerHTML = ART.crest();
  $('#cupCrest').innerHTML = ART.crest();
  $('#revealBtn').addEventListener('click', reveal);
  window.addEventListener('resize', function () { fit(); draw(); });
  Assembly.revealed = function () { return shown; };
  fit();
  draw();
})();
