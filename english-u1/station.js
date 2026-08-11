/* ============================================================
   The Rescue Station — shared behaviour
   Rules: design-system/mns-classroom/pages/rescue-station.md

   NO network. NO localStorage, NO cookies, nothing transmitted, ever.
   The only storage is sessionStorage holding an anonymous points tally, so a
   refresh does not wipe a lesson's work; it dies when the tab closes.
   See CLAUDE.md and design-system/mns-classroom/pages/rescue-station.md.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Inline SVG sprite (replaces emoji-as-icons) ---------- */
  var SPRITE = [
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">',
    // helmet / station mark
    '<symbol id="i-helmet" viewBox="0 0 24 24"><path d="M3 17a9 9 0 0 1 18 0"/><path d="M2 17h20v3H2z"/><path d="M12 8V5M8.5 9 7 6.5M15.5 9 17 6.5"/></symbol>',
    // book / reading
    '<symbol id="i-book" viewBox="0 0 24 24"><path d="M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v14h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4V4Z"/><path d="M12 5v14"/></symbol>',
    // returns / swap arrows
    '<symbol id="i-swap" viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></symbol>',
    // scroll / licence
    '<symbol id="i-scroll" viewBox="0 0 24 24"><path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></symbol>',
    // basket / welcome
    '<symbol id="i-basket" viewBox="0 0 24 24"><path d="M3 9h18l-2 10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L3 9Z"/><path d="M8 9 10 3M16 9 14 3M10 13v4M14 13v4"/></symbol>',
    // star / rescue log points
    '<symbol id="i-star" viewBox="0 0 24 24"><path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.4l6-.8L12 3Z"/></symbol>',
    // radio / dialogue
    '<symbol id="i-radio" viewBox="0 0 24 24"><rect x="3" y="10" width="12" height="11" rx="2"/><path d="M7 10V6a2 2 0 0 1 2-2M17 4l4 4M18 12a4 4 0 0 0 3-3"/><circle cx="9" cy="15" r="1.5"/></symbol>',
    // pen / writing
    '<symbol id="i-pen" viewBox="0 0 24 24"><path d="M14 4l6 6-9.5 9.5-6.5 2 2-6.5L14 4Z"/><path d="M12 6l6 6"/></symbol>',
    // running person / verbs
    '<symbol id="i-run" viewBox="0 0 24 24"><circle cx="15" cy="4.5" r="2"/><path d="M13 21l2-6-3-2 1-5 4 3 3 1M12 13l-4 1-3 5"/></symbol>',
    // newspaper / report
    '<symbol id="i-news" viewBox="0 0 24 24"><path d="M4 5h13v14H5a1 1 0 0 1-1-1V5Z"/><path d="M17 9h3v9a1 1 0 0 1-1 1h-2"/><path d="M7 8h7M7 12h7M7 16h5"/></symbol>',
    // magnifier / mystery
    '<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></symbol>',
    // puzzle
    '<symbol id="i-puzzle" viewBox="0 0 24 24"><path d="M10 3a2 2 0 1 1 4 0v2h3a1 1 0 0 1 1 1v3h2a2 2 0 1 1 0 4h-2v3a1 1 0 0 1-1 1h-3v-2a2 2 0 1 0-4 0v2H7a1 1 0 0 1-1-1v-3H4a2 2 0 1 1 0-4h2V6a1 1 0 0 1 1-1h3V3Z"/></symbol>',
    // speech / talk in your team
    '<symbol id="i-talk" viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-5.5A8 8 0 0 1 13 4a8 8 0 0 1 8 8Z"/><path d="M9 11h8M9 15h5"/></symbol>',
    // people / team
    '<symbol id="i-team" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5.2"/></symbol>',
    // speaker (say it aloud)
    '<symbol id="i-say" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M17 9a4 4 0 0 1 0 6"/></symbol>',
    // tick / cross
    '<symbol id="i-tick" viewBox="0 0 24 24"><path d="m4 13 5 5L20 6"/></symbol>',
    '<symbol id="i-cross" viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18"/></symbol>',
    // medal / licence tier
    '<symbol id="i-medal" viewBox="0 0 24 24"><circle cx="12" cy="15" r="6"/><path d="m8 3 2 6M16 3l-2 6M9 3h6"/></symbol>',
    // clipboard (teacher summary)
    '<symbol id="i-clipboard" viewBox="0 0 24 24"><path d="M9 4h6v3H9zM7 5H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="M8 12h8M8 16h5"/></symbol>',
    // board / screen
    '<symbol id="i-board" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M12 16v4M8 20h8"/></symbol>',
    '</svg>'
  ].join('');

  function injectSprite() {
    if (document.getElementById('station-sprite')) return;
    var d = document.createElement('div');
    d.id = 'station-sprite';
    d.innerHTML = SPRITE;
    document.body.insertBefore(d, document.body.firstChild);
  }

  /** Build an <svg><use> icon. */
  function icon(name, extraClass) {
    return '<svg class="icon' + (extraClass ? ' ' + extraClass : '') +
      '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  }

  /* ---------- Read aloud (device speech engine, no network) ---------- */
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }

  /** Attach a "read this to me" button. Children working alone may still be
      building reading fluency; an instruction they cannot read is a dead end. */
  function readAloudButton(text) {
    if (!('speechSynthesis' in window)) return null;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'say';
    b.innerHTML = icon('say');
    b.setAttribute('aria-label', 'Read this to me');
    b.addEventListener('click', function () { speak(text); });
    return b;
  }

  /* ---------- Rescue Log: points to show the teacher ----------
     Earned for solving, never lost for trying. Hints are free — a child
     working alone must be able to use one without being punished.

     Kept in sessionStorage, NOT localStorage: an accidental refresh or the
     iPad sleeping must not wipe a lesson's work, but everything disappears
     when the tab is closed. Anonymous integers only — no name, no identity,
     nothing transmitted. See design-system/.../pages/rescue-station.md. */
  var POINTS_SOLVED = 10;
  var POINTS_FIRST_TRY = 5;

  var lessonId = (document.body.getAttribute('data-lesson') || 'station');
  var storeKey = 'station-log-' + lessonId;

  var rescueLog = { points: 0, solved: 0, firstTry: 0, items: [] };

  function loadLog() {
    try {
      var raw = window.sessionStorage.getItem(storeKey);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p.points === 'number') rescueLog = p;
      }
    } catch (e) { /* private mode or storage disabled — carry on in memory */ }
  }
  function saveLog() {
    try { window.sessionStorage.setItem(storeKey, JSON.stringify(rescueLog)); }
    catch (e) { /* nothing to do; points still work for this page view */ }
  }

  /** A short code the teacher can eyeball. It is derived from the actual
      tally, so a child cannot just claim a bigger number. */
  function checkCode() {
    var seed = rescueLog.points * 31 + rescueLog.solved * 7 + rescueLog.firstTry * 3 + lessonId.length;
    var letters = 'BCDFGHJKLMNPQRSTVWXZ';
    return letters[seed % 20] + letters[(seed >> 4) % 20] +
           String((seed % 97) + 10).padStart(2, '0');
  }

  function award(task, tries) {
    var earned = POINTS_SOLVED + (tries === 1 ? POINTS_FIRST_TRY : 0);
    rescueLog.points += earned;
    rescueLog.solved += 1;
    if (tries === 1) rescueLog.firstTry += 1;
    rescueLog.items.push({ task: task, tries: tries, earned: earned });
    saveLog();
    paintLog(earned);
    return earned;
  }

  function paintLog(justEarned) {
    var el = document.getElementById('logCount');
    if (!el) return;
    el.textContent = rescueLog.points;
    var badge = document.getElementById('logBadge');
    if (badge && justEarned) {
      badge.classList.remove('pop');
      void badge.offsetWidth;              // restart the animation
      badge.classList.add('pop');
      badge.setAttribute('aria-label', rescueLog.points + ' points. You just earned ' + justEarned + '.');
      var live = document.getElementById('live');
      if (live) live.textContent = 'You earned ' + justEarned + ' points. Total ' + rescueLog.points + '.';
    }
  }

  function resetLog() {
    rescueLog = { points: 0, solved: 0, firstTry: 0, items: [] };
    saveLog();
    paintLog(0);
    renderMyWork();
  }

  /* ---------- Session log: in memory only, dies on reload ---------- */
  var log = [];

  /** Single integration point: anything that reports "correct in N" earns
      points, so every activity in every lesson is covered without each one
      having to remember to award. */
  function record(entry) {
    log.push(entry);
    var m = /^correct in (\d+)/.exec(entry.result || '');
    if (m) award(entry.task, parseInt(m[1], 10));
  }

  /* ---------- Ask: the child does the maths, the page only checks ----------
     Every number a child could work out must be asked for, never displayed.
     Wrong answers get a teaching nudge, then a worked hint after two tries,
     so nobody working alone can get stuck with no way forward. */
  var askCount = 0;

  /** Marking a written word must not turn into a spelling test by accident:
      case, spaces, quotes and end punctuation are all ignored. Spelling is
      assessed in the spelling test and in the child's book, not here. */
  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[‘’“”]/g, "'")
      .replace(/[.,!?;:'"]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function ask(host, cfg) {
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

    var isText = cfg.type === 'text';
    var inp = document.createElement('input');
    inp.type = isText ? 'text' : 'number';
    if (!isText) inp.inputMode = 'numeric';
    if (isText) { inp.autocapitalize = 'none'; inp.setAttribute('autocomplete', 'off'); }
    inp.id = id;
    inp.placeholder = '?';
    inp.setAttribute('aria-describedby', id + '-fb');
    row.appendChild(inp);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn navy';
    btn.textContent = 'Check';
    row.appendChild(btn);

    var ra = readAloudButton(cfg.prompt);
    if (ra) row.appendChild(ra);

    box.appendChild(row);

    var fb = document.createElement('p');
    fb.className = 'ask-fb';
    fb.id = id + '-fb';
    fb.setAttribute('role', 'status');
    box.appendChild(fb);

    function accept(v) {
      if (typeof cfg.accept === 'function') return cfg.accept(v);
      if (isText) return cfg.answers.some(function (a) { return norm(a) === norm(v); });
      return v === cfg.answer;
    }

    function submit() {
      if (solved) return;
      var v = isText ? inp.value : parseInt(inp.value, 10);
      if (isText ? !norm(v) : isNaN(v)) {
        fb.className = 'ask-fb';
        fb.textContent = isText ? 'Write your answer first, then press Check.'
                                : 'Type a number first, then press Check.';
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
        if (cfg.onSolved) cfg.onSolved(v);
      } else {
        fb.className = 'ask-fb bad';
        // First a nudge that makes them look again; only then the worked hint.
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
     For answers a text box cannot mark fairly ("who is telling the story?").
     Same rules as ask(): tries are counted, nothing is deducted, the question
     awards once however many times the buttons are tapped. */
  function choose(host, cfg) {
    var tries = 0, solved = false;

    var box = document.createElement('div');
    box.className = 'ask';

    var q = document.createElement('p');
    q.className = 'ask-q';
    q.textContent = cfg.prompt;
    var ra = readAloudButton(cfg.prompt);
    if (ra) q.appendChild(ra);
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
      b.textContent = opt.text;
      b.addEventListener('click', function () {
        if (solved || b.dataset.state) return;
        tries++;
        if (i === cfg.answer) {
          solved = true;
          b.dataset.state = 'right';
          fb.className = 'ask-fb good';
          fb.textContent = (opt.why || cfg.praise || 'Correct.') +
            (tries === 1 ? ' First try.' : ' You got there in ' + tries + '.');
          record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
          if (cfg.onSolved) cfg.onSolved(i);
        } else {
          b.dataset.state = 'wrong';
          fb.className = 'ask-fb bad';
          fb.textContent = opt.why || cfg.nudge || 'Not that one. Read it again.';
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
     Tap one card, then tap another, and they swap. Deliberately not drag and
     drop: dragging on an iPad fails often enough at this age to become the
     activity, and it is unusable from a keyboard. */
  function order(host, cfg) {
    var items = cfg.items.slice();
    var picked = -1, tries = 0, solved = false;

    var box = document.createElement('div');
    box.className = 'ask';

    var q = document.createElement('p');
    q.className = 'ask-q';
    q.textContent = cfg.prompt;
    var ra = readAloudButton(cfg.prompt);
    if (ra) q.appendChild(ra);
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
    btn.className = 'btn navy';
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
        fb.className = 'ask-fb good';
        fb.textContent = (cfg.praise || 'That is the right order.') +
          (tries === 1 ? ' First try.' : ' You got there in ' + tries + '.');
        btn.disabled = true;
        record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
        paint();
      } else {
        fb.className = 'ask-fb bad';
        fb.textContent = (tries >= 2 && cfg.hint) ? cfg.hint :
          (cfg.nudge || (wrong.length + ' card' + (wrong.length === 1 ? ' is' : 's are') +
            ' in the wrong place. What happened first?'));
        record({ task: cfg.task || cfg.prompt, result: wrong.length + ' out of place' });
      }
    });

    paint();
    box.appendChild(btn);
    box.appendChild(fb);
    host.appendChild(box);
    return { el: box, isSolved: function () { return solved; } };
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
        return '<li><b>' + p[0] + '</b> — ' + p[1] +
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

    // A single-screen page (the charter) has no step rail. Without this guard
    // the missing rail throws and takes the rest of that page's script with it.
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
      // Move focus to the new screen's heading and announce it.
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

  /* ---------- Board mode + log + teacher summary toolbar ---------- */
  function buildToolbar() {
    var bar = document.getElementById('toolbar');
    if (!bar) return;

    // Log badge, always visible so the child watches it grow.
    var badge = document.createElement('div');
    badge.className = 'log';
    badge.id = 'logBadge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', rescueLog.points + ' points');
    badge.innerHTML = icon('star', 'icon-lg') +
      '<span class="log-n" id="logCount">' + rescueLog.points + '</span>' +
      '<span class="log-l">points</span>';
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

      // Teacher-side reset, so the next pupil on this iPad starts at zero.
      var resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'tool';
      resetBtn.innerHTML = icon('swap') + '<span>New pupil</span>';
      resetBtn.setAttribute('aria-label', 'Clear the rescue log for a new pupil');
      resetBtn.addEventListener('click', function () {
        if (window.confirm('Clear the rescue log and start again for a new pupil?')) {
          log.length = 0;
          resetLog();
          sumEl.classList.remove('show');
        }
      });
      bar.appendChild(resetBtn);
    }
  }

  /* ---------- Key words: say it aloud (local SpeechSynthesis) ---------- */
  function buildKeyWords() {
    document.querySelectorAll('.kcard').forEach(function (card) {
      var word = card.getAttribute('data-word');
      if (!word) return;
      var b = readAloudButton(word);
      if (!b) return;
      b.setAttribute('aria-label', 'Say the word ' + word + ' aloud');
      card.appendChild(b);
    });
  }

  /** Read-aloud on any element carrying data-read. */
  function buildReadAloud() {
    document.querySelectorAll('[data-read]').forEach(function (el) {
      if (el.querySelector('.say')) return;
      var b = readAloudButton(el.getAttribute('data-read') || el.textContent);
      if (b) el.appendChild(b);
    });
  }

  /* ---------- The panel the child shows the teacher at the end ----------
     A bare number is easy to make up, so the panel also lists what was
     actually solved and prints a check code derived from the tally. */
  function renderMyWork() {
    var host = document.getElementById('mywork');
    if (!host) return;

    if (!rescueLog.solved) {
      host.innerHTML =
        '<h3>My Rescue Log</h3>' +
        '<div class="big">0</div>' +
        '<div>points so far. Answer some questions to fill your log.</div>';
      return;
    }

    var rows = rescueLog.items.map(function (it) {
      return '<li>' + it.task + ' — <b>' + it.earned + '</b>' +
        (it.tries === 1 ? ' (first try)' : ' (' + it.tries + ' tries)') + '</li>';
    }).join('');

    host.innerHTML =
      '<h3>My Rescue Log</h3>' +
      '<div class="big">' + rescueLog.points + '</div>' +
      '<div>points · ' + rescueLog.solved + ' question' + (rescueLog.solved === 1 ? '' : 's') +
        ' solved · ' + rescueLog.firstTry + ' on the first try</div>' +
      '<div class="code">Check code <b>' + checkCode() + '</b></div>' +
      '<details class="breakdown"><summary>Show my teacher what I did</summary>' +
        '<ul>' + rows + '</ul></details>' +
      '<p class="log-note">Show this screen to your teacher at the end of the lesson.</p>';
  }

  function myWork() {
    return { solved: rescueLog.solved, points: rescueLog.points, firstTry: rescueLog.firstTry };
  }

  /* ---------- Licence stamp ---------- */
  function buildStamp() {
    var btn = document.getElementById('stampBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      document.getElementById('stamp').classList.add('on');
      var live = document.getElementById('live');
      if (live) live.textContent = 'Licence stamped. Well done.';
    });
  }

  function init(steps, opts) {
    injectSprite();
    loadLog();
    buildNav(steps, opts);
    buildToolbar();
    buildKeyWords();
    buildReadAloud();
    buildStamp();
    renderMyWork();
  }

  window.Station = {
    init: init, icon: icon, record: record,
    ask: ask, choose: choose, order: order, speak: speak, norm: norm,
    myWork: myWork, renderMyWork: renderMyWork, award: award
  };
})();
