/* ============================================================
   Year 3 Fun Zone — page engine and the four games.
   Rules: design-system/mns-classroom/pages/fun-zone.md

   Nothing leaves the device. No network, no localStorage, no cookies.
   sessionStorage holds one anonymous number (the star tally) and a list of
   task labels, so a stray refresh does not wipe a whole golden time.
   ============================================================ */
'use strict';
var FunZone = (function () {

  /* ---------- small helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function shuffle(list, random) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor((random || Math.random)() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }
  function say(host, message, tone) {
    host.textContent = message;
    host.className = 'say' + (tone ? ' ' + tone : '');
  }

  /* ---------- icon sprite: SVG only, never emoji ---------- */
  var ICONS = {
    'i-star': '<path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9z"/>',
    'i-back': '<path d="M15 5l-7 7 7 7"/>',
    'i-word': '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>',
    'i-hunt': '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    'i-leaf': '<path d="M5 19c0-8 5-13 14-13 0 9-5 13-14 13z"/><path d="M5 19c3-4 6-6 10-8"/>',
    'i-lock': '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    'i-tick': '<path d="M5 12.5l4.5 4.5L19 7"/>',
    'i-team': '<circle cx="9" cy="9" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8" r="2.5"/><path d="M16 14c3 0 5 2.4 5 6"/>'
  };
  function sprite() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    var markup = '';
    Object.keys(ICONS).forEach(function (id) {
      markup += '<symbol id="' + id + '" viewBox="0 0 24 24">' + ICONS[id] + '</symbol>';
    });
    svg.innerHTML = markup;
    document.body.insertBefore(svg, document.body.firstChild);
  }
  function icon(name, big) {
    return '<svg class="icon' + (big ? ' icon-lg' : '') + '" aria-hidden="true"><use href="#' + name + '"></use></svg>';
  }

  /* ---------- stars: one award per task, nothing ever taken away ---------- */
  var KEY_STARS = 'funzone-stars';
  var KEY_DONE = 'funzone-done';
  function store(key, value) {
    try {
      if (value === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, value);
    } catch (e) { /* private mode, or storage off: the games still work */ }
    return null;
  }
  var stars = parseInt(store(KEY_STARS) || '0', 10) || 0;
  var done = (store(KEY_DONE) || '').split(',').filter(Boolean);

  function paintStars() {
    var badge = $('#stars');
    if (badge) badge.innerHTML = icon('i-star') + ' <span>' + stars + '</span>';
  }
  function award(task, amount) {
    if (done.indexOf(task) !== -1) return false;
    done.push(task);
    stars += amount;
    store(KEY_STARS, String(stars));
    store(KEY_DONE, done.join(','));
    paintStars();
    var badge = $('#stars');
    if (badge) { badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop'); }
    return true;
  }
  function isDone(task) { return done.indexOf(task) !== -1; }

  function newPupil() {
    stars = 0; done = [];
    store(KEY_STARS, '0'); store(KEY_DONE, '');
    paintStars();
    $$('.zone .done').forEach(function (mark) { mark.remove(); });
    startWord(); startHunt(); startJigsaw(); startEscape();
    show('hub');
  }

  /* ---------- screens ---------- */
  function show(id) {
    $$('.screen').forEach(function (screen) { screen.classList.toggle('on', screen.id === id); });
    $$('#rail button').forEach(function (tab) {
      tab.setAttribute('aria-pressed', String(tab.dataset.go === id));
    });
    var open = $('#' + id);
    if (!open) return;
    var heading = open.querySelector('h1, h2');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus(); }
  }
  function markDone(zoneId) {
    var card = $('#card-' + zoneId);
    if (card && !card.querySelector('.done')) {
      var mark = el('span', 'done');
      mark.innerHTML = icon('i-tick');
      card.appendChild(mark);
    }
  }

  /* ============================================================
     1. WORD BUILDER — four letter words from the unit vocabulary
     ============================================================ */
  var WORDS = {
    verbs: ['GROW', 'JUMP', 'HELP', 'HIDE', 'HOLD', 'PULL', 'PUSH', 'SWIM', 'RIDE',
            'WAIT', 'TURN', 'SKIP', 'LIFT', 'LOOK', 'PLAN', 'SORT'],
    plants: ['LEAF', 'STEM', 'ROOT', 'SEED', 'SOIL', 'BULB', 'TREE'],
    team: ['TEAM', 'KIND', 'FAIR', 'CARE', 'TALK', 'JOIN', 'RULE', 'PART'],
    maths: ['EVEN', 'TENS', 'ONES', 'PAIR', 'STEP', 'NEXT', 'MORE', 'LESS', 'HALF', 'ZERO']
  };
  var ANSWERS = WORDS.verbs.concat(WORDS.plants, WORDS.team, WORDS.maths);
  var ROWS = 6, LEN = 4;
  var wordState = null;

  function dayIndex() {
    var now = new Date();
    var days = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    return days % ANSWERS.length;
  }

  function startWord(step) {
    var index = wordState ? (wordState.index + (step || 1)) % ANSWERS.length : dayIndex();
    wordState = { index: index, answer: ANSWERS[index], guesses: [], typed: '', over: false, seen: {} };
    var board = $('#word-board');
    board.innerHTML = '';
    for (var r = 0; r < ROWS; r++) {
      var row = el('div', 'row');
      row.setAttribute('role', 'row');
      for (var c = 0; c < LEN; c++) { row.appendChild(el('div', 'cell')); }
      board.appendChild(row);
    }
    $$('#word-keys .key').forEach(function (key) { key.className = 'key' + (key.dataset.act ? ' wide' : ''); });
    $('#word-wall').hidden = true;
    $('#word-wall-btn').setAttribute('aria-pressed', 'false');
    buildWall();
    say($('#word-say'), 'Six tries. Tap the letters.');
    paintWord();
  }

  function buildWall() {
    var wall = $('#word-wall');
    wall.innerHTML = '';
    var others = shuffle(ANSWERS.filter(function (w) { return w !== wordState.answer; })).slice(0, 11);
    shuffle(others.concat([wordState.answer])).forEach(function (w) {
      wall.appendChild(el('span', null, w));
    });
  }

  function paintWord() {
    var rows = $$('#word-board .row');
    rows.forEach(function (row, r) {
      var cells = $$('.cell', row);
      var guess = wordState.guesses[r];
      cells.forEach(function (cell, c) {
        if (guess) {
          cell.textContent = guess.word[c];
          cell.className = 'cell ' + guess.marks[c];
        } else if (r === wordState.guesses.length && !wordState.over) {
          cell.textContent = wordState.typed[c] || '';
          cell.className = 'cell' + (c === wordState.typed.length ? ' here' : '');
        } else {
          cell.textContent = '';
          cell.className = 'cell';
        }
      });
    });
  }

  /* Two passes, so a letter is only called "somewhere else" as often as it
     really appears: the standard rule, and the one children compare against. */
  function markGuess(guess, answer) {
    var marks = new Array(LEN).fill('gone');
    var left = {};
    var i;
    for (i = 0; i < LEN; i++) {
      if (guess[i] === answer[i]) marks[i] = 'spot';
      else left[answer[i]] = (left[answer[i]] || 0) + 1;
    }
    for (i = 0; i < LEN; i++) {
      if (marks[i] === 'spot') continue;
      if (left[guess[i]]) { marks[i] = 'near'; left[guess[i]]--; }
    }
    return marks;
  }

  function keyRank(mark) { return mark === 'spot' ? 3 : mark === 'near' ? 2 : 1; }
  function paintKeys(word, marks) {
    for (var i = 0; i < LEN; i++) {
      var letter = word[i];
      if (keyRank(marks[i]) >= keyRank(wordState.seen[letter] || '')) wordState.seen[letter] = marks[i];
    }
    $$('#word-keys .key').forEach(function (key) {
      var letter = key.dataset.key;
      if (!letter) return;
      key.className = 'key' + (wordState.seen[letter] ? ' ' + wordState.seen[letter] : '');
    });
  }

  function typeLetter(letter) {
    if (wordState.over || wordState.typed.length >= LEN) return;
    wordState.typed += letter;
    paintWord();
  }
  function rubOut() {
    if (wordState.over) return;
    wordState.typed = wordState.typed.slice(0, -1);
    paintWord();
  }
  function tryWord() {
    if (wordState.over) return;
    if (wordState.typed.length < LEN) { say($('#word-say'), 'Four letters, then tap Go.', 'try'); return; }
    var word = wordState.typed;
    var marks = markGuess(word, wordState.answer);
    wordState.guesses.push({ word: word, marks: marks });
    wordState.typed = '';
    paintKeys(word, marks);
    paintWord();
    if (word === wordState.answer) {
      wordState.over = true;
      var tries = wordState.guesses.length;
      say($('#word-say'), 'You got it in ' + tries + (tries === 1 ? ' try.' : ' tries.'), 'good');
      award('word-' + wordState.answer, tries === 1 ? 15 : 10);
      markDone('word');
    } else if (wordState.guesses.length >= ROWS) {
      wordState.over = true;
      say($('#word-say'), 'The word was ' + wordState.answer + '. Try another one.', 'try');
    } else {
      say($('#word-say'), 'Green is in the right place. Yellow is in the word.');
    }
  }

  /* ============================================================
     2. WORD HUNT — tap the first letter, then the last one
     ============================================================ */
  var HUNT_WORDS = ['SEED', 'STEM', 'ROOT', 'LEAF', 'SOIL', 'GROW',
                    'TEAM', 'KIND', 'FAIR', 'HELP', 'VERB', 'TENS'];
  var SIZE = 10;
  var huntState = null;

  function startHunt() {
    var built = WordGrid.build(HUNT_WORDS, SIZE);
    huntState = { built: built, found: [], pick: null };
    var grid = $('#hunt-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = 'repeat(' + SIZE + ', auto)';
    built.grid.forEach(function (line, r) {
      line.forEach(function (letter, c) {
        var cell = el('button', 'gcell', letter);
        cell.type = 'button';
        cell.dataset.r = r; cell.dataset.c = c;
        cell.setAttribute('aria-label', 'letter ' + letter + ', row ' + (r + 1) + ', column ' + (c + 1));
        grid.appendChild(cell);
      });
    });
    var list = $('#hunt-list');
    list.innerHTML = '';
    HUNT_WORDS.forEach(function (word) {
      var item = el('li', null, word);
      item.dataset.word = word;
      list.appendChild(item);
    });
    say($('#hunt-say'), 'Tap the first letter, then the last letter.');
  }

  function huntCell(r, c) { return $('#hunt-grid .gcell[data-r="' + r + '"][data-c="' + c + '"]'); }

  function huntTap(cell) {
    var r = +cell.dataset.r, c = +cell.dataset.c;
    // A found cell stays tappable: words cross each other, so the first letter
    // of the next word is often the last letter of one already found.
    if (!huntState.pick) {
      huntState.pick = { r: r, c: c };
      cell.classList.add('pick');
      say($('#hunt-say'), 'Now tap the last letter of the word.');
      return;
    }
    var first = huntState.pick;
    huntState.pick = null;
    $$('#hunt-grid .pick').forEach(function (picked) { picked.classList.remove('pick'); });
    var match = null;
    huntState.built.placed.forEach(function (p) {
      var endR = p.r + p.dr * (p.word.length - 1), endC = p.c + p.dc * (p.word.length - 1);
      var forwards = p.r === first.r && p.c === first.c && endR === r && endC === c;
      var backwards = endR === first.r && endC === first.c && p.r === r && p.c === c;
      if (forwards || backwards) match = p;
    });
    if (!match) { say($('#hunt-say'), 'Not a word this time. Have another look.', 'try'); return; }
    if (huntState.found.indexOf(match.word) === -1) huntState.found.push(match.word);
    for (var i = 0; i < match.word.length; i++) {
      var found = huntCell(match.r + match.dr * i, match.c + match.dc * i);
      if (found) { found.classList.add('found'); }
    }
    var item = $('#hunt-list li[data-word="' + match.word + '"]');
    if (item) item.classList.add('got');
    say($('#hunt-say'), 'Found ' + match.word + '.', 'good');
    if (huntState.found.length === HUNT_WORDS.length) {
      say($('#hunt-say'), 'Every word found. Well done.', 'good');
      award('hunt-all', 10);
      markDone('hunt');
    }
  }

  /* ============================================================
     3. PLANT PUZZLE — drag a piece, or tap a piece then tap a space
     ============================================================ */
  var PIECES = 6, COLS = 3;
  var jigState = null;

  function startJigsaw() {
    jigState = { placed: 0, held: null };
    var board = $('#jig-board'), tray = $('#jig-tray');
    board.innerHTML = ''; tray.innerHTML = '';
    for (var s = 0; s < PIECES; s++) {
      var slot = el('button', 'slot');
      slot.type = 'button';
      slot.dataset.slot = s;
      slot.setAttribute('aria-label', 'space ' + (s + 1) + ' of ' + PIECES);
      board.appendChild(slot);
    }
    shuffle(Array.from({ length: PIECES }, function (_, i) { return i; })).forEach(function (i) {
      tray.appendChild(makePiece(i));
    });
    say($('#jig-say'), 'Build the plant. Tap a piece, then tap a space.');
  }

  function makePiece(index) {
    var col = index % COLS, row = Math.floor(index / COLS);
    var piece = el('button', 'piece');
    piece.type = 'button';
    piece.dataset.piece = index;
    piece.setAttribute('aria-label', 'plant piece ' + (index + 1));
    piece.innerHTML = '<svg viewBox="' + (col * 100) + ' ' + (row * 100) + ' 100 100" ' +
      'aria-hidden="true"><use href="#plant-scene"></use></svg>';
    return piece;
  }

  function jigPick(piece) {
    if (piece.classList.contains('set')) return;
    $$('#jig-tray .lift').forEach(function (lifted) { lifted.classList.remove('lift'); });
    if (jigState.held === piece) { jigState.held = null; return; }
    jigState.held = piece;
    piece.classList.add('lift');
    say($('#jig-say'), 'Now tap the space where it goes.');
  }

  function jigDrop(slot) {
    var piece = jigState.held;
    if (!piece) { say($('#jig-say'), 'Tap a piece first.', 'try'); return; }
    if (slot.querySelector('.piece')) { say($('#jig-say'), 'That space is taken.', 'try'); return; }
    if (slot.dataset.slot !== piece.dataset.piece) {
      say($('#jig-say'), 'That piece belongs in another space. Look at the picture.', 'try');
      return;
    }
    piece.classList.remove('lift');
    piece.classList.add('set');
    slot.appendChild(piece);
    jigState.held = null;
    jigState.placed++;
    if (jigState.placed === PIECES) {
      say($('#jig-say'), 'The plant is complete. Can you name every part?', 'good');
      $('#jig-labels').hidden = false;
      award('jig-plant', 10);
      markDone('jig');
    } else {
      say($('#jig-say'), 'That fits. ' + (PIECES - jigState.placed) + ' to go.', 'good');
    }
  }

  /* Dragging is the extra, not the way in: every piece can still be tapped,
     which is what a keyboard and a shaky hand both need. */
  function dragging() {
    var held = null, ghost = null, moved = false, startX = 0, startY = 0;
    document.addEventListener('pointerdown', function (event) {
      var piece = event.target.closest && event.target.closest('#jig-tray .piece');
      if (!piece) return;
      held = piece; moved = false;
      startX = event.clientX; startY = event.clientY;
    });
    document.addEventListener('pointermove', function (event) {
      if (!held) return;
      if (!moved && Math.abs(event.clientX - startX) < 8 && Math.abs(event.clientY - startY) < 8) return;
      if (!moved) {
        moved = true;
        ghost = held.cloneNode(true);
        ghost.className = 'piece lift';
        ghost.style.position = 'fixed';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '20';
        document.body.appendChild(ghost);
        held.style.opacity = '.4';
      }
      ghost.style.left = (event.clientX - 40) + 'px';
      ghost.style.top = (event.clientY - 40) + 'px';
      var under = document.elementFromPoint(event.clientX, event.clientY);
      var slot = under && under.closest ? under.closest('.slot') : null;
      $$('#jig-board .over').forEach(function (hot) { hot.classList.remove('over'); });
      if (slot) slot.classList.add('over');
    });
    document.addEventListener('pointerup', function (event) {
      if (!held) return;
      var piece = held, wasMoved = moved;
      held = null; moved = false;
      piece.style.opacity = '';
      if (ghost) { ghost.remove(); ghost = null; }
      $$('#jig-board .over').forEach(function (hot) { hot.classList.remove('over'); });
      if (!wasMoved) return;                       // a tap: the click handler takes it
      var under = document.elementFromPoint(event.clientX, event.clientY);
      var slot = under && under.closest ? under.closest('.slot') : null;
      if (!slot) return;
      jigState.held = piece;
      jigDrop(slot);
    });
  }

  /* ============================================================
     4. ESCAPE ROOMS — four rooms, one digit each
     ============================================================ */
  var ROOMS = [
    {
      id: 'verbs', name: 'The Action Room', subject: 'English',
      tasks: [
        { q: 'Which word is a verb?',
          opts: [
            { text: 'ladder', why: 'A ladder is a thing, so it is a noun.' },
            { text: 'climbed', why: 'Yes. Climbed is something you do, so it is a verb.' },
            { text: 'brave', why: 'Brave tells us what someone is like, so it is an adjective.' },
            { text: 'slowly', why: 'Slowly tells us how, so it is an adverb.' }
          ], answer: 1 },
        { q: 'The rope is ______ down the wall. Choose the correct spelling.',
          opts: [
            { text: 'sliping', why: 'This one is missing a letter. After a short vowel we double the last letter.' },
            { text: 'slipping', why: 'Yes. Short vowel, so the p doubles before we add ing.' },
            { text: 'slippping', why: 'One p too many. We only double the last letter once.' }
          ], answer: 1 }
      ],
      digit: { q: 'How many verbs are in this sentence? The girl ran to the gate and pulled the rope.', answer: 2 }
    },
    {
      id: 'count', name: 'The Counting Room', subject: 'Maths',
      tasks: [
        { q: 'Carry on the count in fours. 4, 8, 12, ___',
          opts: [
            { text: '14', why: 'That is two more, not four more.' },
            { text: '16', why: 'Yes. Four more than twelve is sixteen.' },
            { text: '20', why: 'That is eight more. You have skipped a step.' }
          ], answer: 1 },
        { q: 'Which number is even?',
          opts: [
            { text: '17', why: 'Seventeen cannot be shared into two equal groups, so it is odd.' },
            { text: '23', why: 'Twenty three is odd. Even numbers end in 0, 2, 4, 6 or 8.' },
            { text: '36', why: 'Yes. Thirty six ends in a six, so it is even.' }
          ], answer: 2 }
      ],
      digit: { q: 'Eight sweets are packed in pairs. How many pairs is that?', answer: 4 }
    },
    {
      id: 'plants', name: 'The Greenhouse', subject: 'Science',
      tasks: [
        { q: 'Which part of the plant takes in water from the soil?',
          opts: [
            { text: 'the flower', why: 'The flower makes the seeds. It does not drink.' },
            { text: 'the roots', why: 'Yes. The roots take in water and hold the plant still.' },
            { text: 'the leaf', why: 'Leaves use the light. The water comes up from below.' }
          ], answer: 1 },
        { q: 'A seed is planted in the dark cupboard with water and soil. What is missing?',
          opts: [
            { text: 'light', why: 'Yes. A plant needs light as well as water and air.' },
            { text: 'a pot', why: 'A pot is handy, but a plant can grow without one.' },
            { text: 'a label', why: 'A label helps us, not the plant.' }
          ], answer: 0 }
      ],
      digit: { q: 'A plant needs light, water and air. How many things is that?', answer: 3 }
    },
    {
      id: 'team', name: 'The Team Room', subject: 'Citizenship',
      tasks: [
        { q: 'Your group cannot agree on a plan. What helps the team most?',
          opts: [
            { text: 'Talk over everyone else.', why: 'Nobody can hear a good idea in all that noise.' },
            { text: 'Listen to each idea, then vote.', why: 'Yes. Everyone is heard and the team still decides.' },
            { text: 'Do it on your own.', why: 'The job may get done, but the team has stopped being a team.' }
          ], answer: 1 },
        { q: 'One person in your team has finished. What is the kind thing to do?',
          opts: [
            { text: 'Ask them to help someone who is stuck.', why: 'Yes. A team finishes together.' },
            { text: 'Let them sit and wait.', why: 'They could be helping. The team is still working.' },
            { text: 'Give them all the tidying.', why: 'That is not fair. Jobs are shared.' }
          ], answer: 0 }
      ],
      digit: { q: 'Twelve jobs are shared fairly between two teams. How many jobs does each team get?', answer: 6 }
    }
  ];
  var escState = null;

  function startEscape() {
    escState = { digits: {}, room: null, typed: '' };
    var doors = $('#esc-doors');
    doors.innerHTML = '';
    ROOMS.forEach(function (room) {
      var door = el('button', 'door');
      door.type = 'button';
      door.dataset.room = room.id;
      door.innerHTML = icon('i-lock', true) + '<strong>' + room.name + '</strong>' +
        '<span>' + room.subject + '</span><span class="digit" data-digit></span>';
      doors.appendChild(door);
    });
    $('#esc-room').hidden = true;
    $('#esc-final').hidden = true;
    escPaintCode();
    say($('#esc-say'), 'Four rooms. Each one gives you one number of the code.');
  }

  function openRoom(id) {
    var room = ROOMS.filter(function (r) { return r.id === id; })[0];
    if (!room) return;
    escState.room = room;
    var host = $('#esc-room');
    host.hidden = false;
    host.innerHTML = '';
    host.appendChild(el('h3', null, room.name));
    room.tasks.forEach(function (task, index) {
      host.appendChild(taskCard(room, task, index, false));
    });
    host.appendChild(taskCard(room, room.digit, room.tasks.length, true));
    $('#esc-doors').hidden = true;
    var back = el('button', 'btn ghost', 'Back to the doors');
    back.type = 'button';
    back.dataset.act = 'esc-doors';
    host.appendChild(back);
    host.querySelector('h3').setAttribute('tabindex', '-1');
    host.querySelector('h3').focus();
  }

  function taskCard(room, task, index, isDigit) {
    var card = el('div', 'task');
    var question = el('p', 'q', task.q);
    card.appendChild(question);
    var opts = el('div', 'opts');
    if (isDigit) {
      for (var n = 0; n <= 9; n++) {
        var pad = el('button', 'opt', String(n));
        pad.type = 'button';
        pad.dataset.digit = n;
        pad.dataset.room = room.id;
        opts.appendChild(pad);
      }
    } else {
      task.opts.forEach(function (opt, i) {
        var choice = el('button', 'opt', opt.text);
        choice.type = 'button';
        choice.dataset.pick = i;
        choice.dataset.room = room.id;
        choice.dataset.task = index;
        opts.appendChild(choice);
      });
    }
    card.appendChild(opts);
    card.appendChild(el('p', 'why'));
    return card;
  }

  function escChoose(button) {
    var room = ROOMS.filter(function (r) { return r.id === button.dataset.room; })[0];
    var task = room.tasks[+button.dataset.task];
    var pick = +button.dataset.pick;
    var card = button.closest('.task');
    $$('.opt', card).forEach(function (opt) { opt.classList.remove('good', 'bad'); });
    button.classList.add(pick === task.answer ? 'good' : 'bad');
    $('.why', card).textContent = task.opts[pick].why;
  }

  function escDigit(button) {
    var room = ROOMS.filter(function (r) { return r.id === button.dataset.room; })[0];
    var card = button.closest('.task');
    var value = +button.dataset.digit;
    $$('.opt', card).forEach(function (opt) { opt.classList.remove('good', 'bad'); });
    if (value !== room.digit.answer) {
      button.classList.add('bad');
      $('.why', card).textContent = 'Not that one. Work it out again, then tap another number.';
      return;
    }
    button.classList.add('good');
    $('.why', card).textContent = 'That is the number for this room. Write it down.';
    escState.digits[room.id] = value;
    var door = $('#esc-doors .door[data-room="' + room.id + '"]');
    if (door) {
      door.dataset.open = 'yes';
      $('[data-digit]', door).textContent = value;
    }
    award('esc-' + room.id, 5);
    escPaintCode();
  }

  function escPaintCode() {
    var boxes = $$('#esc-code b');
    ROOMS.forEach(function (room, i) {
      var got = escState.digits[room.id];
      boxes[i].textContent = got === undefined ? '' : got;
      boxes[i].classList.toggle('on', got !== undefined);
    });
    var all = ROOMS.every(function (room) { return escState.digits[room.id] !== undefined; });
    $('#esc-final').hidden = !all;
    if (all) {
      say($('#esc-say'), 'Every room is open. Tap the code into the lock.', 'good');
    }
  }

  function escLock(value) {
    if (escState.typed.length < 4) escState.typed += value;
    $('#esc-typed').textContent = escState.typed;
    if (escState.typed.length < 4) return;
    var want = ROOMS.map(function (room) { return escState.digits[room.id]; }).join('');
    if (escState.typed === want) {
      say($('#esc-say'), 'The lock opens. You are out.', 'good');
      award('esc-out', 10);
      markDone('esc');
    } else {
      say($('#esc-say'), 'The lock stays shut. Check the numbers on the doors.', 'try');
    }
    escState.typed = '';
    $('#esc-typed').textContent = '';
  }

  /* ============================================================
     wiring
     ============================================================ */
  function wire() {
    document.addEventListener('click', function (event) {
      var target = event.target.closest ? event.target.closest('[data-go],[data-act],[data-key],[data-room],[data-pick],[data-digit],[data-lock],.gcell,.piece,.slot') : null;
      if (!target) return;

      if (target.dataset.go) { show(target.dataset.go); return; }

      if (target.dataset.key) { typeLetter(target.dataset.key); return; }
      if (target.classList.contains('gcell')) { huntTap(target); return; }
      if (target.classList.contains('piece') && !target.classList.contains('set')) { jigPick(target); return; }
      if (target.classList.contains('slot')) { jigDrop(target); return; }
      if (target.dataset.lock) { escLock(target.dataset.lock); return; }
      if (target.dataset.pick !== undefined && target.dataset.task !== undefined) { escChoose(target); return; }
      if (target.dataset.digit !== undefined && target.dataset.room) { escDigit(target); return; }
      if (target.classList.contains('door')) { openRoom(target.dataset.room); return; }

      switch (target.dataset.act) {
        case 'go': tryWord(); break;
        case 'rub': rubOut(); break;
        case 'word-new': startWord(1); break;
        case 'word-wall':
          var wall = $('#word-wall');
          wall.hidden = !wall.hidden;
          target.setAttribute('aria-pressed', String(!wall.hidden));
          break;
        case 'hunt-new': startHunt(); break;
        case 'jig-new': startJigsaw(); $('#jig-labels').hidden = true; break;
        case 'esc-doors': $('#esc-room').hidden = true; $('#esc-doors').hidden = false; break;
        case 'esc-new': startEscape(); break;
        case 'board':
          var on = document.documentElement.hasAttribute('data-board');
          if (on) document.documentElement.removeAttribute('data-board');
          else document.documentElement.setAttribute('data-board', '');
          target.setAttribute('aria-pressed', String(!on));
          break;
        case 'new-pupil':
          // A shared iPad: check before wiping the last child's stars.
          if (window.confirm('Start again for a new pupil? The stars go back to zero.')) newPupil();
          break;
      }
    });

    /* A real keyboard works too, for the whiteboard and for anyone who prefers it. */
    document.addEventListener('keydown', function (event) {
      if (!$('#zone-word').classList.contains('on')) return;
      if (event.key === 'Enter') { tryWord(); event.preventDefault(); }
      else if (event.key === 'Backspace') { rubOut(); event.preventDefault(); }
      else if (/^[a-zA-Z]$/.test(event.key)) { typeLetter(event.key.toUpperCase()); }
    });

    dragging();
  }

  function start() {
    sprite();
    paintStars();
    wire();
    startWord();
    startHunt();
    startJigsaw();
    startEscape();
    ['word', 'hunt', 'jig', 'esc'].forEach(function (zone) {
      if (done.some(function (task) { return task.indexOf(zone + '-') === 0; })) markDone(zone);
    });
  }

  document.addEventListener('DOMContentLoaded', start);

  return { markGuess: markGuess, ANSWERS: ANSWERS, ROOMS: ROOMS, HUNT_WORDS: HUNT_WORDS, isDone: isDone };
})();
