/* ============================================================
   The Dhow Harbour — shared behaviour (Maths Unit 5)
   Number Souq's engine (Unit 4), re-themed, plus the never-give-the-answer
   guard from The Block Yard.
   Rules: design-system/mns-classroom/pages/dhow-harbour.md

   NO network. NO localStorage, NO cookies, nothing transmitted, ever.
   The only storage is sessionStorage holding an anonymous points tally, so a
   refresh does not wipe a lesson's work; it dies when the tab closes.
   See CLAUDE.md and design-system/mns-classroom/pages/dhow-harbour.md.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Inline SVG sprite (replaces emoji-as-icons) ---------- */
  var SPRITE = [
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">',
    // anchor / harbour mark
    '<symbol id="i-anchor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 11h8M4 14a8 7 0 0 0 16 0M4 14l-1.5 1.5M20 14l1.5 1.5"/></symbol>',
    // dhow: hull and lateen sail
    '<symbol id="i-dhow" viewBox="0 0 24 24"><path d="M3 16h18l-3 4H6l-3-4Z"/><path d="M12 16V3M12 3 5 13h7M12 5l7 8h-7"/></symbol>',
    // crate
    '<symbol id="i-crate" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="1"/><path d="M3 10h18M3 16h18M8 6v14M16 6v14"/></symbol>',
    // compass
    '<symbol id="i-compass" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></symbol>',
    // waves
    '<symbol id="i-wave" viewBox="0 0 24 24"><path d="M2 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/></symbol>',
    // balance scale
    '<symbol id="i-balance" viewBox="0 0 24 24"><path d="M12 3v18M7 21h10M3 8l4-4 4 4M3 8a4 4 0 0 0 8 0M13 8l4-4 4 4M13 8a4 4 0 0 0 8 0M7 4h10"/></symbol>',
    // returns / swap arrows
    '<symbol id="i-swap" viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></symbol>',
    // scroll / ship's papers
    '<symbol id="i-scroll" viewBox="0 0 24 24"><path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></symbol>',
    // coin
    '<symbol id="i-coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/></symbol>',
    // exchange desk
    '<symbol id="i-exchange" viewBox="0 0 24 24"><path d="M3 7h13l-3-3M21 17H8l3 3"/><circle cx="18" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/></symbol>',
    // plus / minus in a circle
    '<symbol id="i-plus" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></symbol>',
    '<symbol id="i-minus" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></symbol>',
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
    // medal / rank
    '<symbol id="i-medal" viewBox="0 0 24 24"><circle cx="12" cy="15" r="6"/><path d="m8 3 2 6M16 3l-2 6M9 3h6"/></symbol>',
    // clipboard (teacher summary)
    '<symbol id="i-clipboard" viewBox="0 0 24 24"><path d="M9 4h6v3H9zM7 5H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="M8 12h8M8 16h5"/></symbol>',
    // board / screen
    '<symbol id="i-board" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M12 16v4M8 20h8"/></symbol>',
    '</svg>'
  ].join('');

  function injectSprite() {
    if (document.getElementById('harbour-sprite')) return;
    var d = document.createElement('div');
    d.id = 'harbour-sprite';
    d.innerHTML = SPRITE;
    document.body.insertBefore(d, document.body.firstChild);
  }

  /** Build an <svg><use> icon. */
  function icon(name, extraClass) {
    return '<svg class="icon' + (extraClass ? ' ' + extraClass : '') +
      '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  }

  /* ---------- Read aloud (device speech engine, no network) ---------- */
  /* ---------- Which voice reads to the class ----------
     Setting utterance.lang is only a hint. With no voice chosen the engine
     falls back to the device default, and on a tablet or laptop set to
     another language that default is a voice of THAT language sounding out
     English words with the wrong phonetics. Measured on the teacher's own
     Mac: the default voice came back as Monica (es-ES). For a class of EAL
     readers that is worse than no audio at all, so the voice is picked here
     and never left to the device.

     The novelty list matters as well: macOS ships joke English voices (Bad
     News, Boing, Bubbles) and stylised character ones, any of which a plain
     "first English voice" would happily choose to read out instructions. */
  var VOICE_PREFERRED = [
    'daniel', 'serena', 'kate', 'martha', 'arthur', 'sonia', 'libby', 'ryan',
    'google uk english', 'samantha', 'alex', 'google us english'
  ];
  var VOICE_NOVELTY = [
    'bad news', 'good news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos',
    'jester', 'organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox',
    'albert', 'fred', 'junior', 'ralph', 'kathy', 'princess', 'deranged',
    'hysterical', 'grandma', 'grandpa', 'rocko', 'shelley', 'sandy', 'flo',
    'eddy', 'reed'
  ];
  var chosenVoice = null;

  function pickVoice() {
    var all = [];
    try { all = window.speechSynthesis.getVoices() || []; } catch (e) { return null; }
    var english = all.filter(function (v) { return /^en([-_]|$)/i.test(v.lang || ''); });
    if (!english.length) return null;
    var plain = function (v) {
      var n = (v.name || '').toLowerCase();
      return !VOICE_NOVELTY.some(function (bad) { return n.indexOf(bad) !== -1; });
    };
    var british = english.filter(function (v) { return /^en[-_]gb/i.test(v.lang || ''); });
    // Best first: a plain British voice, then any plain English one, then
    // whatever English is left rather than dropping to another language.
    var pools = [british.filter(plain), english.filter(plain), british, english];
    for (var i = 0; i < pools.length; i++) {
      if (!pools[i].length) continue;
      for (var j = 0; j < VOICE_PREFERRED.length; j++) {
        var want = VOICE_PREFERRED[j];
        var hit = pools[i].filter(function (v) {
          return (v.name || '').toLowerCase().indexOf(want) !== -1;
        })[0];
        if (hit) return hit;
      }
      return pools[i][0];
    }
    return null;
  }

  /* getVoices() is empty until the engine has loaded them, so it is asked
     again on voiceschanged and again lazily on the first tap. */
  if ('speechSynthesis' in window) {
    chosenVoice = pickVoice();
    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', function () {
        chosenVoice = pickVoice();
      });
    }
  }

  function utter(text) {
    var u = new SpeechSynthesisUtterance(text);
    u.voice = chosenVoice;
    u.lang = chosenVoice.lang;
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (!chosenVoice) chosenVoice = pickVoice();
    if (chosenVoice) return utter(text);

    /* No English voice in hand yet. It is never spoken anyway: English read
       out by a Spanish or Arabic voice is not English to a child learning to
       read it, and silence is the better of the two. On iOS the voice list is
       routinely empty until the engine wakes up, which is usually on the very
       first tap, so it is worth asking once more before giving up. */
    var settled = false;
    var retry = function () {
      if (settled) return;
      settled = true;
      chosenVoice = pickVoice();
      if (chosenVoice) utter(text);
      else noEnglishVoice();
    };
    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', retry, { once: true });
    }
    setTimeout(retry, 400);
  }

  /* Say so rather than failing silently: a speaker that does nothing looks
     broken, and the teacher is the one who can install a voice. */
  function noEnglishVoice() {
    var live = document.getElementById('live');
    if (live) {
      live.textContent = 'This device has no English voice installed, so reading aloud is off.';
    }
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

  /* ---------- Ship's Log: points to show the teacher ----------
     Earned for solving, never lost for trying. Hints are free — a child
     working alone must be able to use one without being punished.

     Kept in sessionStorage, NOT localStorage: an accidental refresh or the
     iPad sleeping must not wipe a lesson's work, but everything disappears
     when the tab is closed. Anonymous integers only — no name, no identity,
     nothing transmitted. See design-system/.../pages/dhow-harbour.md. */
  var POINTS_SOLVED = 10;
  var POINTS_FIRST_TRY = 5;

  var lessonId = (document.body.getAttribute('data-lesson') || 'harbour');
  var storeKey = 'harbour-log-' + lessonId;

  var purse = { points: 0, solved: 0, firstTry: 0, items: [] };

  function loadPurse() {
    try {
      var raw = window.sessionStorage.getItem(storeKey);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p.points === 'number') purse = p;
      }
    } catch (e) { /* private mode or storage disabled — carry on in memory */ }
  }
  function savePurse() {
    try { window.sessionStorage.setItem(storeKey, JSON.stringify(purse)); }
    catch (e) { /* nothing to do; points still work for this page view */ }
  }

  /** A short code the teacher can eyeball. It is derived from the actual
      tally, so a child cannot just claim a bigger number. */
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
      void badge.offsetWidth;              // restart the animation
      badge.classList.add('pop');
      badge.setAttribute('aria-label', purse.points + ' points. You just earned ' + justEarned + '.');
      var live = document.getElementById('live');
      if (live) live.textContent = 'You earned ' + justEarned + ' points. Total ' + purse.points + '.';
    }
  }

  function resetPurse() {
    purse = { points: 0, solved: 0, firstTry: 0, items: [] };
    savePurse();
    paintPurse(0);
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

  /* Never give the answer, however many tries (teacher's rule, October 2026).
     A hint teaches the method; if one names its own answer, and the question
     does not already show that number, a generic line goes out instead.
     tools/unit-pipeline/check_no_reveal.js fails on any hint that does. */
  var FALLBACK = 'Not quite. Read the hint above the box again and try once more.';
  function givesAway(text, cfg) {
    if (cfg.answer === undefined || typeof cfg.accept === 'function' || !text) return false;
    var n = new RegExp('(^|[^0-9])' + cfg.answer + '(?![0-9])');
    return n.test(text) && !n.test(cfg.prompt || '');
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

    var inp = document.createElement('input');
    inp.type = 'number';
    inp.inputMode = 'numeric';
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
      var v = parseInt(inp.value, 10);
      if (isNaN(v)) {
        fb.className = 'ask-fb';
        fb.textContent = 'Type a number first, then press Check.';
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
        var said = (tries >= 2 && cfg.hint) ? cfg.hint : nudge;
        fb.textContent = givesAway(said, cfg) ? FALLBACK : said;
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

  /* ---------- Board mode + purse + teacher summary toolbar ---------- */
  function buildToolbar() {
    var bar = document.getElementById('toolbar');
    if (!bar) return;

    // Points badge, always visible so the child watches it grow.
    var badge = document.createElement('div');
    badge.className = 'purse';
    badge.id = 'purseBadge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', purse.points + ' points');
    badge.innerHTML = icon('coin', 'icon-lg') +
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

      // Teacher-side reset, so the next pupil on this iPad starts at zero.
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

    if (!purse.solved) {
      host.innerHTML =
        '<h3>My Ship’s Log</h3>' +
        '<div class="big">0</div>' +
        '<div>points so far. Answer some questions to fill your log.</div>';
      return;
    }

    var rows = purse.items.map(function (it) {
      return '<li>' + it.task + ' — <b>' + it.earned + '</b>' +
        (it.tries === 1 ? ' (first try)' : ' (' + it.tries + ' tries)') + '</li>';
    }).join('');

    host.innerHTML =
      '<h3>My Ship’s Log</h3>' +
      '<div class="big">' + purse.points + '</div>' +
      '<div>points · ' + purse.solved + ' question' + (purse.solved === 1 ? '' : 's') +
        ' solved · ' + purse.firstTry + ' on the first try</div>' +
      '<div class="code">Check code <b>' + checkCode() + '</b></div>' +
      '<details class="breakdown"><summary>Show my teacher what I did</summary>' +
        '<ul>' + rows + '</ul></details>' +
      '<p class="purse-note">Show this screen to your teacher at the end of the lesson.</p>';
  }

  function myWork() {
    return { solved: purse.solved, points: purse.points, firstTry: purse.firstTry };
  }

  /* ---------- Rank stamp ---------- */
  function buildStamp() {
    var btn = document.getElementById('stampBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      document.getElementById('stamp').classList.add('on');
      var live = document.getElementById('live');
      if (live) live.textContent = 'Rank stamped. Well done.';
    });
  }

  /* ---------- Arithmetic from the lesson data ----------
     Lessons store calculations as text ("260 + 120", "? + 800 = 1000") and
     the answer is worked out here, never typed in by hand, so a typo in the
     data cannot become a wrong answer key. check-harbour.js does the same. */
  function calc(text) {
    var t = String(text).replace(/\u2212/g, '-').replace(/\$/g, '').match(/\d+|[+-]/g) || [];
    var v = parseInt(t[0], 10);
    for (var i = 1; i < t.length; i += 2) v += (t[i] === '+' ? 1 : -1) * parseInt(t[i + 1], 10);
    return v;
  }
  /** Value of the ? in "a + ? = b", or of the whole sum when there is no "=". */
  function solve(text) {
    var sides = String(text).split('=');
    if (sides.length === 1) return calc(text);
    for (var x = 0; x <= 2000; x++) {
      var l = sides[0].replace(/\?/g, x), r = sides[1].replace(/\?/g, x);
      if (calc(l) === calc(r)) return x;
    }
    return undefined;
  }

  /* ---------- Chooser chips: one per item, a tick once it is done ----------
     show(i, isDone) builds the item. A finished item is never rebuilt with
     live questions, so tapping it again cannot farm points. */
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
      if (b && b.textContent.indexOf('\u2713') === -1) b.textContent = '\u2713 ' + b.textContent;
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

  window.Harbour = {
    init: init, icon: icon, record: record,
    ask: ask, speak: speak,
    myWork: myWork, renderMyWork: renderMyWork, award: award,
    calc: calc, solve: solve, chips: chips,
    readAloud: buildReadAloud     // for text a lesson builds after init
  };
})();
