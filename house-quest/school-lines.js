/* ============================================================
   House Quest school mode: everything the game says, in one place.

   school.js and school-ui.js take their words from here, and
   House Quest/tools/make-audio.mjs turns every line into an MP3 with
   the project's two voices, so what is shown and what is heard never
   drift apart. Plain English for EAL pupils: no idioms. Pure data, so
   Node can load it too.
   ============================================================ */
(function () {
  'use strict';

  var Lines = {
    /* Wafi and the game (voice: Alice) */
    letsFind: function (colour) { return 'Let\'s find the ' + colour + ' doors!'; },
    find: function (colour, left) { return 'Find the ' + colour + ' doors. ' + left + ' to go!'; },
    goUpstairs: ' Go upstairs!',
    goDownstairs: ' Go downstairs!',
    getCup: 'Get the House Cup from reception!',
    takeCup: 'Take the House Cup to the notice board upstairs!',
    handedIn: 'Points handed in. Well done!',
    openAllFirst: function (left) { return 'Open all 6 chests first! ' + left + ' to go.'; },
    allOpen: 'All the chests are open! Get the House Cup from reception.',
    bump: 'Ouch! You lost a point. Jump on top instead!',
    bumpFree: 'Oops! Jump on top to squash it.',
    squash: 'Squash! It has gone.',
    fruit: function (perPoint) { return 'Yum! ' + perPoint + ' fruit and veg win 1 point.'; },
    paw: function (found, of) { return 'A golden paw! ' + found + ' of ' + of + ' found.'; },
    door: function (name) { return 'That door goes to ' + name + '.'; },
    decoy: function (theirs, mine) { return 'That door is ' + theirs + '. Find a ' + mine + ' one!'; },
    teacher: function (t) { return t.name + ': ' + t.line; },
    handInLeft: function (left) { return 'You still have ' + left + (left === 1 ? ' chest' : ' chests') + ' to open. Hand in your points now?'; },
    handInNoCup: 'You haven\'t got the House Cup yet. Hand in your points now?',
    handInCarrying: 'You have the House Cup! Hand in your points now?',

    /* Signing in from the house QR code, and sending the points (points.js) */
    scanQr: 'Scan your house QR code to start.',
    SEND: {
      sent: 'Your points are on their way to your house!',
      offline: 'Points not sent yet. Check the Wi-Fi and tap Try again.',
      hours: 'House points only count in school time. See you in class!',
      cap: 'Your house has played all its games this week. Well done, team!',
      code: 'That code didn\'t work. Ask your teacher.'
    },

    /* The habit rivals (voice: Daniel): their name, what they say before the
       question, and what they say once their habit has changed. */
    RIVALS: {
      couch: { name: 'Couch Potato', before: 'Why move when there\'s a sofa?', after: 'I\'m off for a run!' },
      cloud: { name: 'Grumpy Cloud', before: 'Nobody cares how I feel!', after: 'I feel much better now!' },
      owl:   { name: 'Night Owl', before: 'Bedtime? Never!', after: 'Time for bed. Goodnight!' },
      fizzy: { name: 'Fizzy Fiend', before: 'Who needs water?', after: 'Water for me from now on!' }
    },

    /* The ending (voice: Daniel) */
    endWell: 'Well done! Your points are on the board.',
    endZero: 'Thanks for playing! Try again next week.',

    /* Words a 7-year-old learning English trips over; check-school.js keeps them out. */
    IDIOMS: ['cat nap', 'eat my lunch', 'got rid of', 'piece of cake', 'over the moon', 'break a leg']
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = Lines; return; }
  window.SchoolLines = Lines;
})();
