/* ============================================================
   Number <-> words, British English, 0 to 1000.
   Cambridge Primary Maths Stage 3 · Unit 3 (3Ni.01).

   The single source of truth for every number name in this unit:
   the interactives, the printable cards and the answer keys all
   come from here, so a wrong spelling can only be wrong once.

   British convention, which is what Collins teaches:
     349 -> "three hundred and forty-nine"   ('and' is required)
     300 -> "three hundred"                  (no trailing 'and')
     507 -> "five hundred and seven"         (zero is not spoken)
     40  -> "forty"                          (NOT "fourty")
     15  -> "fifteen"                        (NOT "fivteen")
   ============================================================ */
(function (root) {
  'use strict';

  var ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
              'eight', 'nine'];
  var TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
               'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  // Index = number of tens. The four that children misspell most are
  // twenty, forty, fifty and eighty — no 'u' in forty, no 'v' in fifty.
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty',
              'seventy', 'eighty', 'ninety'];

  /** Words for the part below one hundred (0-99). */
  function belowHundred(n) {
    if (n < 10) return ONES[n];
    if (n < 20) return TEENS[n - 10];
    var t = Math.floor(n / 10), o = n % 10;
    return o === 0 ? TENS[t] : TENS[t] + '-' + ONES[o];
  }

  /** 0-1000 in British words. Throws outside that range. */
  function toWords(n) {
    if (typeof n !== 'number' || !isFinite(n) || n % 1 !== 0) {
      throw new Error('toWords needs a whole number, got ' + n);
    }
    if (n < 0 || n > 1000) {
      throw new Error('toWords is for 0 to 1000, got ' + n);
    }
    if (n === 1000) return 'one thousand';
    if (n < 100) return belowHundred(n);
    var h = Math.floor(n / 100), rest = n % 100;
    var s = ONES[h] + ' hundred';
    if (rest > 0) s += ' and ' + belowHundred(rest);
    return s;
  }

  /** The word-card pieces a child taps to build a number, in order.
      Mirrors Collins Resource sheet 2, where 'and' is its own card. */
  function toCards(n) {
    if (n === 1000) return ['one', 'thousand'];
    if (n < 100) {
      if (n < 20) return [belowHundred(n)];
      var t = TENS[Math.floor(n / 10)], o = n % 10;
      return o === 0 ? [t] : [t, ONES[o]];
    }
    var h = Math.floor(n / 100), rest = n % 100;
    var cards = [ONES[h], 'hundred'];
    if (rest === 0) return cards;
    cards.push('and');
    if (rest < 20) { cards.push(belowHundred(rest)); return cards; }
    var tt = TENS[Math.floor(rest / 10)], oo = rest % 10;
    cards.push(tt);
    if (oo !== 0) cards.push(ONES[oo]);
    return cards;
  }

  /** Cards joined the way the number is written: tens-ones get a hyphen. */
  function cardsToWords(cards) {
    var out = '';
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (i === 0) { out = c; continue; }
      var prev = cards[i - 1];
      var joinWithHyphen = TENS.indexOf(prev) > 1 && ONES.indexOf(c) > 0;
      out += (joinWithHyphen ? '-' : ' ') + c;
    }
    return out;
  }

  /** Loose comparison for typed answers: ignores case, extra spaces and
      whether the child typed a hyphen or a space in "forty-nine". */
  function normalise(s) {
    return String(s)
      .toLowerCase()
      .replace(/[-‐-―]/g, ' ')   // hyphen and dash variants
      .replace(/[^a-z ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function wordsMatch(a, b) { return normalise(a) === normalise(b); }

  /** Words back to a number, or null if it does not parse. */
  function fromWords(s) {
    var t = normalise(s);
    if (!t) return null;
    if (t === 'one thousand' || t === 'a thousand') return 1000;
    var parts = t.split(' ').filter(function (w) { return w !== 'and'; });
    var total = 0, current = 0, sawAny = false;
    for (var i = 0; i < parts.length; i++) {
      var w = parts[i];
      if (w === 'hundred') {
        if (current === 0) return null;      // "hundred" with nothing before it
        current *= 100; total += current; current = 0; sawAny = true;
        continue;
      }
      var idx;
      if ((idx = ONES.indexOf(w)) > -1) { current += idx; sawAny = true; continue; }
      if ((idx = TEENS.indexOf(w)) > -1) { current += idx + 10; sawAny = true; continue; }
      if ((idx = TENS.indexOf(w)) > 1) { current += idx * 10; sawAny = true; continue; }
      return null;                            // unknown word
    }
    if (!sawAny) return null;
    var n = total + current;
    return (n >= 0 && n <= 1000) ? n : null;
  }

  function isEven(n) { return n % 2 === 0; }
  function isOdd(n) { return n % 2 !== 0; }

  /** Place-value split used by the counters and the H/T/O keypad. */
  function parts(n) {
    return { h: Math.floor(n / 100), t: Math.floor(n / 10) % 10, o: n % 10 };
  }

  var api = {
    toWords: toWords, toCards: toCards, cardsToWords: cardsToWords,
    fromWords: fromWords, normalise: normalise, wordsMatch: wordsMatch,
    isEven: isEven, isOdd: isOdd, parts: parts,
    ONES: ONES, TEENS: TEENS, TENS: TENS
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NumWords = api;
})(typeof window !== 'undefined' ? window : this);
