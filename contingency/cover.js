/* ============================================================
   Base Camp — the Year 3 contingency plan, online half.
   Rules: design-system/mns-classroom/pages/lighthouse.md

   Kite Hill's engine, cut down to one step runner. Every room is a list of
   steps (choose, sort, order, build, write) shown one at a time, plus Spell
   Beam, which keeps its own board. The paper sheets in the folder above
   practise the same skills with different questions, so a child can do both
   and never copy one from the other.

   Only taught content, Term 1A weeks 1 to 6. No Progress Check numbers
   (check-cover.js enforces it).

   Nothing leaves the device. No network, no localStorage, no cookies.
   sessionStorage holds the star tally and the list of finished tasks.
   ============================================================ */
'use strict';
var BaseCamp = (function () {

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
  function button(cls, text, data) {
    var b = el('button', cls, text);
    b.type = 'button';
    Object.keys(data || {}).forEach(function (k) { b.dataset[k] = data[k]; });
    return b;
  }
  /* "The *huge* lorry" puts huge in a <mark>. Built node by node, never innerHTML. */
  function marked(text) {
    var box = el('div', 'show');
    text.split('*').forEach(function (part, i) {
      box.appendChild(i % 2 ? el('mark', null, part) : document.createTextNode(part));
    });
    return box;
  }

  /* ---------- icon sprite: SVG only, never emoji ---------- */
  var ICONS = {
    'i-star': '<path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9z"/>',
    'i-read': '<path d="M4 5h7v14H4z"/><path d="M13 5h7v14h-7z"/>',
    'i-sort': '<path d="M4 6h16M4 12h10M4 18h6"/>',
    'i-spell': '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>',
    'i-pen': '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    'i-build': '<rect x="4" y="13" width="6" height="7"/><rect x="14" y="9" width="6" height="11"/><path d="M4 9h6"/>',
    'i-sum': '<path d="M5 8h6M8 5v6M13 16h6M5 19l6-6"/>',
    'i-trail': '<path d="M3 20h5v-5h5v-5h5V5"/>',
    'i-tick': '<path d="M5 12.5l4.5 4.5L19 7"/>'
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
  function icon(name) {
    return '<svg class="icon" aria-hidden="true"><use href="#' + name + '"></use></svg>';
  }

  /* ---------- stars ---------- */
  var KEY_STARS = 'basecamp-stars';
  var KEY_DONE = 'basecamp-done';
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
  function markDone(zone) {
    var card = $('#card-' + zone);
    if (card && !card.querySelector('.done')) {
      var mark = el('span', 'done');
      mark.innerHTML = icon('i-tick');
      card.appendChild(mark);
    }
  }

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

  /* ============================================================
     THE ROOMS. Step kinds:
       choose  q, show?, opts [{text, why}], a        every option explains itself
       sort    q, show, bins [..], a, why, hint       one item into one of the chutes
       order   q, items [in the right order]          tap them in order
       build   words, answer                          hundreds, tens and ones
       write   q, model                               typed, then marked by the child
     ============================================================ */
  var ROOMS = {

    /* ---- English: reading. A different story from the paper one. ---- */
    read: {
      passage: {
        title: 'The Paper Boat',
        text: [
          'Omar folded a boat out of an old newspaper. He drew a flag on it with a blue pen and called it The Brave Duck.',
          'When the rain stopped, he and his big sister Lina carried it to the stream at the end of the road. The water was fast and brown.',
          'Omar put the boat on the water. It spun round once, then raced away under the little bridge.',
          '“Run!” shouted Lina.',
          'They ran to the other side of the bridge, but the boat was not there. Omar’s face fell.',
          'Then Lina pointed. The Brave Duck was stuck in some long grass near the bank. It was still floating, but its flag was soggy.',
          'Omar leaned over carefully and lifted it out. “It’s still brave,” he said, and he smiled.'
        ],
        vocab: ['stream: a small river', 'bank: the land at the side of a river', 'soggy: very wet and soft']
      },
      steps: [
        { kind: 'choose', q: 'What did Omar make the boat from?', opts: [
          { text: 'an old newspaper', why: 'Yes. The first line says he folded it out of an old newspaper.' },
          { text: 'a cardboard box', why: 'Look at the first line again. It tells you what he folded.' },
          { text: 'wood', why: 'You cannot fold wood. Read the first sentence again.' }], a: 0 },
        { kind: 'choose', q: 'What did Omar call his boat?', opts: [
          { text: 'The Blue Flag', why: 'He drew the flag with a blue pen, but that is not the boat’s name.' },
          { text: 'The Brave Duck', why: 'Yes. He called it The Brave Duck.' },
          { text: 'The Paper Boat', why: 'That is the title of the story, not the boat’s name.' }], a: 1 },
        { kind: 'choose', q: 'Where did the boat go after it spun round?', opts: [
          { text: 'under the little bridge', why: 'Yes. It raced away under the little bridge.' },
          { text: 'into the sea', why: 'There is no sea in this story. It is a stream.' },
          { text: 'back to Omar', why: 'If it came back, they would not need to run after it.' }], a: 0 },
        { kind: 'choose', q: '“Omar’s face fell.” What does this tell you?', opts: [
          { text: 'He fell over.', why: 'His face fell, not Omar. It is a way of saying how he felt.' },
          { text: 'He was sad and worried.', why: 'Yes. He could not see the boat, so he thought it was lost.' },
          { text: 'He was laughing.', why: 'Laughing does not fit. His boat had just disappeared.' }], a: 1 },
        { kind: 'order', q: 'Tap what happened, in order. First thing first.', items: [
          'Omar made the boat.',
          'They carried it to the stream.',
          'The boat raced under the bridge.',
          'Lina saw the boat in the grass.',
          'Omar lifted the boat out.'] },
        { kind: 'write', q: 'Why do you think Lina shouted “Run!”?',
          model: 'The water was fast, so the boat was moving quickly. She wanted to get to the other side of the bridge before it floated away.' }
      ]
    },

    /* ---- English: grammar. Tapping, where the paper asks for writing. ---- */
    words: {
      steps: [
        { kind: 'sort', q: 'What kind of word is underlined?', show: 'The *huge* lorry stopped at the lights.',
          bins: ['Noun', 'Verb', 'Adjective'], a: 2, why: 'Huge describes the lorry, so it is an adjective.',
          hint: 'Ask: does it name something, do something, or describe something?' },
        { kind: 'sort', q: 'What kind of word is underlined?', show: 'A cat *slept* on the warm wall.',
          bins: ['Noun', 'Verb', 'Adjective'], a: 1, why: 'Slept is what the cat did, so it is a verb.',
          hint: 'Ask: is it something the cat did?' },
        { kind: 'sort', q: 'What kind of word is underlined?', show: 'My *teacher* smiled at me.',
          bins: ['Noun', 'Verb', 'Adjective'], a: 0, why: 'Teacher names a person, so it is a noun.',
          hint: 'Can you put “the” in front of it?' },
        { kind: 'sort', q: 'What kind of word is underlined?', show: 'We *climbed* the steep hill.',
          bins: ['Noun', 'Verb', 'Adjective'], a: 1, why: 'Climbed is what we did, so it is a verb.',
          hint: 'Is it a doing word?' },
        { kind: 'sort', q: 'What kind of word is underlined?', show: 'The soup was too *hot*.',
          bins: ['Noun', 'Verb', 'Adjective'], a: 2, why: 'Hot describes the soup, so it is an adjective.',
          hint: 'Does it tell you what the soup was like?' },
        { kind: 'sort', q: 'What kind of word is underlined?', show: 'Dad found the *keys* under the sofa.',
          bins: ['Noun', 'Verb', 'Adjective'], a: 0, why: 'Keys are things, so keys is a noun.',
          hint: 'Can you point at it?' },
        { kind: 'choose', q: 'Yesterday we ______ to the beach.', opts: [
          { text: 'go', why: 'Go is for now. Yesterday needs the past tense.' },
          { text: 'goed', why: 'Go is irregular, so it does not take -ed.' },
          { text: 'went', why: 'Yes. Went is the past tense of go.' }], a: 2 },
        { kind: 'choose', q: 'Last night Gran ______ a cake.', opts: [
          { text: 'made', why: 'Yes. Made is the past tense of make.' },
          { text: 'maked', why: 'Make is irregular. The past tense is made.' },
          { text: 'makes', why: 'Makes is for now. Last night needs the past tense.' }], a: 0 },
        { kind: 'choose', q: 'Which word is a being verb? The children were tired.', opts: [
          { text: 'children', why: 'Children names people, so it is a noun.' },
          { text: 'were', why: 'Yes. Were is a being verb, like is, are and was.' },
          { text: 'tired', why: 'Tired describes the children. It is an adjective.' }], a: 1 },
        { kind: 'choose', q: 'Which sentence has the speech marks in the right place?', opts: [
          { text: '“It’s my turn!” said Ben.', why: 'Yes. Only the words Ben says go inside the marks.' },
          { text: '“It’s my turn! said Ben.”', why: 'Said Ben is not spoken, so it goes outside the marks.' },
          { text: 'It’s my “turn!” said Ben.', why: 'All of the spoken words go inside, not just one.' }], a: 0 }
      ]
    },

    /* ---- English: writing. Build sentences, then fix them. ---- */
    sentence: {
      steps: [
        { kind: 'order', q: 'Tap the words in order to make a sentence.', items: ['The', 'dog', 'chased', 'the', 'red', 'ball.'] },
        { kind: 'order', q: 'Tap the words in order to make a sentence.', items: ['Last', 'week', 'we', 'visited', 'the', 'zoo.'] },
        { kind: 'order', q: 'Tap the words in order to make a sentence.', items: ['My', 'brother', 'laughed', 'at', 'the', 'funny', 'clown.'] },
        { kind: 'choose', q: 'Which sentence is written correctly?', opts: [
          { text: 'we played in the park.', why: 'A sentence starts with a capital letter. We needs a capital W.' },
          { text: 'We played in the park.', why: 'Yes. Capital letter at the start, full stop at the end.' },
          { text: 'We played in the park', why: 'Look at the end. A sentence needs a full stop.' }], a: 1 },
        { kind: 'choose', q: 'Which word is more interesting than went? The ball ______ down the hill.', opts: [
          { text: 'went', why: 'Went is not wrong, but it does not tell you how the ball moved.' },
          { text: 'rolled', why: 'Yes. Rolled shows you how the ball moved.' },
          { text: 'was', why: 'Was is a being verb. It does not say what the ball did.' }], a: 1 },
        { kind: 'choose', q: 'On a postcard, where does the stamp go?', opts: [
          { text: 'top right corner', why: 'Yes. The stamp goes in the top right, above the address.' },
          { text: 'in the middle of the message', why: 'The message side is only for writing. The stamp goes on the address side.' },
          { text: 'at the bottom', why: 'Not at the bottom. Look at a real postcard: it is the top right corner.' }], a: 0 },
        { kind: 'choose', q: 'Which is a good way to end a postcard to your gran?', opts: [
          { text: 'The end.', why: 'That is how a story ends, not a postcard.' },
          { text: 'Goodbye postcard.', why: 'You are writing to Gran, not to the postcard.' },
          { text: 'Love from Sara', why: 'Yes. A friendly sign-off and your name.' }], a: 2 },
        { kind: 'write', q: 'Write one postcard sentence about a place you have been. Use a past tense verb and an adjective.',
          model: 'Yesterday we went to the beach and I built an enormous sandcastle.' }
      ]
    },

    /* ---- Maths: place value ---- */
    place: {
      steps: [
        { kind: 'build', words: 'five hundred and eighty-one', answer: 581 },
        { kind: 'build', words: 'six hundred and nine', answer: 609,
          note: 'Careful. There are no tens, so a zero holds that place.' },
        { kind: 'build', words: 'nine hundred and forty', answer: 940 },
        { kind: 'choose', q: 'What is the 8 worth in 483?', opts: [
          { text: '8', why: 'The 3 is in the ones place, not the 8.' },
          { text: '80', why: 'Yes. The 8 is in the tens place, so it is worth 80.' },
          { text: '800', why: 'The 4 is in the hundreds place. The 8 is one place to the right.' }], a: 1 },
        { kind: 'choose', q: 'Which number has no tens?', opts: [
          { text: '780', why: 'In 780 the 8 is in the tens place.' },
          { text: '708', why: 'Yes. The zero in the middle holds the tens place.' },
          { text: '870', why: 'In 870 the 7 is in the tens place.' }], a: 1 },
        { kind: 'choose', q: 'Which number is the same as 500 + 60 + 2?', opts: [
          { text: '526', why: 'The tens and the ones have swapped places.' },
          { text: '5602', why: 'That has four digits. 60 is 6 tens, so only one digit for the tens.' },
          { text: '562', why: 'Yes. 5 hundreds, 6 tens and 2 ones.' }], a: 2 },
        { kind: 'choose', q: 'Which sign goes in the gap?', show: '637  ?  673', opts: [
          { text: '<', why: 'Yes. Same hundreds, then 3 tens is less than 7 tens.' },
          { text: '>', why: 'Look at the tens: 3 tens is less than 7 tens.' },
          { text: '=', why: 'The digits are the same but in different places, so the numbers are different.' }], a: 0 },
        { kind: 'choose', q: 'Which sign goes in the gap?', show: '461  ?  416', opts: [
          { text: '<', why: 'Look at the tens: 6 tens is more than 1 ten.' },
          { text: '>', why: 'Yes. Same hundreds, then 6 tens is more than 1 ten.' },
          { text: '=', why: 'The ones and tens have moved, so the numbers are not equal.' }], a: 1 },
        { kind: 'order', q: 'Tap the numbers from smallest to largest.', items: ['128', '182', '218', '281'] },
        { kind: 'order', q: 'Tap the numbers from smallest to largest.', items: ['399', '409', '490', '904'] }
      ]
    },

    /* ---- Maths: addition and subtraction ---- */
    sums: {
      steps: [
        { kind: 'sort', q: 'Do you need to regroup?', show: '34 + 25', bins: ['Regroup', 'No regrouping'], a: 1,
          why: '4 + 5 = 9 ones, which is less than 10, so no regrouping.', hint: 'Add the ones first. Do they make 10 or more?' },
        { kind: 'sort', q: 'Do you need to regroup?', show: '47 + 36', bins: ['Regroup', 'No regrouping'], a: 0,
          why: '7 + 6 = 13 ones, so 10 ones become 1 ten.', hint: 'Add the ones first. Do they make 10 or more?' },
        { kind: 'sort', q: 'Do you need to regroup?', show: '68 − 23', bins: ['Regroup', 'No regrouping'], a: 1,
          why: '8 ones take away 3 ones is fine, so no regrouping.', hint: 'Look at the ones. Is there enough to take away?' },
        { kind: 'sort', q: 'Do you need to regroup?', show: '52 − 17', bins: ['Regroup', 'No regrouping'], a: 0,
          why: 'You cannot take 7 ones from 2 ones, so 1 ten becomes 10 ones.', hint: 'Look at the ones. Is there enough to take away?' },
        { kind: 'choose', q: 'What is the answer?', show: '47 + 36', opts: [
          { text: '83', why: 'Yes. 40 + 30 = 70, 7 + 6 = 13, and 70 + 13 = 83.' },
          { text: '713', why: 'The 13 ones were written down without regrouping. 10 ones make 1 more ten.' },
          { text: '73', why: 'Close. The regrouped ten was not added to the tens.' }], a: 0 },
        { kind: 'choose', q: 'What is the answer?', show: '52 − 17', opts: [
          { text: '45', why: 'That takes 2 from 7 instead of 7 from 2. Regroup a ten first.' },
          { text: '35', why: 'Yes. 52 becomes 40 and 12. 12 − 7 = 5 and 40 − 10 = 30.' },
          { text: '25', why: 'Too many tens were taken away. 40 − 10 = 30, not 20.' }], a: 1 },
        { kind: 'choose', q: 'What is the answer?', show: '29 + 46', opts: [
          { text: '65', why: 'The regrouped ten is missing. 9 + 6 = 15, so there is one more ten.' },
          { text: '615', why: 'The 15 ones need regrouping into 1 ten and 5 ones.' },
          { text: '75', why: 'Yes. 20 + 40 = 60, 9 + 6 = 15, and 60 + 15 = 75.' }], a: 2 },
        { kind: 'choose', q: 'What is the answer?', show: '64 − 28', opts: [
          { text: '36', why: 'Yes. 64 becomes 50 and 14. 14 − 8 = 6 and 50 − 20 = 30.' },
          { text: '44', why: 'That takes 4 from 8. You cannot, so regroup a ten first.' },
          { text: '46', why: 'Close. After regrouping there are only 5 tens left, not 6.' }], a: 0 },
        { kind: 'choose', q: 'What is the answer?', show: '268 + 7', opts: [
          { text: '265', why: 'That is 268 take away 3. This is an add.' },
          { text: '275', why: 'Yes. 8 + 7 = 15, so the tens go up by one: 275.' },
          { text: '2615', why: 'The 15 ones need regrouping into 1 ten and 5 ones.' }], a: 1 },
        { kind: 'choose', q: 'What is the missing number?', show: '38 + ? = 100', opts: [
          { text: '72', why: '38 + 72 is 110. That is too many.' },
          { text: '52', why: '38 + 52 is 90. That is not enough.' },
          { text: '62', why: 'Yes. 38 + 2 = 40, then 40 + 60 = 100. 2 + 60 = 62.' }], a: 2 },
        { kind: 'choose', q: 'Ana has 45 stickers. She gets 27 more. How many does she have now?', opts: [
          { text: '72', why: 'Yes. 40 + 20 = 60, 5 + 7 = 12, and 60 + 12 = 72.' },
          { text: '62', why: 'The regrouped ten is missing. 5 + 7 = 12.' },
          { text: '18', why: 'That is a take away. She gets more, so add.' }], a: 0 }
      ]
    },

    /* ---- Maths: sequences, odd and even ---- */
    trail: {
      steps: [
        { kind: 'choose', q: 'What is the missing number?', show: '430, 440, 450, ?, 470', opts: [
          { text: '451', why: 'The steps are 10, not 1. Look at the tens digit.' },
          { text: '460', why: 'Yes. Add 10 each time: 450 + 10 = 460.' },
          { text: '550', why: 'That adds 100. The tens digit is changing, so add 10.' }], a: 1 },
        { kind: 'choose', q: 'What is the missing number?', show: '659, 559, 459, ?, 259', opts: [
          { text: '359', why: 'Yes. Subtract 100 each time: 459 − 100 = 359.' },
          { text: '449', why: 'That takes away 10. The hundreds digit is the one changing.' },
          { text: '369', why: 'Only the hundreds change in this sequence. The tens stay at 5.' }], a: 0 },
        { kind: 'choose', q: 'What is the missing number?', show: '184, 194, 204, ?, 224', opts: [
          { text: '205', why: 'The steps are 10, not 1.' },
          { text: '304', why: 'That adds 100. Look at the steps: they are 10.' },
          { text: '214', why: 'Yes. 204 + 10 = 214. Going past 200 is fine.' }], a: 2 },
        { kind: 'choose', q: 'What is the missing number?', show: '820, 810, 800, ?, 780', opts: [
          { text: '790', why: 'Yes. Subtract 10 each time: 800 − 10 = 790.' },
          { text: '700', why: 'That takes away 100. The steps here are 10.' },
          { text: '810', why: '810 is already in the sequence. Keep counting back.' }], a: 0 },
        { kind: 'choose', q: 'What is the rule?', show: '461, 471, 481, 491', opts: [
          { text: 'add 1 each time', why: 'The ones digit stays as 1. Something else changes.' },
          { text: 'add 10 each time', why: 'Yes. The tens digit goes up by one each time.' },
          { text: 'add 100 each time', why: 'The hundreds digit stays as 4.' }], a: 1 },
        { kind: 'choose', q: 'What is the rule?', show: '870, 770, 670, 570', opts: [
          { text: 'subtract 100 each time', why: 'Yes. The hundreds digit goes down by one each time.' },
          { text: 'subtract 10 each time', why: 'The tens digit stays as 7.' },
          { text: 'add 100 each time', why: 'The numbers are getting smaller, so it is a subtract.' }], a: 0 },
        { kind: 'sort', q: 'Odd or even?', show: '347', bins: ['Odd', 'Even'], a: 0,
          why: 'It ends in 7, so it is odd.', hint: 'Only look at the ones digit.' },
        { kind: 'sort', q: 'Odd or even?', show: '590', bins: ['Odd', 'Even'], a: 1,
          why: 'It ends in 0, so it is even.', hint: 'Only look at the ones digit.' },
        { kind: 'sort', q: 'Odd or even?', show: '763', bins: ['Odd', 'Even'], a: 0,
          why: 'It ends in 3, so it is odd.', hint: 'Only look at the ones digit.' },
        { kind: 'sort', q: 'Odd or even?', show: '128', bins: ['Odd', 'Even'], a: 1,
          why: 'It ends in 8, so it is even.', hint: 'Only look at the ones digit.' }
      ]
    }
  };

  /* ============================================================
     The step runner
     ============================================================ */
  var state = {};

  function startRoom(id) {
    state[id] = { at: 0, picks: { h: null, t: null, o: null }, placed: 0, order: null };
    renderRoom(id);
  }

  function renderRoom(id) {
    var room = ROOMS[id];
    var s = state[id];
    var host = $('#' + id + '-task');
    host.innerHTML = '';
    if (room.passage) {
      var box = el('div', 'passage');
      box.appendChild(el('h3', null, room.passage.title));
      room.passage.text.forEach(function (line) { box.appendChild(el('p', null, line)); });
      var vocab = el('div', 'vocab');
      room.passage.vocab.forEach(function (word) { vocab.appendChild(el('span', null, word)); });
      box.appendChild(vocab);
      host.appendChild(box);
    }
    var step = room.steps[s.at];
    $('#' + id + '-count').textContent = step
      ? 'Question ' + (s.at + 1) + ' of ' + room.steps.length : 'All done';
    if (!step) {
      host.appendChild(el('p', 'q', 'Every question done. Tap Start again for another go, or choose another room.'));
      return;
    }
    var card = el('div', 'task' + (step.kind === 'write' ? ' write' : ''));
    if (step.kind !== 'write' && step.kind !== 'build') card.appendChild(el('p', 'q', step.q));
    if (step.show) card.appendChild(marked(step.show));

    if (step.kind === 'choose') {
      var opts = el('div', 'opts');
      step.opts.forEach(function (opt, i) { opts.appendChild(button('opt', opt.text, { room: id, pick: i })); });
      card.appendChild(opts);
    } else if (step.kind === 'sort') {
      var chutes = el('div', 'chutes');
      step.bins.forEach(function (bin, i) { chutes.appendChild(button('chute', bin, { room: id, pick: i })); });
      card.appendChild(chutes);
    } else if (step.kind === 'order') {
      s.order = s.order || shuffle(step.items.map(function (_, i) { return i; }));
      var line = el('div', 'line');
      line.setAttribute('aria-label', 'your order so far');
      step.items.slice(0, s.placed).forEach(function (item) { line.appendChild(el('span', null, item)); });
      card.appendChild(line);
      var left = el('div', 'opts' + (step.items[0].length > 12 ? ' stack' : ''));
      s.order.forEach(function (i) {
        if (i >= s.placed) left.appendChild(button('opt', step.items[i], { room: id, item: i }));
      });
      card.appendChild(left);
    } else if (step.kind === 'build') {
      card.appendChild(el('div', 'target', 'Build this number:  ' + step.words));
      if (step.note) card.appendChild(el('p', 'why', step.note));
      var place = el('div', 'place');
      [['h', 'hundreds'], ['t', 'tens'], ['o', 'ones']].forEach(function (pair) {
        var row = el('div', 'prow');
        row.appendChild(el('span', 'plabel', pair[1]));
        var digits = el('div', 'digits');
        for (var n = 0; n <= 9; n++) {
          var d = button('digit', String(n), { room: id, place: pair[0], value: n });
          d.setAttribute('aria-pressed', String(s.picks[pair[0]] === n));
          digits.appendChild(d);
        }
        row.appendChild(digits);
        place.appendChild(row);
      });
      card.appendChild(place);
      card.appendChild(el('div', 'built', ''));
    } else if (step.kind === 'write') {
      var label = el('label', null, step.q);
      label.setAttribute('for', 'write-' + id + '-' + s.at);
      card.appendChild(label);
      var area = el('textarea');
      area.id = 'write-' + id + '-' + s.at;
      area.rows = 3;
      card.appendChild(area);
      var reveal = button('btn ghost', 'Show a good answer', { room: id, model: 1 });
      reveal.style.marginTop = '.75rem';
      card.appendChild(reveal);
      var model = el('div', 'model');
      model.hidden = true;
      model.appendChild(el('b', null, 'One good answer'));
      model.appendChild(el('p', null, step.model));
      var marks = el('div', 'selfmark');
      [['got', 'I got that'], ['near', 'Nearly'], ['not', 'Not yet']].forEach(function (pair) {
        marks.appendChild(button('btn ghost', pair[1], { room: id, self: pair[0] }));
      });
      model.appendChild(marks);
      card.appendChild(model);
    }
    card.appendChild(el('p', 'why'));
    host.appendChild(card);
    say($('#' + id + '-say'), step.kind === 'build' ? 'Choose one digit in each row.'
      : step.kind === 'order' ? 'Tap the first one.' : step.kind === 'write' ? 'Write first, then look.' : 'Which one is it?');
  }

  /* A right answer shows its reason and a Next button. The child moves on when
     they have read it, not when a timer decides. */
  function solved(id, message) {
    var s = state[id];
    award(id + '-' + s.at, 5);
    say($('#' + id + '-say'), message || 'Yes.', 'good');
    $$('#' + id + '-task .opt, #' + id + '-task .chute, #' + id + '-task .digit').forEach(function (b) { b.disabled = true; });
    var card = $('#' + id + '-task .task');
    if (!card.querySelector('[data-next]')) card.appendChild(button('btn', 'Next', { room: id, next: 1 }));
  }

  function next(id) {
    var s = state[id];
    s.at++;
    s.picks = { h: null, t: null, o: null };
    s.placed = 0;
    s.order = null;
    if (s.at >= ROOMS[id].steps.length) {
      award(id + '-all', 10);
      markDone(id);
    }
    renderRoom(id);
    if (s.at >= ROOMS[id].steps.length) say($('#' + id + '-say'), 'Room finished. Well worked.', 'good');
  }

  function pick(button) {
    var id = button.dataset.room;
    var step = ROOMS[id].steps[state[id].at];
    var choice = +button.dataset.pick;
    var card = button.closest('.task');
    $$('.opt, .chute', card).forEach(function (b) { b.classList.remove('good', 'bad'); });
    var right = choice === step.a;
    button.classList.add(right ? 'good' : 'bad');
    var why = $('.why', card);
    if (step.kind === 'choose') why.textContent = step.opts[choice].why;
    else why.textContent = right ? step.why : step.hint;
    if (right) solved(id);
    else say($('#' + id + '-say'), 'Not that one. Read the line underneath, then try again.', 'try');
  }

  function place(button) {
    var id = button.dataset.room;
    var s = state[id];
    var step = ROOMS[id].steps[s.at];
    var item = +button.dataset.item;
    var card = button.closest('.task');
    if (item !== s.placed) {
      button.classList.add('bad');
      $('.why', card).textContent = 'Not yet. Which one comes next?';
      return;
    }
    s.placed++;
    if (s.placed < step.items.length) { renderRoom(id); return; }
    renderRoom(id);
    $('#' + id + '-task .why').textContent = step.items.join(' ');
    solved(id, 'All in order.');
  }

  function digit(button) {
    var id = button.dataset.room;
    var s = state[id];
    var step = ROOMS[id].steps[s.at];
    s.picks[button.dataset.place] = +button.dataset.value;
    $$('#' + id + '-task .digit[data-place="' + button.dataset.place + '"]').forEach(function (other) {
      other.setAttribute('aria-pressed', String(other === button));
    });
    var p = s.picks;
    if (p.h === null || p.t === null || p.o === null) return;
    var made = p.h * 100 + p.t * 10 + p.o;
    $('#' + id + '-task .built').textContent = p.h * 100 + ' + ' + p.t * 10 + ' + ' + p.o + '  =  ' + made;
    if (made === step.answer) solved(id, 'Yes. ' + step.words + ' is ' + step.answer + '.');
    else say($('#' + id + '-say'), 'Not yet. Say the number out loud, then change one row.', 'try');
  }

  function selfMark(button) {
    var id = button.dataset.room;
    $$('.selfmark .btn', button.closest('.task')).forEach(function (b) { b.classList.remove('good'); });
    button.classList.add('good');
    solved(id, button.dataset.self === 'got'
      ? 'Good. Marking your own work honestly is the hard part.'
      : 'That is worth knowing. Read the good answer again before you move on.');
  }

  /* ============================================================
     SPELL BEAM — spelling words from weeks 2 to 6
     ============================================================ */
  var SPELL = [
    { word: 'CITY', clue: 'A big town. Soft c: the c sounds like s' },
    { word: 'GIANT', clue: 'Very, very big. Soft g: the g sounds like j' },
    { word: 'PENCIL', clue: 'You write and draw with it. Soft c' },
    { word: 'MAGIC', clue: 'Tricks with a wand. Soft g' },
    { word: 'ORANGE', clue: 'A fruit and a colour. Soft g' },
    { word: 'DANGER', clue: 'Something that could hurt you. Soft g' },
    { word: 'GIRAFFE', clue: 'An animal with a very long neck. Soft g, double f' },
    { word: 'CLIMBING', clue: 'Going up a tree or a wall. Just add -ing' },
    { word: 'SMILING', clue: 'Looking happy. Drop the e, then add -ing' },
    { word: 'SLIDING', clue: 'Going down the slide. Drop the e, then add -ing' },
    { word: 'RUNNING', clue: 'Going very fast on your feet. Double the n, then add -ing' },
    { word: 'SWIMMING', clue: 'Moving through water. Double the m, then add -ing' },
    { word: 'SKIPPING', clue: 'Jumping over a rope. Double the p, then add -ing' },
    { word: 'CLAPPING', clue: 'Hitting your hands together. Double the p, then add -ing' },
    { word: 'LOOKED', clue: 'Used your eyes, in the past. Just add -ed' },
    { word: 'SHARED', clue: 'Gave some to a friend, in the past. Drop the e, then add -ed' },
    { word: 'RUSHED', clue: 'Went very quickly, in the past. Just add -ed' },
    { word: 'SNAPPED', clue: 'Broke with a crack, in the past. Double the p, then add -ed' },
    { word: 'SPOTTED', clue: 'Saw something, in the past. Double the t, then add -ed' },
    { word: 'GRINNED', clue: 'Gave a big smile, in the past. Double the n, then add -ed' }
  ];
  var TRIES = 6;
  var spellState = null;

  function startSpell(step) {
    var index = spellState ? (spellState.index + (step || 1)) % SPELL.length
                           : Math.floor(Math.random() * SPELL.length);
    var pickWord = SPELL[index];
    spellState = { index: index, answer: pickWord.word, guesses: [], typed: '', over: false, seen: {} };
    $('#spell-clue').textContent = pickWord.clue + '. ' + pickWord.word.length + ' letters.';
    var board = $('#spell-board');
    board.innerHTML = '';
    for (var r = 0; r < TRIES; r++) {
      var row = el('div', 'row');
      row.style.gridTemplateColumns = 'repeat(' + pickWord.word.length + ', var(--tap-min))';
      for (var c = 0; c < pickWord.word.length; c++) { row.appendChild(el('div', 'cell')); }
      board.appendChild(row);
    }
    $$('#spell-keys .key').forEach(function (key) { key.className = 'key' + (key.dataset.act ? ' wide' : ''); });
    say($('#spell-say'), 'Six tries. Tap the letters, then tap Go.');
    paintSpell();
  }

  function paintSpell() {
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
  }

  /* Two passes, so a letter is only called "somewhere else" as often as it
     really appears. */
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
     wiring
     ============================================================ */
  function newPupil() {
    stars = 0; done = [];
    store(KEY_STARS, '0'); store(KEY_DONE, '');
    paintStars();
    $$('.room .done').forEach(function (mark) { mark.remove(); });
    Object.keys(ROOMS).forEach(startRoom);
    startSpell();
    show('hub');
  }

  function wire() {
    document.addEventListener('click', function (event) {
      var hit = event.target.closest ? event.target.closest('button') : null;
      if (!hit || hit.disabled) return;
      var data = hit.dataset;

      if (data.go) { show(data.go); return; }
      if (data.key) { typeLetter(data.key); return; }
      if (data.next) { next(data.room); return; }
      if (data.restart) { startRoom(data.restart); return; }
      if (data.pick !== undefined) { pick(hit); return; }
      if (data.item !== undefined) { place(hit); return; }
      if (data.place) { digit(hit); return; }
      if (data.model) {
        var model = $('.model', hit.closest('.task'));
        model.hidden = !model.hidden;
        hit.textContent = model.hidden ? 'Show a good answer' : 'Hide the answer';
        return;
      }
      if (data.self) { selfMark(hit); return; }

      switch (data.act) {
        case 'go': trySpell(); break;
        case 'rub': rubOut(); break;
        case 'spell-new': startSpell(1); break;
        case 'board':
          var on = document.documentElement.hasAttribute('data-board');
          if (on) document.documentElement.removeAttribute('data-board');
          else document.documentElement.setAttribute('data-board', '');
          hit.setAttribute('aria-pressed', String(!on));
          break;
        case 'new-pupil':
          // A shared iPad: check before wiping the tally.
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
    Object.keys(ROOMS).forEach(startRoom);
    startSpell();
    Object.keys(ROOMS).concat('spell').forEach(function (id) {
      if (done.some(function (task) { return task === id + '-all' || (id === 'spell' && task.indexOf('spell-') === 0); })) markDone(id);
    });
  }

  document.addEventListener('DOMContentLoaded', start);

  return { markGuess: markGuess, SPELL: SPELL, ROOMS: ROOMS, state: state };
})();
