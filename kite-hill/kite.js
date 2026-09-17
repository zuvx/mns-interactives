/* ============================================================
   Kite Hill — weeks 3 and 4 practice, page engine and rooms.
   Rules: design-system/mns-classroom/pages/lighthouse.md

   Same engine as The Lighthouse, which covers weeks 2 and 3. The content here
   matches the week 3 and week 4 homework booklets and extra practice packs
   (tools/unit-pipeline/homework/week-3.js, week-4.js and the two in
   extra-practice/). The questions are new ones, so a child who plays this has
   practised the same work rather than copied the answers home.

   Nothing leaves the device. No network, no localStorage, no cookies.
   sessionStorage holds the star tally and the list of finished tasks.
   ============================================================ */
'use strict';
var KiteHill = (function () {

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
  var KEY_STARS = 'kitehill-stars';
  var KEY_DONE = 'kitehill-done';
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
    return 'KH' + total + '-' + LETTERS[seed % 20] + LETTERS[(seed >> 4) % 20] +
           LETTERS[(total * 13 + tasks * 29 + 7) % 20];
  }
  function paintCode() {
    // A code of zero is not worth typing into an assignment, so say so instead.
    $('#code-out').textContent = stars ? checkCode(stars, done.length) : 'Play a room first';
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
     1. SPELL BEAM — the week 3 and week 4 spelling lists
     ============================================================ */
    var SPELL = [
    { word: 'GOING', clue: 'Week 3: just add -ing' },
    { word: 'PLAYING', clue: 'Week 3: just add -ing' },
    { word: 'JUMPING', clue: 'Week 3: just add -ing' },
    { word: 'CLIMBING', clue: 'Week 3: just add -ing' },
    { word: 'SHOUTING', clue: 'Week 3: just add -ing' },
    { word: 'SMILING', clue: 'Week 3: drop the e, then add -ing' },
    { word: 'RISING', clue: 'Week 3: drop the e, then add -ing' },
    { word: 'HOPING', clue: 'Week 3: drop the e, then add -ing. One p, long o' },
    { word: 'SLIDING', clue: 'Week 3: drop the e, then add -ing' },
    { word: 'RUNNING', clue: 'Week 3: double the last letter, then add -ing' },
    { word: 'GRINNING', clue: 'Week 3: double the last letter, then add -ing' },
    { word: 'SPINNING', clue: 'Week 3: double the last letter, then add -ing' },
    { word: 'FITTING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'HOPPING', clue: 'Week 4: short o, so the p doubles. Two ps' },
    { word: 'BEGGING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'WINNING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'JOGGING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'TAPPING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'SITTING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'CLAPPING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'DROPPING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'SKIPPING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'SHOPPING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'CHATTING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'GRABBING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'HUMMING', clue: 'Week 4: short vowel, so the letter doubles' },
    { word: 'TRIPPING', clue: 'Week 4: short vowel, so the letter doubles' }
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
    { kind: 'build', words: 'four hundred and sixty-two', answer: 462 },
    { kind: 'build', words: 'seven hundred and five', answer: 705,
      note: 'Careful. There are no tens, so a zero holds that place.' },
    { kind: 'build', words: 'three hundred and ninety', answer: 390 },
    { kind: 'build', words: 'eight hundred and thirty-four', answer: 834 },
    { kind: 'worth', q: 'What is the 5 worth in 456?', opts: ['5', '50', '500'], a: 1,
      whys: ['The 6 is in the ones place here, not the 5.',
             'Yes. The 5 sits in the tens place, so it is worth 50.',
             'The 4 is worth 400. The 5 is one place to the right.'] },
    { kind: 'worth', q: 'What is the 6 worth in 648?', opts: ['6', '60', '600'], a: 2,
      whys: ['The 6 is the first digit, so it is worth much more than 6.',
             'That would be the tens place. The 6 is one place further left.',
             'Yes. The 6 is in the hundreds place, so it is worth 600.'] },
    { kind: 'worth', q: 'What is the 2 worth in 902?', opts: ['2', '20', '200'], a: 0,
      whys: ['Yes. The 2 is the last digit, so it is worth 2 ones.',
             'The zero is in the tens place here, not the 2.',
             'The 9 is worth 900. The 2 is at the end.'] },
    { kind: 'worth', q: 'Which number has 4 tens?', opts: ['415', '341', '504'], a: 1,
      whys: ['In 415 the 4 is in the hundreds place, so it is worth 400.',
             'Yes. In 341 the 4 sits in the middle, so it is 4 tens.',
             'In 504 the 4 is in the ones place and there are no tens at all.'] }
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
    { show: ['60 + ? = 100'], opts: [30, 40, 50], a: 1,
      why: 'Six tens and four tens make ten tens, and ten tens is 100.' },
    { show: ['35 + ? = 100'], opts: [65, 75, 55], a: 0,
      why: '35 and 65: the tens make 90 and the ones make 10, so that is 100.' },
    { show: ['82 + ? = 100'], opts: [28, 18, 12], a: 1,
      why: '82 and 18. Eight tens and one ten make 90, then 2 and 8 make the last 10.' },
    { show: ['400 + ? = 1000'], opts: [500, 600, 700], a: 1,
      why: 'Four hundreds and six hundreds make ten hundreds, which is 1000.' },
    { show: ['750 + ? = 1000'], opts: [250, 350, 150], a: 0,
      why: '750 and 250. 750 needs 50 to reach 800, then 200 more to reach 1000.' },
    { kind: 'rule', show: ['30 + 12'],
      opts: ['12 + 30', '30 − 12', '12 − 30'], a: 0,
      why: 'Addition can be done in any order, so 12 + 30 gives the same answer. Subtraction cannot.' }
  ];
  var PAIRS = [
    { text: '70 + 30', ok: true },
    { text: '45 + 55', ok: true },
    { text: '60 + 30', ok: false },
    { text: '25 + 75', ok: true },
    { text: '80 + 30', ok: false },
    { text: '90 + 10', ok: true },
    { text: '35 + 55', ok: false },
    { text: '15 + 85', ok: true }
  ];
  var stairState = null;

  function startStairs() {
    stairState = { at: 0, sorted: 0, sums: shuffle(PAIRS.slice()) };
    renderStairs();
  }

  function renderStairs() {
    var host = $('#stairs-task');
    host.innerHTML = '';
    if (stairState.at < SEQ.length) {
      var q = SEQ[stairState.at];
      $('#stairs-count').textContent = 'Step ' + (stairState.at + 1) + ' of ' + SEQ.length;
      host.appendChild(el('p', 'q', q.kind === 'rule'
        ? 'Which one gives the same answer?'
        : 'What is the missing number?'));
      var steps = el('div', 'steps');
      q.show.forEach(function (n) { steps.appendChild(el('div', 'step', String(n))); });
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
      say($('#stairs-say'), 'Count up to the next ten first.');
      return;
    }
    /* Pairs to 100, one sum at a time down the chutes. */
    var left = stairState.sums.length - stairState.sorted;
    $('#stairs-count').textContent = 'Making 100: ' + left + ' left';
    if (!left) {
      host.appendChild(el('p', 'q', 'Every sum sorted. The kite is up.'));
      return;
    }
    var sum = stairState.sums[stairState.sorted];
    host.appendChild(el('p', 'q', 'Does this sum make 100?'));
    var show = el('div', 'steps');
    show.appendChild(el('div', 'step', sum.text));
    host.appendChild(show);
    var chutes = el('div', 'chutes');
    [['yes', 'MAKES 100'], ['no', 'NOT 100']].forEach(function (pair) {
      var chute = el('button', 'chute', pair[1]);
      chute.type = 'button';
      chute.dataset.chute = pair[0];
      chutes.appendChild(chute);
    });
    host.appendChild(chutes);
    host.appendChild(el('p', 'why'));
    say($('#stairs-say'), 'Add the tens first, then the ones.');
  }

  function stairChoose(button) {
    var q = SEQ[stairState.at];
    var pick = +button.dataset.seq;
    $$('#stairs-task .opt').forEach(function (opt) { opt.classList.remove('good', 'bad'); });
    button.classList.add(pick === q.a ? 'good' : 'bad');
    $('#stairs-task .why').textContent = q.why;
    if (pick !== q.a) { say($('#stairs-say'), 'Not that one. Read the line underneath.', 'try'); return; }
    award('stairs-' + stairState.at, 5);
    say($('#stairs-say'), 'Yes.', 'good');
    stairState.at++;
    window.setTimeout(renderStairs, 1100);
  }

  function stairSort(button) {
    var sum = stairState.sums[stairState.sorted];
    var total = sum.text.split('+').reduce(function (a, b) { return a + parseInt(b, 10); }, 0);
    var right = (button.dataset.chute === 'yes') === sum.ok;
    $('#stairs-task .why').textContent = sum.text + ' = ' + total +
      (sum.ok ? ', so it makes 100.' : ', so it does not make 100.');
    if (!right) { say($('#stairs-say'), 'Not that chute. Add it up and look again.', 'try'); return; }
    stairState.sorted++;
    award('stairs-sort-' + sum.text, 3);
    if (stairState.sorted === stairState.sums.length) {
      markDone('stairs');
      award('stairs-all', 10);
      say($('#stairs-say'), 'Every sum in the right chute.', 'good');
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
      id: 'verbs', name: 'The Kite Shed', subject: 'Verbs and -ing',
      tasks: [
        { q: 'Which word is the verb? Leila ran along the top of the hill.',
          opts: [
            { text: 'Leila', why: 'Leila is a person, so that is a noun.' },
            { text: 'ran', why: 'Yes. Ran is what Leila did.' },
            { text: 'top', why: 'The top is a place, so that is a noun.' },
            { text: 'hill', why: 'A hill is a thing you can point at, so it is a noun.' }
          ], answer: 1 },
        { q: 'Add -ing to sit.',
          opts: [
            { text: 'siting', why: 'A letter is missing. Sit has a short i, so the t doubles.' },
            { text: 'sitting', why: 'Yes. Short vowel sound, so the t doubles before -ing.' },
            { text: 'sittting', why: 'One t too many. The last letter doubles once only.' }
          ], answer: 1 }
      ],
      digit: { q: 'How many verbs are in this sentence? Sami shouted and ran up the hill.',
               answer: 2, why: 'Shouted and ran are both things Sami did, so that is two.' }
    },
    {
      id: 'words', name: 'The Word Box', subject: 'Choosing interesting words',
      tasks: [
        { q: 'Which word paints the best picture? The dog ______ down the path.',
          opts: [
            { text: 'went', why: 'Went is not wrong, but it tells you nothing about how the dog moved.' },
            { text: 'raced', why: 'Yes. Raced shows you the speed as well as the movement.' },
            { text: 'was', why: 'Was is a being verb. It does not say what the dog did.' }
          ], answer: 1 },
        { q: 'Which word is better than said here? "Let go!" ______ Sami.',
          opts: [
            { text: 'said', why: 'Said is flat. The exclamation mark tells you he was loud.' },
            { text: 'yelled', why: 'Yes. Yelled tells you how loud he was.' },
            { text: 'talked', why: 'Talked is for a conversation, not for one shouted word.' }
          ], answer: 1 }
      ],
      digit: { q: 'How many adjectives are in this sentence? The cold grey sea turned over the sharp rocks.',
               answer: 3, why: 'Cold, grey and sharp all describe a noun, so that is three.' }
    },
    {
      id: 'speech', name: 'The Message Room', subject: 'Speech marks',
      tasks: [
        { q: 'Which sentence has the speech marks in the right place?',
          opts: [
            { text: '"Hold on, Tom!" shouted Alex.', why: 'Yes. Only the spoken words sit inside the marks.' },
            { text: '"Hold on, Tom! shouted Alex."', why: 'Shouted Alex is not spoken out loud, so it goes outside.' },
            { text: 'Hold on, "Tom!" shouted Alex.', why: 'The whole of what Alex says goes inside, not one word of it.' }
          ], answer: 0 },
        { q: 'Who is speaking? "My leg hurts," said Tom.',
          opts: [
            { text: 'Alex', why: 'Alex is not named in this sentence at all.' },
            { text: 'Tom', why: 'Yes. Said Tom tells you whose words those are.' },
            { text: 'the firefighter', why: 'Nobody else is named here. Look for the name after said.' }
          ], answer: 1 }
      ],
      digit: { q: 'How many words are inside the speech marks? "Let go!" yelled Sami.',
               answer: 2, why: 'Let and go are inside. Yelled Sami is outside, because nobody says it out loud.' }
    },
    {
      id: 'numbers', name: 'The Number Store', subject: 'Place value and making 100',
      tasks: [
        { q: 'What is the 7 worth in 472?',
          opts: [
            { text: '7', why: 'The 2 is in the ones place here, not the 7.' },
            { text: '70', why: 'Yes. The 7 sits in the tens place, so it is worth 70.' },
            { text: '700', why: 'The 4 is worth 400. The 7 is one place to the right.' }
          ], answer: 1 },
        { q: 'What goes with 65 to make 100?',
          opts: [
            { text: '35', why: 'Yes. 65 and 35: six tens and three tens make 90, then 5 and 5 make 10.' },
            { text: '45', why: 'That is too many. 65 and 45 comes to 110.' },
            { text: '25', why: 'That is too few. 65 and 25 comes to 90.' }
          ], answer: 0 }
      ],
      digit: { q: '30 + 12 has the same answer as 12 + 30. What is the tens digit of that answer?',
               answer: 4, why: 'Both come to 42, and the tens digit of 42 is 4.' }
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
      id: 'kite', title: 'The Kite on the Hill',
      vocab: ['to skid means to slide and stop suddenly, the way a bike does on gravel.',
              'to wobble means to move from side to side, not quite falling over.'],
      text: [
        'The wind was pulling hard at the kite.',
        'Leila ran along the top of the hill with the string wound twice round her hand. Behind her, her little brother Sami was shouting something, but the wind grabbed his words and threw them away.',
        'The kite dipped. It swung left, then dropped like a stone towards the trees.',
        '"Let go!" yelled Sami.',
        'Leila did not let go. She skidded to a stop, leaned back and pulled. The kite wobbled, lifted and climbed again into the grey sky.',
        'Sami arrived with grass on his knees.',
        '"You were nearly in the hedge," he said.',
        '"I know," said Leila, grinning. "Hold this."',
        'She passed him the string and sat down on the wet grass to watch.'
      ],
      facts: [
        { q: 'What was Leila holding?',
          opts: ['the string of a kite', 'a football', 'an umbrella'], a: 0,
          why: 'The string was wound twice round her hand.' },
        { q: 'Who shouted "Let go!"?',
          opts: ['Leila', 'Sami', 'their mum'], a: 1,
          why: 'Sami yelled it from behind her.' },
        { q: 'Where did the kite nearly end up?',
          opts: ['in the hedge', 'in the sea', 'on the road'], a: 0,
          why: 'Sami says, "You were nearly in the hedge."' }
      ],
      writes: [
        { q: 'How do you know the wind was strong? Use two things from the story.',
          model: 'The wind was pulling hard at the kite, and it grabbed Sami\'s words and threw them away so Leila could not hear him.' },
        { q: 'The writer chose yelled and grinning instead of said and smiled. What does each one tell you?',
          model: 'Yelled tells you Sami was loud, probably worried. Grinning tells you Leila was pleased with herself, because a grin is a wide, cheeky smile.' }
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
        { q: 'How does Amina feel at the start?',
          opts: ['excited', 'she did not like it one bit', 'sleepy'], a: 1,
          why: 'The story says she did not like the path one bit.' },
        { q: 'How long has the lighthouse been there?',
          opts: ['two years', 'twenty years', 'two hundred years'], a: 2,
          why: 'Grandad says it has been there two hundred years, storms and all.' },
        { q: 'What colour is the lighthouse door?',
          opts: ['white', 'red', 'grey'], a: 1,
          why: 'It is tall and white with a red door.' }
      ],
      writes: [
        { q: 'Why did her house look small as a stamp? Write one sentence.',
          model: 'She was standing right at the top of the cliff, so everything below her looked tiny from that far up.' },
        { q: 'Write two words that describe the path, and copy the part of the story that proves each one.',
          model: 'Steep and narrow, because the story says so in the first line, and slippery, because her boots slipped on the wet stones.' }
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
           SEQ: SEQ, PAIRS: PAIRS, DOORS: DOORS, PASSAGES: PASSAGES };
})();
