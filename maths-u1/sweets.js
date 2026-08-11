/* ============================================================
   The Sweet Factory — the manipulatives this unit needs.
   Cambridge Primary Maths Stage 3 · Unit 1 · 3Nc.01, 3Nc.02, 3Nc.03

   The Teacher's Guide names three misconceptions, and each widget here
   attacks one of them:

     "learners rote count without understanding"
        -> buildCountRun shows the three digits while the number changes, so
           the pattern is visible rather than chanted.
     "many simply remember the rule about the ones digit"
        -> buildPairing and buildSharing make a number even or odd by pairing
           and by sharing between two. The digit rule is what they conclude,
           not what they are told.
     "most learners are averse to estimating; they want to be correct"
        -> buildJar closes the lid, so counting is not an option and a range
           is the only honest answer.

   Depends on factory.js. No network, no storage.
   ============================================================ */
(function (root) {
  'use strict';

  var F = root.Factory;

  function parts(n) {
    return { h: Math.floor(n / 100) % 10, t: Math.floor(n / 10) % 10, o: n % 10,
             thousands: Math.floor(n / 1000) };
  }

  /** Small deterministic generator, so a jar looks the same every time it is
      opened and the answer key can be checked against what is drawn. */
  function seeded(seed) {
    var x = seed * 9301 + 49297;
    return function () { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  }

  /* ---------------- L1: the packing line ---------------- */

  /** The three digit cells. Digits that just changed are highlighted, which is
      the whole point of the lesson: in tens the ones digit never moves. */
  function digitPanel(host, value) {
    var el = document.createElement('div');
    el.className = 'digits';
    el.setAttribute('role', 'img');
    host.appendChild(el);

    function paint(n, previous) {
      var p = parts(n), q = previous === undefined ? null : parts(previous);
      var cells = [
        { cls: 'h', lbl: '100s', d: p.h, was: q && q.h },
        { cls: 't', lbl: '10s', d: p.t, was: q && q.t },
        { cls: 'o', lbl: '1s', d: p.o, was: q && q.o }
      ];
      // Past 999 the hundreds cell alone cannot hold the number, so show it whole.
      var over = n > 999;
      el.innerHTML = over
        ? '<div class="digit" style="width:auto;padding:0 1rem">' + n +
          '<span class="lbl">more than 999</span></div>'
        : cells.map(function (c) {
            var changed = q && c.d !== c.was ? ' changed' : '';
            return '<div class="digit ' + c.cls + changed + '">' + c.d +
                   '<span class="lbl">' + c.lbl + '</span></div>';
          }).join('');
      el.setAttribute('aria-label', over ? String(n)
        : p.h + ' hundreds, ' + p.t + ' tens and ' + p.o + ' ones');
    }

    paint(value);
    return paint;
  }

  /** A run of counting on or back in a constant step.
      cfg: {host, start, step, steps, taskPrefix, unit} where unit is the thing
      being added — 'tray of 10' or 'crate of 100'. */
  function buildCountRun(cfg) {
    var host = cfg.host;
    var going = cfg.step > 0 ? 'on' : 'back';
    var word = cfg.step > 0 ? 'add' : 'take away';
    var size = Math.abs(cfg.step);

    var caption = document.createElement('p');
    caption.className = 'lead';
    caption.textContent = 'The line starts at ' + cfg.start + '. Each time you ' + word +
      ' one ' + cfg.unit + ', work out the new number.';
    host.appendChild(caption);

    var paint = digitPanel(host, cfg.start);

    var value = cfg.start;
    for (var i = 0; i < cfg.steps; i++) {
      (function (from) {
        var to = from + cfg.step;
        var crosses = Math.floor(from / 100) !== Math.floor(to / 100);
        F.ask(host, {
          prompt: 'You ' + word + ' one ' + cfg.unit + ' to ' + from + '. What is the new number?',
          answer: to,
          task: cfg.taskPrefix + ' ' + from + (cfg.step > 0 ? '+' : '') + cfg.step,
          nudge: crosses
            ? 'Careful. This one goes past a hundred, so the hundreds digit moves too.'
            : 'Count ' + going + ' ' + size + ' from ' + from + '. Which digit changes?',
          hint: from + (cfg.step > 0 ? ' + ' : ' − ') + size + ' = ' + to + '.',
          praise: 'Correct.',
          onSolved: function () { paint(to, from); }
        });
      })(value);
      value += cfg.step;
    }
    return value;
  }

  /** The generalisation the Student's Book asks for, as a choice rather than a
      typed sentence: an eight-year-old should not have to spell it to show it. */
  function buildDigitTalk(cfg) {
    var tens = Math.abs(cfg.step) === 10;
    F.choose(cfg.host, {
      prompt: tens
        ? 'When you count on in tens and you do NOT pass a hundred, which digit stays the same?'
        : 'When you count on in hundreds, which digits stay the same?',
      task: cfg.taskPrefix + ' pattern',
      options: tens
        ? [{ label: 'The ones digit', right: true,
             why: 'Yes. Ten more only changes the tens, so the ones digit never moves.' },
           { label: 'The tens digit', why: 'No. The tens digit is the one that goes up by 1.' },
           { label: 'Every digit', why: 'No. Look again at your run: one of the digits never moved.' }]
        : [{ label: 'The tens and the ones', right: true,
             why: 'Yes. A hundred more only changes the hundreds digit.' },
           { label: 'The hundreds', why: 'No. The hundreds digit is the one that goes up by 1.' },
           { label: 'Only the ones', why: 'Close, but the tens digit stayed the same too.' }]
    });
  }

  /* ---------------- L2: the pairing machine ---------------- */

  /** Pair a number of sweets up and see whether one is left over.
      This is the Student's Book cube picture, made to move. */
  function buildPairing(cfg) {
    cfg.numbers.forEach(function (n) {
      var box = document.createElement('div');
      box.className = 'quest';
      box.innerHTML = '<div class="q">' + n + ' sweets</div>';

      var tray = document.createElement('div');
      tray.className = 'pairs';
      box.appendChild(tray);

      var note = document.createElement('p');
      note.className = 'leftover-note';
      box.appendChild(note);

      var run = document.createElement('button');
      run.type = 'button';
      run.className = 'btn mint';
      run.textContent = 'Pair them up';
      box.appendChild(run);

      var asked = false;
      run.addEventListener('click', function () {
        var full = Math.floor(n / 2), spare = n % 2;
        tray.innerHTML = '';
        for (var i = 0; i < full; i++) {
          tray.insertAdjacentHTML('beforeend',
            '<span class="pair"><span class="sweet"></span><span class="sweet"></span></span>');
        }
        if (spare) {
          tray.insertAdjacentHTML('beforeend', '<span class="pair lonely"><span class="sweet"></span></span>');
        }
        tray.setAttribute('aria-label', full + ' pairs' + (spare ? ' and one left over' : ' and none left over'));
        note.textContent = spare ? 'One will not go into a pair.' : 'They all went into pairs.';
        run.disabled = true;

        if (asked) return;          // one award per number, however many taps
        asked = true;
        F.choose(box, {
          prompt: 'So is ' + n + ' even or odd?',
          task: cfg.taskPrefix + ' ' + n,
          options: [
            { label: 'Even', right: spare === 0,
              why: spare === 0
                ? 'Yes. Every sweet found a partner, so ' + n + ' is even.'
                : 'Not this one. Look again — one sweet has no partner.' },
            { label: 'Odd', right: spare === 1,
              why: spare === 1
                ? 'Yes. One sweet is left on its own, so ' + n + ' is odd. It is ' +
                  (n - 1) + ' add 1.'
                : 'Not this one. Look again — every sweet found a partner.' }
          ]
        });
      });

      cfg.host.appendChild(box);
    });
  }

  /** Collins sorts into a Carroll diagram, and labels the right column
      "not even" rather than "odd". Keeping their wording matters: it is the
      wording in the Progress Check. */
  function buildCarroll(cfg) {
    var wrap = document.createElement('div');
    wrap.className = 'carroll';
    wrap.innerHTML =
      '<div class="carroll-col"><h4>' + cfg.leftLabel + '</h4><div class="slot" data-side="left"></div></div>' +
      '<div class="carroll-col"><h4>' + cfg.rightLabel + '</h4><div class="slot" data-side="right"></div></div>';
    var left = wrap.querySelector('[data-side="left"]');
    var right = wrap.querySelector('[data-side="right"]');

    var pool = document.createElement('div');
    pool.className = 'carroll-col';
    pool.innerHTML = '<h4>Still to sort</h4>';
    var poolSlot = document.createElement('div');
    poolSlot.className = 'slot';
    pool.appendChild(poolSlot);

    var v = document.createElement('p');
    v.className = 'verdict';
    v.setAttribute('role', 'status');

    var placed = 0, total = cfg.numbers.length;

    cfg.numbers.forEach(function (n) {
      // Number plus one button per column. A tap is a decision, so the child
      // has to commit before touching the screen rather than shuffle chips.
      var item = document.createElement('span');
      item.style.display = 'inline-flex';
      item.style.alignItems = 'center';
      item.style.gap = '.375rem';

      var chip = document.createElement('span');
      chip.className = 'numchip';
      chip.style.cursor = 'default';
      chip.textContent = n;
      item.appendChild(chip);

      function send(side, label) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice';
        b.textContent = label;
        b.setAttribute('aria-label', 'Put ' + n + ' in ' + label);
        b.addEventListener('click', function () {
          if (item.dataset.done) return;
          var belongsLeft = cfg.test(n);
          var correct = (side === 'left') === belongsLeft;
          item.dataset.done = '1';
          chip.dataset.state = correct ? 'right' : 'wrong';
          Array.prototype.forEach.call(item.querySelectorAll('button'), function (x) { x.remove(); });
          (belongsLeft ? left : right).appendChild(item);
          if (correct) {
            placed++;
            v.className = 'verdict good';
            v.textContent = n + ' is in the right column. ' +
              (placed === total ? 'All sorted.' : (total - placed) + ' to go.');
            F.record({ task: cfg.taskPrefix + ' ' + n, result: 'correct in 1' });
          } else {
            v.className = 'verdict bad';
            v.textContent = n + ' ends in ' + (n % 10) + ', so it belongs under "' +
              (belongsLeft ? cfg.leftLabel : cfg.rightLabel) + '". It has been moved there.';
            F.record({ task: cfg.taskPrefix + ' ' + n, result: 'tried (wrong column)' });
          }
        });
        return b;
      }

      item.appendChild(send('left', cfg.leftLabel));
      item.appendChild(send('right', cfg.rightLabel));
      poolSlot.appendChild(item);
    });

    cfg.host.appendChild(pool);
    cfg.host.appendChild(wrap);
    cfg.host.appendChild(v);
  }

  /* ---------------- L3: the sharing chute ---------------- */

  /** Share a number between two chutes. Even splits equally; odd leaves one in
      the hopper. This is Lesson 3's whole idea, and the generalisation the
      Student's Book asks for follows from watching it happen. */
  function buildSharing(cfg) {
    cfg.numbers.forEach(function (n) {
      var box = document.createElement('div');
      box.className = 'quest';
      box.innerHTML = '<div class="q">Share ' + n + ' sweets between 2 boxes</div>';

      var chutes = document.createElement('div');
      chutes.className = 'chutes';
      chutes.innerHTML =
        '<div class="chute"><h4>Box 1</h4></div>' +
        '<div class="chute"><h4>Box 2</h4></div>' +
        '<div class="chute spare"><h4>Left in the hopper</h4></div>';
      box.appendChild(chutes);

      var run = document.createElement('button');
      run.type = 'button';
      run.className = 'btn mint';
      run.textContent = 'Share them out';
      box.appendChild(run);

      var asked = false;
      run.addEventListener('click', function () {
        var each = Math.floor(n / 2), spare = n % 2;
        var cols = chutes.querySelectorAll('.chute');
        [0, 1].forEach(function (c) {
          cols[c].querySelectorAll('.sweet').forEach(function (s) { s.remove(); });
          for (var i = 0; i < each; i++) {
            cols[c].insertAdjacentHTML('beforeend', '<span class="sweet"></span>');
          }
          cols[c].classList.toggle('equal', true);
        });
        cols[2].querySelectorAll('.sweet').forEach(function (s) { s.remove(); });
        for (var k = 0; k < spare; k++) {
          cols[2].insertAdjacentHTML('beforeend', '<span class="sweet"></span>');
        }
        chutes.setAttribute('aria-label',
          each + ' in each box' + (spare ? ' and 1 left in the hopper' : ' and nothing left over'));
        run.disabled = true;

        if (asked) return;
        asked = true;
        F.ask(box, {
          prompt: 'How many sweets went into each box?',
          answer: each,
          task: cfg.taskPrefix + ' ' + n + ' each',
          nudge: 'Count the sweets in one box only, not both.',
          hint: n + ' shared between 2 is ' + each + (spare ? ', with 1 left over.' : '.'),
          praise: 'Correct.'
        });
        F.choose(box, {
          prompt: 'Did ' + n + ' share equally between 2?',
          task: cfg.taskPrefix + ' ' + n + ' equal',
          options: [
            { label: 'Yes, nothing left over', right: spare === 0,
              why: spare === 0
                ? 'Yes. ' + n + ' can be divided by 2, so it is even.'
                : 'Look at the hopper — there is still one sweet in it.' },
            { label: 'No, one is left over', right: spare === 1,
              why: spare === 1
                ? 'Yes. ' + n + ' cannot be divided by 2, so it is odd.'
                : 'Look at the hopper — it is empty, so it did share equally.' }
          ]
        });
      });

      cfg.host.appendChild(box);
    });
  }

  /* ---------------- L4: the estimating jar ---------------- */

  /** A jar you cannot count.
      The lid shuts after three seconds, so a range really is the only honest
      answer — which is the point the Teacher's Guide says children resist.
      The child presses Look! themselves and may press it again as often as
      they like: there is no countdown on screen and nothing is scored on
      speed. */
  function buildJar(cfg) {
    var n = cfg.count;
    var rand = seeded(n * 7 + 13);

    var jar = document.createElement('div');
    jar.className = 'jar';
    jar.dataset.lid = 'closed';

    var scatter = document.createElement('div');
    scatter.className = 'scatter';
    scatter.setAttribute('role', 'img');
    scatter.setAttribute('aria-label', 'A jar of sweets, too many to count quickly');
    var colours = ['var(--one)', 'var(--lemon)', 'var(--mint)', 'var(--liquorice-2)'];
    for (var i = 0; i < n; i++) {
      var s = document.createElement('i');
      s.style.left = (2 + rand() * 92).toFixed(1) + '%';
      s.style.top = (2 + rand() * 88).toFixed(1) + '%';
      s.style.background = colours[i % colours.length];
      scatter.appendChild(s);
    }
    jar.appendChild(scatter);

    var msg = document.createElement('p');
    msg.className = 'lidmsg';
    msg.textContent = 'The lid is on. Press Look! for a peek — you will not have time to count them.';
    jar.appendChild(msg);
    cfg.host.appendChild(jar);

    var look = document.createElement('button');
    look.type = 'button';
    look.className = 'btn lemon';
    look.textContent = 'Look!';
    look.setAttribute('aria-label', 'Open the lid for a few seconds');
    var timer = null;
    look.addEventListener('click', function () {
      jar.dataset.lid = 'open';
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { jar.dataset.lid = 'closed'; }, 3000);
    });
    var row = document.createElement('div');
    row.className = 'btnrow';
    row.appendChild(look);
    cfg.host.appendChild(row);

    // 1. A range, not a number. Collins marks ranges, so the options are the
    //    decade bands either side of the truth.
    var low = Math.floor(n / 10) * 10;
    var bands = [low - 20, low - 10, low, low + 10]
      .filter(function (b) { return b >= 0; })
      .map(function (b) { return { lo: b, hi: b + 10 }; });
    F.choose(cfg.host, {
      prompt: 'Which range is a sensible estimate?',
      task: cfg.taskPrefix + ' range',
      options: bands.map(function (b) {
        var right = n >= b.lo && n <= b.hi;
        return {
          label: b.lo + '–' + b.hi, right: right,
          why: right
            ? 'Yes, that range holds the real number.'
            : 'Not that one. Press Look! again and think about how full the jar is.'
        };
      })
    });

    // 2. Now group in tens, exactly as the Workbook asks, and count for real.
    var grouped = document.createElement('div');
    grouped.className = 'jar';
    grouped.style.display = 'none';
    var inner = document.createElement('div');
    inner.className = 'grouped';
    grouped.appendChild(inner);
    cfg.host.appendChild(grouped);

    var group = document.createElement('button');
    group.type = 'button';
    group.className = 'btn';
    group.textContent = 'Tip them out and group in tens';
    group.addEventListener('click', function () {
      var full = Math.floor(n / 10), rest = n % 10, html = '';
      for (var g = 0; g < full; g++) {
        html += '<span class="tenbox">' + '<i style="background:var(--one)"></i>'.repeat(10) + '</span>';
      }
      if (rest) {
        html += '<span class="tenbox part">' + '<i style="background:var(--one)"></i>'.repeat(rest) + '</span>';
      }
      inner.innerHTML = html;
      inner.setAttribute('aria-label', full + ' full boxes of ten' +
        (rest ? ' and ' + rest + ' left over' : ''));
      grouped.style.display = 'block';
      group.disabled = true;
    });
    var row2 = document.createElement('div');
    row2.className = 'btnrow';
    row2.appendChild(group);
    cfg.host.appendChild(row2);

    F.ask(cfg.host, {
      prompt: 'Now count the groups of ten. How many sweets are there altogether?',
      answer: n,
      task: cfg.taskPrefix + ' exact',
      nudge: 'Count the full boxes in tens — 10, 20, 30 — then add the ones left over.',
      hint: Math.floor(n / 10) + ' tens and ' + (n % 10) + ' more is ' + n + '.',
      praise: 'Correct. Grouping in tens turns a guess into a count.'
    });
  }

  root.Sweets = {
    buildCountRun: buildCountRun,
    buildDigitTalk: buildDigitTalk,
    buildPairing: buildPairing,
    buildCarroll: buildCarroll,
    buildSharing: buildSharing,
    buildJar: buildJar,
    parts: parts
  };
})(window);
