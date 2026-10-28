/* ============================================================
   The Tile Courtyard — shared behaviour (Maths Unit 20, 2D shapes, symmetry and angles)
   The Bakery's engine (Units 16-17), copied so the pathway stands alone, with
   the fraction pieces taken out and the shape pieces added: tiles drawn as
   inline SVG, angles, and a squared mirror pool where a child colours the
   other half of a pattern.
   Rules: design-system/mns-classroom/pages/tile-courtyard.md

   NO network. NO localStorage, NO cookies, nothing transmitted, ever.
   The only storage is sessionStorage holding an anonymous points tally, so a
   refresh does not wipe a lesson's work; it dies when the tab closes.
   No audio yet (teacher, October 2026). When it comes, the clips are mp3
   files in audio/, recorded once with ElevenLabs on the teacher's Mac; the
   device never calls ElevenLabs or anything else.
   ============================================================ */
(function () {
  'use strict';


  /* ---------- Inline SVG sprite (no emoji as icons) ---------- */
  var SPRITE = [
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">',
    // a tile with a star inside
    '<symbol id="i-tile" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 6l1.8 4.2L18 12l-4.2 1.8L12 18l-1.8-4.2L6 12l4.2-1.8Z"/></symbol>',
    // a mirror line between two halves
    '<symbol id="i-mirror" viewBox="0 0 24 24"><path d="M12 2v3M12 8v3M12 14v3M12 20v2"/><path d="M9 6 4 12l5 6M15 6l5 6-5 6"/></symbol>',
    // a right angle
    '<symbol id="i-angle" viewBox="0 0 24 24"><path d="M5 3v16h16"/><path d="M5 13h6v6"/></symbol>',
    // the courtyard gate
    '<symbol id="i-gate" viewBox="0 0 24 24"><path d="M4 21V10a8 8 0 0 1 16 0v11"/><path d="M2 21h20M8 21v-8a4 4 0 0 1 8 0v8"/></symbol>',
    // pair of cards (match)
    '<symbol id="i-pair" viewBox="0 0 24 24"><rect x="3" y="5" width="9" height="13" rx="1.5"/><rect x="12" y="6" width="9" height="13" rx="1.5"/></symbol>',
    // four squares (four ways)
    '<symbol id="i-four" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M13 13l8 8M21 13l-8 8"/><rect x="13" y="13" width="8" height="8" rx="1"/></symbol>',
    // a recipe book (points)
    '<symbol id="i-book" viewBox="0 0 24 24"><path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4Z"/><path d="M8 8h6M8 12h6"/></symbol>',
    // magnifier
    '<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></symbol>',
    // speech
    '<symbol id="i-talk" viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-5.5A8 8 0 0 1 13 4a8 8 0 0 1 8 8Z"/><path d="M9 11h8M9 15h5"/></symbol>',
    // scroll / word list
    '<symbol id="i-scroll" viewBox="0 0 24 24"><path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></symbol>',
    // speaker
    '<symbol id="i-say" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M17 9a4 4 0 0 1 0 6"/></symbol>',
    '<symbol id="i-tick" viewBox="0 0 24 24"><path d="m4 13 5 5L20 6"/></symbol>',
    '<symbol id="i-cross" viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18"/></symbol>',
    '<symbol id="i-medal" viewBox="0 0 24 24"><circle cx="12" cy="15" r="6"/><path d="m8 3 2 6M16 3l-2 6M9 3h6"/></symbol>',
    '<symbol id="i-clipboard" viewBox="0 0 24 24"><path d="M9 4h6v3H9zM7 5H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="M8 12h8M8 16h5"/></symbol>',
    '<symbol id="i-board" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M12 16v4M8 20h8"/></symbol>',
    '<symbol id="i-swap" viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></symbol>',
    '</svg>'
  ].join('');

  function injectSprite() {
    if (document.getElementById('courtyard-sprite')) return;
    var d = document.createElement('div');
    d.id = 'courtyard-sprite';
    d.innerHTML = SPRITE;
    document.body.insertBefore(d, document.body.firstChild);
  }

  function icon(name, extraClass) {
    return '<svg class="icon' + (extraClass ? ' ' + extraClass : '') +
      '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  }

  function live(text) {
    var el = document.getElementById('live');
    if (el) el.textContent = text;
  }

  /* ---------- Recorded voices ----------
     Project rule: all audio is ElevenLabs, Alice for instructions and Daniel
     for the characters and stories, recorded at speed 0.9 for EAL readers.
     The device speech engine is never used: it picks whatever voice the
     tablet has, which on the teacher's Mac was a Spanish one.

     Each line's file name comes from a hash of the voice and the words, so
     changing a sentence on a page asks for a new recording rather than
     playing the old one. Every line a speaker can play is listed in
     window.__spoken; the browser scan checks each file exists, and
     a recording script records the missing ones. */
  function hash(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function tidy(text) { return String(text).replace(/\s+/g, ' ').trim(); }

  var spoken = window.__spoken = [];
  function clip(text, voice) {
    voice = voice === 'daniel' ? 'daniel' : 'alice';
    text = tidy(text);
    var file = 'audio/' + voice.charAt(0) + '-' + hash(voice + '|' + text) + '.mp3';
    if (!spoken.some(function (s) { return s.file === file; })) {
      spoken.push({ text: text, voice: voice, file: file });
    }
    return file;
  }

  var playing = null;
  function play(file) {
    if (playing) { playing.pause(); playing = null; }
    var a = new Audio(file);
    playing = a;
    a.addEventListener('error', function () {
      live('The recording for this line is missing. Ask your teacher.');
    });
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
  }

  /* No recordings yet (teacher, October 2026): the speakers appear once a
     page sets data-audio on <body> and the clips are recorded. Until
     then nothing is listed in __spoken, so the scan asks for no clips. */
  var AUDIO = document.body.hasAttribute('data-audio');

  /** A speaker button. Children still building reading fluency should never
      meet an instruction they cannot get at. */
  function readAloudButton(text, voice) {
    if (!AUDIO) return document.createComment('speaker');
    var file = clip(text, voice);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'say' + (voice === 'daniel' ? ' daniel' : '');
    b.innerHTML = icon('say');
    b.setAttribute('aria-label', 'Read this to me');
    b.addEventListener('click', function () { play(file); });
    return b;
  }

  /* ---------- Tile Book: points to show the teacher ----------
     Earned for solving, never lost for trying. Hints are free. Anonymous
     integers in sessionStorage only; nothing leaves the device. */
  var POINTS_SOLVED = 10;
  var POINTS_FIRST_TRY = 5;

  var lessonId = (document.body.getAttribute('data-lesson') || 'courtyard');
  var storeKey = 'courtyard-book-' + lessonId;
  var purse = { points: 0, solved: 0, firstTry: 0, items: [] };

  function loadPurse() {
    try {
      var raw = window.sessionStorage.getItem(storeKey);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p.points === 'number') purse = p;
      }
    } catch (e) { /* storage off: carry on in memory */ }
  }
  function savePurse() {
    try { window.sessionStorage.setItem(storeKey, JSON.stringify(purse)); }
    catch (e) { /* points still work for this page view */ }
  }

  /** A short code derived from the tally, so a child cannot just claim more. */
  function checkCode() {
    var seed = purse.points * 31 + purse.solved * 7 + purse.firstTry * 3 + lessonId.length;
    var letters = 'BCDFGHJKLMNPQRSTVWXZ';
    return letters[seed % 20] + letters[(seed >> 4) % 20] +
           String((seed % 97) + 10).padStart(2, '0');
  }

  function award(task, tries) {
    var earned = POINTS_SOLVED + (tries === 1 ? POINTS_FIRST_TRY : 0);
    purse.points += earned;
    purse.solved += 1;
    if (tries === 1) purse.firstTry += 1;
    purse.items.push({ task: task, tries: tries, earned: earned });
    savePurse();
    paintPurse(earned);
    return earned;
  }

  function paintPurse(justEarned) {
    var el = document.getElementById('purseCount');
    if (!el) return;
    el.textContent = purse.points;
    var badge = document.getElementById('purseBadge');
    if (badge && justEarned) {
      badge.classList.remove('pop');
      void badge.offsetWidth;
      badge.classList.add('pop');
      badge.setAttribute('aria-label', purse.points + ' points. You just earned ' + justEarned + '.');
      live('You earned ' + justEarned + ' points. Total ' + purse.points + '.');
    }
  }

  function resetPurse() {
    purse = { points: 0, solved: 0, firstTry: 0, items: [] };
    savePurse();
    paintPurse(0);
    renderMyWork();
  }

  /* ---------- Session log: in memory only ---------- */
  var log = [];

  /** Anything that reports "correct in N" earns points. */
  function record(entry) {
    log.push(entry);
    var m = /^correct in (\d+)/.exec(entry.result || '');
    if (m) award(entry.task, parseInt(m[1], 10));
  }

  /* Widgets that are not a typed box or a single choice (tap-all-that-apply,
     sorting, the mirror pool) list themselves here with a
     solve() the browser scan calls, so every one of them is proved
     answerable in a real browser. */
  var widgets = window.__widgets = [];

  /* ---------- Never give the answer ----------
     A hint teaches the method. If one names its own answer, and the
     question does not already show it, a generic line goes out instead.
     tools/unit-pipeline/check_no_reveal.js fails on any hint that does. */
  var FALLBACK = 'Not quite. Read the hint above the box again and try once more.';
  function givesAway(text, cfg) {
    if (cfg.answer === undefined || !text) return false;
    var a = String(cfg.answer);
    var n = /\//.test(a)
      ? new RegExp('(^|[^0-9])' + a.replace('/', '\\s*/\\s*') + '(?![0-9])')
      : new RegExp('(^|[^0-9])' + a + '(?![0-9])');
    return n.test(text) && !n.test(cfg.prompt || '');
  }

  /* ---------- Shared bits of a question box ---------- */
  var askCount = 0;
  function shell(host, cfg, extraClass) {
    var id = 'ask' + (++askCount);
    var box = document.createElement('div');
    box.className = 'ask' + (extraClass ? ' ' + extraClass : '');
    var q = document.createElement('label');
    q.className = 'ask-q';
    q.setAttribute('for', id);
    q.textContent = cfg.prompt;
    box.appendChild(q);
    if (cfg.show) {                       // a drawing or bar above the answer
      var pic = document.createElement('div');
      pic.className = 'ask-pic';
      pic.innerHTML = cfg.show;
      box.appendChild(pic);
    }
    var row = document.createElement('div');
    row.className = 'ask-row';
    box.appendChild(row);
    var fb = document.createElement('p');
    fb.className = 'ask-fb';
    fb.id = id + '-fb';
    fb.setAttribute('role', 'status');
    box.appendChild(fb);
    host.appendChild(box);
    return { id: id, box: box, row: row, fb: fb, q: q };
  }
  function speaker(row, cfg) {
    row.appendChild(readAloudButton(cfg.say || cfg.prompt, cfg.voice));
  }
  function wrongSay(fb, cfg, tries) {
    fb.className = 'ask-fb bad';
    var nudge = cfg.nudge || 'Not quite. Have another look.';
    var said = (tries >= 2 && cfg.hint) ? cfg.hint : nudge;
    fb.textContent = givesAway(said, cfg) ? FALLBACK : said;
  }
  function rightSay(fb, cfg, tries, extra) {
    fb.className = 'ask-fb good';
    fb.textContent = (extra || cfg.praise || 'Correct.') +
      (tries === 1 ? ' First try.' : ' You got there in ' + tries + '.');
  }
  function checkButton(label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn teal';
    b.textContent = label || 'Check';
    return b;
  }

  /* ---------- ask: a whole number ---------- */
  function ask(host, cfg) {
    var s = shell(host, cfg);
    var tries = 0, solved = false;

    var inp = document.createElement('input');
    inp.type = 'number';
    inp.inputMode = 'numeric';
    inp.id = s.id;
    inp.placeholder = '?';
    inp.setAttribute('aria-describedby', s.id + '-fb');
    s.row.appendChild(inp);
    var btn = checkButton();
    s.row.appendChild(btn);
    speaker(s.row, cfg);

    function accept(v) {
      if (typeof cfg.accept === 'function') return cfg.accept(v);
      return v === cfg.answer;
    }
    function submit() {
      if (solved) return;
      var v = parseInt(inp.value, 10);
      if (isNaN(v)) { s.fb.className = 'ask-fb'; s.fb.textContent = 'Type a number first, then press Check.'; return; }
      tries++;
      if (accept(v)) {
        solved = true;
        rightSay(s.fb, cfg, tries);
        inp.disabled = true; btn.disabled = true;
        s.box.classList.add('solved');
        record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
        if (cfg.onSolved) cfg.onSolved(v, tries);
      } else {
        wrongSay(s.fb, cfg, tries);
        record({ task: cfg.task || cfg.prompt, result: 'tried ' + v });
      }
    }
    btn.addEventListener('click', submit);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    return { el: s.box, isSolved: function () { return solved; } };
  }

  
  /* ---------- choose: one right option ---------- */
  function choose(host, cfg) {
    var s = shell(host, cfg);
    var tries = 0, solved = false;
    var group = document.createElement('div');
    group.className = 'choices' + (cfg.cards ? ' cards' : '');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', cfg.prompt);
    s.box.insertBefore(group, s.row);    // directly in .ask: the scan looks for .ask > .choices
    speaker(s.row, cfg);

    cfg.options.forEach(function (opt, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      if (cfg.cards) b.innerHTML = opt; else b.textContent = opt;
      if (cfg.labels) b.setAttribute('aria-label', cfg.labels[i]);
      b.addEventListener('click', function () {
        if (solved) return;
        tries++;
        if (i === cfg.answer) {
          solved = true;
          b.classList.add('right');
          rightSay(s.fb, cfg, tries);
          s.box.classList.add('solved');
          Array.prototype.forEach.call(group.children, function (x) { x.disabled = x !== b; });
          record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
          if (cfg.onSolved) cfg.onSolved(i, tries);
        } else {
          b.classList.add('wrong');
          b.disabled = true;
          wrongSay(s.fb, cfg, tries);
          record({ task: cfg.task || cfg.prompt, result: 'tried option ' + (i + 1) });
        }
      });
      group.appendChild(b);
    });
    return { el: s.box, isSolved: function () { return solved; } };
  }

  /* ---------- picks: tap every one that fits ---------- */
  function picks(host, cfg) {
    var s = shell(host, cfg, 'picks-ask');
    var tries = 0, solved = false;
    var grid = document.createElement('div');
    grid.className = 'picks';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', cfg.prompt);
    s.box.insertBefore(grid, s.row);
    cfg.items.forEach(function (html, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick';
      b.innerHTML = html;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        if (solved) return;
        b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      });
      grid.appendChild(b);
    });
    var btn = checkButton();
    s.row.appendChild(btn);
    speaker(s.row, cfg);

    function chosen() {
      var out = [];
      Array.prototype.forEach.call(grid.children, function (b, i) {
        if (b.getAttribute('aria-pressed') === 'true') out.push(i);
      });
      return out;
    }
    btn.addEventListener('click', function () {
      if (solved) return;
      var c = chosen();
      if (!c.length) { s.fb.className = 'ask-fb'; s.fb.textContent = 'Tap the ones you choose, then press Check.'; return; }
      tries++;
      var right = cfg.correct.slice().sort().join() === c.slice().sort().join();
      if (right) {
        solved = true;
        rightSay(s.fb, cfg, tries);
        s.box.classList.add('solved');
        btn.disabled = true;
        Array.prototype.forEach.call(grid.children, function (b) { b.disabled = true; });
        record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
        if (cfg.onSolved) cfg.onSolved(c, tries);
      } else {
        var extra = c.filter(function (i) { return cfg.correct.indexOf(i) === -1; }).length;
        var missing = cfg.correct.filter(function (i) { return c.indexOf(i) === -1; }).length;
        s.fb.className = 'ask-fb bad';
        s.fb.textContent = tries >= 2 && cfg.hint ? cfg.hint
          : extra ? 'At least one you chose does not fit. Check each one again.'
                  : 'There are more to find. Look at each one again.';
        record({ task: cfg.task || cfg.prompt, result: 'chose ' + c.length + (missing ? ', missed some' : '') });
      }
    });
    widgets.push({ el: s.box, solve: function () {
      Array.prototype.forEach.call(grid.children, function (b, i) {
        b.setAttribute('aria-pressed', String(cfg.correct.indexOf(i) !== -1));
      });
      btn.click();
    } });
    return { el: s.box, isSolved: function () { return solved; } };
  }


  /* ---------- Tiles: 2D shapes as inline SVG ----------
     A shape is a list of points; named outlines live in TILES. tile() draws
     one centred in a 120-unit box, so every card is the same size whatever
     the shape, and a child compares shapes, not sizes. */
  function reg(n, rot) {
    var out = [];
    for (var k = 0; k < n; k++) {
      var a = (-90 + (rot || 0) + 360 * k / n) * Math.PI / 180;
      out.push([Math.cos(a), Math.sin(a)]);
    }
    return out;
  }
  function arc(a0, a1, steps, rx, ry) {
    var out = [];
    for (var k = 0; k <= steps; k++) {
      var a = (a0 + (a1 - a0) * k / steps) * Math.PI / 180;
      out.push([(rx || 1) * Math.cos(a), -(ry || 1) * Math.sin(a)]);
    }
    return out;
  }
  var TILES = {
    rectangle: [[0, 0], [2, 0], [2, 1], [0, 1]],
    rhombus: [[1, 0], [1.7, 1.2], [1, 2.4], [0.3, 1.2]],
    kite: [[1, 0], [1.8, 0.8], [1, 2.6], [0.2, 0.8]],
    parallelogram: [[0.6, 0], [2.6, 0], [2.0, 1.2], [0, 1.2]],
    trapezium: [[0.5, 0], [1.7, 0], [2.2, 1.2], [0, 1.2]],
    house: [[0, 1], [0.8, 0], [1.6, 1], [1.6, 2.2], [0, 2.2]],
    lshape: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [0, 2]],
    tshape: [[0, 0], [3, 0], [3, 1], [2, 1], [2, 3], [1, 3], [1, 1], [0, 1]],
    plus: [[1, 0], [2, 0], [2, 1], [3, 1], [3, 2], [2, 2], [2, 3], [1, 3], [1, 2], [0, 2], [0, 1], [1, 1]],
    uparrow: [[1, 0], [2, 1], [1.4, 1], [1.4, 2.4], [0.6, 2.4], [0.6, 1], [0, 1]],
    homeplate: [[0, 0], [1.6, 0], [2.4, 0.6], [1.6, 1.2], [0, 1.2]],
    scalene: [[0, 0], [2.2, 0.5], [0.6, 1.5]],
    righttri: [[0, 0], [0, 1.4], [1.8, 1.4]],
    irr4: [[0.2, 0.3], [1.9, 0], [2.3, 1.5], [0, 1.8]],
    irr5: [[0, 0.6], [1.2, 0], [2.2, 0.8], [1.8, 2], [0.4, 1.7]],
    irr7: [[0.7, 0], [1.7, 0.2], [2.4, 0.9], [2.1, 1.9], [1.1, 2.3], [0.2, 1.8], [0, 0.8]],
    irr8: [[0.5, 0], [2.1, 0], [2.6, 0.45], [2.6, 0.95], [2.1, 1.4], [0.5, 1.4], [0, 0.95], [0, 0.45]],
    irr9: [[0.4, 0], [1.3, 0.25], [2.2, 0], [2.6, 0.8], [2.3, 1.6], [2.6, 2.3], [1.4, 2.5], [0.3, 2.3], [0, 1.2]],
    circle: arc(0, 360, 72), oval: arc(0, 360, 72, 1, 0.6),
    semicircle: arc(0, 180, 36), semileft: arc(-90, 90, 36), quarter: [[0, 0]].concat(arc(0, 90, 24)),
    star: (function () {
      var out = [];
      for (var k = 0; k < 10; k++) {
        var a = (-90 + 36 * k) * Math.PI / 180, r = k % 2 ? 0.45 : 1;
        out.push([r * Math.cos(a), r * Math.sin(a)]);
      }
      return out;
    })()
  };
  /** spec: a TILES name, "regN" or "regN@rot", or a list of points. */
  function outline(spec) {
    if (typeof spec !== 'string') return spec;
    var m = /^reg(\d+)(?:@(-?[\d.]+))?$/.exec(spec);
    return m ? reg(+m[1], m[2] ? +m[2] : (+m[1] === 4 ? 45 : 0)) : TILES[spec];
  }
  function fit(points, size) {
    var xs = points.map(function (p) { return p[0]; }), ys = points.map(function (p) { return p[1]; });
    var w = Math.max.apply(null, xs) - Math.min.apply(null, xs), h = Math.max.apply(null, ys) - Math.min.apply(null, ys);
    var k = size / Math.max(w, h);
    var mx = (Math.max.apply(null, xs) + Math.min.apply(null, xs)) / 2, my = (Math.max.apply(null, ys) + Math.min.apply(null, ys)) / 2;
    return points.map(function (p) { return [(p[0] - mx) * k, (p[1] - my) * k]; });
  }
  function pts(points) {
    return points.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
  }
  /** opts: {tone: 0-4, label, lines: 'V' | 'H' | 'HV' (dashed mirror lines), line: [x1,y1,x2,y2]} */
  function tile(spec, opts) {
    opts = opts || {};
    var p = fit(outline(spec), 92);
    var out = '<svg class="tile tone' + (opts.tone || 0) + '" viewBox="-60 -60 120 120" role="img" aria-label="' +
      (opts.label || 'a shape') + '"><polygon points="' + pts(p) + '"/>';
    var L = opts.lines || '';
    if (L.indexOf('V') !== -1) out += '<line class="mline" x1="0" y1="-58" x2="0" y2="58"/>';
    if (L.indexOf('H') !== -1) out += '<line class="mline" x1="-58" y1="0" x2="58" y2="0"/>';
    if (opts.line) out += '<line class="mline" x1="' + opts.line[0] + '" y1="' + opts.line[1] + '" x2="' + opts.line[2] + '" y2="' + opts.line[3] + '"/>';
    return out + '</svg>';
  }
  /** Two arms from one corner, deg apart; start is the first arm's direction, 0 = right, anticlockwise. */
  function angle(deg, start, label) {
    var r = 46, a0 = (start || 0) * Math.PI / 180, a1 = ((start || 0) + deg) * Math.PI / 180;
    var x0 = -Math.cos((a0 + a1) / 2) * 20, y0 = Math.sin((a0 + a1) / 2) * 20;   // nudge the corner off-centre
    return '<svg class="angle" viewBox="-60 -60 120 120" role="img" aria-label="' + (label || 'an angle') + '">' +
      '<polyline points="' + (x0 + r * Math.cos(a0)).toFixed(1) + ',' + (y0 - r * Math.sin(a0)).toFixed(1) + ' ' +
      x0.toFixed(1) + ',' + y0.toFixed(1) + ' ' + (x0 + r * Math.cos(a1)).toFixed(1) + ',' + (y0 - r * Math.sin(a1)).toFixed(1) +
      '"/><circle cx="' + x0.toFixed(1) + '" cy="' + y0.toFixed(1) + '" r="3.5"/></svg>';
  }
  /** A clock face with the minute hand on 12 and the hour hand on `hour`. */
  function clock(hour) {
    var a = (90 - 30 * hour) * Math.PI / 180, nums = '';
    for (var k = 1; k <= 12; k++) {
      var b = (90 - 30 * k) * Math.PI / 180;
      nums += '<text x="' + (40 * Math.cos(b)).toFixed(1) + '" y="' + (-40 * Math.sin(b) + 4).toFixed(1) + '">' + k + '</text>';
    }
    return '<svg class="clock" viewBox="-60 -60 120 120" role="img" aria-label="A clock at ' + hour + ' o’clock">' +
      '<circle r="54"/>' + nums + '<line class="min" x1="0" y1="0" x2="0" y2="-36"/>' +
      '<line class="hr" x1="0" y1="0" x2="' + (24 * Math.cos(a)).toFixed(1) + '" y2="' + (-24 * Math.sin(a)).toFixed(1) + '"/></svg>';
  }

  /* ---------- mirror: colour the other half of a pattern ----------
     cfg: {cols, rows, axis: 'V' | 'H', cells: [[col, row], ...]} on the left
     (or top) half. The child taps squares on the other half; it is right when
     the coloured squares are exactly the reflection. The given half is locked,
     so only the half being built can change. */
  function mirror(host, cfg) {
    var s = shell(host, cfg, 'mirror-ask');
    var tries = 0, solved = false;
    var V = cfg.axis !== 'H';
    var want = {};
    cfg.cells.forEach(function (c) {
      want[(V ? cfg.cols - 1 - c[0] : c[0]) + ',' + (V ? c[1] : cfg.rows - 1 - c[1])] = true;
    });
    var given = {};
    cfg.cells.forEach(function (c) { given[c[0] + ',' + c[1]] = true; });
    var grid = document.createElement('div');
    grid.className = 'pool ' + (V ? 'v' : 'h');
    grid.style.setProperty('--cols', cfg.cols);
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', cfg.prompt);
    var cells = [];
    for (var r = 0; r < cfg.rows; r++) {
      for (var c = 0; c < cfg.cols; c++) {
        var mine = V ? c >= cfg.cols / 2 : r >= cfg.rows / 2;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sq' + (given[c + ',' + r] ? ' given' : '') + (mine ? ' mine' : '');
        b.dataset.k = c + ',' + r;
        b.setAttribute('aria-label', 'Row ' + (r + 1) + ', column ' + (c + 1) + (given[c + ',' + r] ? ', coloured' : ''));
        if (mine) {
          b.setAttribute('aria-pressed', 'false');
          b.addEventListener('click', function () {
            if (solved) return;
            this.setAttribute('aria-pressed', String(this.getAttribute('aria-pressed') !== 'true'));
          });
          cells.push(b);
        } else {
          b.disabled = true;
        }
        if (V && c === cfg.cols / 2) b.classList.add('edge');
        if (!V && r === cfg.rows / 2) b.classList.add('edge');
        grid.appendChild(b);
      }
    }
    s.box.insertBefore(grid, s.row);
    var btn = checkButton();
    s.row.appendChild(btn);
    speaker(s.row, cfg);
    btn.addEventListener('click', function () {
      if (solved) return;
      var on = cells.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; });
      if (!on.length) { s.fb.className = 'ask-fb'; s.fb.textContent = 'Tap the squares to colour them, then press Check.'; return; }
      tries++;
      var extra = on.filter(function (b) { return !want[b.dataset.k]; }).length;
      var missing = Object.keys(want).length - (on.length - extra);
      if (!extra && !missing) {
        solved = true;
        s.box.classList.add('solved');
        btn.disabled = true;
        cells.forEach(function (b) { b.disabled = true; });
        rightSay(s.fb, cfg, tries, 'Symmetrical. Each half mirrors the other.');
        record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
        if (cfg.onSolved) cfg.onSolved(null, tries);
      } else {
        s.fb.className = 'ask-fb bad';
        s.fb.textContent = tries >= 2 ? (cfg.hint || 'Count how far each coloured square is from the mirror line. Its partner is the same distance away on the other side, in the same ' + (V ? 'row' : 'column') + '.')
          : extra ? 'At least one square you coloured has no partner on the other side. Check each one.'
                  : 'Some squares still need a partner. Look at each coloured square again.';
        record({ task: cfg.task || cfg.prompt, result: 'tried, ' + (extra ? 'extra squares' : 'missed some') });
      }
    });
    widgets.push({ el: s.box, solve: function () {
      cells.forEach(function (b) { b.setAttribute('aria-pressed', String(!!want[b.dataset.k])); });
      btn.click();
    } });
    return { el: s.box, isSolved: function () { return solved; } };
  }

  /* ---------- Drag with a tap fallback ----------
     The Bug Hotel's pointer drag (bughotel.js placer): capture on press, a
     ghost follows the finger, the drop is whatever is under it. A press that
     barely moves is a tap, and the widget decides what a tap means. */
  function draggable(card, onDrop, onTap, box) {
    var start = null, ghost = null, over = null, dragged = false, last = null, loop = 0;
    /* Hold a card near the top or bottom edge and the page scrolls, so a
       place below the screen is still reachable without letting go. */
    function edgeScroll() {
      loop = 0;
      if (!ghost || !last) return;
      var edge = 80, dy = 0;
      if (last.y > window.innerHeight - edge) dy = 12;
      else if (last.y < edge) dy = -12;
      if (dy) { window.scrollBy(0, dy); hover(last.x, last.y); }
      loop = requestAnimationFrame(edgeScroll);
    }
    function hover(x, y) {
      var hit = document.elementFromPoint(x, y);
      var drop = hit && hit.closest('.drop');
      if (drop && !box.contains(drop)) drop = null;
      if (over !== drop) {
        if (over) over.classList.remove('hover');
        if (drop) drop.classList.add('hover');
        over = drop;
      }
    }
    card.addEventListener('pointerdown', function (e) {
      if (card.disabled || e.button > 0) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      dragged = false;
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* pointer gone */ }
    });
    card.addEventListener('pointermove', function (e) {
      if (!start || e.pointerId !== start.id) return;
      if (!ghost) {
        if (Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) < 10) return;
        var r = card.getBoundingClientRect();
        ghost = card.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.style.width = r.width + 'px';
        ghost.style.height = r.height + 'px';
        document.body.appendChild(ghost);
        card.classList.add('lifted');
        dragged = true;
        loop = requestAnimationFrame(edgeScroll);
      }
      last = { x: e.clientX, y: e.clientY };
      ghost.style.transform = 'translate(' + (e.clientX - ghost.offsetWidth / 2) + 'px,' +
        (e.clientY - ghost.offsetHeight / 2) + 'px) scale(1.06)';
      hover(e.clientX, e.clientY);
    });
    function end(cancelled) {
      if (!start) return;
      start = null;
      if (loop) { cancelAnimationFrame(loop); loop = 0; }
      last = null;
      if (!ghost) return;
      var g = ghost, to = over;
      ghost = null; over = null;
      if (to) to.classList.remove('hover');
      if (to && !cancelled) {
        g.remove();
        card.classList.remove('lifted');
        onDrop(to);
        return;
      }
      /* Dropped on nothing: the card glides home, so a child sees where it
         went instead of it vanishing. Reduced motion makes this instant. */
      var r = card.getBoundingClientRect();
      g.style.transition = 'transform .22s cubic-bezier(.23,1,.32,1)';
      g.style.transform = 'translate(' + r.left + 'px,' + r.top + 'px)';
      setTimeout(function () { g.remove(); card.classList.remove('lifted'); }, 220);
    }
    card.addEventListener('pointerup', function () { end(false); });
    card.addEventListener('pointercancel', function () { end(true); });
    card.addEventListener('click', function () {
      if (dragged) { dragged = false; return; }
      onTap();
    });
  }
  function bump(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  /* ---------- place: drag cards into places ----------
     cfg.places: [{label?, before?, after?, accept}]. cfg.cards: [{html, value}].
     A card fits a place when its value equals the place's accept, and each
     place takes one card (or many with cfg.baskets). cfg.reuse keeps a card in
     the tray after use, for the < > = symbols. Drag a card to a place, or tap
     a card and then tap the place. */
  function place(host, cfg) {
    var s = shell(host, cfg, 'place' + (cfg.baskets ? ' baskets' : '') + (cfg.line ? ' line' : '') + (cfg.layout ? ' ' + cfg.layout : ''));
    var solved = false, held = null, wrong = 0;
    var tray = document.createElement('div');
    tray.className = 'tray-cards';
    var board = document.createElement('div');
    board.className = 'places';
    s.box.insertBefore(tray, s.row);
    s.box.insertBefore(board, s.row);

    var places = cfg.places.map(function (p) {
      var row = document.createElement('div');
      row.className = 'place-row';
      if (p.before) { var a = document.createElement('div'); a.className = 'place-side'; a.innerHTML = p.before; row.appendChild(a); }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'drop slot';
      b.innerHTML = (p.label ? '<span class="slot-label">' + p.label + '</span>' : '') + '<span class="slot-items"></span>';
      b.setAttribute('aria-label', p.aria || p.label || 'An empty place');
      b._p = p;
      p.b = b; p.full = false;
      b.addEventListener('click', function () {
        if (held) put(held, p);
        else { s.fb.className = 'ask-fb'; s.fb.textContent = 'First choose a card. Then tap where it goes.'; }
      });
      row.appendChild(b);
      if (p.after) { var z = document.createElement('div'); z.className = 'place-side'; z.innerHTML = p.after; row.appendChild(z); }
      board.appendChild(row);
      return p;
    });
    var cards = cfg.cards.map(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card-piece';
      b.innerHTML = c.html;
      if (c.aria) b.setAttribute('aria-label', c.aria);
      b.setAttribute('aria-pressed', 'false');
      c.b = b;
      draggable(b, function (drop) { put(c, drop._p); },
        function () { hold(c); }, s.box);
      tray.appendChild(b);
      return c;
    });
    // Baskets take every card; anything else is done when each place is filled.
    var left = cfg.baskets || cfg.line ? cards.length : places.length;
    /* cfg.line: the places are the ticks of a 0 to 1 number line, one card
       each, and most ticks stay empty. The ends are labelled, the ticks not. */
    if (cfg.line) {
      board.style.setProperty('--cols', places.length + 2);
      board.insertAdjacentHTML('afterbegin', '<div class="line-end">0</div>');
      board.insertAdjacentHTML('beforeend', '<div class="line-end">1</div>');
    }
    if (!cfg.keepOrder) {
      cards.slice().sort(function () { return Math.random() - 0.5; }).forEach(function (c) { tray.appendChild(c.b); });
    }
    speaker(s.row, cfg);

    function hold(c) {
      if (solved || c.done) return;
      held = held === c ? null : c;
      cards.forEach(function (o) { o.b.setAttribute('aria-pressed', String(o === held)); });
      if (held) { s.fb.className = 'ask-fb'; s.fb.textContent = 'Now tap where it goes.'; }
    }
    function put(c, p) {
      if (solved || c.done || !p || (p.full && !cfg.baskets)) return;
      held = null;
      cards.forEach(function (o) { o.b.setAttribute('aria-pressed', 'false'); });
      if (String(c.value) === String(p.accept)) {
        var chip = document.createElement('span');
        chip.className = 'placed-card land';
        chip.innerHTML = c.html;
        p.b.querySelector('.slot-items').appendChild(chip);
        if (!cfg.baskets) { p.full = true; p.b.classList.add('full'); }
        if (!cfg.reuse) { c.done = true; c.b.remove(); }
        left--;
        s.fb.className = 'ask-fb good';
        s.fb.textContent = left ? (c.why || cfg.praise || 'Yes, that fits.') : '';
        if (!left) {
          solved = true;
          s.box.classList.add('solved');
          tray.remove();
          rightSay(s.fb, cfg, wrong + 1, cfg.done || 'All in the right places.');
          record({ task: cfg.task || cfg.prompt, result: 'correct in ' + (wrong + 1) });
          if (cfg.onSolved) cfg.onSolved(null, wrong + 1);
        }
      } else {
        wrong++;
        bump(c.b, 'shake');
        s.fb.className = 'ask-fb bad';
        s.fb.textContent = wrong >= 2 && cfg.hint ? cfg.hint : (cfg.nudge || 'Not there. Look again.');
        record({ task: cfg.task || cfg.prompt, result: 'missed a place' });
      }
    }

    widgets.push({ el: s.box, solve: function () {
      places.forEach(function (p) {
        if (p.full) return;
        var c = cards.filter(function (o) { return !o.done && String(o.value) === String(p.accept); })[0];
        if (c) put(c, p);
      });
      if (cfg.baskets) cards.forEach(function (c) {
        if (c.done) return;
        put(c, places.filter(function (p) { return String(p.accept) === String(c.value); })[0]);
      });
    } });
    return { el: s.box, isSolved: function () { return solved; } };
  }

  /* ---------- Teacher summary ----------
     The Bake-off tags every task with its Progress Check question, so the
     summary can say which question type a child is still missing. */
  function renderSummary(el) {
    if (!el) return;
    var body = el.querySelector('[data-summary-body]');
    if (!log.length) {
      body.innerHTML = '<p class="none">Nothing tried yet this session.</p>';
    } else {
      var pc = {}, counts = {};
      log.forEach(function (e) {
        var k = e.task + '||' + e.result;
        counts[k] = (counts[k] || 0) + 1;
        var q = /^PC (Q\d+)/.exec(e.task);
        if (q) {
          pc[q[1]] = pc[q[1]] || { first: 0, later: 0, tasks: {} };
          var m = /^correct in (\d+)/.exec(e.result);
          if (m) { if (m[1] === '1') pc[q[1]].first++; else pc[q[1]].later++; }
        }
      });
      var html = '';
      var qs = Object.keys(pc).sort(function (a, b) { return a.slice(1) - b.slice(1); });
      if (qs.length) {
        html += '<table class="pc"><tr><th>Progress Check</th><th>First try</th><th>After a hint</th></tr>' +
          qs.map(function (q) {
            return '<tr><td>' + q + '</td><td>' + pc[q].first + '</td><td>' + pc[q].later + '</td></tr>';
          }).join('') + '</table>';
      }
      html += '<ul>' + Object.keys(counts).map(function (k) {
        var p = k.split('||');
        return '<li><b>' + p[0] + '</b>: ' + p[1] + (counts[k] > 1 ? ' (×' + counts[k] + ')' : '') + '</li>';
      }).join('') + '</ul>';
      body.innerHTML = html;
    }
    el.classList.add('show');
    el.setAttribute('tabindex', '-1');
    el.focus();
  }

  /* ---------- Screen navigation ---------- */
  function buildNav(steps, opts) {
    var rail = document.getElementById('rail');
    if (rail) steps.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = icon(s.icon) + '<span>' + s.label + '</span>';
      b.setAttribute('aria-label', 'Step ' + (i + 1) + ' of ' + steps.length + ': ' + s.label);
      b.addEventListener('click', function () { go(i); });
      rail.appendChild(b);
    });

    function go(n) {
      document.querySelectorAll('.screen').forEach(function (el) {
        el.classList.toggle('on', +el.dataset.s === n);
      });
      if (rail) Array.prototype.forEach.call(rail.children, function (b, i) {
        if (i === n) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
      var head = document.querySelector('.screen.on h2');
      if (head) { head.setAttribute('tabindex', '-1'); head.focus({ preventScroll: true }); }
      if (steps[n]) live(steps[n].label + '. ' + (head ? head.textContent : ''));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (opts && opts.onEnter) opts.onEnter(n);
    }
    window.go = go;
    go(0);
    return go;
  }

  /* ---------- Toolbar: points, board mode, summary, new pupil ---------- */
  function buildToolbar() {
    var bar = document.getElementById('toolbar');
    if (!bar) return;

    var badge = document.createElement('div');
    badge.className = 'purse';
    badge.id = 'purseBadge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', purse.points + ' points');
    badge.innerHTML = icon('book', 'icon-lg') +
      '<span class="purse-n" id="purseCount">' + purse.points + '</span>' +
      '<span class="purse-l">points</span>';
    bar.appendChild(badge);

    var boardBtn = document.createElement('button');
    boardBtn.type = 'button';
    boardBtn.className = 'tool';
    boardBtn.setAttribute('aria-pressed', 'false');
    boardBtn.innerHTML = icon('board') + '<span>Board mode</span>';
    boardBtn.addEventListener('click', function () {
      var on = document.documentElement.hasAttribute('data-board');
      if (on) document.documentElement.removeAttribute('data-board');
      else document.documentElement.setAttribute('data-board', '');
      boardBtn.setAttribute('aria-pressed', String(!on));
    });
    bar.appendChild(boardBtn);

    var sumEl = document.getElementById('summary');
    if (sumEl) {
      var sumBtn = document.createElement('button');
      sumBtn.type = 'button';
      sumBtn.className = 'tool';
      sumBtn.innerHTML = icon('clipboard') + '<span>Session summary</span>';
      sumBtn.addEventListener('click', function () { renderSummary(sumEl); });
      bar.appendChild(sumBtn);

      var resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'tool';
      resetBtn.innerHTML = icon('swap') + '<span>New pupil</span>';
      resetBtn.setAttribute('aria-label', 'Clear the log for a new pupil');
      resetBtn.addEventListener('click', function () {
        if (window.confirm('Clear the log and start again for a new pupil?')) {
          log.length = 0;
          resetPurse();
          sumEl.classList.remove('show');
        }
      });
      bar.appendChild(resetBtn);
    }
  }

  /* ---------- Key words and read-aloud text ---------- */
  function buildKeyWords() {
    document.querySelectorAll('.kcard').forEach(function (card) {
      var word = card.getAttribute('data-word');
      if (!AUDIO || !word || card.querySelector('.say')) return;
      var b = readAloudButton(word, 'alice');
      b.setAttribute('aria-label', 'Say the word ' + word + ' aloud');
      card.appendChild(b);
    });
  }
  /** A speaker on any element carrying data-read (data-voice="daniel" for characters). */
  function buildReadAloud() {
    if (!AUDIO) return;
    document.querySelectorAll('[data-read]').forEach(function (el) {
      if (el.querySelector(':scope > .say')) return;
      el.appendChild(readAloudButton(el.getAttribute('data-read') || el.textContent,
                                     el.getAttribute('data-voice')));
    });
  }

  /* ---------- The panel the child shows the teacher ---------- */
  function renderMyWork() {
    var host = document.getElementById('mywork');
    if (!host) return;
    if (!purse.solved) {
      host.innerHTML = '<h3>My Tile Book</h3><div class="big">0</div>' +
        '<div>points so far. Answer some questions to fill your book.</div>';
      return;
    }
    var rows = purse.items.map(function (it) {
      return '<li>' + it.task + ': <b>' + it.earned + '</b>' +
        (it.tries === 1 ? ' (first try)' : ' (' + it.tries + ' tries)') + '</li>';
    }).join('');
    host.innerHTML = '<h3>My Tile Book</h3>' +
      '<div class="big">' + purse.points + '</div>' +
      '<div>points · ' + purse.solved + ' question' + (purse.solved === 1 ? '' : 's') +
        ' solved · ' + purse.firstTry + ' on the first try</div>' +
      '<div class="code">Check code <b>' + checkCode() + '</b></div>' +
      '<details class="breakdown"><summary>Show my teacher what I did</summary><ul>' + rows + '</ul></details>' +
      '<p class="purse-note">Show this screen to your teacher at the end of the lesson.</p>';
  }

  function buildStamp() {
    var btn = document.getElementById('stampBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      document.getElementById('stamp').classList.add('on');
      live('Rank stamped. Well done.');
    });
  }

  /* ---------- Chooser chips: one per item, a tick once it is done ---------- */
  function chips(pickEl, labels, show) {
    var done = {};
    labels.forEach(function (lab, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = lab;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { open(i); });
      pickEl.appendChild(b);
    });
    function open(i) {
      Array.prototype.forEach.call(pickEl.children, function (b, j) {
        b.setAttribute('aria-pressed', String(i === j));
      });
      show(i, !!done[i]);
    }
    function markDone(i) {
      done[i] = true;
      var b = pickEl.children[i];
      if (b && b.textContent.indexOf('✓') === -1) b.textContent = '✓ ' + b.textContent;
    }
    open(0);
    return { open: open, markDone: markDone };
  }

  function init(steps, opts) {
    injectSprite();
    loadPurse();
    buildNav(steps, opts);
    buildToolbar();
    buildKeyWords();
    buildReadAloud();
    buildStamp();
    renderMyWork();
  }

  window.Courtyard = {
    init: init, icon: icon, record: record, live: live,
    ask: ask, choose: choose, picks: picks, place: place, mirror: mirror,
    tile: tile, angle: angle, clock: clock,
    chips: chips, myWork: function () { return { solved: purse.solved, points: purse.points, firstTry: purse.firstTry }; },
    renderMyWork: renderMyWork, award: award,
    readAloud: buildReadAloud, sayButton: readAloudButton
  };
})();
