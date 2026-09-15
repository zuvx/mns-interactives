/* Word Hunt grid builder.
   Pure logic, no DOM, so check-funzone.js can hammer it outside a browser.
   Words run left to right, top to bottom, or diagonally down to the right.
   Nothing runs backwards: these are seven year olds. */
'use strict';
(function (root) {

  /* Seeded generator so a failing grid can be reproduced from its seed. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a += 0x6D2B79F5;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var WAYS = [[0, 1], [1, 0], [1, 1]];

  function fits(grid, word, r, c, dr, dc, size) {
    if (r + dr * (word.length - 1) >= size) return false;
    if (c + dc * (word.length - 1) >= size) return false;
    for (var i = 0; i < word.length; i++) {
      var had = grid[r + dr * i][c + dc * i];
      if (had && had !== word[i]) return false;
    }
    return true;
  }

  /* One attempt. Returns null if a word could not be placed, so build() retries
     with a fresh shuffle rather than shipping a grid with a missing word. */
  function attempt(words, size, random) {
    var grid = [], r, c;
    for (r = 0; r < size; r++) { grid.push(new Array(size).fill('')); }
    var placed = [];
    for (var w = 0; w < words.length; w++) {
      var word = words[w];
      if (word.length > size) return null;
      var spots = [];
      for (r = 0; r < size; r++) {
        for (c = 0; c < size; c++) {
          for (var d = 0; d < WAYS.length; d++) {
            if (fits(grid, word, r, c, WAYS[d][0], WAYS[d][1], size)) {
              spots.push([r, c, WAYS[d][0], WAYS[d][1]]);
            }
          }
        }
      }
      if (!spots.length) return null;
      var pick = spots[Math.floor(random() * spots.length)];
      for (var i = 0; i < word.length; i++) {
        grid[pick[0] + pick[2] * i][pick[1] + pick[3] * i] = word[i];
      }
      placed.push({ word: word, r: pick[0], c: pick[1], dr: pick[2], dc: pick[3] });
    }
    // Fill the gaps from the letters already in play, so no stray Q or X turns up.
    var pool = words.join('');
    for (r = 0; r < size; r++) {
      for (c = 0; c < size; c++) {
        if (!grid[r][c]) grid[r][c] = pool[Math.floor(random() * pool.length)];
      }
    }
    return { grid: grid, placed: placed };
  }

  function build(words, size, seed) {
    var random = rng(seed === undefined ? Math.floor(Math.random() * 1e9) : seed);
    var sorted = words.slice().sort(function (a, b) { return b.length - a.length; });
    for (var tries = 0; tries < 60; tries++) {
      var got = attempt(sorted, size, random);
      if (got) return got;
    }
    throw new Error('word hunt: could not place ' + words.join(', ') + ' in ' + size + 'x' + size);
  }

  root.build = build;
  root.rng = rng;

})(typeof module !== 'undefined' && module.exports ? module.exports : (window.WordGrid = {}));
