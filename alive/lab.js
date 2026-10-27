/* ============================================================
   The Wild Lab — shared engine
   Science · Year 3 · Unit 4 Staying alive

   Each page holds its own content and calls Lab.* to build the rounds:
     Lab.quiz    one question at a time, multiple choice
     Lab.drag    drag cards into places (or tap a card, then tap a place)
     Lab.memory  turn over two cards, find the pairs
     Lab.arrows  tap the arrows in a food chain to turn them round

   Rules shared with the other pathways:
   - Hints say how to work it out. Nothing ever shows the child the answer,
     however many tries: a wrong card goes back, no place lights up.
   - State lives in memory only. Nothing is stored, nothing is sent.
   - The page makes no network request. Voices are mp3 files in audio/.
   ============================================================ */
'use strict';
(function () {
  var $ = function (id) { return document.getElementById(id); };

  function live(text) { var el = $('live'); if (el) el.textContent = text; }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* ---------- Recorded voices (The Bakery pattern) ----------
     Project rule: all audio is ElevenLabs, Alice for instructions and
     vocabulary, Daniel for stories and characters, speed 0.9 for EAL.
     Each line's file name is a hash of voice and words, so changing a
     sentence asks for a new recording. window.__spoken lists every line;
     the browser scan checks the files exist and make_bakery_audio.py
     records the missing ones. */
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
    if (!file) return;
    if (playing) { playing.pause(); playing = null; }
    var a = new Audio(file);
    playing = a;
    a.addEventListener('error', function () {
      live('The recording for this line is missing. Ask your teacher.');
    });
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
  }

  var SPEAK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' +
              '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>';
  function sayButton(text, voice) {
    var file = clip(text, voice);
    var b = el('button', 'say' + (voice === 'daniel' ? ' daniel' : ''));
    b.type = 'button';
    b.innerHTML = SPEAK;
    b.setAttribute('aria-label', 'Read this to me');
    b.addEventListener('click', function () { play(file); });
    return b;
  }

  /* Any element marked data-say gets a speaker button beside it. */
  function wireSay(root) {
    (root || document).querySelectorAll('[data-say]').forEach(function (t) {
      if (t.parentNode.classList.contains('said')) return;
      var box = el('div', 'said');
      t.parentNode.insertBefore(box, t);
      box.appendChild(t);
      box.appendChild(sayButton(t.textContent, t.getAttribute('data-say')));
    });
  }

  /* A picture is an emoji, or "svg:name" for a drawing in the page's <defs>. */
  function art(pic) {
    var s = el('span', 'art');
    s.setAttribute('aria-hidden', 'true');
    if (pic.indexOf('svg:') === 0) {
      s.innerHTML = '<svg viewBox="0 0 64 64"><use href="#a-' + pic.slice(4) + '"/></svg>';
    } else {
      s.textContent = pic;
    }
    return s;
  }
  function picture(item) {
    var f = document.createDocumentFragment();
    f.appendChild(art(item.art));
    f.appendChild(el('span', 'word', item.label));
    return f;
  }

  /* ---------- points, tricky list, badge ---------- */
  var cfg = {}, pts = 0, firstTry = 0, scored = 0, tricky = [];
  var widgets = window.__widgets = [];

  function addPts(n) {
    pts += n;
    $(cfg.countId).textContent = pts;
    $('fill').style.width = Math.min(100, Math.round(pts / cfg.total * 100)) + '%';
    var m = $('meter');
    m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop');
  }
  /* Full marks first time, half after a wrong try. Never lost for trying. */
  function award(full, tries) {
    scored++;
    if (tries === 0) firstTry++;
    addPts(tries === 0 ? full : Math.ceil(full / 2));
  }
  function note(t) { if (tricky.indexOf(t) === -1) tricky.push(t); }

  function feedback(box, kind, text) {
    box.className = 'fb show ' + kind;
    box.textContent = text;
    live(text);
  }

  /* ---------- screens ---------- */
  var screens = [];
  function show(n) {
    screens.forEach(function (s, i) { s.classList.toggle('on', i === n); });
    document.querySelectorAll('#rail button').forEach(function (b, i) {
      if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    var h = screens[n].querySelector('h2'); if (h) h.focus();
    if (n === screens.length - 1) fillBadge();
  }

  function fillBadge() {
    $('finalPts').textContent = pts;
    $('firstTry').textContent = 'First-time answers: ' + firstTry + ' out of ' + scored;
    var share = pts / cfg.total, r = cfg.ranks;
    $('rank').textContent = share >= 0.9 ? r[0] : share >= 0.7 ? r[1] : share >= 0.4 ? r[2] : r[3];
    var ul = $('tricky'); ul.textContent = '';
    var lines = tricky.length ? tricky
      : [scored ? 'Nothing tripped you up. Every answer was right first time.'
                : 'Nothing yet. Play the rounds first.'];
    lines.forEach(function (t) { ul.appendChild(el('li', null, t)); });
  }

  function init(c) {
    cfg = c;
    screens = Array.prototype.slice.call(document.querySelectorAll('section.screen'));
    document.querySelectorAll('#rail button').forEach(function (b, i) {
      b.addEventListener('click', function () { show(i); });
    });
    document.querySelectorAll('[data-go]').forEach(function (b) {
      if (b.closest('#rail')) return;
      b.addEventListener('click', function () { show(+b.getAttribute('data-go')); });
    });
    $('boardBtn').addEventListener('click', function () {
      var on = document.documentElement.hasAttribute('data-board');
      if (on) document.documentElement.removeAttribute('data-board');
      else document.documentElement.setAttribute('data-board', '');
      this.setAttribute('aria-pressed', String(!on));
    });
    $('again').addEventListener('click', function () { location.reload(); });

    var row = $('keyWords');
    (c.keys || []).forEach(function (k) {
      var card = el('div', 'kcard');
      var txt = el('div', 'ktext');
      txt.appendChild(el('b', null, k[0]));
      txt.appendChild(el('span', null, k[1]));
      card.appendChild(txt);
      card.appendChild(sayButton(k[0] + '. ' + k[1], 'alice'));
      row.appendChild(card);
    });
    wireSay();
  }

  /* A round's "Go to round N" button wakes up when the round is done. */
  function unlock(id) { var b = $(id); if (b) b.disabled = false; }

  /* ---------- Lab.quiz: one question at a time ----------
     items: { q, a: [...], c: index of the right one, hint, why }
     opts:  { pts, voice, label ('Question'), fixed (keep order), done } */
  function quiz(host, items, opts) {
    var qi = 0, tries = 0, answered = false;
    // List every question's recording now, not when it is drawn, so the scan
    // can see the lines a child only reaches later.
    items.forEach(function (item) { clip(item.q, opts.voice); });
    var box = el('div', 'ask');
    var num = el('p', 'qnum');
    var qtext = el('p', 'ask-q');
    var choices = el('div', 'choices' + (opts.fixed ? ' two' : ''));
    var fb = el('div', 'fb');
    var row = el('div', 'btnrow');
    var next = el('button', 'btn deep', 'Next question');
    next.type = 'button';
    row.appendChild(next);
    box.appendChild(num);
    var qline = el('div', 'said');
    qline.appendChild(qtext);
    box.appendChild(qline);
    box.appendChild(choices);
    host.appendChild(box); host.appendChild(fb); host.appendChild(row);

    function draw() {
      var item = items[qi];
      answered = false; tries = 0;
      num.textContent = (opts.label || 'Question') + ' ' + (qi + 1) + ' of ' + items.length;
      qtext.textContent = item.q;
      if (qline.lastChild !== qtext) qline.removeChild(qline.lastChild);
      qline.appendChild(sayButton(item.q, opts.voice));
      box.classList.remove('solved');
      fb.className = 'fb'; fb.textContent = '';
      next.disabled = true;
      next.style.display = qi === items.length - 1 ? 'none' : '';
      choices.textContent = '';
      var order = item.a.map(function (_, i) { return i; });
      if (!opts.fixed) shuffle(order);
      order.forEach(function (src, i) {
        var b = el('button', 'opt choice');
        b.type = 'button';
        if (!opts.fixed) b.appendChild(el('span', 'mark', 'ABC'.charAt(i)));
        b.appendChild(el('span', null, item.a[src]));
        b.addEventListener('click', function () { pick(src, b); });
        choices.appendChild(b);
      });
    }

    function pick(i, btn) {
      if (answered) return;
      var item = items[qi];
      if (i === item.c) {
        answered = true;
        btn.setAttribute('data-state', 'right');
        box.classList.add('solved');
        award(opts.pts, tries);
        feedback(fb, 'good', 'Correct. ' + item.why);
        choices.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
        next.disabled = false;
        if (qi === items.length - 1 && opts.done) opts.done();
      } else {
        tries++;
        btn.setAttribute('data-state', 'wrong'); btn.disabled = true;
        note(item.q);
        feedback(fb, 'bad', 'Not quite. ' + item.hint);
      }
    }

    next.addEventListener('click', function () {
      if (qi < items.length - 1) { qi++; draw(); box.scrollIntoView({ block: 'nearest' }); }
    });
    draw();
  }

  /* ---------- Lab.drag: cards into places ----------
     cfg: { prompt, voice, pts, layout ('body' | 'baskets' | 'row'),
            slots: [{ id, label, clue }], link (text under the arrows in a row),
            items: [{ id, label, art, target, hint }], hint (fallback), done, doneMsg }
     Drag with a finger, or tap a card and then tap the place. Only a right
     card stays in a place, so a place never shows a wrong answer. */
  function drag(host, c) {
    var box = el('div', 'ask drag');
    var q = el('p', 'ask-q', c.prompt);
    box.appendChild(q);
    var board = el('div', c.layout === 'baskets' ? 'baskets' : c.layout === 'row' ? 'row' : 'figure');
    var pool = el('div', 'pool');
    var fb = el('div', 'fb');
    var slotEls = {};
    var selected = null, left = c.items.length;

    c.slots.forEach(function (s, i) {
      if (c.layout === 'row' && i > 0) {
        var link = el('span', 'link');
        link.setAttribute('aria-hidden', 'true');
        link.appendChild(document.createTextNode('→'));
        if (c.link) link.appendChild(el('small', null, c.link));
        board.appendChild(link);
      }
      var b = el('button', 'slot');
      b.type = 'button';
      b.setAttribute('data-slot', s.id);
      b.appendChild(el('span', 'slot-name', s.label));
      if (s.clue) b.appendChild(el('span', 'slot-clue', s.clue));
      b.appendChild(el('div', 'slot-items'));
      b.setAttribute('aria-label', s.label + (s.clue ? ', ' + s.clue : ''));
      b.addEventListener('click', function () {
        if (selected) place(selected, b);
        else feedback(fb, 'info', 'First choose a card. Then tap where it goes.');
      });
      slotEls[s.id] = b;
      board.appendChild(b);
    });

    if (c.layout === 'body') {
      var wrap = el('div', 'bodymap');
      board.insertAdjacentHTML('afterbegin',
        '<svg viewBox="0 0 200 400" aria-hidden="true"><use href="#a-outline"/></svg>');
      wrap.appendChild(board); wrap.appendChild(pool);
      box.appendChild(wrap);
    } else {
      box.appendChild(board);
      if (c.after) box.appendChild(el('p', 'again', c.after));
      box.appendChild(pool);
    }
    box.appendChild(fb);
    host.appendChild(box);

    var cards = [];
    shuffle(c.items.slice()).forEach(function (item) {
      var card = el('button', 'chip');
      card.type = 'button';
      card.setAttribute('aria-pressed', 'false');
      card.appendChild(picture(item));
      item.tries = 0;
      item.card = card;
      item.file = clip(item.label, c.voice);
      cards.push(item);
      pool.appendChild(card);
      grab(card, item);
    });

    function choose(item) {
      cards.forEach(function (o) { o.card.setAttribute('aria-pressed', String(o === item)); });
      selected = item;
      play(item.file);
    }

    function place(item, slot) {
      if (!item.card.isConnected || !item.card.parentNode || item.done) return;
      var ok = slot.getAttribute('data-slot') === String(item.target);
      if (ok) {
        item.done = true;
        selected = null;
        var p = el('div', 'placed');
        p.appendChild(picture(item));
        slot.querySelector('.slot-items').appendChild(p);
        if (c.layout === 'row') slot.classList.add('full');
        item.card.remove();
        award(c.pts, item.tries);
        left--;
        if (left === 0) {
          box.classList.add('solved');
          feedback(fb, 'good', c.doneMsg || 'All done. Brilliant work!');
          if (c.done) c.done();
        } else {
          feedback(fb, 'good', 'Yes! ' + item.label + ' goes there.');
        }
      } else {
        item.tries++;
        note(c.noteAs ? c.noteAs(item) : item.label);
        var card = item.card;
        card.classList.remove('bad'); void card.offsetWidth; card.classList.add('bad');
        feedback(fb, 'bad', 'Not there. ' + (item.hint || c.hint));
      }
    }

    /* Pointer drag. A press that barely moves is a tap, and the click
       handler picks the card instead. */
    function grab(card, item) {
      var start = null, ghost = null, over = null, dragged = false;
      card.addEventListener('pointerdown', function (e) {
        if (item.done || e.button > 0) return;
        start = { x: e.clientX, y: e.clientY, id: e.pointerId };
        dragged = false;
        // Capture now, not once the drag starts: a quick finger can leave
        // the card before the first move, and the drag would be lost.
        try { card.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
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
          ghost.removeAttribute('aria-pressed');
          document.body.appendChild(ghost);
          card.classList.add('lifted');
          dragged = true;
          choose(item);
        }
        var w = ghost.offsetWidth, h = ghost.offsetHeight;
        ghost.style.transform = 'translate(' + (e.clientX - w / 2) + 'px,' + (e.clientY - h / 2) + 'px) rotate(-4deg) scale(1.05)';
        var hit = document.elementFromPoint(e.clientX, e.clientY);
        var slot = hit && hit.closest('.slot');
        if (slot && !box.contains(slot)) slot = null;
        if (over !== slot) {
          if (over) over.classList.remove('hover');
          if (slot) slot.classList.add('hover');
          over = slot;
        }
      });
      function end(e, cancelled) {
        if (!start) return;
        start = null;
        if (!ghost) return;
        ghost.remove(); ghost = null;
        card.classList.remove('lifted');
        if (over) {
          over.classList.remove('hover');
          if (!cancelled) place(item, over);
          over = null;
        }
      }
      card.addEventListener('pointerup', function (e) { end(e, false); });
      card.addEventListener('pointercancel', function (e) { end(e, true); });
      card.addEventListener('click', function () {
        if (dragged) { dragged = false; return; }
        if (!item.done) choose(item);
        feedback(fb, 'info', 'Now tap where ' + item.label + ' goes.');
      });
    }

    widgets.push({ el: box, solve: function () {
      cards.forEach(function (item) { if (!item.done) place(item, slotEls[item.target]); });
    } });
  }

  /* ---------- Lab.memory: find the pairs ----------
     cfg: { prompt, pts, voice, pairs: [{ a: { art, label }, b: { label } }], done, doneMsg } */
  function memory(host, c) {
    var box = el('div', 'ask');
    box.appendChild(el('p', 'ask-q', c.prompt));
    var grid = el('div', 'memory');
    var found = el('p', 'found');
    var fb = el('div', 'fb');
    box.appendChild(grid); box.appendChild(found); box.appendChild(fb);
    host.appendChild(box);

    var open = [], busy = false, got = 0, misses = {};
    var deck = [];
    c.pairs.forEach(function (p, i) {
      deck.push({ pair: i, art: p.a.art, label: p.a.label });
      deck.push({ pair: i, art: p.b.art || '', label: p.b.label });
    });
    function count() { found.textContent = 'Pairs found: ' + got + ' of ' + c.pairs.length; }
    count();

    shuffle(deck).forEach(function (card) {
      var b = el('button', 'flip');
      b.type = 'button';
      b.setAttribute('aria-label', 'Hidden card');
      var back = el('span', 'face back', '?');
      back.setAttribute('aria-hidden', 'true');
      var front = el('span', 'face front');
      if (card.art) front.appendChild(art(card.art));
      front.appendChild(el('span', 'word', card.label));
      b.appendChild(back); b.appendChild(front);
      card.btn = b;
      card.file = clip(card.label, c.voice);
      b.addEventListener('click', function () { turn(card); });
      grid.appendChild(b);
    });

    function turn(card) {
      if (busy || card.matched || open.indexOf(card) !== -1) return;
      card.btn.classList.add('up');
      card.btn.setAttribute('aria-label', card.label);
      play(card.file);
      open.push(card);
      if (open.length < 2) return;
      var a = open[0], b = open[1];
      if (a.pair === b.pair) {
        a.matched = b.matched = true;
        [a, b].forEach(function (x) { x.btn.classList.add('matched'); x.btn.disabled = true; });
        open = [];
        got++; count();
        award(c.pts, misses[a.pair] ? 1 : 0);
        if (got === c.pairs.length) {
          box.classList.add('solved');
          feedback(fb, 'good', c.doneMsg);
          if (c.done) c.done();
        } else {
          feedback(fb, 'good', 'A pair! ' + c.pairs[a.pair].a.label + ' and ' + c.pairs[a.pair].b.label + '.');
        }
      } else {
        busy = true;
        misses[a.pair] = misses[b.pair] = true;
        [a, b].forEach(function (x) { x.btn.classList.add('miss'); });
        feedback(fb, 'bad', c.hint);
        setTimeout(function () {
          [a, b].forEach(function (x) {
            x.btn.classList.remove('up', 'miss');
            x.btn.setAttribute('aria-label', 'Hidden card');
          });
          open = []; busy = false;
        }, 1300);
      }
    }

    widgets.push({ el: box, solve: function () {
      busy = false;
      open.forEach(function (x) { x.btn.classList.remove('up', 'miss'); });
      open = [];
      c.pairs.forEach(function (_, i) {
        var two = deck.filter(function (d) { return d.pair === i && !d.matched; });
        if (two.length === 2) { turn(two[0]); turn(two[1]); }
      });
    } });
  }

  /* ---------- Lab.arrows: turn the wrong arrows round ----------
     cfg: { prompt, pts, chain: [{ art, label }], wrong: [indexes of arrows drawn backwards],
            hint, done, doneMsg }
     The right way is always left to right: towards the one doing the eating. */
  function arrows(host, c) {
    var box = el('div', 'ask');
    box.appendChild(el('p', 'ask-q', c.prompt));
    var row = el('div', 'row arrows');
    var fb = el('div', 'fb');
    box.appendChild(row); box.appendChild(fb);
    host.appendChild(box);

    var links = [], fixed = 0;
    c.chain.forEach(function (beast, i) {
      if (i > 0) {
        var k = i - 1;
        var b = el('button', 'link');
        b.type = 'button';
        b.setAttribute('data-dir', c.wrong.indexOf(k) === -1 ? 'right' : 'left');
        b.innerHTML = '<span class="tip">→</span>';
        b.appendChild(el('small', null, 'tap to turn'));
        b.setAttribute('aria-label', 'Arrow between ' + c.chain[k].label + ' and ' + beast.label);
        b.addEventListener('click', function () { flip(k, b); });
        links.push(b);
        row.appendChild(b);
      }
      var cell = el('div', 'beast');
      cell.appendChild(picture(beast));
      row.appendChild(cell);
    });

    var credited = {};
    function flip(k, b) {
      if (box.classList.contains('solved')) return;
      var nowRight = b.getAttribute('data-dir') === 'left';
      b.setAttribute('data-dir', nowRight ? 'right' : 'left');
      if (nowRight && c.wrong.indexOf(k) !== -1 && !credited[k]) {
        credited[k] = true; fixed++;
        award(c.pts, 0);
      }
      if (!nowRight) note(c.noteText);
      var good = links.every(function (l) { return l.getAttribute('data-dir') === 'right'; });
      if (good) {
        box.classList.add('solved');
        links.forEach(function (l) { l.setAttribute('data-good', '1'); l.disabled = true; });
        feedback(fb, 'good', c.doneMsg);
        if (c.done) c.done();
      } else {
        feedback(fb, nowRight ? 'info' : 'bad', nowRight ? 'Keep checking. Are all the arrows right now?' : c.hint);
      }
    }

    widgets.push({ el: box, solve: function () {
      links.forEach(function (l, k) { if (l.getAttribute('data-dir') === 'left') flip(k, l); });
    } });
  }

  window.Lab = {
    init: init, quiz: quiz, drag: drag, memory: memory, arrows: arrows,
    unlock: unlock, clip: clip, play: play, sayButton: sayButton, note: note
  };
})();
