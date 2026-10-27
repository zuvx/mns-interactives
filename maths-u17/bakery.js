/* ============================================================
   The Bakery Upstairs — shared behaviour (Maths Unit 17, Fractions B)
   The Bakery's engine (Unit 16), copied so each pathway stands alone, with
   the equivalence pieces added: the fraction wall, building one amount out
   of smaller pieces, and cards dragged into places (compare, order, sort).
   Icing now accepts any equivalent amount, so ice 1/2 of a cake cut in
   eight is four parts.
   Rules: design-system/mns-classroom/pages/bakery.md

   NO network. NO localStorage, NO cookies, nothing transmitted, ever.
   The only storage is sessionStorage holding an anonymous points tally, so a
   refresh does not wipe a lesson's work; it dies when the tab closes.
   The voices are mp3 files in audio/, recorded once with ElevenLabs on the
   teacher's Mac (tools/unit-pipeline/make_bakery_audio.py). The device never
   calls ElevenLabs or anything else.
   ============================================================ */
(function () {
  'use strict';

  var SHAPES = window.BakeryShapes;

  /* ---------- Inline SVG sprite (no emoji as icons) ---------- */
  var SPRITE = [
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">',
    // a slice of cake
    '<symbol id="i-cake" viewBox="0 0 24 24"><path d="M3 20h18V12L3 8v12Z"/><path d="M3 13l18 3M3 8l9-4 9 8"/></symbol>',
    // a loaf
    '<symbol id="i-loaf" viewBox="0 0 24 24"><path d="M4 18V11a4 4 0 0 1 0-6h16a4 4 0 0 1 0 6v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path d="M9 9v3M15 9v3"/></symbol>',
    // a biscuit
    '<symbol id="i-biscuit" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 10h.01M10 15h.01M14.5 14.5h.01"/></symbol>',
    // a whisk
    '<symbol id="i-whisk" viewBox="0 0 24 24"><path d="M14 10 21 3"/><path d="M14 10c-3-3-9-2-10 3s4 8 7 7 5-6 3-10Z"/><path d="M14 10c-4 0-7 3-7 7"/></symbol>',
    // an oven
    '<symbol id="i-oven" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 8h18"/><rect x="7" y="11" width="10" height="7" rx="1"/><path d="M7 5.5h.01M11 5.5h.01"/></symbol>',
    // a plate seen from above
    '<symbol id="i-plate" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/></symbol>',
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
    if (document.getElementById('bakery-sprite')) return;
    var d = document.createElement('div');
    d.id = 'bakery-sprite';
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
     make_bakery_audio.py records the missing ones. */
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
     page sets data-audio on <body> and make_bakery_audio.py has run. Until
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

  /* ---------- Baker's Book: points to show the teacher ----------
     Earned for solving, never lost for trying. Hints are free. Anonymous
     integers in sessionStorage only; nothing leaves the device. */
  var POINTS_SOLVED = 10;
  var POINTS_FIRST_TRY = 5;

  var lessonId = (document.body.getAttribute('data-lesson') || 'bakery');
  var storeKey = 'upstairs-book-' + lessonId;
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

  /* Widgets that are not a typed box or a single choice (icing, matching,
     the four quarters, tap-all-that-apply) list themselves here with a
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

  /* ---------- askFrac: numerator over denominator ----------
     Two boxes stacked on a horizontal bar, the way the Progress Check is
     answered (the vinculum is always horizontal, TG p191). cfg.answer is
     "n/d". An equivalent fraction is accepted unless cfg.exact, as the mark
     scheme does for "what fraction is shaded". cfg.words lays the boxes out
     as "_ parts out of a total of _ parts" instead (PC Q9). */
  function parseFrac(v) {
    var m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(v));
    return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
  }

  function askFrac(host, cfg) {
    var target = parseFrac(cfg.answer);
    var s = shell(host, cfg, 'frac-ask');
    var tries = 0, solved = false;

    var num = document.createElement('input');
    var den = document.createElement('input');
    [num, den].forEach(function (inp) {
      inp.type = 'number';
      inp.inputMode = 'numeric';
      inp.placeholder = '?';
      inp.setAttribute('aria-describedby', s.id + '-fb');
    });
    num.id = s.id;

    var holder = document.createElement('div');
    if (cfg.words) {
      holder.className = 'words';
      num.setAttribute('aria-label', 'How many parts');
      den.setAttribute('aria-label', 'Total number of parts');
      holder.appendChild(num);
      holder.appendChild(txt(' part' + (target[0] === 1 ? '' : 's') + ' out of a total of '));
      holder.appendChild(den);
      holder.appendChild(txt(' parts'));
    } else {
      holder.className = 'frac-in';
      num.setAttribute('aria-label', 'Top number, the numerator');
      den.setAttribute('aria-label', 'Bottom number, the denominator');
      var bar = document.createElement('span');
      bar.className = 'vinc';
      bar.setAttribute('aria-hidden', 'true');
      holder.appendChild(num);
      holder.appendChild(bar);
      holder.appendChild(den);
    }
    s.row.appendChild(holder);
    var btn = checkButton();
    s.row.appendChild(btn);
    speaker(s.row, cfg);

    function accept(v) {
      var f = parseFrac(v);
      if (!f || !f[1]) return false;
      if (cfg.exact || cfg.words) return f[0] === target[0] && f[1] === target[1];
      return f[0] * target[1] === target[0] * f[1] && f[0] <= f[1];
    }
    // The scan reads cfg.accept to find a value the question takes.
    cfg.accept = accept;

    function submit() {
      if (solved) return;
      if (num.value === '' || den.value === '') {
        s.fb.className = 'ask-fb';
        s.fb.textContent = cfg.words ? 'Fill in both boxes, then press Check.'
                                     : 'Fill in the top number and the bottom number, then press Check.';
        return;
      }
      var v = parseInt(num.value, 10) + '/' + parseInt(den.value, 10);
      tries++;
      if (accept(v)) {
        solved = true;
        var f = parseFrac(v);
        var same = f[0] === target[0] && f[1] === target[1];
        rightSay(s.fb, cfg, tries, same ? null :
          'Yes, that is the same amount. Your Progress Check accepts it too.');
        num.disabled = den.disabled = btn.disabled = true;
        s.box.classList.add('solved');
        record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
        if (cfg.onSolved) cfg.onSolved(v, tries);
      } else {
        var f2 = parseFrac(v);
        // The commonest slip, numbers upside down, gets its own nudge.
        if (f2 && f2[0] === target[1] && f2[1] === target[0] && tries < 2) {
          s.fb.className = 'ask-fb bad';
          s.fb.textContent = 'Check which number goes where. The bottom number is how many equal parts in the whole.';
        } else {
          wrongSay(s.fb, cfg, tries);
        }
        record({ task: cfg.task || cfg.prompt, result: 'tried ' + v });
      }
    }
    btn.addEventListener('click', submit);
    [num, den].forEach(function (inp) {
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    });
    return { el: s.box, isSolved: function () { return solved; } };
  }

  function txt(t) { var s = document.createElement('span'); s.textContent = t; return s; }

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

  /* ---------- Cakes ---------- */
  function pts(poly) {
    return poly.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
  }

  var KIND_WORDS = {
    circle: 'round cake', strip: 'long cake', rect: 'cake', band: 'cake', hstrip: 'tall cake', grid: 'tray bake',
    square: 'square cake', squareX: 'square cake', rectX: 'cake', halfX: 'cake', diamond: 'diamond biscuit',
    hex: 'hexagon cake', pent: 'pentagon cake', tri: 'triangle cake', star: 'star biscuit', z: 'cake',
    stripU: 'cake', crossU: 'square cake', circleU: 'round cake', triU: 'triangle cake'
  };
  function cakeName(spec) {
    var k = /^([a-zA-Z]+?)(\d+)?(?:-\d+)?(\/|$)/.exec(spec);
    return KIND_WORDS[k ? k[1] : ''] || 'cake';
  }

  /** A drawn cake: svg string. opts.tap makes parts tappable (icing). */
  function cake(spec, opts) {
    opts = opts || {};
    var s = SHAPES.parse(spec);
    var n = s.parts.length;
    var label = 'A ' + cakeName(spec) + ' cut into ' + n + (s.equal ? ' equal' : '') + ' parts. ' +
      (opts.tap ? 'Tap a part to ice it.' : s.shaded + ' part' + (s.shaded === 1 ? ' is' : 's are') + ' iced.');
    var out = '<svg class="cake' + (opts.small ? ' small' : '') + '" viewBox="-2 -2 104 104" ' +
      (opts.tap ? 'role="group"' : 'role="img"') + ' aria-label="' + label + '">';
    s.parts.forEach(function (poly, i) {
      var on = !opts.tap && i < s.shaded;
      out += '<polygon class="part' + (on ? ' on' : '') + '" points="' + pts(poly) + '"' +
        (opts.tap ? ' role="button" tabindex="0" aria-pressed="false" aria-label="Part ' + (i + 1) + ' of ' + n + '" data-i="' + i + '"' : '') +
        '/>';
    });
    return out + '</svg>';
  }

  /** A fraction written the right way: numerator over a horizontal bar. */
  function frac(n, d) {
    return '<span class="fr" role="img" aria-label="' + n + ' out of ' + d + '"><span>' + n +
      '</span><span>' + d + '</span></span>';
  }

  /** A part-whole bar. top: "1 whole" or a number. labels: one per part, or null. */
  function bar(parts, top, labels) {
    var out = '<div class="pw" role="img" aria-label="A bar of ' + parts + ' equal parts. The whole is ' + top + '.">' +
      '<div class="pw-top">' + top + '</div><div class="pw-row">';
    for (var i = 0; i < parts; i++) {
      var l = labels ? labels[i] : '';
      out += '<div class="pw-part">' + (l === null || l === undefined ? '' : l) + '</div>';
    }
    return out + '</div></div>';
  }

  /** A set of counters or biscuits, some marked. */
  function set(total, marked, kind) {
    var out = '<div class="set ' + (kind || 'counters') + '" role="img" aria-label="' + total + ' ' +
      (kind === 'biscuits' ? 'biscuits. ' + marked + ' are iced.' : 'counters. ' + marked + ' are white.') + '">';
    for (var i = 0; i < total; i++) {
      out += '<span class="dot' + (i < marked ? ' mark' : '') + '"></span>';
    }
    return out + '</div>';
  }

  /* ---------- shade: ice the cake to show a fraction ---------- */
  function shade(host, cfg) {
    var target = parseFrac(cfg.target);
    var s = shell(host, cfg, 'shade');
    var tries = 0, solved = false;
    var stage = document.createElement('div');
    stage.className = 'shade-stage';
    // cfg.check(c) judges the count instead, for "ice it so the row is in order":
    // then cfg.target is only one right answer, kept for the scanner.
    stage.innerHTML = (cfg.check ? '' : '<div class="shade-goal">' + frac(target[0], target[1]) + '</div>') + cake(cfg.shape, { tap: true });
    s.box.insertBefore(stage, s.row);

    var parts = stage.querySelectorAll('.part');
    Array.prototype.forEach.call(parts, function (p) {
      function flip() {
        if (solved) return;
        var on = p.classList.toggle('on');
        p.setAttribute('aria-pressed', String(on));
      }
      p.addEventListener('click', flip);
      p.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
      });
    });

    var btn = checkButton();
    var clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'btn ghost';
    clear.textContent = 'Start again';
    s.row.appendChild(btn);
    s.row.appendChild(clear);
    speaker(s.row, cfg);

    function count() { return stage.querySelectorAll('.part.on').length; }
    // The same amount counts, however the cake is cut: 1/2 of eighths is 4.
    var whole = parts.length;
    var need = target[0] * whole / target[1];
    clear.addEventListener('click', function () {
      if (solved) return;
      Array.prototype.forEach.call(parts, function (p) { p.classList.remove('on'); p.setAttribute('aria-pressed', 'false'); });
    });
    btn.addEventListener('click', function () {
      if (solved) return;
      var c = count();
      if (!c) { s.fb.className = 'ask-fb'; s.fb.textContent = 'Tap the parts you want to ice, then press Check.'; return; }
      tries++;
      if (cfg.check ? cfg.check(c) : c === need) {
        solved = true;
        rightSay(s.fb, cfg, tries);
        s.box.classList.add('solved');
        btn.disabled = clear.disabled = true;
        record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
        if (cfg.onSolved) cfg.onSolved(c, tries);
      } else {
        s.fb.className = 'ask-fb bad';
        s.fb.textContent = tries >= 2
          ? (cfg.hint || 'The bottom number says how many equal parts the cake has. The top number says how many of them to ice. Count your iced parts.')
          : (c > need ? (cfg.over || 'Too many parts iced. Look at the top number again.')
                      : (cfg.under || 'Not enough parts iced yet. Look at the top number again.'));
        record({ task: cfg.task || cfg.prompt, result: 'iced ' + c });
      }
    });

    widgets.push({ el: s.box, solve: function () {
      clear.click();
      for (var i = 0; i < need; i++) parts[i].dispatchEvent(new Event('click'));
      btn.click();
    } });
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

  /* ---------- match: pairs that show the same fraction (PC Q5) ----------
     cfg.cards: [{spec, key}]. Two cards with the same key are a pair. The
     mark on the Progress Check needs every pair right, so it is solved only
     when all of them are. */
  function match(host, cfg) {
    var s = shell(host, cfg, 'match-ask');
    var misses = 0, solved = false, held = null, pairs = 0;
    var total = cfg.cards.length / 2;
    var grid = document.createElement('div');
    grid.className = 'picks match';
    s.box.insertBefore(grid, s.row);
    cfg.cards.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick';
      b.innerHTML = cake(c.spec, { small: true }) + '<span class="pairno" aria-hidden="true"></span>';
      b.setAttribute('aria-pressed', 'false');
      b.dataset.key = c.key;
      b.addEventListener('click', function () { tap(b); });
      grid.appendChild(b);
    });
    speaker(s.row, cfg);

    function tap(b) {
      if (solved || b.classList.contains('paired')) return;
      if (!held) { held = b; b.setAttribute('aria-pressed', 'true'); return; }
      if (held === b) { held = null; b.setAttribute('aria-pressed', 'false'); return; }
      var a = held; held = null;
      a.setAttribute('aria-pressed', 'false');
      if (a.dataset.key === b.dataset.key) {
        pairs++;
        [a, b].forEach(function (x) {
          x.classList.add('paired'); x.disabled = true;
          x.querySelector('.pairno').textContent = pairs;
        });
        s.fb.className = 'ask-fb good';
        s.fb.textContent = pairs < total ? 'A pair. ' + (total - pairs) + ' to go.' : '';
        if (pairs === total) {
          solved = true;
          s.box.classList.add('solved');
          rightSay(s.fb, cfg, misses + 1, 'All the pairs match. On the Progress Check that is the mark.');
          record({ task: cfg.task || cfg.prompt, result: 'correct in ' + (misses + 1) });
          if (cfg.onSolved) cfg.onSolved(pairs, misses + 1);
        }
      } else {
        misses++;
        [a, b].forEach(function (x) {
          x.classList.remove('shake'); void x.offsetWidth; x.classList.add('shake');
        });
        s.fb.className = 'ask-fb bad';
        s.fb.textContent = misses >= 2
          ? (cfg.hint || 'For each cake, count all the equal parts, then the iced ones. A pair has the same two numbers.')
          : 'Those two do not show the same fraction. Try again.';
        record({ task: cfg.task || cfg.prompt, result: 'missed a pair' });
      }
    }
    widgets.push({ el: s.box, solve: function () {
      var left = Array.prototype.filter.call(grid.children, function (x) { return !x.classList.contains('paired'); });
      left.forEach(function (x) {
        if (x.classList.contains('paired')) return;
        var mate = left.filter(function (y) { return y !== x && !y.classList.contains('paired') && y.dataset.key === x.dataset.key; })[0];
        tap(x); tap(mate);
      });
    } });
    return { el: s.box, isSolved: function () { return solved; } };
  }

  /* ---------- quarters: show 1/4 in four different ways (PC Q6) ----------
     cfg.options: shape specs, some right (four equal parts, one iced) and
     some not. The child fills four plates. All four must be quarters and
     all four different, because that is what earns the Progress Check mark. */
  function isQuarter(spec) {
    var s = SHAPES.parse(spec);
    return s.equal && s.parts.length === 4 && s.shaded === 1;
  }

  function quarters(host, cfg) {
    var s = shell(host, cfg, 'quarters-ask');
    var tries = 0, solved = false;
    var plates = document.createElement('div');
    plates.className = 'plates';
    var tray = document.createElement('div');
    tray.className = 'picks tray';
    s.box.insertBefore(plates, s.row);
    s.box.insertBefore(tray, s.row);

    var slots = [];
    for (var i = 0; i < 4; i++) {
      var p = document.createElement('button');
      p.type = 'button';
      p.className = 'plate';
      p.setAttribute('aria-label', 'Plate ' + (i + 1) + ', empty');
      p.innerHTML = '<span class="plate-n">' + (i + 1) + '</span>';
      plates.appendChild(p);
      slots.push({ el: p, opt: null });
    }
    var opts = cfg.options.map(function (spec, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick';
      b.innerHTML = cake(spec, { small: true });
      b.setAttribute('aria-label', 'Cake ' + (i + 1));
      tray.appendChild(b);
      return { el: b, spec: spec };
    });

    function place(o) {
      if (solved) return;
      var free = slots.filter(function (x) { return !x.opt; })[0];
      if (!free) { s.fb.className = 'ask-fb'; s.fb.textContent = 'All four plates are full. Tap a plate to take a cake back.'; return; }
      free.opt = o;
      free.el.innerHTML = o.el.innerHTML;
      free.el.setAttribute('aria-label', 'Plate ' + (slots.indexOf(free) + 1) + ', ' + o.el.getAttribute('aria-label'));
      o.el.disabled = true;
      free.el.classList.remove('wrong');
    }
    function empty(slot) {
      if (solved || !slot.opt) return;
      slot.opt.el.disabled = false;
      slot.opt = null;
      slot.el.classList.remove('wrong');
      slot.el.innerHTML = '<span class="plate-n">' + (slots.indexOf(slot) + 1) + '</span>';
      slot.el.setAttribute('aria-label', 'Plate ' + (slots.indexOf(slot) + 1) + ', empty');
    }
    opts.forEach(function (o) { o.el.addEventListener('click', function () { place(o); }); });
    slots.forEach(function (sl) { sl.el.addEventListener('click', function () { empty(sl); }); });

    var btn = checkButton();
    s.row.appendChild(btn);
    speaker(s.row, cfg);

    btn.addEventListener('click', function () {
      if (solved) return;
      var filled = slots.filter(function (x) { return x.opt; });
      if (filled.length < 4) { s.fb.className = 'ask-fb'; s.fb.textContent = 'Fill all four plates, then press Check.'; return; }
      tries++;
      var bad = filled.filter(function (x) { return !isQuarter(x.opt.spec); });
      if (!bad.length) {
        solved = true;
        rightSay(s.fb, cfg, tries, 'Four different quarters. On the Progress Check that is the mark.');
        s.box.classList.add('solved');
        btn.disabled = true;
        opts.forEach(function (o) { o.el.disabled = true; });
        slots.forEach(function (x) { x.el.disabled = true; });
        record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
        if (cfg.onSolved) cfg.onSolved(4, tries);
      } else {
        bad.forEach(function (x) { x.el.classList.add('wrong'); });
        s.fb.className = 'ask-fb bad';
        s.fb.textContent = (bad.length === 1 ? 'One plate does not' : bad.length + ' plates do not') +
          ' show one quarter. Tap it to take it back.' + (tries >= 2
          ? ' A quarter is 1 of 4 equal parts. Are all four parts the same size? Is only one part iced?' : '');
        record({ task: cfg.task || cfg.prompt, result: bad.length + ' not a quarter' });
      }
    });
    widgets.push({ el: s.box, solve: function () {
      slots.forEach(empty);
      opts.filter(function (o) { return isQuarter(o.spec); }).slice(0, 4).forEach(place);
      btn.click();
    } });
    return { el: s.box, isSolved: function () { return solved; } };
  }

  /* ---------- The fraction wall ----------
     rows: denominators, top to bottom, under one whole. mark: {d: k} ices the
     first k bricks of row d. Every row is the same width, so a child lines
     the bricks up by eye: that is the whole of Unit 17 lesson 1. */
  function wall(rows, mark) {
    mark = mark || {};
    var out = '<div class="wall" role="img" aria-label="A fraction wall: one whole, then ' +
      rows.map(function (d) { return d + ' ' + (d === 2 ? 'halves' : d === 4 ? 'quarters' : 'pieces of 1/' + d); }).join(', ') + '.">' +
      '<div class="wall-row"><div class="brick whole">1 whole</div></div>';
    rows.forEach(function (d) {
      out += '<div class="wall-row">';
      for (var i = 0; i < d; i++) {
        out += '<div class="brick' + (i < (mark[d] || 0) ? ' on' : '') + '">' + frac(1, d) + '</div>';
      }
      out += '</div>';
    });
    return out + '</div>';
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

  /* ---------- build: make the same amount out of smaller pieces ----------
     cfg.target "n/d" is iced on the top bar. Underneath is an empty bar the
     same length, and a tray of pieces (cfg.pieces: denominators). Drag a
     piece onto the bar, or tap it, and it lands at the next free place. Tap
     a piece on the bar to take it off. Right when the pieces fill exactly the
     iced length and are all one size, so 2/4 and 4/8 are both right answers
     to "build 1/2": the page never has to name either. */
  function build(host, cfg) {
    var target = parseFrac(cfg.target);
    var s = shell(host, cfg, 'build');
    var tries = 0, solved = false, placed = [];
    var stage = document.createElement('div');
    stage.className = 'build-stage';
    var top = '<div class="build-label">' + frac(target[0], target[1]) + '</div><div class="build-bar">';
    for (var i = 0; i < target[1]; i++) top += '<div class="brick' + (i < target[0] ? ' on' : '') + '"></div>';
    stage.innerHTML = top + '</div>';
    var track = document.createElement('div');
    track.className = 'build-bar track drop';
    track.setAttribute('aria-label', 'Your bar. Pieces go here.');
    stage.appendChild(track);
    var tray = document.createElement('div');
    tray.className = 'tray-pieces';
    tray.setAttribute('aria-label', 'Pieces to use');
    stage.appendChild(tray);
    s.box.insertBefore(stage, s.row);

    function used() { return placed.reduce(function (t, d) { return t + 1 / d; }, 0); }
    function add(d) {
      if (solved) return;
      if (used() + 1 / d > 1 + 1e-9) { s.fb.className = 'ask-fb'; s.fb.textContent = 'The bar is full. Tap a piece on it to take it off.'; return; }
      placed.push(d);
      paint(true);
    }
    function paint(added) {
      track.innerHTML = '';
      placed.forEach(function (d, k) {
        var b = document.createElement('button');
        b.type = 'button';
        /* Only the piece just dropped lands; the rest stay still. */
        b.className = 'piece placed' + (added && k === placed.length - 1 ? ' land' : '');
        b.style.width = (100 / d) + '%';
        b.innerHTML = frac(1, d);
        b.setAttribute('aria-label', 'One ' + (d === 2 ? 'half' : d === 4 ? 'quarter' : 'piece of 1/' + d) + ' on your bar. Tap to take it off.');
        b.addEventListener('click', function () {
          if (solved) return;
          placed.splice(k, 1);
          paint();
        });
        track.appendChild(b);
      });
    }
    cfg.pieces.forEach(function (d) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'piece source';
      b.style.width = 'calc(' + (100 / d) + '% - 2px)';
      b.style.minWidth = 'var(--tap)';
      b.innerHTML = frac(1, d);
      b.setAttribute('aria-label', 'A piece of 1/' + d + '. Drag it to your bar, or tap to add it.');
      draggable(b, function () { add(d); }, function () { add(d); }, s.box);
      tray.appendChild(b);
    });

    var btn = checkButton();
    var clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'btn ghost';
    clear.textContent = 'Start again';
    s.row.appendChild(btn);
    s.row.appendChild(clear);
    speaker(s.row, cfg);
    clear.addEventListener('click', function () { if (!solved) { placed = []; paint(); } });

    btn.addEventListener('click', function () {
      if (solved) return;
      if (!placed.length) { s.fb.className = 'ask-fb'; s.fb.textContent = 'Drag pieces onto your bar, then press Check.'; return; }
      tries++;
      var goal = target[0] / target[1], got = used();
      var oneSize = placed.every(function (d) { return d === placed[0]; });
      if (Math.abs(got - goal) < 1e-9 && oneSize) {
        solved = true;
        var n = placed.length, d = placed[0];
        rightSay(s.fb, cfg, tries, 'Yes. ' + n + ' pieces of 1/' + d + ' make the same amount, so ' +
          target[0] + '/' + target[1] + ' = ' + n + '/' + d + '.');
        s.box.classList.add('solved');
        btn.disabled = clear.disabled = true;
        Array.prototype.forEach.call(tray.children, function (b) { b.disabled = true; });
        record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
        if (cfg.onSolved) cfg.onSolved(n + '/' + d, tries);
      } else {
        s.fb.className = 'ask-fb bad';
        s.fb.textContent = !oneSize ? 'Use pieces that are all the same size, so you can count them.'
          : tries >= 2 && cfg.hint ? cfg.hint
          : got > goal ? 'Your bar is longer than the iced part. Take a piece off.'
          : 'Your bar is shorter than the iced part. Add another piece.';
        record({ task: cfg.task || cfg.prompt, result: 'built ' + placed.length + ' of 1/' + placed[0] });
      }
    });

    widgets.push({ el: s.box, solve: function () {
      clear.click();
      var d = cfg.pieces.filter(function (p) { return (target[0] * p) % target[1] === 0; })[0];
      for (var k = 0; k < target[0] * d / target[1]; k++) add(d);
      btn.click();
    } });
    return { el: s.box, isSolved: function () { return solved; } };
  }

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
      host.innerHTML = '<h3>My Baker’s Book</h3><div class="big">0</div>' +
        '<div>points so far. Answer some questions to fill your book.</div>';
      return;
    }
    var rows = purse.items.map(function (it) {
      return '<li>' + it.task + ': <b>' + it.earned + '</b>' +
        (it.tries === 1 ? ' (first try)' : ' (' + it.tries + ' tries)') + '</li>';
    }).join('');
    host.innerHTML = '<h3>My Baker’s Book</h3>' +
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

  window.Bakery = {
    init: init, icon: icon, record: record, live: live,
    ask: ask, askFrac: askFrac, choose: choose, shade: shade, picks: picks,
    match: match, quarters: quarters, isQuarter: isQuarter,
    wall: wall, build: build, place: place,
    cake: cake, frac: frac, bar: bar, set: set, parseFrac: parseFrac,
    chips: chips, myWork: function () { return { solved: purse.solved, points: purse.points, firstTry: purse.firstTry }; },
    renderMyWork: renderMyWork, award: award,
    readAloud: buildReadAloud, sayButton: readAloudButton
  };
})();
