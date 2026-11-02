/* ============================================================
   House Quest school mode: the map as data.

   The real MNS on two floors, from the teacher's annotated satellite map
   and his sketch of the junior school upstairs. One character per 48 px
   tile, north at the top downstairs; upstairs runs east to west as the
   teacher drew it. The two floors meet at two stairs. Pure data and rules,
   no DOM, so check-school.js can load it in Node.
   ============================================================ */
(function () {
  'use strict';

  /* Each floor: its rows, its furniture (DECOR: blocking pieces are 'o' in
     the rows; flat ones lie on floor; wall pieces hang on a wall's face),
     its floor materials (areas: the first rect that holds a tile gives its
     material) and named spots for the set pieces. */
  var FLOORS = {
    ground: {
      name: 'Ground floor',
      rows: [
        '########################################################',
        '#,,,,,S,,,,,,,,,,,,,,####################,#####___oo___#',
        '#,,,,,,,,,,,,,,,,,,,,#oo.o##BB.BB###oo..#,#####______p_#',
        '######x####,,,,,,,,,,#....##.....###..k.#,#####________#',
        '###########,,,T,,,T,,#oo..##..k..###....#,#####________#',
        '#####x#####,,,,,,,,,,#....##.....###o...#,#####__f_____#',
        '#^.........,,,,,,,,,,#....##...oo###o.oo#,#####________#',
        '##.........,,,,,,,,,,#....##.....###....#,#####________#',
        '######x####,,,,,,,,,,###N#####2######6###,#####________#',
        '###########,,T,,,,,,,,,,,,,,,,,,,,,,,,,,,,#####________#',
        '###########,,,,,,,,,,######"""""""""""""",#####_____f__#',
        '####################,######""T"""""""""T",#####________#',
        '####################,######"""""""T"""""",#####________#',
        '####################,######"""""""""""""",#####________#',
        '####################,######"""""""""""""",#####________#',
        '####################,######""""""""""u""",#####________#',
        '####################,######"T""u""""""""",#####_f______#',
        '####################,######""""""T"""""T",#####________#',
        '###########o,,ooo,,o,######"""""""""""""",#####________#',
        '###########,o,,C,,,,,######,,,,,,,,,,,,,,,#####________#',
        '###########=========,######oooFooo,"""""",##x##___oo___#',
        '###########o,,,,,,,,,######o"""""o,"T"f"",,,,,,,,,,,,,,#',
        '###########,,,,,,,,,,######of"""fo,""""T",,,,,###W####,#',
        '###########,,,,u,,,,,##x###o"oo""o,"f"""",,,,,#......#,#',
        '###########,,,,,,,,,,,,,,,,o"""f"o,,""""",,u,,#.f.ooo#,#',
        '###########,,,,,,,,,,,,,u,,o"f"""o,,,"""p,,,,,#oo...f#,#',
        '###########,,,,,,,,,,,,,,,,ooooooo,,,,""",,,,,#....f.#,#',
        '######x####,,_______,,,,,,,,,,,,,,,,,,,,,,,,,,########,#',
        '#^.........,,____oo_,######oooEoooo,,,u,,,,,,,,,,,,,,,,#',
        '##.........,,_f__oo_,######o______o,,,,,,,,,,,,,,,,,,,,#',
        '###########,,_ooou__,######oo___f_o,,,,,,,,,,,,,,,,,,,,#',
        '###########,,_ooo___,######o_f___oo,,,,,,,,,,,,,,,,,,,,#',
        '###########,,_____f_,######o______o,,,,,,,,,,,,,,,,,,,,#',
        '###########,,_p_____,######oooooooo,,,,,,,,,,,,,,,,,,,,#',
        '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
        '########################################################'
      ],
      decor: [
        { type: 'beds', rect: [22, 2, 23, 2], block: true },
        { type: 'beds', rect: [22, 4, 23, 4], block: true },
        { type: 'cabinet', rect: [25, 2, 25, 2], block: true },
        { type: 'beanbags', rect: [31, 6, 32, 6], block: true },
        { type: 'rug', rect: [28, 6, 29, 6], block: false },
        { type: 'piano', rect: [36, 2, 37, 2], block: true },
        { type: 'drums', rect: [38, 6, 39, 6], block: true },
        { type: 'stands', rect: [36, 5, 36, 6], block: true },
        { type: 'counter', rect: [50, 24, 52, 24], block: true },
        { type: 'longTables', rect: [47, 25, 48, 25], block: true },
        { type: 'facadeSign', rect: [12, 17, 18, 17], block: false, wall: true },
        { type: 'pillar', rect: [11, 18, 11, 18], block: true },
        { type: 'pillar', rect: [19, 18, 19, 18], block: true },
        { type: 'backdrop', rect: [14, 18, 16, 18], block: true },
        { type: 'lectern', rect: [12, 19, 12, 19], block: true },
        { type: 'flagpole', rect: [11, 21, 11, 21], block: true },
        { type: 'hedge', rect: [27, 20, 29, 20], block: true },
        { type: 'hedge', rect: [31, 20, 33, 20], block: true },
        { type: 'hedge', rect: [27, 26, 33, 26], block: true },
        { type: 'hedge', rect: [27, 21, 27, 25], block: true },
        { type: 'hedge', rect: [33, 21, 33, 25], block: true },
        { type: 'veggieBed', rect: [29, 23, 30, 23], block: true },
        { type: 'fence', rect: [27, 28, 29, 28], block: true },
        { type: 'fence', rect: [31, 28, 34, 28], block: true },
        { type: 'fence', rect: [27, 33, 34, 33], block: true },
        { type: 'fence', rect: [27, 29, 27, 32], block: true },
        { type: 'fence', rect: [34, 29, 34, 32], block: true },
        { type: 'hoopPost', rect: [28, 30, 28, 30], block: true },
        { type: 'hoopPost', rect: [33, 31, 33, 31], block: true },
        { type: 'goal', rect: [50, 1, 51, 1], block: true },
        { type: 'goal', rect: [50, 20, 51, 20], block: true },
        { type: 'slide', rect: [17, 28, 18, 29], block: true },
        { type: 'climber', rect: [14, 30, 16, 31], block: true },
        { type: 'canopy', rect: [36, 29, 53, 33], block: false }
      ],
      areas: [
        { m: 'stage', rect: [11, 18, 19, 19] },
        { m: 'mint', rect: [22, 2, 25, 7] },
        { m: 'woodDark', rect: [28, 2, 32, 7] },
        { m: 'carpet', rect: [36, 2, 39, 7] },
        { m: 'checker', rect: [47, 23, 52, 26] },
        { m: 'pitch', rect: [47, 1, 54, 20] },
        { m: 'blueCourt', rect: [28, 29, 33, 32] },
        { m: 'rubber', rect: [13, 27, 19, 33] }
      ],
      spots: { stage: [12, 17, 18, 18], crest: [15, 22] },
      /* What each building's roof looks like from above (spec polish 2.1). */
      roofs: [
        { rect: [1, 3, 10, 33], style: 'sand' },
        { rect: [11, 11, 19, 17], style: 'navy' },
        { rect: [21, 1, 40, 8], style: 'sand' },
        { rect: [21, 10, 26, 23], style: 'white', label: 'INFANT' },
        { rect: [42, 1, 46, 20], style: 'sand', label: 'HIGH SCHOOL' },
        { rect: [46, 22, 53, 27], style: 'sand' },
        { rect: [21, 28, 26, 33], style: 'white' }
      ],
      /* Generic pupils walking set routes (loop: round and round; otherwise
         there and back), and the cook behind the canteen counter. */
      walkers: [
        { path: [[12, 2], [19, 2], [19, 8], [12, 8]], loop: true },
        { path: [[21, 9], [40, 9]] },
        { path: [[12, 22], [18, 22], [18, 25], [12, 25]], loop: true },
        { path: [[28, 13], [38, 13], [38, 15], [28, 15]], loop: true },
        { path: [[20, 27], [45, 27]] },
        { path: [[48, 4], [53, 4], [53, 15], [48, 15]], loop: true }
      ],
      cook: [51, 23]
    },
    up: {
      name: 'Junior school',
      rows: [
        '####################################################',
        '#....oo#..oo#..oo#..oo#....oo#..oo#....oo#.......o.#',
        '#...k..#....#....#....#..k...#....#..k...#...k...o.#',
        '#oo..oo#oo..#oo..#oo..#oo..oo#oo..#oo..oo#.........#',
        '#oo..oo#oo..#oo..#oo..#oo..oo#oo..#oo..oo#.oo......#',
        '#......#....#....#....#......#....#......#.........#',
        '###4######d####d####d#####3#####d#####1#######5#####',
        '#^................................................^#',
        '##................................................##',
        '####d######nn###d####d##################d######d####',
        '#.........###########################.......########',
        '#.oo...oo.###########################oo...oo########',
        '#.oo...oo.###########################oo...oo########',
        '#.........###########################.......########',
        '#......oo.###########################..oo...########',
        '####################################################'
      ],
      decor: [
        { type: 'whiteboard', rect: [2, 0, 4, 0], block: false, wall: true },
        { type: 'teacherDesk', rect: [5, 1, 6, 1], block: true },
        { type: 'desks', rect: [1, 3, 2, 4], block: true },
        { type: 'desks', rect: [5, 3, 6, 4], block: true },
        { type: 'whiteboard', rect: [24, 0, 26, 0], block: false, wall: true },
        { type: 'teacherDesk', rect: [27, 1, 28, 1], block: true },
        { type: 'desks', rect: [23, 3, 24, 4], block: true },
        { type: 'desks', rect: [27, 3, 28, 4], block: true },
        { type: 'whiteboard', rect: [36, 0, 38, 0], block: false, wall: true },
        { type: 'teacherDesk', rect: [39, 1, 40, 1], block: true },
        { type: 'desks', rect: [35, 3, 36, 4], block: true },
        { type: 'desks', rect: [39, 3, 40, 4], block: true },
        { type: 'worldMap', rect: [5, 0, 5, 0], block: false, wall: true },
        { type: 'globe', rect: [6, 0, 6, 0], block: false, wall: true },
        { type: 'easels', rect: [49, 1, 49, 2], block: true },
        { type: 'paintTable', rect: [43, 4, 44, 4], block: true },
        { type: 'clock', rect: [13, 6, 13, 6], block: false, wall: true },
        /* The classrooms without a chest: open to walk round (Zoe, Oct 2026). */
        { type: 'whiteboard', rect: [8, 0, 9, 0], block: false, wall: true },
        { type: 'teacherDesk', rect: [10, 1, 11, 1], block: true },
        { type: 'desks', rect: [8, 3, 9, 4], block: true },
        { type: 'whiteboard', rect: [13, 0, 14, 0], block: false, wall: true },
        { type: 'teacherDesk', rect: [15, 1, 16, 1], block: true },
        { type: 'desks', rect: [13, 3, 14, 4], block: true },
        { type: 'whiteboard', rect: [18, 0, 19, 0], block: false, wall: true },
        { type: 'teacherDesk', rect: [20, 1, 21, 1], block: true },
        { type: 'desks', rect: [18, 3, 19, 4], block: true },
        { type: 'whiteboard', rect: [30, 0, 31, 0], block: false, wall: true },
        { type: 'teacherDesk', rect: [32, 1, 33, 1], block: true },
        { type: 'desks', rect: [30, 3, 31, 4], block: true },
        { type: 'whiteboard', rect: [6, 9, 8, 9], block: false, wall: true },
        { type: 'desks', rect: [2, 11, 3, 12], block: true },
        { type: 'desks', rect: [7, 11, 8, 12], block: true },
        { type: 'teacherDesk', rect: [7, 14, 8, 14], block: true },
        { type: 'whiteboard', rect: [41, 9, 43, 9], block: false, wall: true },
        { type: 'desks', rect: [37, 11, 38, 12], block: true },
        { type: 'desks', rect: [42, 11, 43, 12], block: true },
        { type: 'teacherDesk', rect: [39, 14, 40, 14], block: true }
      ],
      areas: [
        { m: 'wood', rect: [1, 1, 6, 5] },
        { m: 'wood', rect: [23, 1, 28, 5] },
        { m: 'wood', rect: [35, 1, 40, 5] },
        { m: 'lino', rect: [42, 1, 50, 5] },
        { m: 'wood', rect: [8, 1, 11, 5] },
        { m: 'wood', rect: [13, 1, 16, 5] },
        { m: 'wood', rect: [18, 1, 21, 5] },
        { m: 'wood', rect: [30, 1, 33, 5] },
        { m: 'carpet', rect: [1, 10, 9, 14] },
        { m: 'carpet', rect: [37, 10, 43, 14] }
      ],
      spots: {},
      roofs: [],
      walkers: [
        { path: [[3, 8], [48, 8]] },
        { path: [[45, 7], [5, 7]] }
      ]
    }
  };

  /* walk: Wafi and the foods can stand on it. Doors and rivals are walked
     through only once open or beaten, so they are not walkable here. */
  var LEGEND = {
    '#': { name: 'wall' }, 'L': { name: 'lockers' }, 'B': { name: 'bookshelf' },
    'T': { name: 'palm tree' }, 'o': { name: 'furniture' },
    '.': { name: 'indoor floor', walk: true }, ',': { name: 'forecourt', walk: true },
    '=': { name: 'steps', walk: true }, '_': { name: 'playground', walk: true },
    '"': { name: 'garden', walk: true }, '^': { name: 'stairs', walk: true },
    'S': { name: 'start', walk: true }, 'f': { name: 'fruit', walk: true },
    'p': { name: 'golden paw', walk: true }, 'u': { name: 'food home', walk: true },
    'C': { name: 'House Cup' }, 'k': { name: 'chest' }, 'x': { name: 'door of another house' },
    'd': { name: 'classroom door' }, 'n': { name: 'notice board' },
    '1': { name: 'own door' }, '2': { name: 'own door' }, '3': { name: 'own door' },
    '4': { name: 'own door' }, '5': { name: 'own door' }, '6': { name: 'own door' },
    'E': { name: 'rival' }, 'F': { name: 'rival' }, 'N': { name: 'rival' }, 'W': { name: 'rival' }
  };

  /* One zone per pipe of Quest.YEARS. rect is [c0, r0, c1, r1], inclusive,
     on the zone's floor. name is short, for the sign by the door. */
  var ZONES = [
    { id: 'y6m', name: 'Year 6M', floor: 'up', pipe: 0, kind: 'room', icon: 'maths', door: '1', rect: [35, 1, 40, 5] },
    { id: 'court', name: 'Court', floor: 'ground', pipe: 1, kind: 'rival', icon: 'ball', rival: { ch: 'E', kind: 'couch' }, rect: [28, 29, 33, 32] },
    { id: 'library', name: 'Library', floor: 'ground', pipe: 2, kind: 'room', icon: 'book', door: '2', rect: [28, 2, 32, 7] },
    { id: 'y3m', name: 'Year 3M', floor: 'up', pipe: 3, kind: 'room', icon: 'pencil', door: '3', rect: [23, 1, 28, 5] },
    { id: 'garden', name: 'Garden', floor: 'ground', pipe: 4, kind: 'rival', icon: 'sun', rival: { ch: 'F', kind: 'cloud' }, rect: [28, 21, 32, 25] },
    { id: 'y5', name: 'Year 5', floor: 'up', pipe: 5, kind: 'room', icon: 'globe', door: '4', rect: [1, 1, 6, 5] },
    { id: 'nurse', name: 'Nurse', floor: 'ground', pipe: 6, kind: 'rival', icon: 'moon', rival: { ch: 'N', kind: 'owl' }, rect: [22, 2, 25, 7] },
    { id: 'art', name: 'Art', floor: 'up', pipe: 7, kind: 'room', icon: 'palette', door: '5', rect: [42, 1, 50, 5] },
    { id: 'cantina', name: 'Canteen', floor: 'ground', pipe: 8, kind: 'rival', icon: 'fork', rival: { ch: 'W', kind: 'fizzy' }, rect: [47, 23, 52, 26] },
    { id: 'music', name: 'Music', floor: 'ground', pipe: 9, kind: 'room', icon: 'note', door: '6', rect: [36, 2, 39, 7] }
  ];

  /* Doors that aren't zones: those of the other houses downstairs (x) and
     the classrooms and offices upstairs (d). sign is on the wall; name is
     how Wafi's message says it ("This is Year 4M."). A classroom has rect,
     the room behind its door: the door opens at a bump and Wafi can walk
     in. Offices and toilets have none and stay shut. */
  var ROOMS = [
    { id: 'toilets', floor: 'ground', at: [6, 3], sign: 'Toilets', name: 'the toilets' },
    { id: 'ict', floor: 'ground', at: [5, 5], sign: 'ICT', name: 'the ICT room' },
    { id: 'arabic', floor: 'ground', at: [6, 8], sign: 'Arabic', name: 'the Arabic room' },
    { id: 'head', floor: 'ground', at: [6, 27], sign: 'Head\'s office', name: 'the Head of School\'s office' },
    { id: 'infant', floor: 'ground', at: [23, 23], sign: 'Infant school', name: 'the infant school' },
    { id: 'high', floor: 'ground', at: [44, 20], sign: 'High school', name: 'the high school' },
    { id: 'y4m', floor: 'up', at: [10, 6], rect: [8, 1, 11, 5], sign: 'Year 4M', name: 'Year 4M' },
    { id: 'y4s', floor: 'up', at: [15, 6], rect: [13, 1, 16, 5], sign: 'Year 4S', name: 'Year 4S' },
    { id: 'y3s', floor: 'up', at: [20, 6], rect: [18, 1, 21, 5], sign: 'Year 3S', name: 'Year 3S' },
    { id: 'y6s', floor: 'up', at: [32, 6], rect: [30, 1, 33, 5], sign: 'Year 6S', name: 'Year 6S' },
    { id: 'y2m', floor: 'up', at: [4, 9], rect: [1, 10, 9, 14], sign: 'Year 2M', name: 'Year 2M' },
    { id: 'khatoon', floor: 'up', at: [16, 9], sign: 'Ms Khatoon', name: 'Ms Khatoon\'s room' },
    { id: 'kim', floor: 'up', at: [21, 9], sign: 'Ms Kim', name: 'Ms Kim\'s office' },
    { id: 'y2s', floor: 'up', at: [40, 9], rect: [37, 10, 43, 14], sign: 'Year 2S', name: 'Year 2S' },
    { id: 'toiletsUp', floor: 'up', at: [47, 9], sign: 'Toilets', name: 'the toilets' }
  ];

  /* Each stair, at both ends: north joins the stairs by ICT and Arabic to
     the east end of the junior corridor (Art, toilets); south joins the
     other end of the building to the west end (Year 5, Year 2M). */
  var STAIRS = [
    { id: 'north', ground: [1, 6], up: [50, 7] },
    { id: 'south', ground: [1, 28], up: [1, 7] }
  ];

  /* Unhealthy foods by year: how many, ms per step, how close Wafi must be
     before they follow him. Wafi takes 150 ms a step, so all are slower. */
  var DIFF = {
    2: { foods: 3, stepMs: 620, chase: 2 },
    3: { foods: 4, stepMs: 560, chase: 3 },
    4: { foods: 5, stepMs: 500, chase: 3 },
    5: { foods: 6, stepMs: 440, chase: 4 },
    6: { foods: 7, stepMs: 400, chase: 4 }
  };

  function walkable(ch) { return !!(LEGEND[ch] && LEGEND[ch].walk); }

  function zoneAt(floor, c, r) {
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i].rect;
      if (ZONES[i].floor === floor && c >= z[0] && c <= z[2] && r >= z[1] && r <= z[3]) return ZONES[i].id;
    }
    return null;
  }

  /* One floor, ready to play: its tile() and where everything is. */
  function parse(floor) {
    var ROWS = FLOORS[floor].rows;
    var m = { floor: floor, w: ROWS[0].length, h: ROWS.length, doors: [], decoys: [], chests: [], rivals: [],
      fruit: [], paws: [], foodHomes: [], rooms: [], board: [], stairs: [] };
    m.tile = function (c, r) { return (ROWS[r] && ROWS[r][c]) || '#'; };
    var roomAt = function (c, r) { return ROOMS.filter(function (rm) { return rm.floor === floor && rm.at[0] === c && rm.at[1] === r; })[0]; };
    ROWS.forEach(function (row, r) {
      row.split('').forEach(function (ch, c) {
        var at = { c: c, r: r };
        if (ch === 'S') m.start = at;
        else if (ch === 'C') m.cup = at;
        else if (ch === 'k') m.chests.push({ c: c, r: r, zone: zoneAt(floor, c, r) });
        else if (ch === 'x') { m.decoys.push(at); m.rooms.push({ id: roomAt(c, r).id, c: c, r: r }); }
        else if (ch === 'd') m.rooms.push({ id: roomAt(c, r).id, c: c, r: r });
        else if (ch === 'n') m.board.push(at);
        else if (ch === '^') m.stairs.push({ id: STAIRS.filter(function (s) { return s[floor][0] === c && s[floor][1] === r; })[0].id, c: c, r: r });
        else if (ch === 'f') m.fruit.push(at);
        else if (ch === 'p') m.paws.push(at);
        else if (ch === 'u') m.foodHomes.push(at);
        else if (/[1-6]/.test(ch)) {
          var room = ZONES.filter(function (z) { return z.door === ch; })[0];
          m.doors.push({ c: c, r: r, digit: ch, zone: room && room.id });
        } else if (/[EFNW]/.test(ch)) {
          var zone = ZONES.filter(function (z) { return z.rival && z.rival.ch === ch; })[0];
          m.rivals.push({ c: c, r: r, zone: zone && zone.id, kind: zone && zone.rival.kind });
        }
      });
    });
    return m;
  }

  /* The floor under a piece of furniture, a tree, a door or a fruit, for flat
     plans: the most common floor among its 8 neighbours. */
  function groundUnder(rows, c, r) {
    var n = {}, best = '.', most = 0;
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
      var ch = (rows[r + dr] || '')[c + dc];
      if (!ch || !/[.,=_"]/.test(ch)) continue;
      n[ch] = (n[ch] || 0) + 1;
      if (n[ch] > most) { most = n[ch]; best = ch; }
    }
    return best;
  }

  /* Shortest 4-way path by breadth-first search. The list leaves out `from`
     and ends at `to`; null when `to` can't be reached. */
  function findPath(from, to, blocked) {
    if (from.c === to.c && from.r === to.r) return [];
    var key = function (c, r) { return c + ',' + r; };
    var prev = {}, queue = [from], seen = {};
    seen[key(from.c, from.r)] = true;
    while (queue.length) {
      var at = queue.shift();
      var steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < steps.length; i++) {
        var c = at.c + steps[i][0], r = at.r + steps[i][1], k = key(c, r);
        if (seen[k] || blocked(c, r)) continue;
        seen[k] = true;
        prev[k] = at;
        if (c === to.c && r === to.r) {
          var path = [{ c: c, r: r }], p = at;
          while (p !== from) { path.unshift({ c: p.c, r: p.r }); p = prev[key(p.c, p.r)]; }
          return path;
        }
        queue.push({ c: c, r: r });
      }
    }
    return null;
  }

  /* One step of an unhealthy food. If Wafi is within food.chase tiles on a
     free tile it can reach, step towards him (a chase can end on him: that is
     a bump); otherwise wander to a free neighbour that keeps it within 3
     tiles of home, or stay put now and then. */
  function foodStep(food, wafi, blocked, rand) {
    var away = Math.abs(food.c - wafi.c) + Math.abs(food.r - wafi.r);
    if (away <= food.chase && !blocked(wafi.c, wafi.r)) {
      var path = findPath(food, wafi, blocked);
      if (path && path.length && path.length <= food.chase + 2) return path[0];
    }
    var options = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (d) { return { c: food.c + d[0], r: food.r + d[1] }; })
      .filter(function (n) {
        return !blocked(n.c, n.r) && Math.abs(n.c - food.home.c) + Math.abs(n.r - food.home.r) <= 3;
      });
    if (!options.length || rand() < 0.25) return { c: food.c, r: food.r };
    return options[Math.floor(rand() * options.length)];
  }

  var SchoolMap = { FLOORS: FLOORS, LEGEND: LEGEND, ZONES: ZONES, ROOMS: ROOMS, STAIRS: STAIRS, DIFF: DIFF,
    parse: parse, walkable: walkable, zoneAt: zoneAt, findPath: findPath, foodStep: foodStep, groundUnder: groundUnder };
  if (typeof module !== 'undefined' && module.exports) { module.exports = SchoolMap; return; }
  window.SchoolMap = SchoolMap;
})();
