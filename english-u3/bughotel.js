/* ============================================================
   The Bug Hotel — shared behaviour (English Unit 3, Bugs!)
   Copied from The Telegraph Office (Unit 2). Same scoring, same rules.
   Rules: design-system/mns-classroom/pages/bug-hotel.md

   NO network. NO localStorage, NO cookies, nothing transmitted, ever.
   The only storage is sessionStorage holding an anonymous points tally, so a
   refresh does not wipe a lesson's work; it dies when the tab closes.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Inline SVG sprite (no emoji as icons) ---------- */
  var SPRITE = [
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">',
    // the hotel: a pitched roof over a frame of rooms
    '<symbol id="i-hotel" viewBox="0 0 24 24"><path d="M2.5 10.5 12 3l9.5 7.5"/><path d="M5 9v12h14V9"/><path d="M5 15h14M12 9v12"/></symbol>',
    // the five bugs, one per room
    '<symbol id="i-bee" viewBox="0 0 24 24"><ellipse cx="12" cy="14.5" rx="4.5" ry="6"/><path d="M7.7 12.5h8.6M7.7 16.5h8.6"/><ellipse cx="8" cy="6.5" rx="3.2" ry="2.3"/><ellipse cx="16" cy="6.5" rx="3.2" ry="2.3"/></symbol>',
    '<symbol id="i-beetle" viewBox="0 0 24 24"><ellipse cx="12" cy="14" rx="5" ry="7"/><path d="M12 9v12M7.2 10h9.6"/><circle cx="12" cy="5" r="2"/><path d="M7 12.5 3 10.5M7 16.5l-4 1M17 12.5l4-2M17 16.5l4 1"/></symbol>',
    '<symbol id="i-ladybird" viewBox="0 0 24 24"><circle cx="12" cy="14" r="7"/><path d="M12 7v14M9 7.6a3 3 0 0 1 6 0M10 5 8.5 2.5M14 5l1.5-2.5"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></symbol>',
    '<symbol id="i-spider" viewBox="0 0 24 24"><circle cx="12" cy="14" r="3.6"/><circle cx="12" cy="8.6" r="1.8"/><path d="M9 12 5.5 7.5M8.5 13.5 3 12M8.5 15 3 17M9.2 16.5 6 21M15 12l3.5-4.5M15.5 13.5 21 12M15.5 15l5.5 2M14.8 16.5 18 21"/></symbol>',
    '<symbol id="i-ant" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2.3"/><circle cx="10.5" cy="12" r="1.8"/><ellipse cx="17" cy="12" rx="3.8" ry="3"/><path d="M9.6 10.6 8 7M10.5 10.2V6.5M11.4 10.6 13 7M9.6 13.4 8 17M10.5 13.8v3.7M11.4 13.4 13 17M4 10 2.8 7M5.8 9.9 7 7.2"/></symbol>',
    // book / reading
    '<symbol id="i-book" viewBox="0 0 24 24"><path d="M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v14h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4V4Z"/><path d="M12 5v14"/></symbol>',
    '<symbol id="i-swap" viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></symbol>',
    '<symbol id="i-star" viewBox="0 0 24 24"><path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.4l6-.8L12 3Z"/></symbol>',
    '<symbol id="i-pen" viewBox="0 0 24 24"><path d="M14 4l6 6-9.5 9.5-6.5 2 2-6.5L14 4Z"/><path d="M12 6l6 6"/></symbol>',
    '<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></symbol>',
    '<symbol id="i-puzzle" viewBox="0 0 24 24"><path d="M10 3a2 2 0 1 1 4 0v2h3a1 1 0 0 1 1 1v3h2a2 2 0 1 1 0 4h-2v3a1 1 0 0 1-1 1h-3v-2a2 2 0 1 0-4 0v2H7a1 1 0 0 1-1-1v-3H4a2 2 0 1 1 0-4h2V6a1 1 0 0 1 1-1h3V3Z"/></symbol>',
    '<symbol id="i-talk" viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-5.5A8 8 0 0 1 13 4a8 8 0 0 1 8 8Z"/><path d="M9 11h8M9 15h5"/></symbol>',
    '<symbol id="i-leaf" viewBox="0 0 24 24"><path d="M5 19C5 10 11 5 20 4c-1 9-6 15-15 15Z"/><path d="M5 19 13 11"/></symbol>',
    '<symbol id="i-say" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M17 9a4 4 0 0 1 0 6"/></symbol>',
    '<symbol id="i-medal" viewBox="0 0 24 24"><circle cx="12" cy="15" r="6"/><path d="m8 3 2 6M16 3l-2 6M9 3h6"/></symbol>',
    '<symbol id="i-clipboard" viewBox="0 0 24 24"><path d="M9 4h6v3H9zM7 5H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="M8 12h8M8 16h5"/></symbol>',
    '<symbol id="i-board" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M12 16v4M8 20h8"/></symbol>',
    '</svg>'
  ].join('');

  function injectSprite() {
    if (document.getElementById('hotel-sprite')) return;
    var d = document.createElement('div');
    d.id = 'hotel-sprite';
    d.innerHTML = SPRITE;
    document.body.insertBefore(d, document.body.firstChild);
  }

  function icon(name, extraClass) {
    return '<svg class="icon' + (extraClass ? ' ' + extraClass : '') +
      '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  }

  /* ---------- Recorded voices (switched off for now) ----------
     Project rule: all audio is ElevenLabs, Alice for instructions and
     vocabulary, Daniel for texts and characters, speed 0.9 for EAL. The
     device speech engine is never used.

     Same pattern as The Bakery: each line's file is a hash of voice and
     words, every line a speaker can play is listed in window.__spoken,
     scan_interactives.js checks the files exist and make_bakery_audio.py
     records the missing ones. Nothing is fetched from anywhere but this
     folder.

     ponytail: AUDIO is off until the teacher records Unit 3. While it is off
     no speaker is drawn and nothing is listed, so there is no silent button
     and no missing-clip warning. The words to record are already on the
     pages (data-read, data-voice, key words). To switch on: AUDIO = true
     (and PROMPT_AUDIO = true for the question prompts), then follow the
     steps in this pathway's README. */
  var AUDIO = false;
  var PROMPT_AUDIO = false;

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
      var live = document.getElementById('live');
      if (live) live.textContent = 'The recording for this line is missing. Ask your teacher.';
    });
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
  }

  /** A "read this to me" button, or null while audio is off. */
  function readAloudButton(text, voice) {
    if (!AUDIO) return null;
    var file = clip(text, voice);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'say' + (voice === 'daniel' ? ' daniel' : '');
    b.innerHTML = icon('say');
    b.setAttribute('aria-label', 'Read this to me');
    b.addEventListener('click', function () { play(file); });
    return b;
  }
  function promptButton(text) { return PROMPT_AUDIO ? readAloudButton(text) : null; }

  /* ---------- Bug points: to show the teacher ----------
     Earned for solving, never lost for trying. Hints are free.
     sessionStorage, NOT localStorage: a refresh must not wipe a lesson's
     work, but it all disappears when the tab closes. Anonymous integers and
     task labels only. */
  var POINTS_SOLVED = 10;
  var POINTS_FIRST_TRY = 5;

  var lessonId = (document.body.getAttribute('data-lesson') || 'hotel');
  var storeKey = 'bughotel-log-' + lessonId;

  var tally = { points: 0, solved: 0, firstTry: 0, items: [] };

  function loadLog() {
    try {
      var raw = window.sessionStorage.getItem(storeKey);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p.points === 'number') tally = p;
      }
    } catch (e) { /* private mode or storage disabled: carry on in memory */ }
  }
  function saveLog() {
    try { window.sessionStorage.setItem(storeKey, JSON.stringify(tally)); }
    catch (e) { /* points still work for this page view */ }
  }

  /** A short code the teacher can eyeball, derived from the real tally. */
  function checkCode() {
    var seed = tally.points * 31 + tally.solved * 7 + tally.firstTry * 3 + lessonId.length;
    var letters = 'BCDFGHJKLMNPQRSTVWXZ';
    return letters[seed % 20] + letters[(seed >> 4) % 20] +
           String((seed % 97) + 10).padStart(2, '0');
  }

  /** tries 0 with fixed points: a memory pair, scored per pair found. */
  function award(task, tries, fixed) {
    var earned = fixed || (POINTS_SOLVED + (tries === 1 ? POINTS_FIRST_TRY : 0));
    tally.points += earned;
    tally.solved += 1;
    if (tries === 1) tally.firstTry += 1;
    tally.items.push({ task: task, tries: tries, earned: earned });
    saveLog();
    paintLog(earned);
    return earned;
  }

  function paintLog(justEarned) {
    var el = document.getElementById('logCount');
    if (!el) return;
    el.textContent = tally.points;
    var badge = document.getElementById('logBadge');
    if (badge && justEarned) {
      badge.classList.remove('pop');
      void badge.offsetWidth;              // restart the animation
      badge.classList.add('pop');
      badge.setAttribute('aria-label', tally.points + ' points. You just earned ' + justEarned + '.');
      var live = document.getElementById('live');
      if (live) live.textContent = 'You earned ' + justEarned + ' points. Total ' + tally.points + '.';
    }
  }

  function resetLog() {
    tally = { points: 0, solved: 0, firstTry: 0, items: [] };
    saveLog();
    paintLog(0);
    renderMyWork();
  }

  /* ---------- Session log: in memory only, dies on reload ---------- */
  var log = [];

  /** Anything that reports "correct in N" earns points, once. */
  function record(entry) {
    log.push(entry);
    var m = /^correct in (\d+)/.exec(entry.result || '');
    if (m) award(entry.task, parseInt(m[1], 10));
  }

  /** Marking a typed word must not turn into a spelling test by accident
      where spelling is not the point: case, spaces, quotes and end
      punctuation are ignored. */
  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[‘’“”]/g, "'")
      .replace(/[.,!?;:'"]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ---------- Ask: the child types a word ----------
     A wrong answer gets a nudge, then after two tries a hint that teaches
     the method. Never the answer itself (check-bughotel.js enforces it). */
  var askCount = 0;

  function ask(host, cfg) {
    cfg.type = 'text';
    var id = 'ask' + (++askCount);
    var tries = 0, solved = false;

    var box = document.createElement('div');
    box.className = 'ask';

    var q = document.createElement('label');
    q.className = 'ask-q';
    q.setAttribute('for', id);
    q.textContent = cfg.prompt;
    box.appendChild(q);

    var row = document.createElement('div');
    row.className = 'ask-row';

    var inp = document.createElement('input');
    inp.type = 'text';
    inp.autocapitalize = 'none';
    inp.setAttribute('autocomplete', 'off');
    inp.setAttribute('spellcheck', 'false');
    inp.id = id;
    inp.placeholder = '?';
    inp.setAttribute('aria-describedby', id + '-fb');
    row.appendChild(inp);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn timber';
    btn.textContent = 'Check';
    row.appendChild(btn);

    var say = promptButton(cfg.prompt);
    if (say) row.appendChild(say);

    box.appendChild(row);

    var fb = document.createElement('p');
    fb.className = 'ask-fb';
    fb.id = id + '-fb';
    fb.setAttribute('role', 'status');
    box.appendChild(fb);

    function accept(v) {
      if (typeof cfg.accept === 'function') return cfg.accept(v);
      return cfg.answers.some(function (a) { return norm(a) === norm(v); });
    }

    function submit() {
      if (solved) return;
      var v = inp.value;
      if (!norm(v)) {
        fb.className = 'ask-fb';
        fb.textContent = 'Write your answer first, then press Check.';
        return;
      }
      tries++;
      if (accept(v)) {
        solved = true;
        fb.className = 'ask-fb good';
        fb.textContent = (cfg.praise || 'Correct.') +
          (tries === 1 ? ' First try.' : ' You got there in ' + tries + '.');
        inp.disabled = true;
        btn.disabled = true;
        box.classList.add('solved');
        record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
      } else {
        fb.className = 'ask-fb bad';
        var nudge = cfg.nudge || 'Not quite. Have another look.';
        fb.textContent = (tries >= 2 && cfg.hint) ? cfg.hint : nudge;
        record({ task: cfg.task || cfg.prompt, result: 'tried ' + v });
      }
    }

    btn.addEventListener('click', submit);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });

    host.appendChild(box);
    return { el: box, isSolved: function () { return solved; } };
  }

  /* ---------- Choice question ----------
     Every option carries its own why. A wrong why explains that option; it
     never names the right one. Awards once, however often it is tapped. */
  function choose(host, cfg) {
    var tries = 0, solved = false;

    var box = document.createElement('div');
    box.className = 'ask';

    var q = document.createElement('p');
    q.className = 'ask-q';
    q.textContent = cfg.prompt;
    var say = promptButton(cfg.prompt);
    if (say) q.appendChild(say);
    box.appendChild(q);

    var wrap = document.createElement('div');
    wrap.className = 'choices';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', cfg.prompt);
    box.appendChild(wrap);

    var fb = document.createElement('p');
    fb.className = 'ask-fb';
    fb.setAttribute('role', 'status');

    cfg.options.forEach(function (opt, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';   // the scan's choice pass owns these
      b.textContent = opt.text;
      b.addEventListener('click', function () {
        if (solved || b.dataset.state) return;
        tries++;
        if (i === cfg.answer) {
          solved = true;
          b.dataset.state = 'right';
          box.classList.add('solved');
          fb.className = 'ask-fb good';
          fb.textContent = opt.why + (tries === 1 ? ' First try.' : ' You got there in ' + tries + '.');
          record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
        } else {
          b.dataset.state = 'wrong';
          fb.className = 'ask-fb bad';
          fb.textContent = opt.why;
          record({ task: cfg.task || cfg.prompt, result: 'tried ' + opt.text });
        }
      });
      wrap.appendChild(b);
    });

    box.appendChild(fb);
    host.appendChild(box);
    return { el: box, isSolved: function () { return solved; } };
  }

  /* ---------- Ordering ----------
     Tap one card, then another, and they swap. Never drag and drop:
     dragging on an iPad fails often enough at this age to become the
     activity, and it is unusable from a keyboard. */
  function order(host, cfg) {
    var items = cfg.items.slice();
    var picked = -1, tries = 0, solved = false;

    var box = document.createElement('div');
    box.className = 'ask';

    var q = document.createElement('p');
    q.className = 'ask-q';
    q.textContent = cfg.prompt;
    var say = promptButton(cfg.prompt);
    if (say) q.appendChild(say);
    box.appendChild(q);

    var list = document.createElement('div');
    list.className = 'order';
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', cfg.prompt);
    box.appendChild(list);

    var fb = document.createElement('p');
    fb.className = 'ask-fb';
    fb.setAttribute('role', 'status');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn timber';
    btn.textContent = 'Check the order';

    function paint() {
      list.innerHTML = '';
      items.forEach(function (it, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.appendChild(document.createTextNode(it.text));
        b.setAttribute('aria-pressed', String(picked === i));
        b.setAttribute('aria-label', 'Position ' + (i + 1) + ': ' + it.text +
          '. Tap to pick it up, then tap another card to swap.');
        if (solved) b.dataset.state = 'right';
        b.addEventListener('click', function () {
          if (solved) return;
          if (picked === -1) { picked = i; }
          else if (picked === i) { picked = -1; }
          else {
            var t = items[picked]; items[picked] = items[i]; items[i] = t;
            picked = -1;
          }
          paint();
        });
        list.appendChild(b);
      });
    }

    btn.addEventListener('click', function () {
      if (solved) return;
      tries++;
      var wrong = items.filter(function (it, i) { return it.pos !== i + 1; });
      if (!wrong.length) {
        solved = true;
        box.classList.add('solved');
        fb.className = 'ask-fb good';
        fb.textContent = (cfg.praise || 'That is the right order.') +
          (tries === 1 ? ' First try.' : ' You got there in ' + tries + '.');
        btn.disabled = true;
        record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
        paint();
      } else {
        fb.className = 'ask-fb bad';
        var count = wrong.length + ' card' + (wrong.length === 1 ? ' is' : 's are') + ' in the wrong place. ';
        fb.textContent = count + ((tries >= 2 && cfg.hint) ? cfg.hint : (cfg.nudge || ''));
        record({ task: cfg.task || cfg.prompt, result: wrong.length + ' out of place' });
      }
    });

    paint();
    box.appendChild(btn);
    box.appendChild(fb);
    host.appendChild(box);
    return { el: box, isSolved: function () { return solved; } };
  }

  /* ============================================================
     Hands-on activities (added October 2026, the teacher's request):
     memory, sort into baskets, labels on a page, join the pieces,
     the highlighter. Same rules as ask(): a wrong move costs nothing,
     the second wrong try on the same thing brings a hint that teaches
     the method, and nothing ever shows the answer.

     Drag is pointer events with the pointer captured on press (the Wild
     Lab pattern, lab.js). A tap picks a card and a tap on a place puts it
     there, so a child who can't drag, or uses a keyboard, can still play.

     Every activity lists itself in window.__widgets with solve(), which
     uses the activity's own tap path, and wrong(), which makes two wrong
     moves and returns the feedback. scan_interactives.js drives both.
     ============================================================ */
  var widgets = window.__widgets = [];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (tag === 'button') n.type = 'button';
    return n;
  }
  /* Box, question and feedback line, the same shape as ask() and choose(). */
  function shell(host, cfg, cls) {
    var box = el('div', 'ask act ' + cls);
    var q = el('p', 'ask-q', cfg.prompt);
    var say = promptButton(cfg.prompt);
    if (say) q.appendChild(say);
    box.appendChild(q);
    var fb = el('p', 'ask-fb');
    fb.setAttribute('role', 'status');
    host.appendChild(box);
    return { box: box, fb: fb, finish: function () { box.appendChild(fb); } };
  }
  function tell(fb, kind, text) { fb.className = 'ask-fb' + (kind ? ' ' + kind : ''); fb.textContent = text; }
  /* Restart a one-shot animation on a node. */
  function replay(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }
  /* First wrong try: the nudge. Second and later: the hint (method only). */
  function wrongWords(cfg, src, tries) {
    return tries >= 2 ? (src.hint || cfg.hint) : (src.nudge || cfg.nudge);
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function solvedOnce(task, tries) { record({ task: task, result: 'correct in ' + tries }); }

  /* ---------- Memory: face-down pairs ----------
     Flip two. A pair stays up and earns points; anything else turns back.
     Points are per pair found, never per attempt, and there is no timer. */
  function memory(host, cfg) {
    var s = shell(host, cfg, 'memory');
    var grid = el('div', 'mem-grid');
    s.box.appendChild(grid);
    var cards = [];
    cfg.pairs.forEach(function (p, i) { p.forEach(function (w) { cards.push({ text: w, pair: i }); }); });
    shuffle(cards);
    var up = [], found = 0, misses = 0, timer = null;

    cards.forEach(function (c, k) {
      var b = el('button', 'mem choice');
      b.dataset.state = 'down';
      var inner = el('span', 'mem-inner');
      var back = el('span', 'mem-back'); back.innerHTML = icon(cfg.back || 'leaf');
      var face = el('span', 'mem-face', c.text);
      inner.appendChild(back); inner.appendChild(face); b.appendChild(inner);
      c.b = b; c.n = k + 1;
      show(c, 'down');
      b.addEventListener('click', function () { flip(c); });
      grid.appendChild(b);
    });

    function show(c, state) {
      c.b.dataset.state = state;
      c.b.setAttribute('aria-label', state === 'down' ? 'Card ' + c.n + ', face down' :
        'Card ' + c.n + ': ' + c.text + (state === 'matched' ? ', matched' : ''));
    }
    function settle() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (up.length === 2) { up.forEach(function (c) { show(c, 'down'); }); up = []; }
    }
    function flip(c) {
      if (c.matched || up.indexOf(c) !== -1 || found === cfg.pairs.length) return;
      settle();
      show(c, 'up'); up.push(c);
      if (up.length < 2) { tell(s.fb, '', 'Now find its partner.'); return; }
      var a = up[0], b = up[1];
      if (a.pair === b.pair) {
        a.matched = b.matched = true; show(a, 'matched'); show(b, 'matched');
        replay(a.b, 'land'); replay(b.b, 'land');
        up = []; found++;
        log.push({ task: cfg.task + ': ' + a.text + ' + ' + b.text, result: 'pair found' });
        award(cfg.task + ': ' + a.text + ' + ' + b.text, 0, POINTS_SOLVED);
        if (found === cfg.pairs.length) {
          s.box.classList.add('solved');
          tell(s.fb, 'good', cfg.done || 'All the pairs are found.');
        } else {
          tell(s.fb, 'good', (cfg.praise || 'A pair!') + ' ' + a.text + ' and ' + b.text + '.');
        }
      } else {
        misses++;
        tell(s.fb, 'bad', wrongWords(cfg, cfg, misses));
        timer = setTimeout(settle, 1100);
      }
    }
    s.finish();
    widgets.push({ el: s.box, kind: 'memory',
      solve: function () {
        settle();
        cfg.pairs.forEach(function (_, i) {
          var two = cards.filter(function (c) { return c.pair === i && !c.matched; });
          if (two.length === 2) { flip(two[0]); flip(two[1]); }
        });
      },
      wrong: function () {
        var out = [];
        for (var t = 0; t < 2; t++) {
          settle();
          var open = cards.filter(function (c) { return !c.matched; });
          var a = open[0], b = open.filter(function (c) { return c.pair !== a.pair; })[0];
          if (!a || !b) break;
          flip(a); flip(b); out.push(s.fb.textContent);
        }
        settle();
        return out;
      } });
  }

  /* ---------- Placing: one engine, five layouts ----------
     baskets  sort cards into labelled baskets
     picture  labels onto the parts of a drawn page
     inline   an end mark onto the gap at the end of a sentence
     join     a piece onto the piece it joins (compound logs, suffix machine)
     roof     report parts onto roof tiles, top to bottom

     A card fits a place when card.value === place.accept and the place has
     room (max). cfg.reuse keeps cards in the tray after use (suffixes);
     then hints live on the place, because the place is what is being solved. */
  function placer(host, cfg, layout) {
    var s = shell(host, cfg, 'place place-' + layout);
    var board = el('div', 'board');
    var pool = el('div', 'pool');
    pool.setAttribute('aria-label', 'Cards to place');
    var selected = null;
    var places = cfg.targets.map(function (t) {
      var P = { t: t, count: 0, tries: 0 };
      var b = el('button', 'drop choice');
      b._place = P;
      if (layout === 'picture' && t.html) { var art = el('span', 'drop-art'); art.innerHTML = t.html; b.appendChild(art); }
      b.appendChild(el('span', 'drop-label', t.label));
      P.list = el('span', 'drop-items');
      b.appendChild(P.list);
      b.setAttribute('aria-label', t.aria || t.label);
      b.addEventListener('click', function () {
        if (selected) put(selected, P);
        else tell(s.fb, '', 'First choose a card. Then tap where it goes.');
      });
      P.b = b;
      if (layout === 'inline') {
        var row = el('div', 'inline-row');
        row.appendChild(el('span', 'inline-text', t.before));
        row.appendChild(b);
        board.appendChild(row);
      } else board.appendChild(b);
      return P;
    });
    var items = cfg.items.map(function (it, k) {
      var I = { it: it, tries: 0, done: false };
      var c = el('button', 'card choice', it.text);
      c.setAttribute('aria-pressed', 'false');
      I.c = c; I.k = k;
      pool.appendChild(c);
      grab(c, I);
      return I;
    });
    if (!cfg.keepOrder) shuffle(items).forEach(function (I) { pool.appendChild(I.c); });
    // Cards above the places: a drag can't scroll the page, so the places
    // a card goes to must be below it and within reach.
    s.box.appendChild(pool); s.box.appendChild(board);
    s.finish();

    function pick(I) {
      selected = I;
      items.forEach(function (o) { o.c.setAttribute('aria-pressed', String(o === I)); });
    }
    function isDone() {
      return cfg.reuse ? places.every(function (P) { return P.count >= (P.t.max || 1); })
                       : items.every(function (I) { return I.done; });
    }
    function put(I, P) {
      if (I.done || s.box.classList.contains('solved')) return;
      var full = P.t.max && P.count >= P.t.max;
      if (P.t.accept === I.it.value && !full) {
        var src = cfg.reuse ? P : I;
        P.count++;
        var shown = cfg.result ? cfg.result(P.t, I.it) : I.it.text;
        var chip = el('span', 'placed', shown);
        if (layout === 'baskets') P.list.appendChild(chip);
        else { P.list.textContent = ''; P.list.appendChild(chip); P.b.classList.add('full'); }
        replay(chip, 'land');
        if (!cfg.reuse) { I.done = true; I.c.remove(); }
        selected = null;
        items.forEach(function (o) { o.c.setAttribute('aria-pressed', 'false'); });
        solvedOnce(cfg.task + ': ' + (cfg.reuse ? P.t.label + ' + ' : '') + I.it.text, src.tries + 1);
        if (isDone()) {
          s.box.classList.add('solved');
          pool.remove();
          tell(s.fb, 'good', (P.t.why || I.it.why ? (P.t.why || I.it.why) + ' ' : '') + (cfg.done || 'All done.'));
        } else tell(s.fb, 'good', P.t.why || I.it.why || cfg.praise || 'Yes, that fits.');
      } else {
        var who = cfg.reuse ? P : I;
        who.tries++;
        replay(I.c, 'shake');
        tell(s.fb, 'bad', (full ? 'That place is full. ' : 'Not there. ') + wrongWords(cfg, cfg.reuse ? P.t : I.it, who.tries));
      }
    }

    /* Pointer drag. A press that barely moves is a tap: the click picks. */
    function grab(card, I) {
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
        if (drop && !s.box.contains(drop)) drop = null;
        if (over !== drop) {
          if (over) over.classList.remove('hover');
          if (drop) drop.classList.add('hover');
          over = drop;
        }
      }
      card.addEventListener('pointerdown', function (e) {
        if (I.done || e.button > 0) return;
        start = { x: e.clientX, y: e.clientY, id: e.pointerId };
        dragged = false;
        // Capture on press: a quick finger can leave the card before the
        // first move, and the drag would be lost (Wild Lab, lab.js).
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
          ghost.removeAttribute('aria-pressed');
          document.body.appendChild(ghost);
          card.classList.add('lifted');
          dragged = true;
          pick(I);
          loop = requestAnimationFrame(edgeScroll);
        }
        last = { x: e.clientX, y: e.clientY };
        ghost.style.transform = 'translate(' + (e.clientX - ghost.offsetWidth / 2) + 'px,' +
          (e.clientY - ghost.offsetHeight / 2) + 'px) rotate(-3deg)';
        hover(e.clientX, e.clientY);
      });
      function end(cancelled) {
        if (!start) return;
        start = null;
        if (loop) { cancelAnimationFrame(loop); loop = 0; }
        last = null;
        if (!ghost) return;
        ghost.remove(); ghost = null;
        card.classList.remove('lifted');
        if (over) {
          over.classList.remove('hover');
          if (!cancelled) put(I, over._place);
          over = null;
        } else replay(card, 'shake');
      }
      card.addEventListener('pointerup', function () { end(false); });
      card.addEventListener('pointercancel', function () { end(true); });
      card.addEventListener('click', function () {
        if (dragged) { dragged = false; return; }
        if (I.done) return;
        pick(I);
        tell(s.fb, '', 'Now tap where "' + I.it.text + '" goes.');
      });
    }

    widgets.push({ el: s.box, kind: layout,
      solve: function () {
        places.forEach(function (P) {
          while (!s.box.classList.contains('solved') && P.count < (P.t.max || Infinity)) {
            var I = items.filter(function (o) { return !o.done && o.it.value === P.t.accept; })[0];
            if (!I) break;
            I.c.click(); P.b.click();
          }
        });
      },
      wrong: function () {
        var out = [];
        var I = items.filter(function (o) { return !o.done; })[0];
        if (!I) return out;
        var P = places.filter(function (p) { return p.t.accept !== I.it.value; })[0];
        if (!P) return out;
        for (var t = 0; t < 2; t++) { I.c.click(); P.b.click(); out.push(s.fb.textContent); }
        return out;
      } });
  }
  function sortInto(host, cfg) { placer(host, cfg, 'baskets'); }
  function label(host, cfg) { placer(host, cfg, cfg.inline ? 'inline' : 'picture'); }
  function join(host, cfg) { placer(host, cfg, cfg.roof ? 'roof' : 'join'); }

  /* ---------- Highlighter ----------
     Pick a pen, tap the words. "[ant:noun]" in a sentence is a word with a
     key; plain words are tappable too, so the child has to decide. */
  function highlight(host, cfg) {
    var s = shell(host, cfg, 'highlight');
    var pens = cfg.pens;
    var pen = pens[0].id;
    if (pens.length > 1) {
      var pr = el('div', 'pens');
      pr.setAttribute('role', 'group');
      pr.setAttribute('aria-label', 'Choose a highlighter');
      pens.forEach(function (p) {
        var b = el('button', 'pen choice hl-' + p.id, p.label);
        b.setAttribute('aria-pressed', String(p.id === pen));
        b.addEventListener('click', function () {
          pen = p.id;
          pr.querySelectorAll('button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        });
        p.b = b;
        pr.appendChild(b);
      });
      s.box.appendChild(pr);
    }
    var words = [];
    cfg.sentences.forEach(function (line) {
      var row = el('p', 'hl-line');
      var re = /\[([^\]:]+):(\w+)\]|([A-Za-z’']+)|([^A-Za-z’'\[\s]+)|(\s+)/g, m;
      while ((m = re.exec(line))) {
        if (m[1] || m[3]) {
          var W = { text: m[1] || m[3], cat: m[2] || null, tries: 0, done: false };
          var b = el('button', 'word choice', W.text);
          b.addEventListener('click', function (W) { return function () { tap(W); }; }(W));
          W.b = b; words.push(W); row.appendChild(b);
        } else row.appendChild(document.createTextNode(m[4] || ' '));
      }
      s.box.appendChild(row);
    });
    s.finish();
    var keyed = words.filter(function (W) { return W.cat; });

    function tap(W) {
      if (W.done || s.box.classList.contains('solved')) return;
      if (W.cat === pen) {
        W.done = true;
        W.b.classList.add('hl-' + pen);
        W.b.setAttribute('aria-label', W.text + ', ' + pens.filter(function (p) { return p.id === pen; })[0].label);
        solvedOnce(cfg.task + ': ' + W.text, W.tries + 1);
        if (keyed.every(function (k) { return k.done; })) {
          s.box.classList.add('solved');
          tell(s.fb, 'good', cfg.done || 'All found.');
          if (cfg.onSolved) cfg.onSolved();
        } else tell(s.fb, 'good', cfg.praise || 'Yes.');
      } else {
        W.tries++;
        replay(W.b, 'shake');
        var base = W.cat ? (W.nudge || cfg.nudge) : (cfg.blank || cfg.nudge);
        tell(s.fb, 'bad', W.tries >= 2 ? cfg.hint : base);
      }
    }
    function choosePen(id) { pen = id; pens.forEach(function (p) { if (p.b) p.b.setAttribute('aria-pressed', String(p.id === id)); }); }
    widgets.push({ el: s.box, kind: 'highlight',
      solve: function () { keyed.forEach(function (W) { if (!W.done) { choosePen(W.cat); tap(W); } }); },
      wrong: function () {
        var W = words.filter(function (w) { return !w.cat && !w.done; })[0];
        if (!W) {
          W = keyed.filter(function (w) { return !w.done; })[0];
          var other = pens.filter(function (p) { return p.id !== W.cat; })[0];
          if (!other) return [];
          choosePen(other.id);
        }
        var out = [];
        for (var t = 0; t < 2; t++) { tap(W); out.push(s.fb.textContent); }
        return out;
      } });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function renderSummary(el) {
    if (!el) return;
    var body = el.querySelector('[data-summary-body]');
    if (!log.length) {
      body.innerHTML = '<p class="none">Nothing tried yet this session.</p>';
    } else {
      var counts = {};
      log.forEach(function (e) {
        var k = e.task + '||' + e.result;
        counts[k] = (counts[k] || 0) + 1;
      });
      var rows = Object.keys(counts).map(function (k) {
        var p = k.split('||');
        return '<li><b>' + esc(p[0]) + '</b>: ' + esc(p[1]) +
          (counts[k] > 1 ? ' (×' + counts[k] + ')' : '') + '</li>';
      });
      body.innerHTML = '<ul>' + rows.join('') + '</ul>';
    }
    el.classList.add('show');
    el.setAttribute('tabindex', '-1');
    el.focus();
  }

  /* ---------- Screen navigation, accessible ---------- */
  function buildNav(steps, opts) {
    var rail = document.getElementById('rail');
    var live = document.getElementById('live');

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
      if (live) live.textContent = steps[n].label + '. ' + (head ? head.textContent : '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (opts && opts.onEnter) opts.onEnter(n);
    }

    window.go = go;
    go(0);
    return go;
  }

  /* ---------- Board mode + points + teacher summary toolbar ---------- */
  function buildToolbar() {
    var bar = document.getElementById('toolbar');
    if (!bar) return;

    var badge = document.createElement('div');
    badge.className = 'log';
    badge.id = 'logBadge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', tally.points + ' points');
    badge.innerHTML = icon('star', 'icon-lg') +
      '<span class="log-n" id="logCount">' + tally.points + '</span>' +
      '<span class="log-l">bug points</span>';
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
      resetBtn.setAttribute('aria-label', 'Clear the points for a new pupil');
      resetBtn.addEventListener('click', function () {
        if (window.confirm('Clear the bug points and start again for a new pupil?')) {
          log.length = 0;
          resetLog();
          sumEl.classList.remove('show');
        }
      });
      bar.appendChild(resetBtn);
    }
  }

  /* ---------- Speakers on key words and leads (only when AUDIO is on) ---------- */
  function buildReadAloud() {
    document.querySelectorAll('.kcard[data-word]').forEach(function (card) {
      var word = card.getAttribute('data-word');
      var b = readAloudButton(word);
      if (!b) return;
      b.setAttribute('aria-label', 'Say the word ' + word + ' aloud');
      card.appendChild(b);
    });
    document.querySelectorAll('[data-read]').forEach(function (el) {
      if (el.querySelector('.say')) return;
      var b = readAloudButton(el.getAttribute('data-read') || el.textContent,
                              el.getAttribute('data-voice'));
      if (b) el.appendChild(b);
    });
  }

  /* ---------- The panel the child shows the teacher at the end ---------- */
  function renderMyWork() {
    var host = document.getElementById('mywork');
    if (!host) return;

    if (!tally.solved) {
      host.innerHTML =
        '<h3>My bug points</h3>' +
        '<div class="big">0</div>' +
        '<div>points so far. Answer some questions to fill this room.</div>';
      return;
    }

    var rows = tally.items.map(function (it) {
      return '<li>' + esc(it.task) + ': <b>' + it.earned + '</b>' +
        (it.tries === 0 ? ' (pair found)' : it.tries === 1 ? ' (first try)' : ' (' + it.tries + ' tries)') + '</li>';
    }).join('');

    host.innerHTML =
      '<h3>My bug points</h3>' +
      '<div class="big">' + tally.points + '</div>' +
      '<div>points · ' + tally.solved + ' question' + (tally.solved === 1 ? '' : 's') +
        ' solved · ' + tally.firstTry + ' on the first try</div>' +
      '<div class="code">Check code <b>' + checkCode() + '</b></div>' +
      '<details class="breakdown"><summary>Show my teacher what I did</summary>' +
        '<ul>' + rows + '</ul></details>' +
      '<p class="log-note">Show this screen to your teacher at the end of the lesson.</p>';
  }

  /* ---------- Room card stamp ---------- */
  function buildStamp() {
    var btn = document.getElementById('stampBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      document.getElementById('stamp').classList.add('on');
      var live = document.getElementById('live');
      if (live) live.textContent = 'Room open. Well done.';
    });
  }

  function init(steps, opts) {
    injectSprite();
    loadLog();
    buildNav(steps, opts);
    buildToolbar();
    buildReadAloud();
    buildStamp();
    renderMyWork();
  }

  window.Station = {
    init: init, icon: icon, record: record,
    ask: ask, choose: choose, order: order, norm: norm,
    memory: memory, sortInto: sortInto, label: label, join: join, highlight: highlight,
    renderMyWork: renderMyWork
  };
})();
