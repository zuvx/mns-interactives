/* ============================================================
   The Number Post Office — shared behaviour
   Rules: design-system/mns-classroom/pages/number-post-office.md

   NO network. NO localStorage, NO cookies, nothing transmitted, ever.
   The only storage is sessionStorage holding an anonymous points tally, so a
   refresh does not wipe a lesson's work; it dies when the tab closes.
   See CLAUDE.md and design-system/mns-classroom/pages/number-post-office.md.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Inline SVG sprite (replaces emoji-as-icons) ---------- */
  var SPRITE = [
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">',
    // envelope / letter
    '<symbol id="i-letter" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="m2 7 10 7 10-7"/></symbol>',
    // parcel
    '<symbol id="i-parcel" viewBox="0 0 24 24"><path d="M3 8l9-5 9 5v8l-9 5-9-5V8Z"/><path d="M3 8l9 5 9-5M12 13v8"/></symbol>',
    // postbox
    '<symbol id="i-postbox" viewBox="0 0 24 24"><path d="M6 9a6 6 0 0 1 12 0v11H6V9Z"/><path d="M9 8h6M8 20v2M16 20v2"/></symbol>',
    // sorting tray
    '<symbol id="i-sort" viewBox="0 0 24 24"><path d="M3 7h7M3 12h13M3 17h9"/><path d="m17 8 4 4-4 4"/></symbol>',
    // scales / place value
    '<symbol id="i-scales" viewBox="0 0 24 24"><path d="M12 3v18M7 21h10M3 8l4-4 4 4M3 8a4 4 0 0 0 8 0M13 8l4-4 4 4M13 8a4 4 0 0 0 8 0M7 4h10"/></symbol>',
    // house
    '<symbol id="i-house" viewBox="0 0 24 24"><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></symbol>',
    // street
    '<symbol id="i-street" viewBox="0 0 24 24"><path d="M4 21 8 4M20 21 16 4"/><path d="M12 6v2M12 11v2M12 16v2"/></symbol>',
    // stamp
    '<symbol id="i-stamp" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="1"/><path d="M8 9h8v6H8z"/></symbol>',
    // postbag
    '<symbol id="i-postbag" viewBox="0 0 24 24"><path d="M4 9h16l-1.5 11a1 1 0 0 1-1 .9H6.5a1 1 0 0 1-1-.9L4 9Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/><path d="M9 13h6"/></symbol>',
    // van
    '<symbol id="i-van" viewBox="0 0 24 24"><path d="M2 7h11v9H2z"/><path d="M13 10h4l4 3v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></symbol>',
    // magnifier
    '<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></symbol>',
    // pencil / write
    '<symbol id="i-pencil" viewBox="0 0 24 24"><path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m14 6 4 4"/></symbol>',
    // speech
    '<symbol id="i-talk" viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-5.5A8 8 0 0 1 13 4a8 8 0 0 1 8 8Z"/><path d="M9 11h8M9 15h5"/></symbol>',
    // speaker
    '<symbol id="i-say" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M17 9a4 4 0 0 1 0 6"/></symbol>',
    // tick / cross
    '<symbol id="i-tick" viewBox="0 0 24 24"><path d="m4 13 5 5L20 6"/></symbol>',
    '<symbol id="i-cross" viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18"/></symbol>',
    // medal
    '<symbol id="i-medal" viewBox="0 0 24 24"><circle cx="12" cy="15" r="6"/><path d="m8 3 2 6M16 3l-2 6M9 3h6"/></symbol>',
    // clipboard
    '<symbol id="i-clipboard" viewBox="0 0 24 24"><path d="M9 4h6v3H9zM7 5H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="M8 12h8M8 16h5"/></symbol>',
    // board
    '<symbol id="i-board" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M12 16v4M8 20h8"/></symbol>',
    // swap (new pupil)
    '<symbol id="i-swap" viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></symbol>',
    '</svg>'
  ].join('');

  function injectSprite() {
    if (document.getElementById('post-sprite')) return;
    var d = document.createElement('div');
    d.id = 'post-sprite';
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

  /* ---------- Postbag: points to show the teacher ----------
     Earned for solving, never lost for trying. Hints are free — a child
     working alone must be able to use one without being punished.

     Kept in sessionStorage, NOT localStorage: an accidental refresh or the
     iPad sleeping must not wipe a lesson's work, but everything disappears
     when the tab is closed. Anonymous integers only — no name, no identity,
     nothing transmitted. See design-system/.../pages/number-post.md. */
  var POINTS_SOLVED = 10;
  var POINTS_FIRST_TRY = 5;

  var lessonId = (document.body.getAttribute('data-lesson') || 'post');
  var storeKey = 'post-bag-' + lessonId;

  var bag = { points: 0, solved: 0, firstTry: 0, items: [] };

  function loadBag() {
    try {
      var raw = window.sessionStorage.getItem(storeKey);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p.points === 'number') bag = p;
      }
    } catch (e) { /* private mode or storage disabled — carry on in memory */ }
  }
  function saveBag() {
    try { window.sessionStorage.setItem(storeKey, JSON.stringify(bag)); }
    catch (e) { /* nothing to do; points still work for this page view */ }
  }

  /** A short code the teacher can eyeball. It is derived from the actual
      tally, so a child cannot just claim a bigger number. */
  function checkCode() {
    var seed = bag.points * 31 + bag.solved * 7 + bag.firstTry * 3 + lessonId.length;
    var letters = 'BCDFGHJKLMNPQRSTVWXZ';
    return letters[seed % 20] + letters[(seed >> 4) % 20] +
           String((seed % 97) + 10).padStart(2, '0');
  }

  function award(task, tries) {
    var earned = POINTS_SOLVED + (tries === 1 ? POINTS_FIRST_TRY : 0);
    bag.points += earned;
    bag.solved += 1;
    if (tries === 1) bag.firstTry += 1;
    bag.items.push({ task: task, tries: tries, earned: earned });
    saveBag();
    paintBag(earned);
    return earned;
  }

  function paintBag(justEarned) {
    var el = document.getElementById('postbagCount');
    if (!el) return;
    el.textContent = bag.points;
    var badge = document.getElementById('postbagBadge');
    if (badge && justEarned) {
      badge.classList.remove('pop');
      void badge.offsetWidth;              // restart the animation
      badge.classList.add('pop');
      badge.setAttribute('aria-label', bag.points + ' points. You just earned ' + justEarned + '.');
      var live = document.getElementById('live');
      if (live) live.textContent = 'You earned ' + justEarned + ' points. Total ' + bag.points + '.';
    }
  }

  function resetBag() {
    bag = { points: 0, solved: 0, firstTry: 0, items: [] };
    saveBag();
    paintBag(0);
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

    var inp = document.createElement('input');
    if (cfg.words) {
      inp.type = 'text';
      inp.autocapitalize = 'none';
      inp.spellcheck = false;
      inp.className = 'words';
      inp.placeholder = 'write it in words';
    } else {
      inp.type = 'number';
      inp.inputMode = 'numeric';
    }
    inp.id = id;
    inp.placeholder = '?';
    inp.setAttribute('aria-describedby', id + '-fb');
    row.appendChild(inp);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn teal';
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
      return v === cfg.answer;
    }

    function submit() {
      if (solved) return;
      var v;
      if (cfg.words) {
        v = inp.value;
        if (!String(v).trim()) {
          fb.className = 'ask-fb';
          fb.textContent = 'Write the number in words first, then press Check.';
          return;
        }
      } else {
        v = parseInt(inp.value, 10);
        if (isNaN(v)) {
          fb.className = 'ask-fb';
          fb.textContent = 'Type a number first, then press Check.';
          return;
        }
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

  /* ---------- Board mode + bag + teacher summary toolbar ---------- */
  function buildToolbar() {
    var bar = document.getElementById('toolbar');
    if (!bar) return;

    // Bag badge, always visible so the child watches it grow.
    var badge = document.createElement('div');
    badge.className = 'postbag';
    badge.id = 'postbagBadge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', bag.points + ' points');
    badge.innerHTML = icon('postbag', 'icon-lg') +
      '<span class="postbag-n" id="postbagCount">' + bag.points + '</span>' +
      '<span class="postbag-l">points</span>';
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
      resetBtn.setAttribute('aria-label', 'Clear the bag for a new pupil');
      resetBtn.addEventListener('click', function () {
        if (window.confirm('Clear the bag and start again for a new pupil?')) {
          log.length = 0;
          resetBag();
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

    if (!bag.solved) {
      host.innerHTML =
        '<h3>My Postbag</h3>' +
        '<div class="big">0</div>' +
        '<div>points so far. Answer some questions to fill your bag.</div>';
      return;
    }

    var rows = bag.items.map(function (it) {
      return '<li>' + it.task + ' — <b>' + it.earned + '</b>' +
        (it.tries === 1 ? ' (first try)' : ' (' + it.tries + ' tries)') + '</li>';
    }).join('');

    host.innerHTML =
      '<h3>My Postbag</h3>' +
      '<div class="big">' + bag.points + '</div>' +
      '<div>points · ' + bag.solved + ' question' + (bag.solved === 1 ? '' : 's') +
        ' solved · ' + bag.firstTry + ' on the first try</div>' +
      '<div class="code">Check code <b>' + checkCode() + '</b></div>' +
      '<details class="breakdown"><summary>Show my teacher what I did</summary>' +
        '<ul>' + rows + '</ul></details>' +
      '<p class="purse-note">Show this screen to your teacher at the end of the lesson.</p>';
  }

  function myWork() {
    return { solved: bag.solved, points: bag.points, firstTry: bag.firstTry };
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
    loadBag();
    buildNav(steps, opts);
    buildToolbar();
    buildKeyWords();
    buildReadAloud();
    buildStamp();
    renderMyWork();
  }

  window.Post = {
    init: init, icon: icon, record: record,
    ask: ask, speak: speak,
    myWork: myWork, renderMyWork: renderMyWork, award: award
  };
})();
