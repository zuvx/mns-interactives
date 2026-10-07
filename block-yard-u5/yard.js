/* ============================================================
   The Block Yard — shared behaviour
   Cambridge Primary Maths Stage 3 · Unit 4 · Addition and subtraction (A)

   Everything runs from the file itself. No network of any kind: no fonts,
   no analytics, no fetch. The only thing kept is an anonymous points tally
   in sessionStorage, which dies with the tab.

   Public surface: window.Yard
     init(steps, opts)   build the rail, toolbar, key words, read-aloud
     mat(host, cfg)      a base ten mat the child taps to build and to trade
     chart(host, cfg)    the 100 chart. Linked to a mat by default; pass
                         {interactive:true} for one the child moves themselves
     col(host, cfg)      the written column method, filled as the child works
     strip(host, n, lbl) a read-only pile: a number shown, not built
     ask(host, cfg)      a typed-answer question with nudge then hint, never the answer
     choose(host, cfg)   a tap-an-option question
     chain(host, cfg)    three addends, and a choice of which pair to add first
     award / record / speak / icon
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Inline SVG icons. No emoji: they render differently on every
       device and a screen reader says "grinning face" in the middle of a
       maths instruction. ---------- */
  var SPRITE = [
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">',
    '<symbol id="i-blocks" viewBox="0 0 24 24"><rect x="3" y="13" width="8" height="8" rx="1"/>',
    '<rect x="13" y="13" width="8" height="8" rx="1"/><rect x="8" y="3" width="8" height="8" rx="1"/></symbol>',
    '<symbol id="i-swap" viewBox="0 0 24 24"><path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/></symbol>',
    '<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>',
    '<symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>',
    '<symbol id="i-say" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 8a5 5 0 010 8"/></symbol>',
    '<symbol id="i-board" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/></symbol>',
    '<symbol id="i-clip" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/>',
    '<path d="M9 4h6v3H9z"/><path d="M8 11h8M8 15h5"/></symbol>',
    '<symbol id="i-coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10h5M9.5 14h5"/></symbol>',
    '<symbol id="i-tarp" viewBox="0 0 24 24"><path d="M3 9l9-5 9 5-9 5-9-5z"/><path d="M3 9v6l9 5 9-5V9"/></symbol>',
    '<symbol id="i-check" viewBox="0 0 24 24"><path d="M4 13l5 5L20 6"/></symbol>',
    '<symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/>',
    '<path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></symbol>',
    '</svg>'
  ].join('');

  function injectSprite() {
    if (document.getElementById('yard-sprite')) return;
    var d = document.createElement('div');
    d.id = 'yard-sprite';
    d.innerHTML = SPRITE;
    document.body.insertBefore(d, document.body.firstChild);
  }

  function icon(name, extra) {
    return '<svg class="icon' + (extra ? ' ' + extra : '') +
      '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- Read aloud, on the device's own speech engine ---------- */
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

  function readAloudButton(text) {
    if (!('speechSynthesis' in window)) return null;
    var b = el('button', 'say');
    b.type = 'button';
    b.innerHTML = icon('say');
    b.setAttribute('aria-label', 'Read this to me');
    b.addEventListener('click', function () { speak(text); });
    return b;
  }

  /* ---------- Points ----------
     Earned for solving, never lost for trying, hints free. Same rules as the
     Number Souq so a child moving between the two resources is not scored by
     two different systems. sessionStorage, not localStorage: an accidental
     refresh must not wipe the lesson, but nothing survives closing the tab.
     Anonymous integers only. Nothing is transmitted. */
  var SOLVED = 10, FIRST_TRY = 5;
  var storeKey = 'yard-' + (document.body.getAttribute('data-lesson') || 'block-yard');
  var purse = { points: 0, solved: 0, firstTry: 0, items: [] };

  function loadPurse() {
    try {
      var raw = sessionStorage.getItem(storeKey);
      if (raw) purse = JSON.parse(raw);
    } catch (e) { /* private browsing: carry on with an empty purse */ }
  }
  function savePurse() {
    try { sessionStorage.setItem(storeKey, JSON.stringify(purse)); } catch (e) { /* no-op */ }
  }
  function award(task, tries) {
    if (purse.items.some(function (i) { return i.task === task; })) return;
    var got = SOLVED + (tries === 1 ? FIRST_TRY : 0);
    purse.points += got;
    purse.solved += 1;
    if (tries === 1) purse.firstTry += 1;
    purse.items.push({ task: task, tries: tries, points: got });
    savePurse();
    paintPurse(got);
  }
  function paintPurse(justEarned) {
    var n = document.getElementById('yardCount');
    if (!n) return;
    n.textContent = purse.points;
    var badge = document.getElementById('yardBadge');
    if (badge) badge.setAttribute('aria-label', purse.points + ' points');
    if (justEarned) {
      n.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }],
        { duration: 320, easing: 'ease-out' });
    }
    renderMyWork();
  }
  function resetPurse() {
    purse = { points: 0, solved: 0, firstTry: 0, items: [] };
    savePurse();
    paintPurse(0);
  }

  /* ---------- Teacher-side log, memory only ---------- */
  var log = [];
  function record(entry) {
    entry.at = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    log.push(entry);
  }

  /* ============================================================
     The mat: a base ten workspace the child taps
     ============================================================ */
  var PLACE = {
    h: { cls: 'hun', name: 'hundreds', one: 'hundred', worth: 100 },
    t: { cls: 'ten', name: 'tens', one: 'ten', worth: 10 },
    o: { cls: 'one', name: 'ones', one: 'one', worth: 1 }
  };
  var UP = { o: 't', t: 'h' }, DOWN = { t: 'o', h: 't' };
  var EXCHANGE_EASE = 'cubic-bezier(0.77, 0, 0.175, 1)';
  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function mat(host, cfg) {
    cfg = cfg || {};
    var places = cfg.places || ['t', 'o'];
    var cap = cfg.cap || { h: 3, t: 19, o: 24 };
    var state = { h: 0, t: 0, o: 0 };
    var showCounts = cfg.showCounts !== false;
    var listeners = [];

    var box = el('div', 'mat');
    var top = el('div', 'mat-top');
    var name = el('div', 'mat-name', cfg.label || 'The mat');
    top.appendChild(name);
    var goal = el('div', 'mat-goal');
    if (cfg.goal) goal.textContent = cfg.goal;
    top.appendChild(goal);
    box.appendChild(top);

    var row = el('div', 'places');
    box.appendChild(row);

    var piles = {}, counts = {}, tradeBtns = {}, breakBtns = {};
    places.forEach(function (p) {
      var col = el('div', 'place');
      var pile = el('button', 'pile ' + (p === 'h' ? 'hunplace' : p === 't' ? 'tensplace' : 'onesplace'));
      pile.type = 'button';
      pile.setAttribute('aria-label', 'Take one ' + PLACE[p].one + ' back off the mat');
      pile.addEventListener('click', function () { take(p); });
      var cnt = el('div', 'place-n');
      col.appendChild(pile);
      col.appendChild(cnt);
      /* The exchanges sit under the pile they act on. One break button that
         chose for the child always broke a ten while any were left, so 412 - 30
         could not be done: the hundred it needed was never on offer. */
      var acts = el('div', 'place-acts');
      var up = UP[p], down = DOWN[p];
      if (cfg.trade !== false && up && places.indexOf(up) !== -1) {
        tradeBtns[p] = actBtn(acts, 'Trade 10 ' + PLACE[p].name + ' for 1 ' + PLACE[up].one,
          function () { tradeUp(p); });
      }
      if (cfg.breakTen && down && places.indexOf(down) !== -1) {
        breakBtns[p] = actBtn(acts, 'Break 1 ' + PLACE[p].one + ' into 10 ' + PLACE[down].name,
          function () { breakDown(p); });
      }
      col.appendChild(acts);
      row.appendChild(col);
      piles[p] = pile;
      counts[p] = cnt;
    });
    function actBtn(host, label, fn) {
      var b = el('button', 'btn act');
      b.type = 'button';
      b.innerHTML = icon('swap') + ' ' + label;
      b.addEventListener('click', fn);
      host.appendChild(b);
      return b;
    }

    var shelf = el('div', 'shelf');
    places.forEach(function (p) {
      var b = el('button');
      b.type = 'button';
      b.innerHTML = '<span class="chip ' + PLACE[p].cls + '" aria-hidden="true"></span>Add a ' + PLACE[p].one;
      b.addEventListener('click', function () { add(p); });
      shelf.appendChild(b);
      b.dataset.place = p;
    });

    var clearBtn = el('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear the mat';
    clearBtn.addEventListener('click', function () { set({ h: 0, t: 0, o: 0 }); });
    shelf.appendChild(clearBtn);
    box.appendChild(shelf);

    var live = el('p', 'sr');
    live.setAttribute('role', 'status');
    box.appendChild(live);

    function total() { return state.h * 100 + state.t * 10 + state.o; }

    function add(p) {
      if (state[p] >= cap[p]) {
        live.textContent = 'The ' + PLACE[p].name + ' pile is full. Trade some first.';
        return;
      }
      state[p]++;
      paint(p);
      say('One ' + PLACE[p].one + ' added.');
    }
    function take(p) {
      if (state[p] <= 0) { live.textContent = 'There are no ' + PLACE[p].name + ' to take back.'; return; }
      state[p]--;
      paint();
      say('One ' + PLACE[p].one + ' taken back.');
    }
    /* With no place given these keep the old order, ones before tens, so a
       caller that only ever had one trade button still gets the same move. */
    function tradeUp(p) {
      p = p || (state.o >= 10 ? 'o' : 't');
      var up = UP[p];
      if (!canTrade(p)) {
        live.textContent = state[p] < 10
          ? 'You need ten ' + PLACE[p].name + ' in the pile before you can trade.'
          : 'The ' + PLACE[up].name + ' pile is full.';
        return;
      }
      var from = lastBlocks(p, 10).map(function (b) { return { el: b, r: b.getBoundingClientRect() }; });
      state[p] -= 10; state[up] += 1;
      paint();
      gather(from, piles[up].lastElementChild, up);
      say('Ten ' + PLACE[p].name + ' traded for one ' + PLACE[up].one + '.');
    }
    function breakDown(p) {
      p = p || (state.t >= 1 ? 't' : 'h');
      var down = DOWN[p];
      if (!canBreak(p)) {
        live.textContent = state[p] < 1
          ? 'There is no ' + PLACE[p].one + ' to break.'
          : 'The ' + PLACE[down].name + ' pile is too full. Trade some first.';
        return;
      }
      var from = piles[p].lastElementChild.getBoundingClientRect();
      state[p] -= 1; state[down] += 10;
      paint();
      split(from, lastBlocks(down, 10), p);
      say('One ' + PLACE[p].one + ' broken into ten ' + PLACE[down].name + '.');
    }
    function canTrade(p) {
      var up = UP[p];
      return !!up && places.indexOf(up) !== -1 && state[p] >= 10 && state[up] < cap[up];
    }
    function canBreak(p) {
      var down = DOWN[p];
      return !!down && places.indexOf(down) !== -1 && state[p] >= 1 && state[down] + 10 <= cap[down];
    }
    function lastBlocks(p, n) {
      return Array.prototype.slice.call(piles[p].children, -n);
    }

    /* The exchange, shown. A rod is ten cubes stacked and a flat is ten rods
       side by side, so breaking one sends each new piece out from its own slice
       of the old block, and trading sends ten pieces into the slices of the new
       one. Same size in, same size out: nothing grows or shrinks, which is the
       point. Reduced motion keeps a fade so the change is still noticed. */
    function slice(r, whole, i) {
      // whole is the place of the big block: a rod slices top to bottom, a flat left to right.
      return whole === 't'
        ? { x: r.left + r.width / 2, y: r.top + r.height * (i + 0.5) / 10 }
        : { x: r.left + r.width * (i + 0.5) / 10, y: r.top + r.height / 2 };
    }
    function centre(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    function split(from, blocks, whole) {
      blocks.forEach(function (b, i) {
        if (reduceMotion()) {
          b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out', fill: 'backwards' });
          return;
        }
        var s = slice(from, whole, i), c = centre(b.getBoundingClientRect());
        b.animate([
          { transform: 'translate(' + (s.x - c.x) + 'px,' + (s.y - c.y) + 'px)' },
          { transform: 'none' }
        ], { duration: 450, delay: i * 40, easing: EXCHANGE_EASE, fill: 'backwards' });
      });
    }
    function gather(from, target, whole) {
      if (!target) return;
      var arrive = 0;
      if (!reduceMotion()) {
        var to = target.getBoundingClientRect(), base = box.getBoundingClientRect();
        from.forEach(function (f, i) {
          var g = f.el.cloneNode(false);
          g.className = f.el.className.replace(' fresh', '') + ' ghost';
          g.style.left = (f.r.left - base.left) + 'px';
          g.style.top = (f.r.top - base.top) + 'px';
          box.appendChild(g);
          var s = slice(to, whole, i), c = centre(f.r);
          g.animate([
            { transform: 'none' },
            { transform: 'translate(' + (s.x - c.x) + 'px,' + (s.y - c.y) + 'px)' }
          ], { duration: 450, delay: i * 30, easing: EXCHANGE_EASE, fill: 'forwards' })
            .onfinish = function () { g.remove(); };
        });
        arrive = 450 + 9 * 30;
      }
      target.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: 150, delay: arrive, easing: 'ease-out', fill: 'backwards' });
    }
    function say(msg) { live.textContent = msg + ' ' + describe(); }
    function describe() {
      return places.map(function (p) { return state[p] + ' ' + PLACE[p].name; }).join(', ') + '.';
    }

    function paint(fresh) {
      places.forEach(function (p) {
        var pile = piles[p];
        pile.innerHTML = '';
        for (var i = 0; i < state[p]; i++) {
          var b = el('span', 'blk ' + PLACE[p].cls + (fresh === p && i === state[p] - 1 ? ' fresh' : ''));
          pile.appendChild(b);
        }
        counts[p].textContent = showCounts
          ? state[p] + ' ' + (state[p] === 1 ? PLACE[p].one : PLACE[p].name)
          : '? ' + PLACE[p].name;
      });
      Object.keys(tradeBtns).forEach(function (q) { tradeBtns[q].disabled = !canTrade(q); });
      Object.keys(breakBtns).forEach(function (q) { breakBtns[q].disabled = !canBreak(q); });
      Array.prototype.forEach.call(shelf.querySelectorAll('[data-place]'), function (b) {
        b.disabled = state[b.dataset.place] >= cap[b.dataset.place];
      });
      listeners.forEach(function (fn) { fn(api); });
    }

    function set(next) {
      state = { h: next.h || 0, t: next.t || 0, o: next.o || 0 };
      paint();
    }

    var api = {
      el: box,
      get: function () { return { h: state.h, t: state.t, o: state.o }; },
      total: total,
      set: set,
      setLabel: function (s) { name.textContent = s; },
      setGoal: function (s) { goal.textContent = s; },
      showCounts: function (on) { showCounts = on; paint(); },
      onChange: function (fn) { listeners.push(fn); fn(api); return api; },
      tradeUp: tradeUp,
      breakDown: breakDown
    };

    host.appendChild(box);
    if (cfg.start) set(cfg.start); else paint();
    return api;
  }

  /** A read-only pile of blocks: the part of a problem the child is told,
      drawn in the same apparatus as the part they have to work out. Not a
      button, because there is nothing to tap. */
  function strip(host, n, label) {
    var box = el('div', 'strip');
    var p = parts(n);
    var cap = el('div', 'strip-label', label);
    box.appendChild(cap);
    var pile = el('div', 'strip-pile');
    pile.setAttribute('role', 'img');
    pile.setAttribute('aria-label', label + ': ' + p.h + ' hundreds, ' + p.t + ' tens and ' + p.o + ' ones');
    ['h', 't', 'o'].forEach(function (k) {
      for (var i = 0; i < p[k]; i++) pile.appendChild(el('span', 'blk ' + PLACE[k].cls));
    });
    box.appendChild(pile);
    host.appendChild(box);
    return box;
  }
  function parts(n) { return { h: Math.floor(n / 100), t: Math.floor(n / 10) % 10, o: n % 10 }; }

  /* ============================================================
     The hundred chart, one hundred at a time.

     Unit 5 works up to 1000, and a chart of 1 to 100 is no use for 652. It
     shows one hundred at a time instead: the cells are relabelled 601 to 700
     and the window follows the number, so a jump that crosses a hundred slides
     the chart with it. Collins asks for no chart at all in this unit, only
     Base 10 equipment, so this is here as the support the class already knows
     from Unit 4 rather than as something the source requires.

     Two personalities behind the one grid, as in Unit 4: passive, driven by a
     mat and covered so it never gives an answer away; and interactive, where
     the child moves the marker themselves.
     ============================================================ */

  /* 1 to 100 sits in window 0, 101 to 200 in window 100, 652 in window 600. */
  function hundredBase(n) {
    if (n <= 1) return 0;
    return Math.floor((n - 1) / 100) * 100;
  }

  function chart(host, cfg) {
    cfg = cfg || {};
    if (cfg.interactive) return interactiveChart(host, cfg);

    var wrap = el('div', 'chart-wrap');
    var caption = el('p', 'chart-range');
    wrap.appendChild(caption);
    /* The cover goes over the grid alone. Stretched across the whole wrap it
       also blacked out the caption saying which hundred is on screen. */
    var frame = el('div', 'chart-frame');
    var grid = el('div', 'chart');
    grid.setAttribute('role', 'img');
    var cells = [];
    for (var n = 1; n <= 100; n++) {
      var c = el('i', n % 10 === 0 ? 'tenth' : '', String(n));
      grid.appendChild(c);
      cells.push(c);
    }
    frame.appendChild(grid);

    var cover = el('div', 'chart-cover');
    cover.textContent = cfg.coverText || 'Answer first. Then the chart will show you.';
    cover.hidden = true;
    frame.appendChild(cover);
    wrap.appendChild(frame);
    host.appendChild(wrap);

    var base = 0;
    var visited = {};
    var current = null;
    var timer = null;

    function relabel(newBase) {
      base = newBase;
      cells.forEach(function (c, i) { c.textContent = String(base + i + 1); });
      caption.textContent = (base + 1) + ' to ' + (base + 100);
      grid.setAttribute('aria-label', 'A hundred chart, ' + (base + 1) + ' to ' + (base + 100));
      repaint();
    }
    function repaint() {
      cells.forEach(function (c, i) {
        var n = base + i + 1;
        c.classList.toggle('trail', !!visited[n] && n !== current);
        c.classList.toggle('here', n === current);
      });
    }
    function clear() {
      if (timer) { clearInterval(timer); timer = null; }
      visited = {};
      current = null;
      repaint();
    }
    function mark(n, cls) {
      if (cls === 'trail') visited[n] = true; else current = n;
      repaint();
    }
    function set(n) {
      clear();
      current = n;
      relabel(hundredBase(n));
    }
    /* The jump strategy as a check once the child has answered: the hundreds,
       then the tens down the rows, then the ones across. The window follows,
       so crossing from 460 into the next hundred is something they watch. */
    function hop(from, add, done) {
      clear();
      var path = [from], at = from, left = Math.abs(add), dir = add < 0 ? -1 : 1;
      while (left >= 100) { at += dir * 100; left -= 100; path.push(at); }
      while (left >= 10) { at += dir * 10; left -= 10; path.push(at); }
      while (left > 0) { at += dir; left -= 1; path.push(at); }
      var i = 0;
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      function step() {
        if (i > 0) visited[path[i - 1]] = true;
        current = path[i];
        if (hundredBase(current) !== base) relabel(hundredBase(current));
        else repaint();
        i++;
        if (i >= path.length) {
          if (timer) { clearInterval(timer); timer = null; }
          if (done) done();
        }
      }
      if (reduced) { i = path.length - 1; step(); return; }
      step();
      timer = setInterval(step, 190);
    }
    relabel(0);
    return {
      set: set, mark: mark, clear: clear, hop: hop,
      cover: function (on) { cover.hidden = !on; }
    };
  }

  function interactiveChart(host, cfg) {
    var wrap = el('div', 'chart-wrap big');
    var controls = el('div', 'chart-controls');

    var modeRow = el('div', 'seg');
    var tapBtn = el('button', null, 'Tap the chart');
    tapBtn.type = 'button';
    var stepBtn = el('button', null, 'Jump buttons');
    stepBtn.type = 'button';
    modeRow.appendChild(tapBtn);
    modeRow.appendChild(stepBtn);
    controls.appendChild(modeRow);

    var startRow = el('div', 'chart-start');
    var startLbl = el('label', null, 'Start at');
    var startInp = document.createElement('input');
    startInp.type = 'number';
    startInp.inputMode = 'numeric';
    startInp.min = '1';
    startInp.max = '1000';
    startLbl.appendChild(startInp);
    var startBtn = el('button', 'btn', 'Go');
    startBtn.type = 'button';
    var clearBtn = el('button', 'btn', 'Clear the chart');
    clearBtn.type = 'button';
    startRow.appendChild(startLbl);
    startRow.appendChild(startBtn);
    startRow.appendChild(clearBtn);
    controls.appendChild(startRow);

    /* Unit 5 adds and subtracts hundreds as well as tens and ones, so the
       jumps go up to a hundred at a time. */
    var stepRow = el('div', 'shelf');
    [['−100', -100], ['−10', -10], ['−1', -1],
     ['+1', 1], ['+10', 10], ['+100', 100]].forEach(function (pair) {
      var b = el('button', null, pair[0]);
      b.type = 'button';
      b.addEventListener('click', function () { step(pair[1]); });
      stepRow.appendChild(b);
    });
    controls.appendChild(stepRow);
    wrap.appendChild(controls);

    /* Which hundred is on screen, and a way to page through them by hand. */
    var pager = el('div', 'chart-pager');
    var prev = el('button', 'btn', '◀');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Show the hundred before this one');
    var caption = el('span', 'chart-range');
    var next = el('button', 'btn', '▶');
    next.type = 'button';
    next.setAttribute('aria-label', 'Show the hundred after this one');
    pager.appendChild(prev);
    pager.appendChild(caption);
    pager.appendChild(next);
    wrap.appendChild(pager);

    var scroller = el('div', 'chart-scroll');
    var grid = el('div', 'chart interactive');
    grid.setAttribute('role', 'group');
    var cells = [];
    for (var n = 1; n <= 100; n++) {
      var c = el('button', n % 10 === 0 ? 'tenth' : '', String(n));
      c.type = 'button';
      (function (index, btn) {
        btn.addEventListener('click', function () { onCellTap(base + index + 1); });
      })(n - 1, c);
      grid.appendChild(c);
      cells.push(c);
    }
    scroller.appendChild(grid);
    wrap.appendChild(scroller);

    var live = el('p', 'sr');
    live.setAttribute('role', 'status');
    wrap.appendChild(live);
    host.appendChild(wrap);

    var mode = 'tap', current = null, visited = {}, base = 0;

    function relabel(newBase) {
      base = Math.max(0, Math.min(900, newBase));
      cells.forEach(function (c, i) {
        var n = base + i + 1;
        c.textContent = String(n);
        c.setAttribute('aria-label', 'Go to ' + n);
      });
      caption.textContent = (base + 1) + ' to ' + (base + 100);
      grid.setAttribute('aria-label', 'A hundred chart, ' + (base + 1) + ' to ' + (base + 100)
        + '. Move around it yourself.');
      prev.disabled = base === 0;
      next.disabled = base === 900;
      repaint();
    }
    function repaint() {
      cells.forEach(function (c, i) {
        var n = base + i + 1;
        c.classList.toggle('trail', !!visited[n] && n !== current);
        c.classList.toggle('here', n === current);
      });
    }
    function setMode(m) {
      mode = m;
      tapBtn.setAttribute('aria-pressed', String(m === 'tap'));
      stepBtn.setAttribute('aria-pressed', String(m === 'step'));
      Array.prototype.forEach.call(stepRow.children, function (b) { b.disabled = m !== 'step'; });
    }
    tapBtn.addEventListener('click', function () { setMode('tap'); });
    stepBtn.addEventListener('click', function () { setMode('step'); });
    setMode('tap');

    function onCellTap(n) {
      if (mode !== 'tap') {
        live.textContent = 'Switch to "Tap the chart" to touch it directly, or use the jump buttons.';
        return;
      }
      go(n);
    }
    function step(delta) {
      if (current == null) { live.textContent = 'Type a start number and press Go first.'; return; }
      go(current + delta);
    }
    function go(n) {
      if (n < 1 || n > 1000) { live.textContent = 'That is off the edge of the chart.'; return; }
      if (current != null) visited[current] = true;
      current = n;
      relabel(hundredBase(n));
      live.textContent = 'You are on ' + n + '.';
    }
    function reset() {
      current = null;
      visited = {};
      relabel(0);
      live.textContent = 'Chart cleared.';
    }
    prev.addEventListener('click', function () { relabel(base - 100); });
    next.addEventListener('click', function () { relabel(base + 100); });
    startBtn.addEventListener('click', function () {
      var v = parseInt(startInp.value, 10);
      if (isNaN(v)) { live.textContent = 'Type a number from 1 to 1000 first.'; return; }
      go(v);
    });
    clearBtn.addEventListener('click', reset);
    relabel(0);

    return {
      reset: reset,
      go: go,
      current: function () { return current; },
      mark: function (n, cls) {
        if (n < 1 || n > 1000) return;
        if (cls === 'trail') visited[n] = true;
        if (hundredBase(n) !== base) relabel(hundredBase(n)); else repaint();
        var i = n - base - 1;
        if (cells[i]) cells[i].classList.add(cls || 'answer');
      }
    };
  }

  /* ============================================================
     The written column method, filled in as the child works
     ============================================================ */
  function col(host, cfg) {
    var box = el('div', 'col');
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', cfg.a + ' ' + (cfg.op === '-' ? 'subtract' : 'add') + ' ' + cfg.b);
    var carry = [el('span', 'carry'), el('span', 'carry'), el('span', 'carry'), el('span', 'carry')];
    var ansCells = [];

    function digits(n, width) {
      var s = String(n);
      while (s.length < width) s = ' ' + s;
      return s.split('');
    }
    function rowOf(text, opChar) {
      var cells = digits(text, 3);
      var out = [el('span', 'op', opChar || '')];
      cells.forEach(function (d) { out.push(el('span', '', d.trim())); });
      return out;
    }
    carry.forEach(function (c) { box.appendChild(c); });
    rowOf(cfg.a, '').forEach(function (n) { box.appendChild(n); });
    rowOf(cfg.b, cfg.op === '-' ? '−' : '+').forEach(function (n) { box.appendChild(n); });
    box.appendChild(el('div', 'rule'));
    var blank = el('span', 'op', '');
    box.appendChild(blank);
    for (var i = 0; i < 3; i++) {
      var c = el('span', 'hid', '?');
      box.appendChild(c);
      ansCells.push(c);
    }
    host.appendChild(box);
    return {
      carry: function (place, value) {
        // place 0 is hundreds, 1 tens, 2 ones, matching the digit columns.
        carry[place + 1].textContent = value;
      },
      answer: function (n) {
        var d = digits(n, 3);
        ansCells.forEach(function (c, i) {
          c.textContent = d[i].trim();
          c.className = d[i].trim() ? '' : 'hid';
        });
      }
    };
  }

  /* ============================================================
     Three numbers, and a choice of which pair to add first.

     This is Lesson 1, the associative property: 6 + 7 + 4 can be taken as
     (6 + 7) + 4 or as 6 + (4 + 7), and one of those grouping choices lands on
     ten and makes the rest easy. Every pair is allowed, because being allowed
     is the property. The page only ever says which pair was kinder.
     ============================================================ */
  function chain(host, cfg) {
    var parts = cfg.parts;
    var total = parts.reduce(function (a, b) { return a + b; }, 0);
    var picked = [];
    var solvedAsk = null;

    var box = el('div', 'chain');
    var prompt = el('p', 'chain-q', 'Tap two of these to add them first.');
    box.appendChild(prompt);

    var tileRow = el('div', 'chain-row');
    var tiles = parts.map(function (v, i) {
      var t = el('button', 'tile', String(v));
      t.type = 'button';
      t.setAttribute('aria-label', 'Add ' + v + ' first');
      t.addEventListener('click', function () { tap(i); });
      tileRow.appendChild(t);
      if (i < parts.length - 1) {
        var plus = el('span', 'chain-op', '+');
        tileRow.appendChild(plus);
      }
      return t;
    });
    box.appendChild(tileRow);

    var working = el('p', 'chain-working');
    working.setAttribute('role', 'status');
    box.appendChild(working);

    var again = el('button', 'btn', 'Try a different pair');
    again.type = 'button';
    again.hidden = true;
    again.addEventListener('click', reset);
    box.appendChild(again);

    var askHost = el('div');
    box.appendChild(askHost);
    host.appendChild(box);

    function tap(i) {
      if (picked.length >= 2) return;
      if (picked.indexOf(i) !== -1) return;
      picked.push(i);
      tiles[i].classList.add('chosen');
      if (picked.length === 1) {
        working.textContent = 'Now tap the second one.';
        return;
      }
      resolve();
    }

    function resolve() {
      var a = parts[picked[0]], b = parts[picked[1]];
      var pairSum = a + b;
      var restIndex = [0, 1, 2].filter(function (i) { return picked.indexOf(i) === -1; })[0];
      var rest = parts[restIndex];
      var best = cfg.easiest.slice().sort().join(',') === picked.slice().sort().join(',');

      working.textContent = a + ' + ' + b + ' = ' + pairSum + ', then ' + pairSum + ' + ' + rest + '.'
        + (best ? '  ' + cfg.why : '  That grouping is allowed too. ' + cfg.hintAtBest);
      working.className = 'chain-working ' + (best ? 'good' : 'fair');
      again.hidden = false;
      record({ task: cfg.task + ': grouping', result: best ? 'took the easy pair' : 'took ' + a + ' + ' + b });

      if (!solvedAsk) {
        solvedAsk = ask(askHost, {
          task: cfg.task,
          prompt: 'What is ' + parts.join(' + ') + '?',
          answer: total,
          nudge: 'Add your pair first, then add the number that is left.',
          hint: 'Your pair makes ' + pairSum + '. Now count on ' + rest + ' more from there.',
          praise: 'Correct.'
        });
      }
    }

    function reset() {
      picked = [];
      tiles.forEach(function (t) { t.classList.remove('chosen'); });
      working.textContent = 'Pick two again. The total will not change.';
      working.className = 'chain-working';
      again.hidden = true;
    }

    return { el: box };
  }

  /* ============================================================
     Questions
     ============================================================ */
  var askCount = 0;
  var FALLBACK = 'Not quite. Have another look at the blocks.';

  /** True when a message names the answer and the question did not already.
      The safety net under every hint: a page can be edited carelessly, and
      this keeps the answer off the screen anyway. */
  function givesAway(text, cfg) {
    if (cfg.answer === undefined || typeof cfg.accept === 'function' || !text) return false;
    var n = new RegExp('(^|[^0-9])' + cfg.answer + '(?![0-9])');
    return n.test(text) && !n.test(cfg.prompt || '');
  }

  function ask(host, cfg) {
    var id = 'ask' + (++askCount);
    var tries = 0, solved = false;

    var box = el('div', 'ask');
    var q = el('label', 'ask-q', cfg.prompt);
    q.setAttribute('for', id);
    box.appendChild(q);

    var row = el('div', 'ask-row');
    var inp = document.createElement('input');
    inp.type = 'number';
    inp.inputMode = 'numeric';
    inp.id = id;
    inp.placeholder = '?';
    inp.setAttribute('aria-describedby', id + '-fb');
    row.appendChild(inp);

    var btn = el('button', 'btn', 'Check');
    btn.type = 'button';
    row.appendChild(btn);

    var ra = readAloudButton(cfg.prompt);
    if (ra) row.appendChild(ra);
    box.appendChild(row);

    var fb = el('p', 'ask-fb');
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
      if (isNaN(v)) { fb.className = 'ask-fb'; fb.textContent = 'Type a number first, then press Check.'; return; }
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
        award(cfg.task || cfg.prompt, tries);
        if (cfg.onSolved) cfg.onSolved(v);
      } else {
        fb.className = 'ask-fb bad';
        // A nudge that sends them back to look at something, then a hint on how
        // to work it out. A child working alone must never be left with only
        // "no", and must never be handed the answer either: however many tries
        // it takes, the number has to come from them.
        var miss = typeof cfg.miss === 'function' ? cfg.miss(v) : null;
        var nudge = miss || cfg.nudge || FALLBACK;
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

  function choose(host, cfg) {
    var box = el('div', 'ask');
    var q = el('p', 'ask-q', cfg.prompt);
    box.appendChild(q);
    var ra = readAloudButton(cfg.prompt);
    if (ra) q.appendChild(ra);

    var group = el('div', 'choices');
    var fb = el('p', 'ask-fb');
    fb.setAttribute('role', 'status');
    var tries = 0, solved = false;

    cfg.options.forEach(function (opt) {
      var b = el('button', 'choice', opt.label);
      b.type = 'button';
      b.addEventListener('click', function () {
        if (solved) return;
        tries++;
        if (opt.right) {
          solved = true;
          b.dataset.state = 'right';
          box.classList.add('solved');
          fb.className = 'ask-fb good';
          fb.textContent = opt.why || cfg.praise || 'Yes.';
          record({ task: cfg.task || cfg.prompt, result: 'correct in ' + tries });
          award(cfg.task || cfg.prompt, tries);
          if (cfg.onSolved) cfg.onSolved(opt);
        } else {
          b.dataset.state = 'wrong';
          fb.className = 'ask-fb bad';
          fb.textContent = opt.why || cfg.nudge || 'Not this one. Look at the ones pile again.';
          record({ task: cfg.task || cfg.prompt, result: 'tried ' + opt.label });
        }
      });
      group.appendChild(b);
    });

    box.appendChild(group);
    box.appendChild(fb);
    host.appendChild(box);
    return { el: box, isSolved: function () { return solved; } };
  }

  /* ============================================================
     Page shell
     ============================================================ */
  function buildNav(steps, opts) {
    var rail = document.getElementById('rail');
    var live = document.getElementById('live');
    if (rail) steps.forEach(function (s, i) {
      var b = el('button');
      b.type = 'button';
      b.innerHTML = icon(s.icon) + '<span>' + s.label + '</span>';
      b.setAttribute('aria-label', 'Step ' + (i + 1) + ' of ' + steps.length + ': ' + s.label);
      b.addEventListener('click', function () { go(i); });
      rail.appendChild(b);
    });

    function go(n) {
      document.querySelectorAll('.screen').forEach(function (s) {
        s.classList.toggle('on', +s.dataset.s === n);
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

  function buildToolbar() {
    var bar = document.getElementById('toolbar');
    if (!bar) return;

    var badge = el('div', 'points');
    badge.id = 'yardBadge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', purse.points + ' points');
    badge.innerHTML = icon('coin', 'icon-lg') +
      '<span class="n" id="yardCount">' + purse.points + '</span><span class="l">points</span>';
    bar.appendChild(badge);

    var board = el('button');
    board.type = 'button';
    board.setAttribute('aria-pressed', 'false');
    board.innerHTML = icon('board') + '<span>Board mode</span>';
    board.addEventListener('click', function () {
      var on = document.documentElement.hasAttribute('data-board');
      if (on) document.documentElement.removeAttribute('data-board');
      else document.documentElement.setAttribute('data-board', '');
      board.setAttribute('aria-pressed', String(!on));
    });
    bar.appendChild(board);

    var panel = document.getElementById('summary');
    if (!panel) return;

    var sum = el('button');
    sum.type = 'button';
    sum.innerHTML = icon('clip') + '<span>Session summary</span>';
    sum.addEventListener('click', function () { renderSummary(panel); });
    bar.appendChild(sum);

    var next = el('button');
    next.type = 'button';
    next.innerHTML = icon('swap') + '<span>New pupil</span>';
    next.setAttribute('aria-label', 'Clear the points for a new pupil');
    next.addEventListener('click', function () {
      if (window.confirm('Clear the points and start again for a new pupil?')) {
        log.length = 0;
        resetPurse();
        panel.classList.remove('show');
      }
    });
    bar.appendChild(next);
  }

  function renderSummary(panel) {
    var body = panel.querySelector('[data-summary-body]');
    if (!body) return;
    if (!log.length) {
      body.innerHTML = '<p>Nothing attempted yet on this device.</p>';
    } else {
      var counts = {};
      log.forEach(function (e) {
        counts[e.task] = counts[e.task] || { tries: 0, got: false, last: '' };
        counts[e.task].tries++;
        counts[e.task].last = e.at;
        if (/^correct/.test(e.result)) counts[e.task].got = true;
      });
      var rows = Object.keys(counts).map(function (k) {
        var c = counts[k];
        return '<tr><td>' + k + '</td><td>' + c.tries + '</td><td>' +
          (c.got ? 'solved' : 'still trying') + '</td><td>' + c.last + '</td></tr>';
      }).join('');
      body.innerHTML = '<table><thead><tr><th>Question</th><th>Tries</th><th>State</th>' +
        '<th>Last</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
    panel.classList.add('show');
  }

  function renderMyWork() {
    var host = document.getElementById('myWork');
    if (!host) return;
    if (!purse.items.length) {
      host.innerHTML = '<p>No questions solved yet. Have a go above.</p>';
      return;
    }
    var rows = purse.items.map(function (i) {
      return '<tr><td>' + i.task + '</td><td>' + i.tries + '</td><td>' + i.points + '</td></tr>';
    }).join('');
    host.innerHTML =
      '<p><strong>' + purse.points + ' points</strong> from ' + purse.solved +
      ' question' + (purse.solved === 1 ? '' : 's') + ', ' + purse.firstTry + ' of them first try.</p>' +
      '<table><thead><tr><th>Question</th><th>Tries</th><th>Points</th></tr></thead><tbody>' +
      rows + '</tbody></table>';
  }

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

  function buildReadAloud() {
    document.querySelectorAll('[data-read]').forEach(function (node) {
      if (node.querySelector('.say')) return;
      var b = readAloudButton(node.getAttribute('data-read') || node.textContent);
      if (b) node.appendChild(b);
    });
  }

  function init(steps, opts) {
    injectSprite();
    loadPurse();
    buildToolbar();
    paintPurse(0);
    buildNav(steps, opts);
    buildKeyWords();
    buildReadAloud();
    renderMyWork();
  }

  window.Yard = {
    init: init, icon: icon, speak: speak, record: record, award: award,
    mat: mat, strip: strip, chart: chart, col: col, ask: ask, choose: choose,
    chain: chain,
    renderMyWork: renderMyWork
  };
})();
