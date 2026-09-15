/* ============================================================
   The Lighthouse — weeks 2 and 3 practice, page engine and rooms.
   Rules: design-system/mns-classroom/pages/lighthouse.md

   The content matches the week 2 and week 3 homework booklets and extra
   practice packs (tools/unit-pipeline/homework/week-*.js and
   extra-practice/week-*.js). The questions are new ones, so a child who plays
   this has practised the same work rather than copied the answers home.

   Nothing leaves the device. No network, no localStorage, no cookies.
   sessionStorage holds the star tally and the list of finished tasks.
   ============================================================ */
'use strict';
var Lighthouse = (function () {

  /* ---------- small helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
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
    'i-spell': '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>',
    'i-build': '<rect x="4" y="13" width="6" height="7"/><rect x="14" y="9" width="6" height="11"/><path d="M4 9h6"/>',
    'i-stairs': '<path d="M3 20h5v-5h5v-5h5V5"/>',
    'i-lamp': '<path d="M12 3l3 5H9z"/><rect x="8" y="8" width="8" height="8" rx="1"/><path d="M7 20h10M4 10l3 1M20 10l-3 1"/>',
    'i-read': '<path d="M4 5h7v14H4z"/><path d="M13 5h7v14h-7z"/>',
    'i-tick': '<path d="M5 12.5l4.5 4.5L19 7"/>',
    'i-code': '<rect x="4" y="7" width="16" height="10" rx="2"/><path d="M8 11h2M14 11h2M8 14h8"/>'
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

  /* ---------- stars and the check code ---------- */
  var KEY_STARS = 'lighthouse-stars';
  var KEY_DONE = 'lighthouse-done';
  function store(key, value) {
    try {
      if (value === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, value);
    } catch (e) { /* private mode, or storage off: the rooms still work */ }
    return null;
  }
  var stars = parseInt(store(KEY_STARS) || '0', 10) || 0;
  var done = (store(KEY_DONE) || '').split(',').filter(Boolean);

  function paintStars() {
    var badge = $('#stars');
    if (badge) badge.innerHTML = icon('i-star') + ' <span>' + stars + '</span>';
    if ($('#code-out')) paintCode();
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

  /* The code a child types into Teams. It carries the star total in the open
     and two check letters worked out from the total and the number of tasks,
     so a bigger number cannot just be claimed. Verify it with
     tools/unit-pipeline/check_lighthouse_code.js. */
  var LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';
  function checkCode(total, tasks) {
    var seed = total * 31 + tasks * 7 + 11;
    // Three letters, not two: with two, a made up star total lands on a real
    // looking pair about half the time, which makes the check worth nothing.
    return 'LH' + total + '-' + LETTERS[seed % 20] + LETTERS[(seed >> 4) % 20] +
           LETTERS[(total * 13 + tasks * 29 + 7) % 20];
  }
  function paintCode() {
    $('#code-out').textContent = checkCode(stars, done.length);
    $('#code-tally').innerHTML = '<span>' + stars + ' stars</span><span>' +
      done.length + ' task' + (done.length === 1 ? '' : 's') + ' finished</span>';
  }

  function newPupil() {
    stars = 0; done = [];
    store(KEY_STARS, '0'); store(KEY_DONE, '');
    paintStars();
    $$('.room .done').forEach(function (mark) { mark.remove(); });
    startSpell(); startBuild(); startStairs(); startRooms(); startReading();
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
  function markDone(zone) {
    var card = $('#card-' + zone);
    if (card && !card.querySelector('.done')) {
      var mark = el('span', 'done');
      mark.innerHTML = icon('i-tick');
      card.appendChild(mark);
    }
  }

  /* ============================================================
     1. SPELL BEAM — the week 2 and week 3 spelling lists
     ============================================================ */
  var SPELL = [
    { word: 'CITY', clue: 'Week 2: soft c and soft g' },
    { word: 'RICE', clue: 'Week 2: soft c and soft g' },
    { word: 'HUGE', clue: 'Week 2: soft c and soft g' },
    { word: 'MAGIC', clue: 'Week 2: soft c and soft g' },
    { word: 'STAGE', clue: 'Week 2: soft c and soft g' },
    { word: 'DANCE', clue: 'Week 2: soft c and soft g' },
    { word: 'CYCLE', clue: 'Week 2: soft c and soft g' },
    { word: 'GIANT', clue: 'Week 2: soft c and soft g' },
    { word: 'CIRCUS', clue: 'Week 2: soft c and soft g' },
    { word: 'DANGER', clue: 'Week 2: soft c and soft g' },
    { word: 'ORANGE', clue: 'Week 2: soft c and soft g' },
    { word: 'PENCIL', clue: 'Week 2: soft c and soft g' },
    { word: 'VILLAGE', clue: 'Week 2: soft c and soft g' },
    { word: 'GIRAFFE', clue: 'Week 2: soft c and soft g' },
    { word: 'GOING', clue: 'Week 3: adding -ing to a verb' },
    { word: 'HOPING', clue: 'Week 3: drop the e, then add -ing' },
    { word: 'RISING', clue: 'Week 3: drop the e, then add -ing' },
    { word: 'SMILING', clue: 'Week 3: drop the e, then add -ing' },
    { word: 'SLIDING', clue: 'Week 3: drop the e, then add -ing' },
    { word: 'JUMPING', clue: 'Week 3: just add -ing' },
    { word: 'PLAYING', clue: 'Week 3: just add -ing' },
    { word: 'RUNNING', clue: 'Week 3: double the last letter, then add -ing' },
    { word: 'GETTING', clue: 'Week 3: double the last letter, then add -ing' }
  ];
  var TRIES = 6;
  var spellState = null;

  function startSpell(step) {
    var index = spellState ? (spellState.index + (step || 1)) % SPELL.length
                           : Math.floor(Math.random() * SPELL.length);
    var pick = SPELL[index];
    spellState = { index: index, answer: pick.word, guesses: [], typed: '', over: false, seen: {} };
    $('#spell-clue').textContent = pick.clue + '. ' + pick.word.length + ' letters.';
    var board = $('#spell-board');
    board.innerHTML = '';
    for (var r = 0; r < TRIES; r++) {
      var row = el('div', 'row');
      row.style.gridTemplateColumns = 'repeat(' + pick.word.length + ', var(--tap-min))';
      for (var c = 0; c < pick.word.length; c++) { row.appendChild(el('div', 'cell')); }
      board.appendChild(row);
    }
    $$('#spell-keys .key').forEach(function (key) { key.className = 'key' + (key.dataset.act ? ' wide' : ''); });
    say($('#spell-say'), 'Six tries. Tap the letters, then tap Go.');
    paintSpell();
  }

  function paintSpell() {
    var len = spellState.answer.length;
    $$('#spell-board .row').forEach(function (row, r) {
      var guess = spellState.guesses[r];
      $$('.cell', row).forEach(function (cell, c) {
        if (guess) {
          cell.textContent = guess.word[c];
          cell.className = 'cell ' + guess.marks[c];
        } else if (r === spellState.guesses.length && !spellState.over) {
          cell.textContent = spellState.typed[c] || '';
          cell.className = 'cell' + (c === spellState.typed.length ? ' here' : '');
        } else {
          cell.textContent = '';
          cell.className = 'cell';
        }
      });
    });
    void len;
  }

  /* Two passes, so a letter is only called "somewhere else" as often as it
     really appears. The rule children compare their screens against. */
  function markGuess(guess, answer) {
    var marks = new Array(answer.length).fill('gone');
    var left = {};
    var i;
    for (i = 0; i < answer.length; i++) {
      if (guess[i] === answer[i]) marks[i] = 'spot';
      else left[answer[i]] = (left[answer[i]] || 0) + 1;
    }
    for (i = 0; i < answer.length; i++) {
      if (marks[i] === 'spot') continue;
      if (left[guess[i]]) { marks[i] = 'near'; left[guess[i]]--; }
    }
    return marks;
  }

  function keyRank(mark) { return mark === 'spot' ? 3 : mark === 'near' ? 2 : 1; }
  function paintKeys(word, marks) {
    for (var i = 0; i < word.length; i++) {
      var letter = word[i];
      if (keyRank(marks[i]) >= keyRank(spellState.seen[letter] || '')) spellState.seen[letter] = marks[i];
    }
    $$('#spell-keys .key').forEach(function (key) {
      var letter = key.dataset.key;
      if (!letter) return;
      key.className = 'key' + (spellState.seen[letter] ? ' ' + spellState.seen[letter] : '');
    });
  }

  function typeLetter(letter) {
    if (spellState.over || spellState.typed.length >= spellState.answer.length) return;
    spellState.typed += letter;
    paintSpell();
  }
  function rubOut() {
    if (spellState.over) return;
    spellState.typed = spellState.typed.slice(0, -1);
    paintSpell();
  }
  function trySpell() {
    if (spellState.over) return;
    var len = spellState.answer.length;
    if (spellState.typed.length < len) {
      say($('#spell-say'), 'This word has ' + len + ' letters. Fill them all, then tap Go.', 'try');
      return;
    }
    var word = spellState.typed;
    var marks = markGuess(word, spellState.answer);
    spellState.guesses.push({ word: word, marks: marks });
    spellState.typed = '';
    paintKeys(word, marks);
    paintSpell();
    if (word === spellState.answer) {
      spellState.over = true;
      var tries = spellState.guesses.length;
      say($('#spell-say'), 'Right. ' + word + ' in ' + tries + (tries === 1 ? ' try.' : ' tries.'), 'good');
      award('spell-' + word, tries === 1 ? 15 : 10);
      markDone('spell');
    } else if (spellState.guesses.length >= TRIES) {
      spellState.over = true;
      say($('#spell-say'), 'The word was ' + spellState.answer + '. Tap Another word.', 'try');
    } else {
      say($('#spell-say'), 'Green is in the right place. Yellow is in the word somewhere else.');
    }
  }

  /* ============================================================
     2. NUMBER BUILD — place value, building and splitting numbers
     ============================================================ */
  var BUILD = [
    { kind: 'build', words: 'five hundred and twenty-eight', answer: 528 },
    { kind: 'build', words: 'three hundred and six', answer: 306,
      note: 'Careful. There are no tens, so a zero holds that place.' },
    { kind: 'build', words: 'nine hundred and forty', answer: 940 },
    { kind: 'build', words: 'two hundred and seventy-three', answer: 273 },
    { kind: 'worth', q: 'What is the 7 worth in 375?', opts: ['7', '70', '700'], a: 1,
      whys: ['The 7 is not in the ones place. Look again at where it sits.',
             'Yes. The 7 is in the tens place, so it is worth 70.',
             'The 3 is worth 300 here. The 7 sits in the tens place.'] },
    { kind: 'worth', q: 'What is the 4 worth in 418?', opts: ['4', '40', '400'], a: 2,
      whys: ['The 4 is the first digit, so it is worth much more than 4.',
             'That would be the tens place. The 4 is one place further left.',
             'Yes. The 4 is in the hundreds place, so it is worth 400.'] },
    { kind: 'worth', q: 'What is the 9 worth in 209?', opts: ['9', '90', '900'], a: 0,
      whys: ['Yes. The 9 is the last digit, so it is worth 9 ones.',
             'The zero is in the tens place here, not the 9.',
             'The 2 is worth 200. The 9 is at the end.'] },
    { kind: 'worth', q: 'Which number has 6 tens?', opts: ['645', '564', '406'], a: 1,
      whys: ['In 645 the 6 is in the hundreds place, so it is worth 600.',
             'Yes. In 564 the 6 sits in the middle, so it is 6 tens.',
             'In 406 the 6 is in the ones place and there are no tens at all.'] }
  ];
  var buildState = null;

  function startBuild() {
    buildState = { at: 0, picks: { h: null, t: null, o: null } };
    renderBuild();
  }

  function renderBuild() {
    var q = BUILD[buildState.at];
    var host = $('#build-task');
    host.innerHTML = '';
    $('#build-count').textContent = 'Question ' + (buildState.at + 1) + ' of ' + BUILD.length;
    if (!q) {
      host.appendChild(el('p', 'q', 'Every question done. Tap Start again for another go.'));
      return;
    }
    if (q.kind === 'build') {
      var target = el('div', 'target', 'Build this number:  ' + q.words);
      host.appendChild(target);
      if (q.note) host.appendChild(el('p', 'why', q.note));
      var place = el('div', 'place');
      [['h', 'hundreds'], ['t', 'tens'], ['o', 'ones']].forEach(function (pair) {
        var row = el('div', 'prow');
        row.appendChild(el('span', 'plabel', pair[1]));
        var digits = el('div', 'digits');
        for (var n = 0; n <= 9; n++) {
          var digit = el('button', 'digit', String(n));
          digit.type = 'button';
          digit.dataset.place = pair[0];
          digit.dataset.value = n;
          digit.setAttribute('aria-pressed', 'false');
          digits.appendChild(digit);
        }
        row.appendChild(digits);
        place.appendChild(row);
      });
      host.appendChild(place);
      host.appendChild(el('div', 'built', ''));
    } else {
      host.appendChild(el('p', 'q', q.q));
      var opts = el('div', 'opts');
      q.opts.forEach(function (text, i) {
        var opt = el('button', 'opt', text);
        opt.type = 'button';
        opt.dataset.pick = i;
        opts.appendChild(opt);
      });
      host.appendChild(opts);
      host.appendChild(el('p', 'why'));
    }
    say($('#build-say'), q.kind === 'build' ? 'Choose one digit in each row.' : 'Which one is it?');
  }

  function buildDigit(button) {
    var place = button.dataset.place;
    buildState.picks[place] = +button.dataset.value;
    $$('.digit[data-place="' + place + '"]').forEach(function (other) {
      other.setAttribute('aria-pressed', String(other === button));
    });
    var picks = buildState.picks;
    if (picks.h === null || picks.t === null || picks.o === null) return;
    var made = picks.h * 100 + picks.t * 10 + picks.o;
    $('.built').textContent = picks.h * 100 + ' + ' + picks.t * 10 + ' + ' + picks.o + '  =  ' + made;
    var q = BUILD[buildState.at];
    if (made === q.answer) {
      say($('#build-say'), 'Yes. ' + q.words + ' is ' + q.answer + '.', 'good');
      award('build-' + buildState.at, 5);
      nextBuild();
    } else {
      say($('#build-say'), 'Not yet. Say the number out loud, then change one row.', 'try');
    }
  }

  function buildChoose(button) {
    var q = BUILD[buildState.at];
    var pick = +button.dataset.pick;
    $$('#build-task .opt').forEach(function (opt) { opt.classList.remove('good', 'bad'); });
    button.classList.add(pick === q.a ? 'good' : 'bad');
    $('#build-task .why').textContent = q.whys[pick];
    if (pick === q.a) {
      award('build-' + buildState.at, 5);
      say($('#build-say'), 'That is it.', 'good');
      nextBuild();
    }
  }

  function nextBuild() {
    buildState.at++;
    buildState.picks = { h: null, t: null, o: null };
    if (buildState.at >= BUILD.length) {
      markDone('build');
      award('build-all', 10);
      window.setTimeout(function () {
        renderBuild();
        say($('#build-say'), 'All eight done. Well worked.', 'good');
      }, 900);
      return;
    }
    window.setTimeout(renderBuild, 900);
  }

  /* ============================================================
     3. THE STAIRS — counting on and back, then odd and even
     ============================================================ */
  var SEQ = [
    { show: [462, 472, 482], opts: [483, 492, 592], a: 1,
      why: 'Count on in 10s: only the tens digit changes, so 482 goes to 492.' },
    { show: [155, 255, 355], opts: [365, 455, 555], a: 1,
      why: 'Count on in 100s: the hundreds digit goes up by one, so 355 goes to 455.' },
    { show: [631, 621, 611], opts: [601, 610, 591], a: 0,
      why: 'Count back in 10s: take one ten away, so 611 goes to 601.' },
    { show: [890, 790, 690], opts: [680, 590, 490], a: 1,
      why: 'Count back in 100s: take one hundred away, so 690 goes to 590.' },
    { kind: 'rule', show: [240, 250, 260, 270],
      opts: ['count on in 10s', 'count on in 100s', 'count back in 10s'], a: 0,
      why: 'Each number is ten more than the one before it.' },
    { kind: 'rule', show: [640, 540, 440],
      opts: ['count back in 10s', 'count back in 100s', 'count on in 100s'], a: 1,
      why: 'Each number is one hundred less than the one before it.' }
  ];
  var ODDEVEN = [314, 507, 660, 229, 483, 750, 176, 895];
  var stairState = null;

  function startStairs() {
    stairState = { at: 0, sorted: 0, numbers: shuffle(ODDEVEN) };
    renderStairs();
  }

  function renderStairs() {
    var host = $('#stairs-task');
    host.innerHTML = '';
    if (stairState.at < SEQ.length) {
      var q = SEQ[stairState.at];
      $('#stairs-count').textContent = 'Step ' + (stairState.at + 1) + ' of ' + SEQ.length;
      host.appendChild(el('p', 'q', q.kind === 'rule'
        ? 'What is the rule for this count?'
        : 'What is the next number?'));
      var steps = el('div', 'steps');
      q.show.forEach(function (n) { steps.appendChild(el('div', 'step', String(n))); });
      if (q.kind !== 'rule') steps.appendChild(el('div', 'step blank', '?'));
      host.appendChild(steps);
      var opts = el('div', 'opts');
      q.opts.forEach(function (text, i) {
        var opt = el('button', 'opt', String(text));
        opt.type = 'button';
        opt.dataset.seq = i;
        opts.appendChild(opt);
      });
      host.appendChild(opts);
      host.appendChild(el('p', 'why'));
      say($('#stairs-say'), 'Look at what changes each time.');
      return;
    }
    /* Odd and even, one number at a time down the chutes. */
    var left = stairState.numbers.length - stairState.sorted;
    $('#stairs-count').textContent = 'Odd and even: ' + left + ' left';
    if (!left) {
      host.appendChild(el('p', 'q', 'Every number sorted. The lamp is lit.'));
      return;
    }
    var number = stairState.numbers[stairState.sorted];
    host.appendChild(el('p', 'q', 'Is this number odd or even?'));
    var show = el('div', 'steps');
    show.appendChild(el('div', 'step', String(number)));
    host.appendChild(show);
    var chutes = el('div', 'chutes');
    ['odd', 'even'].forEach(function (name) {
      var chute = el('button', 'chute', name.toUpperCase());
      chute.type = 'button';
      chute.dataset.chute = name;
      chutes.appendChild(chute);
    });
    host.appendChild(chutes);
    host.appendChild(el('p', 'why'));
    say($('#stairs-say'), 'Look at the last digit.');
  }

  function stairChoose(button) {
    var q = SEQ[stairState.at];
    var pick = +button.dataset.seq;
    $$('#stairs-task .opt').forEach(function (opt) { opt.classList.remove('good', 'bad'); });
    button.classList.add(pick === q.a ? 'good' : 'bad');
    $('#stairs-task .why').textContent = q.why;
    if (pick !== q.a) { say($('#stairs-say'), 'Not that one. Read the rule under the numbers.', 'try'); return; }
    award('stairs-' + stairState.at, 5);
    say($('#stairs-say'), 'Yes.', 'good');
    stairState.at++;
    window.setTimeout(renderStairs, 1100);
  }

  function stairSort(button) {
    var number = stairState.numbers[stairState.sorted];
    var even = number % 2 === 0;
    var right = (button.dataset.chute === 'even') === even;
    $('#stairs-task .why').textContent = number + ' ends in ' + (number % 10) + ', so it is ' +
      (even ? 'even' : 'odd') + '.';
    if (!right) { say($('#stairs-say'), 'Not that chute. Look at the last digit again.', 'try'); return; }
    stairState.sorted++;
    award('stairs-sort-' + number, 3);
    if (stairState.sorted === stairState.numbers.length) {
      markDone('stairs');
      award('stairs-all', 10);
      say($('#stairs-say'), 'Every number in the right chute.', 'good');
    } else {
      say($('#stairs-say'), 'In it goes.', 'good');
    }
    window.setTimeout(renderStairs, 800);
  }

  /* ============================================================
     4. THE LAMP ROOM — four locked doors, one digit each
     ============================================================ */
  var DOORS = [
    {
      id: 'words', name: 'The Word Store', subject: 'Nouns and adjectives',
      tasks: [
        { q: 'Which word is the noun? The sleepy cat sat on the warm roof.',
          opts: [
            { text: 'sleepy', why: 'Sleepy tells you more about the cat, so it is an adjective.' },
            { text: 'cat', why: 'Yes. A cat is a thing you can point at, so it is a noun.' },
            { text: 'sat', why: 'Sat is what the cat did, so it is a verb.' },
            { text: 'warm', why: 'Warm describes the roof, so it is an adjective.' }
          ], answer: 1 },
        { q: 'Choose the adjective that fits. A ______ wind pushed at her coat.',
          opts: [
            { text: 'cold', why: 'Yes. Cold tells you what the wind was like.' },
            { text: 'coat', why: 'A coat is a thing, so it is a noun.' },
            { text: 'pushed', why: 'Pushed is an action, so it is a verb.' },
            { text: 'quickly', why: 'Quickly tells you how, so it is an adverb, not an adjective.' }
          ], answer: 0 }
      ],
      digit: { q: 'How many adjectives are in this sentence? The tall white lighthouse had a red door.',
               answer: 3, why: 'Tall, white and red all describe a noun, so that is three.' }
    },
    {
      id: 'verbs', name: 'The Engine Room', subject: 'Verbs and -ing',
      tasks: [
        { q: 'Which word is the verb? Amina climbed the last few steps.',
          opts: [
            { text: 'Amina', why: 'Amina is a person, so that is a noun.' },
            { text: 'climbed', why: 'Yes. Climbed is what Amina did.' },
            { text: 'last', why: 'Last tells you which steps, so it is an adjective.' },
            { text: 'steps', why: 'Steps are things, so that is a noun.' }
          ], answer: 1 },
        { q: 'Add -ing to run.',
          opts: [
            { text: 'runing', why: 'A letter is missing. After a short vowel sound the last letter doubles.' },
            { text: 'running', why: 'Yes. Short vowel sound, so the n doubles before -ing.' },
            { text: 'runnning', why: 'One n too many. The last letter doubles once only.' }
          ], answer: 1 }
      ],
      digit: { q: 'How many verbs are in this sentence? The gull sat on the rail and watched the sea.',
               answer: 2, why: 'Sat and watched are both things somebody did, so that is two.' }
    },
    {
      id: 'story', name: 'The Reading Room Door', subject: 'What the story tells you',
      tasks: [
        { q: 'In The Path to the Lighthouse, how do you know the path was slippery?',
          opts: [
            { text: 'Her boots slipped on the wet stones.', why: 'Yes. That is the line that tells you.' },
            { text: 'The wind pushed at her coat.', why: 'That tells you it was windy, not slippery.' },
            { text: 'The lighthouse was tall and white.', why: 'That describes the lighthouse, not the path.' }
          ], answer: 0 },
        { q: 'In The Cat on the Shed Roof, how do you know Pip was never stuck?',
          opts: [
            { text: 'He jumped onto the fence and landed without a sound.', why: 'Yes. He got down on his own, easily.' },
            { text: 'Nadia found him on Saturday morning.', why: 'That tells you when, not whether he was stuck.' },
            { text: 'Dad carried the ladder out.', why: 'That is what Dad did. It does not tell you about Pip.' }
          ], answer: 0 }
      ],
      digit: { q: 'Dad climbed two steps, then three more. How many steps had he climbed?',
               answer: 5, why: 'Two steps and three more makes five.' }
    },
    {
      id: 'numbers', name: 'The Number Store', subject: 'Place value, odd and even',
      tasks: [
        { q: 'Which number is even?',
          opts: [
            { text: '407', why: 'It ends in 7, so it is odd.' },
            { text: '316', why: 'Yes. It ends in 6, so it is even.' },
            { text: '559', why: 'It ends in 9, so it is odd.' }
          ], answer: 1 },
        { q: 'What is the 8 worth in 483?',
          opts: [
            { text: '8', why: 'The 3 is in the ones place here, not the 8.' },
            { text: '80', why: 'Yes. The 8 sits in the tens place, so it is worth 80.' },
            { text: '800', why: 'The 4 is worth 400. The 8 is one place to the right.' }
          ], answer: 1 }
      ],
      digit: { q: 'Count on in 10s from 370: 380, 390, then what? Tap the hundreds digit of that number.',
               answer: 4, why: '390 and ten more is 400, and the hundreds digit of 400 is 4.' }
    }
  ];
  var roomState = null;

  function startRooms() {
    roomState = { digits: {}, typed: '' };
    var doors = $('#lamp-doors');
    doors.innerHTML = '';
    DOORS.forEach(function (door) {
      var card = el('button', 'door');
      card.type = 'button';
      card.dataset.door = door.id;
      card.innerHTML = icon('i-lamp', true) + '<strong>' + door.name + '</strong>' +
        '<span>' + door.subject + '</span><span class="digit-out" data-digit-out></span>';
      doors.appendChild(card);
    });
    $('#lamp-room').hidden = true;
    $('#lamp-final').hidden = true;
    $('#lamp-doors').hidden = false;
    paintLock();
    say($('#lamp-say'), 'Four doors. Each one gives you one number of the code.');
  }

  function openDoor(id) {
    var door = DOORS.filter(function (d) { return d.id === id; })[0];
    if (!door) return;
    var host = $('#lamp-room');
    host.hidden = false;
    host.innerHTML = '';
    host.appendChild(el('h3', null, door.name));
    door.tasks.forEach(function (task, index) {
      host.appendChild(doorCard(door, task, index, false));
    });
    host.appendChild(doorCard(door, door.digit, door.tasks.length, true));
    var back = el('button', 'btn ghost', 'Back to the doors');
    back.type = 'button';
    back.dataset.act = 'lamp-doors';
    host.appendChild(back);
    $('#lamp-doors').hidden = true;
    host.querySelector('h3').setAttribute('tabindex', '-1');
    host.querySelector('h3').focus();
  }

  function doorCard(door, task, index, isDigit) {
    var card = el('div', 'task');
    card.appendChild(el('p', 'q', task.q));
    var opts = el('div', 'opts');
    if (isDigit) {
      for (var n = 0; n <= 9; n++) {
        var pad = el('button', 'opt', String(n));
        pad.type = 'button';
        pad.dataset.doorDigit = n;
        pad.dataset.door = door.id;
        opts.appendChild(pad);
      }
    } else {
      task.opts.forEach(function (opt, i) {
        var choice = el('button', 'opt', opt.text);
        choice.type = 'button';
        choice.dataset.doorPick = i;
        choice.dataset.door = door.id;
        choice.dataset.task = index;
        opts.appendChild(choice);
      });
    }
    card.appendChild(opts);
    card.appendChild(el('p', 'why'));
    return card;
  }

  function doorChoose(button) {
    var door = DOORS.filter(function (d) { return d.id === button.dataset.door; })[0];
    var task = door.tasks[+button.dataset.task];
    var pick = +button.dataset.doorPick;
    var card = button.closest('.task');
    $$('.opt', card).forEach(function (opt) { opt.classList.remove('good', 'bad'); });
    button.classList.add(pick === task.answer ? 'good' : 'bad');
    $('.why', card).textContent = task.opts[pick].why;
    if (pick === task.answer) award('door-' + door.id + '-' + button.dataset.task, 5);
  }

  function doorDigit(button) {
    var door = DOORS.filter(function (d) { return d.id === button.dataset.door; })[0];
    var card = button.closest('.task');
    var value = +button.dataset.doorDigit;
    $$('.opt', card).forEach(function (opt) { opt.classList.remove('good', 'bad'); });
    if (value !== door.digit.answer) {
      button.classList.add('bad');
      $('.why', card).textContent = 'Not that number. Work it out again, then tap another one.';
      return;
    }
    button.classList.add('good');
    $('.why', card).textContent = door.digit.why + ' Write this number down.';
    roomState.digits[door.id] = value;
    var face = $('#lamp-doors .door[data-door="' + door.id + '"]');
    if (face) {
      face.dataset.open = 'yes';
      $('[data-digit-out]', face).textContent = value;
    }
    award('door-' + door.id + '-digit', 5);
    paintLock();
  }

  function paintLock() {
    var boxes = $$('#lamp-code b');
    DOORS.forEach(function (door, i) {
      var got = roomState.digits[door.id];
      boxes[i].textContent = got === undefined ? '' : got;
      boxes[i].classList.toggle('on', got !== undefined);
    });
    var all = DOORS.every(function (door) { return roomState.digits[door.id] !== undefined; });
    $('#lamp-final').hidden = !all;
    if (all) say($('#lamp-say'), 'Every door is open. Tap the four numbers into the lock.', 'good');
  }

  function lockTap(value) {
    if (roomState.typed.length < 4) roomState.typed += value;
    $('#lamp-typed').textContent = roomState.typed;
    if (roomState.typed.length < 4) return;
    var want = DOORS.map(function (door) { return roomState.digits[door.id]; }).join('');
    if (roomState.typed === want) {
      say($('#lamp-say'), 'The lamp is lit. You are out.', 'good');
      award('lamp-out', 10);
      markDone('lamp');
    } else {
      say($('#lamp-say'), 'The lock stays shut. Check the numbers on the doors.', 'try');
    }
    roomState.typed = '';
    $('#lamp-typed').textContent = '';
  }

  /* ============================================================
     5. THE READING ROOM — the two passages from the practice packs
     ============================================================ */
  var PASSAGES = [
    {
      id: 'cat', title: 'The Cat on the Shed Roof',
      vocab: ['soaked means very wet, wet all the way through.',
              'trotted means walked quickly with small steps.'],
      text: [
        'Pip was not supposed to be on the shed roof.',
        'Nadia found him up there on Saturday morning, sitting by the chimney with his tail curled around his paws. The roof was wet from the rain and the shed was taller than the garden fence.',
        '"Come down," said Nadia. Pip yawned.',
        'Dad carried the ladder out and leaned it against the wall. He climbed two steps, then three. Pip watched him with round yellow eyes. When Dad reached out, the cat trotted along the roof, jumped onto the fence and landed in the grass without a sound.',
        'Dad came down the ladder slowly. His socks were soaked.',
        '"He was never stuck," said Nadia.',
        'Pip walked into the kitchen and sat by his bowl, as if the whole morning had been somebody else’s idea.'
      ],
      facts: [
        { q: 'What was the roof like?',
          opts: ['dry and warm', 'wet from the rain', 'covered in snow'], a: 1,
          why: 'The story says the roof was wet from the rain.' },
        { q: 'What did Pip do when Nadia told him to come down?',
          opts: ['he yawned', 'he ran inside', 'he climbed the ladder'], a: 0,
          why: 'Pip yawned, which tells you he was not worried at all.' },
        { q: 'Where did Pip go at the end?',
          opts: ['the shed', 'the fence', 'the kitchen'], a: 2,
          why: 'He walked into the kitchen and sat by his bowl.' }
      ],
      writes: [
        { q: 'Why did Pip sit by his bowl at the end? Write one sentence.',
          model: 'He wanted his food, and he behaved as if nothing had happened and none of it was his fault.' },
        { q: 'Write two words that describe Dad, and say why you chose each one.',
          model: 'Any two that fit the story, for example kind, because he fetched the ladder to help, and patient, because he came down slowly and did not get cross.' }
      ]
    },
    {
      id: 'path', title: 'The Path to the Lighthouse',
      vocab: ['a bay is a curved piece of coast, where the sea comes into the land.',
              'a gull is a sea bird, the big grey and white one you see at the beach.'],
      text: [
        'The path to the lighthouse was steep and narrow, and Amina did not like it one bit.',
        'On one side stood a grey stone wall. On the other side the cliff dropped away to the sea, where the water turned and folded over the rocks. The wind pushed at her coat. Her boots slipped on the wet stones.',
        '"Nearly there," called Grandad, three steps ahead. "Look up."',
        'Amina looked up. The lighthouse stood at the top of the cliff, tall and white, with a red door and a gull sitting on the rail.',
        '"It has been here two hundred years," said Grandad. "Storms and all."',
        'Amina took a breath and climbed the last few steps. From the top she could see the whole bay, and her house, small as a stamp, on the far side of it.',
        'She decided the path had not been so bad after all.'
      ],
      facts: [
        { q: 'What stood on one side of the path?',
          opts: ['a grey stone wall', 'a row of houses', 'a line of trees'], a: 0,
          why: 'On one side stood a grey stone wall, and on the other the cliff dropped away.' },
        { q: 'Who called out "Nearly there"?',
          opts: ['Amina', 'Grandad', 'a gull'], a: 1,
          why: 'Grandad called it from three steps ahead.' },
        { q: 'What could Amina see from the top?',
          opts: ['the red door', 'a ship out at sea', 'the whole bay'], a: 2,
          why: 'From the top she could see the whole bay, and her own house across it.' }
      ],
      writes: [
        { q: 'How do you know Amina was high up at the end? Use the story.',
          model: 'Her house looked small as a stamp on the far side of the bay, so she was looking down from a long way above it.' },
        { q: 'Would you like to climb that path? Use two words from the story to explain why.',
          model: 'Any answer that uses the story, for example: no, because it was steep and narrow and her boots slipped on the wet stones.' }
      ]
    }
  ];
  var readState = null;

  function startReading() {
    readState = { at: 0 };
    renderReading();
  }

  function renderReading() {
    var passage = PASSAGES[readState.at];
    var host = $('#read-task');
    host.innerHTML = '';
    $('#read-count').textContent = 'Story ' + (readState.at + 1) + ' of ' + PASSAGES.length;
    var box = el('div', 'passage');
    box.appendChild(el('h3', null, passage.title));
    passage.text.forEach(function (line) { box.appendChild(el('p', null, line)); });
    var vocab = el('div', 'vocab');
    passage.vocab.forEach(function (word) { vocab.appendChild(el('span', null, word)); });
    box.appendChild(vocab);
    host.appendChild(box);

    passage.facts.forEach(function (fact, index) {
      var card = el('div', 'task');
      card.appendChild(el('p', 'q', fact.q));
      var opts = el('div', 'opts');
      fact.opts.forEach(function (text, i) {
        var opt = el('button', 'opt', text);
        opt.type = 'button';
        opt.dataset.fact = index;
        opt.dataset.pick = i;
        opts.appendChild(opt);
      });
      card.appendChild(opts);
      card.appendChild(el('p', 'why'));
      host.appendChild(card);
    });

    passage.writes.forEach(function (write, index) {
      var card = el('div', 'task write');
      var label = el('label', null, write.q);
      label.setAttribute('for', 'write-' + passage.id + '-' + index);
      card.appendChild(label);
      var box2 = el('textarea');
      box2.id = 'write-' + passage.id + '-' + index;
      box2.rows = 3;
      card.appendChild(box2);
      var show = el('button', 'btn ghost', 'Show a good answer');
      show.type = 'button';
      show.style.marginTop = '.75rem';
      show.dataset.model = index;
      card.appendChild(show);
      var model = el('div', 'model');
      model.hidden = true;
      model.innerHTML = '<b>One good answer</b>';
      model.appendChild(el('p', null, write.model));
      var marks = el('div', 'selfmark');
      [['got', 'I got that'], ['near', 'Nearly'], ['not', 'Not yet']].forEach(function (pair) {
        var mark = el('button', 'btn ghost', pair[1]);
        mark.type = 'button';
        mark.dataset.self = pair[0];
        mark.dataset.write = passage.id + '-' + index;
        marks.appendChild(mark);
      });
      model.appendChild(marks);
      card.appendChild(model);
      host.appendChild(card);
    });
    say($('#read-say'), 'Read the story twice. The second time is where the answers are.');
  }

  function readFact(button) {
    var passage = PASSAGES[readState.at];
    var fact = passage.facts[+button.dataset.fact];
    var card = button.closest('.task');
    $$('.opt', card).forEach(function (opt) { opt.classList.remove('good', 'bad'); });
    var right = +button.dataset.pick === fact.a;
    button.classList.add(right ? 'good' : 'bad');
    $('.why', card).textContent = right ? fact.why : 'Look again. The answer is in the story.';
    if (right) {
      award('read-' + passage.id + '-' + button.dataset.fact, 5);
      say($('#read-say'), 'Yes.', 'good');
    }
  }

  function readSelf(button) {
    var card = button.closest('.task');
    $$('.selfmark .btn', card).forEach(function (mark) { mark.classList.remove('good', 'bad'); });
    button.classList.add('good');
    award('write-' + button.dataset.write, 5);
    say($('#read-say'), button.dataset.self === 'got'
      ? 'Good. Marking your own work honestly is the hard part.'
      : 'That is worth knowing. Read the good answer again, then try the next one.', 'good');
    if (readState.at === PASSAGES.length - 1) markDone('read');
  }

  /* ============================================================
     wiring
     ============================================================ */
  function wire() {
    document.addEventListener('click', function (event) {
      var hit = event.target.closest ? event.target.closest('button') : null;
      if (!hit) return;
      var data = hit.dataset;

      if (data.go) { show(data.go); return; }
      if (data.key) { typeLetter(data.key); return; }
      if (data.place) { buildDigit(hit); return; }
      if (data.pick !== undefined && data.fact !== undefined) { readFact(hit); return; }
      if (data.pick !== undefined && $('#build-task').contains(hit)) { buildChoose(hit); return; }
      if (data.seq !== undefined) { stairChoose(hit); return; }
      if (data.chute) { stairSort(hit); return; }
      if (data.doorPick !== undefined) { doorChoose(hit); return; }
      if (data.doorDigit !== undefined) { doorDigit(hit); return; }
      if (data.lock) { lockTap(data.lock); return; }
      if (data.model !== undefined) {
        var model = $('.model', hit.closest('.task'));
        model.hidden = !model.hidden;
        hit.textContent = model.hidden ? 'Show a good answer' : 'Hide the answer';
        return;
      }
      if (data.self) { readSelf(hit); return; }
      if (hit.classList.contains('door')) { openDoor(data.door); return; }

      switch (data.act) {
        case 'go': trySpell(); break;
        case 'rub': rubOut(); break;
        case 'spell-new': startSpell(1); break;
        case 'build-new': startBuild(); break;
        case 'stairs-new': startStairs(); break;
        case 'lamp-doors': $('#lamp-room').hidden = true; $('#lamp-doors').hidden = false; break;
        case 'lamp-new': startRooms(); break;
        case 'read-next':
          readState.at = (readState.at + 1) % PASSAGES.length;
          renderReading();
          break;
        case 'board':
          var on = document.documentElement.hasAttribute('data-board');
          if (on) document.documentElement.removeAttribute('data-board');
          else document.documentElement.setAttribute('data-board', '');
          hit.setAttribute('aria-pressed', String(!on));
          break;
        case 'new-pupil':
          // A shared iPad, or a family computer: check before wiping the tally.
          if (window.confirm('Start again for a new pupil? The stars go back to zero.')) newPupil();
          break;
      }
    });

    /* A real keyboard works too, on the whiteboard and at home. */
    document.addEventListener('keydown', function (event) {
      if (!$('#room-spell').classList.contains('on')) return;
      if (event.target && event.target.tagName === 'TEXTAREA') return;
      if (event.key === 'Enter') { trySpell(); event.preventDefault(); }
      else if (event.key === 'Backspace') { rubOut(); event.preventDefault(); }
      else if (/^[a-zA-Z]$/.test(event.key)) { typeLetter(event.key.toUpperCase()); }
    });
  }

  function start() {
    sprite();
    paintStars();
    wire();
    startSpell();
    startBuild();
    startStairs();
    startRooms();
    startReading();
    paintCode();
    [['spell', 'spell-'], ['build', 'build-'], ['stairs', 'stairs-'],
     ['lamp', 'lamp-'], ['read', 'write-']].forEach(function (pair) {
      if (done.some(function (task) { return task.indexOf(pair[1]) === 0; })) markDone(pair[0]);
    });
  }

  document.addEventListener('DOMContentLoaded', start);

  return { markGuess: markGuess, checkCode: checkCode, SPELL: SPELL, BUILD: BUILD,
           SEQ: SEQ, ODDEVEN: ODDEVEN, DOORS: DOORS, PASSAGES: PASSAGES };
})();
