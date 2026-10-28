/* ============================================================
   The Toy Box Workshop — shared behaviour (Maths Unit 21, 3D shapes)
   The Tile Courtyard's engine (Unit 20), itself the Bakery's, copied so the
   pathway stands alone, with the 2D pieces taken out (tiles, angles, clocks,
   the mirror pool) and the 3D ones added: shapes drawn by solids.js, and a
   "Turn it" view so a child can see the faces at the back before counting.
   Rules: design-system/mns-classroom/pages/toy-box-workshop.md

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
    // a toy box with its lid open
    '<symbol id="i-box" viewBox="0 0 24 24"><path d="M3 10h18v10H3z"/><path d="M3 10 6 4h12l3 6"/><path d="M10 14h4"/></symbol>',
    // a cube
    '<symbol id="i-cube" viewBox="0 0 24 24"><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9Z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/></symbol>',
    // a pyramid
    '<symbol id="i-pyramid" viewBox="0 0 24 24"><path d="M12 3 3 19l9 2 9-2Z"/><path d="M12 3v18"/></symbol>',
    // the workshop door
    '<symbol id="i-door" viewBox="0 0 24 24"><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17"/><path d="M3 21h18M15 12h.01"/></symbol>',
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
    if (document.getElementById('workshop-sprite')) return;
    var d = document.createElement('div');
    d.id = 'workshop-sprite';
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

  /* ---------- Toy Book: points to show the teacher ----------
     Earned for solving, never lost for trying. Hints are free. Anonymous
     integers in sessionStorage only; nothing leaves the device. */
  var POINTS_SOLVED = 10;
  var POINTS_FIRST_TRY = 5;

  var lessonId = (document.body.getAttribute('data-lesson') || 'workshop');
  var storeKey = 'workshop-book-' + lessonId;
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
     sorting) list themselves here with a
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


  /* ---------- 3D shapes ----------
     solid(name, opts) is the SVG from solids.js: every shape fitted to the same
     120-unit box, so a child compares shapes, not sizes. Every shape is the same
     colour unless opts.plain is false: on the deck prisms are blue and pyramids
     orange, and here that colour would answer the question for them. */
  function solid(name, opts) {
    opts = opts || {};
    if (opts.plain === undefined) opts.plain = true;
    return window.Solids.svg(name, opts);
  }

  /* ---------- turn: the same shape from four sides ----------
     A drawing hides the faces at the back. "Turn it" spins the shape a
     quarter of the way round each press, so a child can count what was
     hidden. Purely a view: nothing is scored here. */
  var TURNS = [-32, 28, 88, 148];
  function turn(host, name, opts) {
    opts = opts || {};
    var fig = document.createElement('figure');
    fig.className = 'turn';
    var view = document.createElement('div');
    view.className = 'turn-view';
    var k = 0;
    function draw() { view.innerHTML = solid(name, { yaw: TURNS[k], plain: opts.plain, label: opts.label || 'a 3D shape, view ' + (k + 1) + ' of 4' }); }
    draw();
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ghost turn-btn';
    b.innerHTML = icon('swap') + '<span>Turn it</span>';
    b.addEventListener('click', function () {
      k = (k + 1) % TURNS.length;
      draw();
      bump(view, 'spin');
      live('Turned. View ' + (k + 1) + ' of 4.');
    });
    fig.appendChild(view);
    fig.appendChild(b);
    host.appendChild(fig);
    return fig;
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
      host.innerHTML = '<h3>My Toy Book</h3><div class="big">0</div>' +
        '<div>points so far. Answer some questions to fill your book.</div>';
      return;
    }
    var rows = purse.items.map(function (it) {
      return '<li>' + it.task + ': <b>' + it.earned + '</b>' +
        (it.tries === 1 ? ' (first try)' : ' (' + it.tries + ' tries)') + '</li>';
    }).join('');
    host.innerHTML = '<h3>My Toy Book</h3>' +
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

  window.Workshop = {
    init: init, icon: icon, record: record, live: live,
    ask: ask, choose: choose, picks: picks, place: place,
    solid: solid, turn: turn,
    chips: chips, myWork: function () { return { solved: purse.solved, points: purse.points, firstTry: purse.firstTry }; },
    renderMyWork: renderMyWork, award: award,
    readAloud: buildReadAloud, sayButton: readAloudButton,
    // A question behind a chooser chip sits in a hidden box; the browser scan shows it before answering.
    reveal: function (el) { for (var n = el; n; n = n.parentElement) if (n.hidden) n.hidden = false; }
  };
})();
