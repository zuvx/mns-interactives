/* ============================================================
   Shared widgets for Lesson 3 (Even Street) and Lesson 4 (Odd Street).
   The two lessons are the same shape with the parity flipped, so the
   logic lives here once rather than being copied and left to drift.
   Depends on numwords.js and post.js.
   ============================================================ */
(function (root) {
  'use strict';
  var N = root.NumWords;

  /** Sort house numbers onto the right side of the street.
      cfg: {host, houses:[n], want:'even'|'odd', taskPrefix, streetName} */
  function buildSort(cfg) {
    var host = cfg.host;
    var wantEven = cfg.want === 'even';
    var solved = 0, total = cfg.houses.filter(function (n) {
      return wantEven ? N.isEven(n) : N.isOdd(n);
    }).length;

    var v = document.createElement('p');
    v.className = 'verdict';
    v.setAttribute('role', 'status');

    var street = document.createElement('div');
    street.className = 'street';
    street.innerHTML = '<h3>' + cfg.streetName + '</h3>';
    var row = document.createElement('div');
    row.className = 'houses';
    street.appendChild(row);

    cfg.houses.forEach(function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'house';
      b.textContent = n;
      b.setAttribute('aria-label', 'House number ' + n);
      b.addEventListener('click', function () {
        if (b.dataset.state) return;
        var right = wantEven ? N.isEven(n) : N.isOdd(n);
        b.dataset.state = right ? 'right' : 'wrong';
        b.disabled = true;
        if (right) {
          solved++;
          v.className = 'verdict good';
          v.textContent = n + ' is ' + cfg.want + ' — it belongs here. ' +
            (solved === total ? 'That is the whole street.' : (total - solved) + ' to go.');
          root.Post.record({ task: cfg.taskPrefix + ' ' + n, result: 'correct in 1' });
        } else {
          v.className = 'verdict bad';
          v.textContent = n + ' ends in ' + (n % 10) + ', so it is ' +
            (wantEven ? 'odd' : 'even') + '. It lives on the other side of the road.';
          root.Post.record({ task: cfg.taskPrefix + ' ' + n, result: 'tried (wrong side)' });
        }
      });
      row.appendChild(b);
    });

    host.appendChild(street);
    host.appendChild(v);
  }

  /** A linear sequence with the last terms blanked out.
      cfg: {host, start, step, shown, blanks, taskPrefix} */
  function buildSequence(cfg) {
    var host = cfg.host;
    var terms = [];
    for (var i = 0; i < cfg.shown + cfg.blanks; i++) terms.push(cfg.start + i * cfg.step);

    var strip = document.createElement('div');
    strip.className = 'seq';
    strip.setAttribute('role', 'img');
    strip.setAttribute('aria-label',
      'Sequence starting ' + terms.slice(0, cfg.shown).join(', ') + ', then blanks');

    terms.forEach(function (t, i) {
      // Arrow and box travel together, so a line break never strands a "+2"
      // at the end of one line with its box on the next.
      var step = document.createElement('span');
      step.className = 'seqstep';
      if (i) {
        var a = document.createElement('span');
        a.className = 'arrow';
        a.textContent = (cfg.step > 0 ? '+' : '−') + Math.abs(cfg.step);
        step.appendChild(a);
      }
      var box = document.createElement('span');
      box.className = 'seqbox' + (i >= cfg.shown ? ' blank' : '');
      box.textContent = i >= cfg.shown ? '?' : t;
      box.id = cfg.taskPrefix.replace(/\s+/g, '') + '-box' + i;
      step.appendChild(box);
      strip.appendChild(step);
    });
    host.appendChild(strip);

    // Ask for the term-to-term rule first — 3Nc.05 is about describing it,
    // not only continuing the pattern.
    root.Post.ask(host, {
      prompt: 'What is the rule? The numbers go up by how many each time?',
      answer: Math.abs(cfg.step),
      task: cfg.taskPrefix + ' rule',
      nudge: 'Look at the first two numbers. How far apart are they?',
      hint: terms[0] + ' to ' + terms[1] + ' is ' + Math.abs(cfg.step) + '.',
      praise: 'Yes — that is the term-to-term rule.'
    });

    for (var b = 0; b < cfg.blanks; b++) {
      (function (idx) {
        root.Post.ask(host, {
          prompt: 'What is the next number after ' + terms[idx - 1] + '?',
          answer: terms[idx],
          task: cfg.taskPrefix + ' term ' + (idx + 1),
          nudge: 'Add ' + Math.abs(cfg.step) + ' to ' + terms[idx - 1] + '.',
          hint: terms[idx - 1] + ' + ' + Math.abs(cfg.step) + ' = ' + terms[idx] + '.',
          praise: 'Correct.',
          onSolved: function () {
            var box = document.getElementById(cfg.taskPrefix.replace(/\s+/g, '') + '-box' + idx);
            if (box) { box.textContent = terms[idx]; box.classList.remove('blank'); }
          }
        });
      })(cfg.shown + b);
    }
  }

  /** Write each of these in words — the reading-and-writing spine of the unit. */
  function buildWordsSet(cfg) {
    cfg.numbers.forEach(function (n) {
      root.Post.ask(cfg.host, {
        words: true,
        prompt: 'Write ' + n + ' in words.',
        accept: function (v) { return N.wordsMatch(v, N.toWords(n)); },
        task: cfg.taskPrefix + ' ' + n,
        nudge: 'Say it out loud first. Hundreds, then "and", then the rest.',
        hint: 'It is "' + N.toWords(n) + '".',
        praise: 'Correct.'
      });
    });
  }

  /** And the other way: words in, numeral out. */
  function buildNumeralSet(cfg) {
    cfg.numbers.forEach(function (n) {
      root.Post.ask(cfg.host, {
        prompt: 'Write "' + N.toWords(n) + '" as a numeral.',
        answer: n,
        task: cfg.taskPrefix + ' ' + n,
        nudge: 'How many hundreds, how many tens, how many ones?',
        hint: 'It is ' + n + '.',
        praise: 'Correct.'
      });
    });
  }

  root.Street = {
    buildSort: buildSort,
    buildSequence: buildSequence,
    buildWordsSet: buildWordsSet,
    buildNumeralSet: buildNumeralSet
  };
})(window);
