/* ============================================================
   House Quest school mode: everything around the map (demo)

   Sign-in, the HUD, Wafi's bubble, sound effects, the question panel and
   the treasure room. Most of it is game.js's shell, copied so the park
   stays untouched while the school mode is a demo.
   ponytail: copied from game.js for the demo; move to a shared shell if school mode stays.

   The map (school.js) calls openQuestion() when Wafi opens a chest and
   finish() when he reaches the House Cup; it reports bumps through
   School.onBump, which this file sets.
   ============================================================ */
(function () {
  'use strict';

  var Q = window.Quest, ART = window.MNSArt;
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };
  var ORDER = ['FIRE', 'WATER', 'AIR', 'EARTH'];
  var PIPES = 10;

  /* level: the adaptive level for bank questions, for this game only (Quest.nextLevel). */
  var state = { house: null, year: null, gems: 0, chestPts: 0, foods: 0, bonus: 0, bumps: 0, paws: 0, perQ: [], level: { level: 1, streak: 0 } };
  /* This game's questions: q[pipe] = { card, box, pts } once its chest has
     been opened; used holds the prompts drawn so none comes up twice. */
  var game = { used: new Set(), q: [] };
  /* The pipe's question: drawn at the pupil's level the first time its chest
     opens, then the same one for the rest of the game. */
  function slot(i) {
    if (!game.q[i]) {
      var s = game.q[i] = { card: Q.draw(state.year, i, state.level.level, game.used), box: null, pts: undefined };
      s.box = addQuestion($('#qHost'), i, s);
    }
    return game.q[i];
  }
  function isDone(i) { return !!game.q[i] && game.q[i].pts !== undefined; }
  function doneCount() { var n = 0; for (var i = 0; i < PIPES; i++) if (isDone(i)) n++; return n; }

  /* ---------- Messages ---------- */
  var toastTimer = null;
  var WAFI_HEAD = '';
  /* A teacher at their door says their line; no head in the bubble, it is not Wafi talking. */
  function teacherSay(id) {
    var t = ART.TEACHERS[id];
    toast(window.SchoolLines.teacher(t), 12000, true);
  }
  /* noHead leaves out Wafi's head (a teacher is speaking). */
  function toast(text, ms, noHead) {
    ms = Math.max(ms || 0, 10000);                      // long enough to read, or to tap "read aloud" (EAL)
    $('#toastWafi').innerHTML = noHead ? '' : WAFI_HEAD;
    $('#toastWafi').hidden = !!noHead;
    $('#toastText').textContent = text;
    $('#toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('#toast').hidden = true; }, ms || 5500);
  }

  /* ---------- Panels ---------- */
  var PANELS = ['#startPanel', '#pipeModal', '#battlePanel', '#handInPanel', '#treasurePanel'];
  function showPanel(id) {
    PANELS.forEach(function (s) { $(s).hidden = s !== id; });
    if (id) {
      if (window.School) window.School.freeze(true);
      var h = $(id + ' h2');
      if (h) h.focus({ preventScroll: true });
    }
  }

  /* ---------- HUD ---------- */
  function paintGems(lost) {
    $('#gemCount').textContent = String(state.gems);
    var pill = $('#gemPill');
    pill.classList.remove('pop', 'lose');
    void pill.offsetWidth;
    pill.classList.add(lost ? 'lose' : 'pop');
  }
  /* The ten pips: the six chests, then the four rivals. */
  function buildPips() {
    var Z = window.SchoolMap.ZONES, zones = Z.filter(function (z) { return z.kind === 'room'; }).concat(Z.filter(function (z) { return z.kind === 'rival'; }));
    $('#pips').innerHTML = zones.map(function (z, k) {
      return '<li class="pip ' + z.kind + (k === 6 ? ' gap' : '') + '" data-zone="' + z.id + '" data-pipe="' + z.pipe + '"></li>';
    }).join('');
  }
  var handedIn = false;
  function paintHud() {
    var S = window.School, done = 0;
    $$('#pips .pip').forEach(function (p) {
      var on = isDone(Number(p.dataset.pipe)) || !!(S && S.isPainted(p.dataset.zone));
      p.classList.toggle('done', on);
      if (on) done++;
    });
    $('#pips').setAttribute('aria-label', 'Questions answered: ' + done + ' of ' + PIPES);
    $('#handInBtn').hidden = handedIn || doneCount() === 0;
    $('#gemCount').textContent = String(state.gems);
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
    flag:   ['triangle', [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.14], [784, 0.52, 0.1], [1047, 0.62, 0.45]]],
    door:   ['triangle', [[440, 0, 0.06], [660, 0.05, 0.1]]],
    battle: ['square',   [[330, 0, 0.08], [392, 0.08, 0.08], [494, 0.16, 0.08], [659, 0.24, 0.2]]],
    hit2:   ['triangle', [[784, 0, 0.08], [1047, 0.07, 0.08], [1319, 0.14, 0.08], [1568, 0.21, 0.25]]],
    hit1:   ['triangle', [[659, 0, 0.08], [880, 0.08, 0.18]]],
    miss:   ['sine',     [[392, 0, 0.12], [349, 0.12, 0.2]]],
    change: ['sine',     [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [988, 0.3, 0.1], [1175, 0.4, 0.3]]],
    stairs: ['sine',     [[392, 0, 0.06], [494, 0.06, 0.06], [587, 0.12, 0.06], [784, 0.18, 0.14]]],
    fanfare: ['triangle', [[523, 0, 0.15], [523, 0.15, 0.1], [659, 0.25, 0.15], [784, 0.4, 0.15], [1047, 0.55, 0.55]]]
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

  /* ---------- Sign in: the house QR code (points.js), or a teacher types the code ---------- */
  var onSignedIn = null;
  /* entry: { house, year, code } from the QR address or the teacher's code. */
  function enter(entry) {
    showPanel(null);
    signInAs(entry.house, entry.year, entry.code);
    if (onSignedIn) onSignedIn({ house: state.house, year: state.year });
  }
  function typedCode() {
    var code = $('#code').value.replace(/\D/g, '');
    $('#codeMsg').textContent = '';
    window.HQPoints.lookup(window.HQ_POINTS_URL, code).then(function (o) {
      if (o) { enter({ house: o.house, year: o.year, code: code }); return; }
      $('#codeMsg').textContent = window.SchoolLines.SEND.code;
      $('#code').select();
    });
  }
  /* Also used by the #test-HOUSE-YEAR start in school.js. */
  function signInAs(house, year, code) {
    state.house = house;
    state.year = year;
    state.code = code || '';
    game.q.forEach(function (s) { s.box.remove(); });
    game = { used: new Set(), q: [] };
    state.level = { level: 1, streak: 0 };
    document.documentElement.dataset.house = house;
    $('#houseBadge').innerHTML = Q.icon(Q.HOUSES[house].icon) + '<span class="badge-name" aria-hidden="true">' + Q.HOUSES[house].name +
      '</span><span class="sr-only">' + Q.HOUSES[house].name + ' house, Year ' + year + '</span>';
    $('#houseBadge').hidden = false;
    paintHud();
  }
  function buildStart() {
    $('#scanMsg').textContent = window.SchoolLines.scanQr;
    $('#scanSay').addEventListener('click', function () { Q.speak($('#scanMsg').textContent); });
    $('#typeCodeBtn').addEventListener('click', function () {
      var open = $('#codeForm').hidden;
      $('#codeForm').hidden = !open;
      $('#typeCodeBtn').setAttribute('aria-expanded', String(open));
      if (open) $('#code').focus();
    });
    $('#code').addEventListener('input', function () { $('#codeMsg').textContent = ''; });
    $('#codeForm').addEventListener('submit', function (e) { e.preventDefault(); typedCode(); });
  }

  /* ---------- Inside a chest ----------
     A question box is built when its chest is first opened (slot()). */
  var cur = null, onClose = null;
  function addQuestion(host, i, s) {
    var cfg = {};
    Object.keys(s.card.cfg).forEach(function (k) { cfg[k] = s.card.cfg[k]; });
    cfg.onWrong = function () {
      sfx('wrong');
      if (battle && cur === s) battleWrong();
      var svg = $('#pipeModal .chest');
      svg.classList.remove('wobble');
      void svg.getBoundingClientRect();
      svg.classList.add('wobble');
    };
    cfg.onSolve = function (pts) {
      if (s.pts !== undefined) return;
      s.pts = pts;
      state.level = Q.nextLevel(state.level, pts === 2);     // 2 = right first time, no hint
      state.gems += pts;
      state.chestPts += pts;
      state.perQ[i] = pts;
      sfx('chest');
      paintHud();
      if (battle && cur === s) { battleSolved(pts); return; }
      if (cur === s) paintModal();
      if (pts) flyGem();
    };
    var handle = Q.ask(host, cfg);
    handle.el.hidden = true;
    return handle.el;
  }
  /* The gem leaves the chest and lands in the counter, which then ticks up. */
  function flyGem() {
    var from = $('#pipeModal .gem-in'), to = $('#gemPill');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!from || !to || reduce || !from.getBoundingClientRect().width) { paintGems(); return; }
    setTimeout(function () {
      var a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      if (!a.width) { paintGems(); return; }   // chest already closed
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
    var pts = cur.pts, solved = pts !== undefined;
    $('#pipeModal .chest').classList.toggle('open', solved);
    $('#pipeModal .chest').classList.toggle('empty', pts === 0);     // opened, but no gem this time
    var leave = $('#leavePipe');
    leave.innerHTML = solved ? 'Back to the school' + Q.icon('i-check') : 'Leave it for now';
    leave.classList.toggle('ghost', !solved);
  }
  /* Open the picked question of pipe i in the chest panel; done(pts) when it
     closes, with pts undefined if the pupil left it unanswered. */
  function openQuestion(i, done) {
    cur = slot(i);
    onClose = done || null;
    game.q.forEach(function (s) { s.box.hidden = s !== cur; });
    var subj = cur.card.subject;
    $('#pipeTitle').textContent = 'You found ' + (/^[AEIOU]/.test(subj) ? 'an ' : 'a ') + subj + ' chest!';
    $('#pipeModal .chest').classList.remove('wobble');
    paintModal();
    showPanel('#pipeModal');
  }
  function leavePipe() {
    showPanel(null);
    var pts = cur.pts, cb = onClose;
    onClose = null;
    if (window.School) window.School.freeze(false);
    if (cb) cb(pts);
  }

  /* ---------- Battles with the habit rivals (spec 3.4, 6.3) ----------
     The question box moves into the battle panel; after it is answered the
     hit shows, the rival changes its habit, and Continue goes back. */
  var RIVALS = window.SchoolLines.RIVALS;           // names and lines, in school-lines.js
  var battle = null;
  function wafiBack(droop) {
    var col = window.School.PAINT[state.house];
    return ART.wafi('idle', { dir: 'up', shirt: col.main, mark: '#FFFFFF', ears: droop ? 'droop' : null });
  }
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BURST = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4 L60 36 L94 30 L68 52 L88 82 L56 70 L44 96 L38 64 L6 72 L30 48 L10 18 L42 32 Z" fill="#FFE066" stroke="#2A2745" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="50" r="12" fill="#FFFFFF"/></svg>';
  function openBattle(i, kind, done) {
    var rv = RIVALS[kind];
    cur = slot(i);
    battle = { kind: kind, done: done || null, pts: undefined };
    var box = cur.box;
    box.hidden = false;
    $('#battleQ').appendChild(box);
    $('#battleBanner').textContent = 'A wild ' + rv.name.toUpperCase() + ' appeared!';
    $('#battleRival').innerHTML = ART.rival(kind, 'before');
    $('#battleRival').className = 'arena-rival idle-' + kind;
    $('#battleWafi').innerHTML = wafiBack(false);
    $('#battleWafi').className = 'arena-wafi';
    $('#habitName').textContent = rv.name;
    $('#habitFill').style.transition = 'none';
    $('#habitFill').style.width = '100%';
    $('#battleLine').textContent = rv.before;
    $('#battleMsg').textContent = 'Choose the healthy answer to use Wafi\'s power!';
    ['#battleHit', '#battlePower', '#battleBurst', '#battlePts', '#battleGo'].forEach(function (s) { $(s).hidden = true; });
    $('#battlePower').dataset.kind = '';
    if (powerAnim) { powerAnim.cancel(); powerAnim = null; }       // nothing left over from the last battle
    var panel = $('#battlePanel');
    panel.classList.remove('enter'); void panel.offsetWidth; panel.classList.add('enter');
    showPanel('#battlePanel');
    sfx('battle');
  }
  function battleWrong() {
    $('#battleWafi').innerHTML = wafiBack(true);
    var rv = $('#battleRival');
    rv.classList.remove('smug'); void rv.offsetWidth; rv.classList.add('smug');
    setTimeout(function () { if (battle) $('#battleWafi').innerHTML = wafiBack(false); }, 1000);
  }
  /* Centre of an element in the arena, from its resting layout: Wafi's jump
     and the rivals' idle bobbing are transforms, so they don't move it. */
  function centreIn(el) {
    return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
  }
  var powerAnim = null;
  /* Wafi's healthy power flies at the rival (spec: livelier battles). The
     score decides the show: 2 is super effective, 1 works, 0 falls short,
     but the rival still changes, because the question was answered. */
  function battleSolved(pts) {
    var b = battle, rv = RIVALS[b.kind];
    b.pts = pts;
    paintGems();
    var later = function (ms, fn) { setTimeout(function () { if (battle === b) fn(); }, REDUCE ? 0 : ms); };
    var label = pts === 2 ? 'Super hit!' : pts === 1 ? 'Hit!' : 'Missed!';
    var msg = pts === 2 ? 'It\'s super effective!' : pts === 1 ? 'It worked!' : 'Not quite... but ' + rv.name + ' will give it a go!';
    var power = $('#battlePower');
    power.innerHTML = ART.power(b.kind);
    power.dataset.kind = b.kind;
    if (REDUCE) {
      settle();
      return;
    }
    $('#battleWafi').innerHTML = wafiBack(false);
    $('#battleWafi').classList.add('lunge');
    later(250, function () {
      var from = centreIn($('#battleWafi')), to = centreIn($('#battleRival'));
      power.hidden = false;                             // measure once it's shown
      var w = power.offsetWidth, h = power.offsetHeight;
      power.style.left = (from.x - w / 2) + 'px';
      power.style.top = (from.y - h / 2) + 'px';
      var dx = to.x - from.x, dy = to.y - from.y;
      var end = pts ? 'translate(' + dx + 'px,' + dy + 'px) scale(1.15) rotate(360deg)'
        : 'translate(' + dx * 0.45 + 'px,' + (dy * 0.2 + 40) + 'px) scale(.5) rotate(200deg)';
      if (power.animate) {
        powerAnim = power.animate([
          { transform: 'translate(0,0) scale(.5) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 70) + 'px) scale(1) rotate(180deg)', opacity: 1, offset: 0.5 },
          { transform: end, opacity: pts ? 1 : 0 }
        ], { duration: 550, easing: 'ease-in', fill: 'forwards' });
      }
    });
    later(800, impact);
    later(1900, change);

    function impact() {
      power.hidden = true;
      var hit = $('#battleHit');
      hit.textContent = label;
      hit.className = 'battle-hit hit' + pts;
      hit.hidden = false;
      $('#battleMsg').textContent = msg;
      sfx(pts === 2 ? 'hit2' : pts === 1 ? 'hit1' : 'miss');
      var fill = $('#habitFill');
      fill.style.transition = 'width ' + (pts === 2 ? 0.5 : pts === 1 ? 1 : 1.4) + 's ease';
      fill.style.width = '0%';
      if (!pts) return;
      var to = centreIn($('#battleRival')), burst = $('#battleBurst'), float = $('#battlePts');
      burst.innerHTML = BURST;
      burst.className = 'battle-burst size' + pts;
      burst.style.left = to.x + 'px'; burst.style.top = to.y + 'px';
      burst.hidden = false;
      float.textContent = '+' + pts;
      float.style.left = to.x + 'px'; float.style.top = (to.y - 30) + 'px';
      float.hidden = false;
      $('#battleRival').classList.add('struck');
      if (pts === 2) { var a = $('.arena'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); }
    }
    function change() {
      $('#battleBurst').hidden = true;
      $('#battlePts').hidden = true;
      settle();
    }
    function settle() {
      var hit = $('#battleHit');
      hit.textContent = label; hit.className = 'battle-hit hit' + pts; hit.hidden = false;
      $('#battleMsg').textContent = msg;
      $('#habitFill').style.width = '0%';
      $('#battleRival').innerHTML = ART.rival(b.kind, 'after');
      $('#battleRival').className = 'arena-rival changed';
      $('#battleWafi').className = 'arena-wafi';
      $('#battleWafi').innerHTML = ART.wafi('jump', { dir: 'up', shirt: window.School.PAINT[state.house].main, mark: '#FFFFFF' });
      $('#battleLine').textContent = rv.after;
      sfx('change');
      $('#battleGo').hidden = false;
      $('#battleGo').scrollIntoView({ block: 'nearest', behavior: REDUCE ? 'auto' : 'smooth' });   // on short screens it sits below the fold
      $('#battleGo').focus({ preventScroll: true });
    }
  }
  function closeBattle() {
    var b = battle;
    battle = null;
    $('#qHost').appendChild(cur.box);
    showPanel(null);
    window.School.freeze(false);
    if (b && b.done) b.done(b.pts);
  }

  /* ---------- Treasure room ---------- */
  /* The House Cup, in gold with a band in the house colour (end card, still cup moment). */
  function cupSvg(col) {
    return '<svg class="end-cup" viewBox="0 0 64 64" aria-hidden="true">' +
      '<path d="M18 8h28v10c0 12-6 20-14 20s-14-8-14-20z" fill="#F2C94C" stroke="#2A2745" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M18 12h-6a6 6 0 0 0 6 10M46 12h6a6 6 0 0 1-6 10" fill="none" stroke="#2A2745" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="29" y="38" width="6" height="10" fill="#F2C94C" stroke="#2A2745" stroke-width="3"/>' +
      '<rect x="18" y="48" width="28" height="9" rx="2" fill="' + col + '" stroke="#2A2745" stroke-width="3"/></svg>';
  }
  function wafiWithCup(house) {
    var col = window.School.PAINT[house].main;
    return ART.wafi('cheer', { shirt: col, mark: house === 'AIR' ? '#2A2745' : '#FFFFFF' }) + cupSvg(col);
  }
  function zoneIcon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      ART.ICONS[name].map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</svg>';
  }
  function finish(drawMiniMap) {
    var H = Q.HOUSES[state.house];
    $('#tGems').textContent = String(state.gems);
    $('#tOf').textContent = (state.gems === 1 ? 'point' : 'points') + ' for ' + H.name;
    $('#tSay').textContent = state.gems > 0 ? window.SchoolLines.endWell : window.SchoolLines.endZero;
    $('#tWafi').innerHTML = wafiWithCup(state.house);
    $('#bOpened').textContent = String(doneCount());
    $('#bQ').textContent = '+' + state.chestPts;
    $('#bBonus').textContent = '+' + state.bonus;
    $('#bBumps').textContent = state.bumps ? '−' + state.bumps : '0';
    var list = $('#tList'), zones = window.SchoolMap.ZONES;
    list.innerHTML = '';
    Q.YEARS[state.year].forEach(function (pool, i) {          // a stamp for each question
      var c = game.q[i] ? game.q[i].card : pool[0], z = zones.filter(function (x) { return x.pipe === i; })[0], pts = state.perQ[i];
      var li = Q.el('li', 'stamp' + (pts !== undefined ? ' got' : ''));
      li.innerHTML = zoneIcon(z.icon) + '<span>' + c.subject + '</span><b>' + (pts === undefined ? '–' : pts) + '</b>';
      li.setAttribute('aria-label', c.subject + ': ' + (pts === undefined ? 'not answered' : pts + (pts === 1 ? ' point' : ' points')));
      list.appendChild(li);
    });
    $('#tPaws').hidden = !state.paws;
    $('#tPaws').textContent = state.paws ? 'You found ' + state.paws + ' golden ' + (state.paws === 1 ? 'paw' : 'paws') + '!' : '';
    $('#teacherPart').hidden = true;
    $('#teacherBtn').setAttribute('aria-expanded', 'false');
    if (drawMiniMap) drawMiniMap($('#tMap'));
    $('#receipt').hidden = true;
    $('#sendMsg').textContent = '';
    $('#sendSayRow').hidden = true;
    $('#retryRow').hidden = true;
    showPanel('#treasurePanel');
  }
  function perQText() {
    var out = [];
    for (var i = 0; i < PIPES; i++) out.push(state.perQ[i] === undefined ? '–' : String(state.perQ[i]));
    return out.join(' · ');
  }
  /* The receipt, then the one record goes to the points script. A retry
     sends the same gameId, so the script never counts a game twice. */
  var gameId = '';
  function send() {
    var H = Q.HOUSES[state.house], SEND = window.SchoolLines.SEND;
    $('#rHouse').textContent = H.name;
    $('#rYear').textContent = 'Year ' + state.year;
    $('#rWeek').textContent = '—';
    $('#rGems').textContent = String(state.gems);
    $('#rPerQ').textContent = perQText();
    $('#receipt').hidden = false;
    $('#retryRow').hidden = true;
    if (!gameId) gameId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    var body = window.HQPoints.payload({ house: state.house, year: state.year, code: state.code }, Math.max(0, Math.min(28, state.gems)), gameId);   // the script takes 0-28
    window.HQPoints.send(window.HQ_POINTS_URL, body).then(function (r) {
      r = r || {};
      var why = r.ok || r.reason === 'duplicate' ? 'sent' : r.reason === 'week' ? 'hours' : SEND[r.reason] ? r.reason : 'code';
      $('#sendMsg').textContent = SEND[why];
      $('#retryRow').hidden = why !== 'offline';
      if (r.week) $('#rWeek').textContent = String(r.week);
      $('#sendSayRow').hidden = false;
    });
  }

  /* ---------- The notice board ----------
     askHandIn: the board without the cup asks first. handIn: the points go on
     the board, the receipt shows at once, and the game is over: no way back. */
  var handInDone = null;
  function askHandIn(text, done) {
    $('#handInText').textContent = text;
    handInDone = done;
    showPanel('#handInPanel');
  }
  function answerHandIn(now) {
    var done = handInDone;
    handInDone = null;
    if (!now) { showPanel(null); window.School.freeze(false); }
    if (done) done(now);
  }
  function handIn(drawMiniMap) {
    handedIn = true;
    paintHud();
    finish(drawMiniMap);
    send();
    $('#treasurePanel h2').textContent = 'You handed in your points!';
  }

  /* ---------- What a bump on the map means ---------- */
  function onBump(kind, info) {
    var mine = Q.HOUSES[state.house];
    if (kind === 'door') sfx('door');
    if (kind === 'room') {
      if (info.teacher) teacherSay(info.teacher);
      else toast(window.SchoolLines.door(info.name));
    }
    if (kind === 'decoy') toast(window.SchoolLines.decoy(Q.HOUSES[info.house].colour, mine.colour));
  }

  function init(signedIn) {
    onSignedIn = signedIn;
    $('#hudCrest').innerHTML = ART.crest();
    $('#greetWafi').innerHTML = ART.wafi('head');
    WAFI_HEAD = ART.wafi('head');
    $('#toastWafi').innerHTML = WAFI_HEAD;
    $('#toastSay').addEventListener('click', function () { Q.speak($('#toastText').textContent); });
    if (window.AudioContext || window.webkitAudioContext) $('#soundBtn').addEventListener('click', toggleSound);
    else $('#soundBtn').hidden = true;
    $('#leavePipe').addEventListener('click', leavePipe);
    $('#sendBtn').addEventListener('click', send);
    $('#handInNow').addEventListener('click', function () { answerHandIn(true); });
    $('#teacherBtn').addEventListener('click', function () {
      var open = $('#teacherPart').hidden;
      $('#teacherPart').hidden = !open;
      $('#teacherBtn').setAttribute('aria-expanded', String(open));
    });
    $('#tSayBtn').addEventListener('click', function () { Q.speak($('#tSay').textContent); });
    $('#sendSay').addEventListener('click', function () { Q.speak($('#sendMsg').textContent); });
    $('#handInSay').addEventListener('click', function () { Q.speak($('#handInText').textContent); });
    buildPips();
    $('#whatNowBtn').addEventListener('click', function () {
      var t = window.School.objectiveText();
      toast(t);
      Q.speak(t);
    });
    $('#handInBtn').addEventListener('click', function () { window.School.offerHandIn(); });
    $('#handInLater').addEventListener('click', function () { answerHandIn(false); });
    $('#battleGo').addEventListener('click', closeBattle);
    $('#battleSay').addEventListener('click', function () { Q.speak($('#battleLine').textContent); });
    window.School.onBump = function (kind, info) { onBump(kind, info); if (SchoolUI.onBump) SchoolUI.onBump(kind, info); };
    buildStart();
    $('#pipeChest').innerHTML = Q.chestSvg();
    paintHud();
  }

  var SchoolUI = {
    state: state, init: init, enter: enter, signInAs: signInAs, showPanel: showPanel,
    openQuestion: openQuestion, openBattle: openBattle, isDone: isDone, doneCount: doneCount,
    toast: toast, teacherSay: teacherSay, wafiWithCup: wafiWithCup, hasSfx: function (n) { return !!SFX[n]; }, askHandIn: askHandIn, handIn: handIn, sfx: sfx, paintHud: paintHud, paintGems: paintGems, finish: finish,
    onBump: null,
    /* For play-school.mjs, which answers questions the way a pupil would. */
    box: function (i) { return slot(i).box; },
    pickedAnswer: function (i) { return slot(i).card.cfg.answer; }
  };
  window.SchoolUI = SchoolUI;
})();
