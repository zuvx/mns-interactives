/* ============================================================
   House Quest: question engine and weekly content (Year 3-4 demo,
   theme of the month: healthy choices)

   Holds what the pupil answers, not the game world: the questions, the
   read-aloud voice, the house codes and the chest picture. game.js builds
   the pipe park on top of it.

   Engine contract (shared with Yard / Station / Souq so scan_interactives.js
   can drive it): window.Quest is assigned once, and every question is built
   through Quest.ask(host, cfg), which returns { el: box }. Questions in the
   game sit inside pipes, out of sight, so game.js adds Quest.reveal(box).
   ============================================================ */
(function () {
  'use strict';

  var HOUSES = {
    FIRE:  { name: 'Fire',  colour: 'red',    icon: 'i-fire' },
    WATER: { name: 'Water', colour: 'blue',   icon: 'i-water' },
    AIR:   { name: 'Air',   colour: 'yellow', icon: 'i-air' },
    EARTH: { name: 'Earth', colour: 'green',  icon: 'i-earth' }
  };

  var num = function (answer) {
    return function (v) { return parseInt(String(v).replace(/\s+/g, ''), 10) === answer; };
  };
  var word = function (answer) {
    return function (v) { return String(v).trim().toLowerCase().replace(/\s+/g, '') === answer; };
  };

  /* This month's theme. game.js draws what to collect and what to jump on
     from these names; the theme questions sit among the others below. */
  var THEME = {
    name: 'Healthy choices',
    collect: ['apple', 'carrot', 'banana', 'broccoli', 'strawberry', 'orange'],
    avoid: ['burger', 'doughnut', 'fizzy', 'cupcake'],
    perPoint: 2          // fruit and veg collected for each bonus house point
  };

  var YEAR_LIST = [2, 3, 4, 5, 6];

  /* Question builders. typed(): the pupil types the answer; pick(): taps one. */
  function typed(subject, type, prompt, answer, accept, nudge, hint) {
    var cfg = { type: type, prompt: prompt, answer: answer, accept: accept, nudge: nudge, hint: hint };
    return { subject: subject, cfg: cfg };
  }
  function pick(subject, prompt, choices, answer, hint, nudge) {
    return { subject: subject, cfg: {
      prompt: prompt, choices: choices, answer: answer,
      accept: function (v) { return v === answer; },
      nudge: nudge || 'Not that one. Have another go.', hint: hint } };
  }

  /* Ten pipes per year, in the order the pipes appear. Each pipe has a pool
     of questions and every game picks one from each pool at random, so games
     differ from one go to the next and from one pupil to the next (Zoe,
     2026-10-01). A pool left empty here, and any pool whose subject has
     cards in that year's bank (bank-y2.js ... bank-y6.js), is filled from
     the bank below. Theme questions (Exercise, Feelings, Sleep, Water) follow
     NHS and UK government guidance. Sources: ../SOURCE-NOTES.md */
  var YEARS = {
    2: [
      [],   // Maths: bank-y2.js
      [pick('Exercise', 'Which of these makes your heart beat faster?', ['Watching TV', 'Skipping', 'Sleeping'], 'Skipping',
        'Your heart beats faster when your body is moving a lot.'),
       pick('Exercise', 'Which of these is a good way to be active at playtime?', ['Sitting on a bench', 'Playing tag', 'Watching others play'], 'Playing tag',
        'Being active means moving your body.'),
       pick('Exercise', 'Which part of your body gets stronger when you exercise?', ['Your hair', 'Your muscles', 'Your nails'], 'Your muscles',
        'Running, jumping and climbing all use them.')],
      [],   // Spelling: bank-y2.js
      [],   // Grammar: bank-y2.js
      [pick('Feelings', 'Your friend looks sad at playtime. What could you do?', ['Laugh at them', 'Ask if they\'re OK', 'Walk away'], 'Ask if they\'re OK',
        'What would help you feel better if you were sad?', 'Hmm, think again.'),
       pick('Feelings', 'Someone in your class is crying. Who could you tell?', ['Nobody', 'A grown-up you trust', 'Only your pet'], 'A grown-up you trust',
        'Grown-ups at school and at home can help.', 'Hmm, think again.'),
       pick('Feelings', 'What could you do when you feel cross?', ['Hit something', 'Count slowly to ten', 'Shout at a friend'], 'Count slowly to ten',
        'Doing something slow and calm helps the cross feeling go away.', 'Hmm, think again.')],
      [],   // Humanities: bank-y2.js
      [pick('Sleep', 'Why do we need a good night\'s sleep?', ['So we can skip breakfast', 'It helps our body and brain rest and grow', 'It doesn\'t matter'], 'It helps our body and brain rest and grow',
        'While you sleep, your body and brain get ready for a new day.'),
       pick('Sleep', 'What is a good thing to do just before bed?', ['Play a fast game', 'Read a book', 'Eat lots of sweets'], 'Read a book',
        'Pick something calm and quiet.'),
       pick('Sleep', 'When should you turn off the TV or tablet?', ['A while before bedtime', 'When you fall asleep', 'Never'], 'A while before bedtime',
        'Screens keep your brain busy. Switch them off before you go to bed.')],
      [typed('Puzzle', 'number', 'I\'m thinking of a number. If I add 5, I get 12. What\'s my number?', '7', num(7),
        'Not yet. Start at 12.', 'Count back 5 from 12: 11, 10, 9, 8, 7.'),
       typed('Puzzle', 'number', 'I\'m thinking of a number. If I take away 4, I get 10. What\'s my number?', '14', num(14),
        'Not yet. Start at 10.', 'Count on 4 from 10: 11, 12, 13, 14.'),
       typed('Puzzle', 'number', 'There are 3 baskets with 5 apples in each. How many apples are there?', '15', num(15),
        'Not yet. Count in fives.', 'Count in fives three times: 5, 10, 15.')],
      [pick('Water', 'When is a good time to drink water?', ['Only at bedtime', 'When you\'re thirsty or after running about', 'Never'], 'When you\'re thirsty or after running about',
        'Your body loses water when you run around and play.'),
       pick('Water', 'Which drink is kind to your teeth?', ['water', 'cola', 'lemonade'], 'water',
        'Sugary drinks can make holes in your teeth.'),
       pick('Water', 'How can you tell your body needs a drink?', ['You feel thirsty', 'Your hair grows', 'You sneeze'], 'You feel thirsty',
        'Your body tells you when it needs water.')],
      [pick('Trivia', 'Which animal is the tallest in the world?', ['an elephant', 'a giraffe', 'a horse'], 'a giraffe',
        'It has a very long neck!'),
       pick('Trivia', 'How many legs does a spider have?', ['6', '8', '10'], '8',
        'It has more legs than an insect, which has 6.'),
       pick('Trivia', 'What do bees make?', ['milk', 'honey', 'bread'], 'honey',
        'It\'s sweet and sticky.')]
    ],
    3: [
      [],   // Maths: bank-y3.js
      [pick('Exercise', 'How long should children be active every day to keep their bodies healthy?',
        ['About 10 minutes', 'At least 60 minutes', 'Only at weekends'], 'At least 60 minutes',
        'That\'s one whole hour. Playtime, PE and walking to school all count!'),
       pick('Exercise', 'Which of these counts as being active?', ['Watching TV', 'Reading in bed', 'Dancing'], 'Dancing',
        'Being active means moving your body.'),
       pick('Exercise', 'What happens to your breathing when you run fast?', ['It gets faster', 'It stops', 'It gets slower'], 'It gets faster',
        'Your muscles need more air when they work hard.'),
       pick('Exercise', 'Why is playing outside good for you?', ['It makes you grumpy', 'You move your body and get fresh air', 'There\'s no reason'], 'You move your body and get fresh air',
        'Running about outside is great exercise.')],
      [],   // Spelling: bank-y3.js
      [],   // Grammar: bank-y3.js
      [pick('Feelings', 'You feel really worried about something. What\'s a healthy choice?',
        ['Keep it all to yourself', 'Talk to a grown-up you trust', 'Stay up late to forget about it'], 'Talk to a grown-up you trust',
        'Sharing a worry can make it feel smaller. Who could you tell?', 'Hmm, think again.'),
       pick('Feelings', 'Your friend is upset because they lost a game. What could you say?', ['"Ha ha, you lost!"', '"Never mind, let\'s play again."', '"You\'re rubbish."'], '"Never mind, let\'s play again."',
        'Which words would cheer you up?', 'Hmm, think again.'),
       pick('Feelings', 'Which of these is a healthy way to calm down?', ['Take three slow, deep breaths', 'Slam the door', 'Kick the wall'], 'Take three slow, deep breaths',
        'Slow breathing helps your body relax.', 'Hmm, think again.'),
       pick('Feelings', 'How can you show kindness at school?', ['Push in the line', 'Hide someone\'s pencil case', 'Help someone who has dropped their things'], 'Help someone who has dropped their things',
        'Kindness means helping and caring about others.', 'Hmm, think again.')],
      [],   // Humanities: bank-y3.js
      [pick('Sleep', 'How much sleep do children your age need each night?', ['About 5 hours', 'About 10 hours', 'About 15 hours'], 'About 10 hours',
        'It\'s more than grown-ups need. Count the hours from 8 at night to 6 in the morning.'),
       pick('Sleep', 'Which of these helps you get to sleep?', ['A scary film', 'A warm bath and a story', 'A big fizzy drink'], 'A warm bath and a story',
        'Calm, cosy things help your body get ready for sleep.'),
       pick('Sleep', 'Why is it hard to sleep after using a tablet in bed?', ['The bright screen keeps your brain awake', 'Tablets are too heavy', 'It isn\'t hard'], 'The bright screen keeps your brain awake',
        'Screen light tells your brain it\'s still daytime.'),
       pick('Sleep', 'How do you feel at school after a good night\'s sleep?', ['Grumpy and tired', 'Too sleepy to play', 'Ready to learn'], 'Ready to learn',
        'Sleep gives your brain and body energy for the day.')],
      [typed('Puzzle', 'number', 'I\'m a number between 30 and 40. I\'m even. My two digits add up to 7. What number am I?', '34', num(34),
        'Not yet. Write down the even numbers between 30 and 40 first.', 'The even numbers are 32, 34, 36 and 38. Which one has digits that add up to 7?'),
       typed('Puzzle', 'number', 'I\'m a 2-digit number. My tens digit is 4. My ones digit is double my tens digit. What number am I?', '48', num(48),
        'Not yet. Find the ones digit first.', 'Double 4 is 8, so the ones digit is 8.'),
       typed('Puzzle', 'number', 'I\'m thinking of a number. If I add 10, I get 63. What\'s my number?', '53', num(53),
        'Not yet. Start at 63 and go back.', 'Take 10 away from 63: the tens digit goes down by one.'),
       typed('Puzzle', 'number', 'There are 4 tables with 3 children at each table. How many children are there?', '12', num(12),
        'Not yet. Count in threes.', 'Count in threes four times: 3, 6, 9, 12.'),
       typed('Puzzle', 'number', 'I\'m an odd number between 20 and 30. My two digits add up to 9. What number am I?', '27', num(27),
        'Not yet. Write down the odd numbers between 20 and 30.', 'The odd numbers are 21, 23, 25, 27 and 29. Which one has digits that add up to 9?')],
      [pick('Water', 'What\'s the healthiest drink when you\'re thirsty?', ['a fizzy drink', 'water', 'a milkshake'], 'water',
        'It has no sugar at all, and more than half of your body is made of it!'),
       pick('Water', 'When does your body need extra water?', ['After PE or on a hot day', 'When you\'re asleep', 'Never'], 'After PE or on a hot day',
        'You lose water when you get hot and sweaty.'),
       pick('Water', 'Which drink can hurt your teeth if you have it a lot?', ['water', 'milk', 'a fizzy drink'], 'a fizzy drink',
        'Sugar can make holes in your teeth.'),
       pick('Water', 'Which food has lots of water in it?', ['bread', 'watermelon', 'crisps'], 'watermelon',
        'Its name gives you a clue!')],
      [pick('Trivia', 'Which planet is the biggest in our solar system?', ['Mars', 'Jupiter', 'Earth'], 'Jupiter',
        'It\'s a giant ball of gas, and it\'s the fifth planet from the Sun.'),
       pick('Trivia', 'Which is the largest animal on Earth?', ['the elephant', 'the giraffe', 'the blue whale'], 'the blue whale',
        'It lives in the sea.'),
       pick('Trivia', 'How many days are there in a leap year?', ['365', '366', '360'], '366',
        'A leap year has one extra day, on 29 February.'),
       pick('Trivia', 'What colour do you get when you mix blue and yellow?', ['green', 'purple', 'orange'], 'green',
        'It\'s the colour of grass.'),
       pick('Trivia', 'Which is the closest star to Earth?', ['the Moon', 'the Sun', 'Mars'], 'the Sun',
        'It gives us light and heat every day.')]
    ],
    4: [
      [],   // Maths: bank-y4.js
      [pick('Exercise', 'Why should you warm up before PE?', ['To get your muscles ready and avoid getting hurt', 'To get tired quickly', 'It makes you shorter'],
        'To get your muscles ready and avoid getting hurt', 'Cold muscles can get hurt more easily.'),
       pick('Exercise', 'Which of these is a good way to cool down after exercise?', ['Walking slowly and stretching', 'Sprinting as fast as you can', 'Lying in the sun'],
        'Walking slowly and stretching', 'Cooling down means slowing your body down gently.'),
       pick('Exercise', 'Which of these counts as exercise?', ['Riding a bike', 'Playing a video game', 'Watching a film'], 'Riding a bike',
        'Exercise means your body is moving.')],
      [],   // Spelling: bank-y4.js
      [],   // Grammar: bank-y4.js
      [pick('Feelings', 'Which is a good way to calm down when you feel angry?', ['Shout at someone', 'Take slow, deep breaths', 'Throw something'], 'Take slow, deep breaths',
        'Breathing slowly helps your body relax.', 'Hmm, think again.'),
       pick('Feelings', 'You made a mistake in your work. What\'s a healthy way to think about it?', ['I\'m useless', 'Mistakes help me learn', 'I\'ll never try again'], 'Mistakes help me learn',
        'Everyone makes mistakes. They show us what to practise.', 'Hmm, think again.'),
       pick('Feelings', 'Your friend won the race and you didn\'t. What\'s a kind thing to say?', ['That\'s not fair!', 'Well done!', 'I didn\'t even try.'], 'Well done!',
        'How would you like a friend to speak to you if you won?', 'Hmm, think again.')],
      [],   // Humanities: bank-y4.js
      [pick('Sleep', 'Which habit helps you sleep well?', ['Playing on a tablet in bed', 'Going to bed at the same time each night', 'Eating sweets before bed'],
        'Going to bed at the same time each night', 'Your body likes a routine, a bit like a clock.'),
       pick('Sleep', 'What helps you fall asleep?', ['A dark, quiet bedroom', 'Bright lights on', 'Loud music'], 'A dark, quiet bedroom',
        'Your brain gets sleepy when it\'s dark and quiet.'),
       pick('Sleep', 'What can happen if you don\'t get enough sleep?', ['You find it hard to concentrate', 'You grow wings', 'You get taller'], 'You find it hard to concentrate',
        'Think about how you feel in class after a late night.')],
      [typed('Puzzle', 'number', 'I\'m a 2-digit number. My tens digit is double my ones digit. My digits add up to 9. What number am I?', '63', num(63),
        'Not yet. Try a ones digit, then double it for the tens.', 'Try ones = 3: the tens digit is 6, and 6 + 3 = 9.'),
       typed('Puzzle', 'number', 'I\'m in the 6 times table and the 8 times table. I\'m less than 30. What number am I?', '24', num(24),
        'Not yet. Write down the 8 times table first.', '8, 16, 24 ... Which of these is also in the 6 times table?'),
       typed('Puzzle', 'number', 'I\'m a 2-digit number. My two digits are the same and they add up to 14. What number am I?', '77', num(77),
        'Not yet. Both digits are the same.', 'Half of 14 is 7.')],
      [pick('Water', 'Which drink has the most sugar?', ['water', 'milk', 'a can of fizzy drink'], 'a can of fizzy drink',
        'Some fizzy drinks have up to 9 teaspoons of sugar in one can!'),
       pick('Water', 'When do you need to drink more water?', ['On a hot day or after sport', 'When you\'re cold and sitting still', 'Never'], 'On a hot day or after sport',
        'You lose water when you sweat.'),
       pick('Water', 'Which of these is a healthy swap for a fizzy drink?', ['Water with a slice of lemon', 'A bigger fizzy drink', 'A milkshake'], 'Water with a slice of lemon',
        'Pick the one with no added sugar.')],
      [pick('Trivia', 'What is the longest river in the UK?', ['the Thames', 'the Severn', 'the Trent'], 'the Severn',
        'It starts in the mountains of Wales and flows into the Bristol Channel.'),
       pick('Trivia', 'What is the capital city of Scotland?', ['Glasgow', 'Edinburgh', 'Aberdeen'], 'Edinburgh',
        'It has a famous castle on a big rock.'),
       pick('Trivia', 'How many sides does a hexagon have?', ['5', '6', '8'], '6',
        'Think of the cells in a honeycomb.')]
    ],
    5: [
      [],   // Maths: bank-y5.js
      [pick('Exercise', 'What happens to your heart rate when you exercise?', ['It goes up', 'It goes down', 'It stops'], 'It goes up',
        'Your muscles need more oxygen, so your heart pumps faster.'),
       pick('Exercise', 'Which of these helps keep your bones strong?', ['Jumping and running', 'Sitting all day', 'Sleeping in'], 'Jumping and running',
        'Bones get stronger when they carry your weight, like when you land from a jump.'),
       pick('Exercise', 'Why is it good to walk or cycle to school?', ['It\'s extra activity in your day', 'It makes you tired all day', 'There\'s no reason'], 'It\'s extra activity in your day',
        'Every bit of moving counts towards your 60 active minutes.')],
      [],   // Spelling: bank-y5.js
      [],   // Grammar: bank-y5.js
      [pick('Feelings', 'Someone keeps sending you unkind messages online. What should you do?',
        ['Send unkind messages back', 'Tell a trusted adult and don\'t reply', 'Keep it a secret'], 'Tell a trusted adult and don\'t reply',
        'You don\'t have to deal with it alone. Keep the messages and get help.', 'Hmm, think again.'),
       pick('Feelings', 'You feel nervous before a test. What could help?', ['Take slow breaths and do your best', 'Stay up all night worrying', 'Tell yourself you\'ll fail'], 'Take slow breaths and do your best',
        'Calm breathing helps your brain think clearly.', 'Hmm, think again.'),
       pick('Feelings', 'A new pupil joins your class and looks nervous. What could you do?', ['Show them where things are', 'Laugh at them', 'Ignore them'], 'Show them where things are',
        'Think about how it feels to be new.', 'Hmm, think again.')],
      [],   // Humanities: bank-y5.js
      [pick('Sleep', 'Why is it a good idea to stop using screens before bed?',
        ['Screens make it harder for your brain to get sleepy', 'Screens make you taller', 'There\'s no reason'], 'Screens make it harder for your brain to get sleepy',
        'The bright light tells your brain it\'s still daytime.'),
       pick('Sleep', 'About how many hours of sleep do 10-year-olds need each night?', ['About 6 hours', 'About 10 hours', 'About 14 hours'], 'About 10 hours',
        'It\'s a little less than younger children need, but a lot more than 6.'),
       pick('Sleep', 'What does your brain do while you sleep?', ['It sorts out what you learned that day', 'It switches off completely', 'Nothing at all'], 'It sorts out what you learned that day',
        'That\'s one reason sleep helps you learn.')],
      [typed('Puzzle', 'number', 'A farmer has some chickens and some cows. There are 5 animals and 14 legs. How many cows are there?', '2', num(2),
        'Not yet. Chickens have 2 legs and cows have 4.', 'If all 5 were chickens there would be 10 legs. Each cow adds 2 more legs. How many cows make 14?'),
       typed('Puzzle', 'number', 'I\'m a prime number between 20 and 30. My digits add up to 5. What number am I?', '23', num(23),
        'Not yet. Write down the prime numbers between 20 and 30.', 'The primes are 23 and 29. Which one has digits that add up to 5?'),
       typed('Puzzle', 'number', 'Two numbers add up to 20. One is 4 more than the other. What is the bigger number?', '12', num(12),
        'Not yet. Try two numbers that add up to 20.', 'Take the 4 away first: 20 − 4 = 16. Halve it to get 8. The bigger number is 8 + 4.')],
      [pick('Water', 'About how much of the human body is water?', ['about a tenth', 'more than half', 'all of it'], 'more than half',
        'It\'s around 60 per cent.'),
       pick('Water', 'Why can sugary drinks be bad for you?', ['They can damage your teeth', 'They make you taller', 'They have no taste'], 'They can damage your teeth',
        'Sugar feeds the germs that make holes in teeth.'),
       pick('Water', 'What can happen when your body doesn\'t get enough water?', ['You can get a headache and feel tired', 'You run faster', 'Nothing'], 'You can get a headache and feel tired',
        'Your brain and muscles need water to work well.')],
      [pick('Trivia', 'Which is the largest ocean on Earth?', ['the Atlantic', 'the Pacific', 'the Indian'], 'the Pacific',
        'It lies between Asia and the Americas.'),
       pick('Trivia', 'Which planet is closest to the Sun?', ['Venus', 'Mercury', 'Mars'], 'Mercury',
        'It\'s the smallest planet, too.'),
       pick('Trivia', 'What is the hardest natural material?', ['diamond', 'gold', 'iron'], 'diamond',
        'It\'s used on drill tips to cut through rock.')]
    ],
    6: [
      [],   // Maths: bank-y6.js
      [pick('Exercise', 'Which activity makes your muscles stronger?', ['Climbing and swinging on the bars', 'Watching sport on TV', 'Lying on the sofa'],
        'Climbing and swinging on the bars', 'Muscles get stronger when they have to lift or pull your body.'),
       pick('Exercise', 'On average, how long should children be active every day?', ['At least 60 minutes', 'About 10 minutes', 'About 10 hours'], 'At least 60 minutes',
        'That\'s one whole hour, and PE, playtime and walking all count.'),
       pick('Exercise', 'How can regular exercise affect your mood?', ['It can help you feel happier', 'It always makes you sad', 'It has no effect'], 'It can help you feel happier',
        'When you move, your brain releases chemicals that make you feel good.')],
      [],   // Spelling: bank-y6.js
      [],   // Grammar: bank-y6.js
      [pick('Feelings', 'Your friend is being left out by the group. What\'s the kindest choice?', ['Invite them to join in', 'Ignore it', 'Leave them out too'],
        'Invite them to join in', 'Think about how it feels to be left out.', 'Hmm, think again.'),
       pick('Feelings', 'You\'re worried about moving to secondary school. What could help?', ['Talking about it with family or a teacher', 'Keeping it to yourself', 'Pretending it isn\'t happening'],
        'Talking about it with family or a teacher', 'Sharing a worry can make it feel smaller.', 'Hmm, think again.'),
       pick('Feelings', 'Someone posts an unkind photo of a classmate. What\'s the right thing to do?', ['Share it with friends', 'Tell a trusted adult', 'Add a mean comment'], 'Tell a trusted adult',
        'Sharing it would hurt them more. Who can help stop it?', 'Hmm, think again.')],
      [],   // Humanities: bank-y6.js
      [pick('Sleep', 'About how much sleep do 11-year-olds need each night?', ['About 5 hours', 'About 9 to 10 hours', 'About 14 hours'], 'About 9 to 10 hours',
        'It\'s a little less than younger children need, but more than grown-ups.'),
       pick('Sleep', 'Which habit is best for sleep?', ['Charging your phone outside your bedroom', 'Scrolling in bed', 'Gaming until midnight'], 'Charging your phone outside your bedroom',
        'If the phone isn\'t there, it can\'t keep you awake.'),
       pick('Sleep', 'Why do growing bodies need plenty of sleep?', ['Your body grows and repairs itself while you sleep', 'Sleep stops you growing', 'You only need sleep when you\'re ill'],
        'Your body grows and repairs itself while you sleep', 'A lot of growing happens at night.')],
      [typed('Puzzle', 'number', 'What comes next? 1, 4, 9, 16, 25, ...', '36', num(36),
        'Not yet. Look at how much the numbers go up by.', 'These are square numbers: 1 × 1, 2 × 2, 3 × 3 ... so the next is 6 × 6.'),
       typed('Puzzle', 'number', 'What comes next? 2, 3, 5, 8, 12, ...', '17', num(17),
        'Not yet. Look at how much the numbers go up by each time.', 'They go up by 1, 2, 3, 4 ... so next they go up by 5.'),
       typed('Puzzle', 'number', 'A rectangle has a perimeter of 20 cm. It is 6 cm long. How wide is it, in cm?', '4', num(4),
        'Not yet. The perimeter is all four sides added together.', 'The two long sides make 12 cm. That leaves 8 cm for the two short sides.')],
      [pick('Water', 'What\'s the best drink after a long run on a hot day?', ['water', 'an energy drink', 'a sugary fizzy drink'], 'water',
        'Your body needs to replace the water it lost as sweat, without extra sugar.'),
       pick('Water', 'About how many teaspoons of sugar can there be in one can of cola?', ['about 1', 'about 9', 'about 30'], 'about 9',
        'It\'s far more than you\'d put on your cereal!'),
       pick('Water', 'Which of these foods has a lot of water in it?', ['cucumber', 'crackers', 'crisps'], 'cucumber',
        'It\'s crunchy and cool, and you often find it in salads.')],
      [pick('Trivia', 'Which gas do plants take in from the air to make their food?', ['oxygen', 'carbon dioxide', 'helium'], 'carbon dioxide',
        'It\'s the gas we breathe out.'),
       pick('Trivia', 'Which organ pumps blood around your body?', ['the heart', 'the lungs', 'the stomach'], 'the heart',
        'You can feel it beating in your chest.'),
       pick('Trivia', 'At what temperature does water boil at sea level?', ['100 °C', '50 °C', '0 °C'], '100 °C',
        '0 °C is when water freezes.')]
    ]

  };

  /* ---------- Question banks ----------
     bank-yN.js holds plain cards; each becomes a question here. Pipe 10 is
     Science instead of Trivia for a year whose bank has Science cards. In
     Node there is no window, so the banks are required (make-audio, checks). */
  var BANK = (typeof window !== 'undefined' && window.QUEST_BANK) || {};
  if (typeof module !== 'undefined' && module.exports) {
    YEAR_LIST.forEach(function (y) { BANK[y] = require('./bank-y' + y + '.js'); });
  }
  var PIPE_SUBJECTS = ['Maths', 'Exercise', 'Spelling', 'Grammar', 'Feelings', 'Humanities', 'Sleep', 'Puzzle', 'Water', 'Trivia'];
  var squash = function (v) { return String(v).trim().toLowerCase().replace(/\s+/g, ' '); };
  function fromCard(c) {
    var ok = (c.accept || []).concat(c.answer), q;
    if (c.type === 'pick') q = pick(c.subject, c.prompt, c.choices, c.answer, c.hint, c.nudge);
    else q = typed(c.subject, c.type, c.prompt, c.answer, c.type === 'number'
      ? function (v) { var n = String(v).replace(/[\s,]/g, ''); return n !== '' && ok.some(function (a) { return Number(n) === Number(a); }); }
      : function (v) { return ok.some(function (a) { return squash(v) === squash(a); }); },
      c.nudge, c.hint);
    q.bank = true;
    q.level = c.level;
    q.src = c.src;
    return q;
  }
  YEAR_LIST.forEach(function (y) {
    var cards = BANK[y] || [];
    var has = function (s) { return cards.some(function (c) { return c.subject === s; }); };
    PIPE_SUBJECTS.forEach(function (s, p) {
      if (p === 9 && has('Science')) s = 'Science';
      if (has(s)) YEARS[y][p] = cards.filter(function (c) { return c.subject === s; }).map(fromCard);
    });
  });

  /* One question for a pipe, drawn when its chest is first opened: an unused
     card of the pupil's level, else of the other level. Pools outside the
     banks have no level, so any unused one. */
  function draw(year, pipe, level, used) {
    var pool = YEARS[year][pipe];
    var fresh = pool.filter(function (c) { return !used.has(c.cfg.prompt); });
    if (!fresh.length) fresh = pool;
    var mine = fresh.filter(function (c) { return c.level === level; });
    var from = mine.length ? mine : fresh;
    var card = from[Math.floor(Math.random() * from.length)];
    used.add(card.cfg.prompt);
    return card;
  }
  /* Two right-first-time answers in a row move up to level 2; any answer
     that isn't right first time goes back to level 1. */
  function nextLevel(st, firstTry) {
    if (!firstTry) return { level: 1, streak: 0 };
    if (st.level === 1 && st.streak + 1 >= 2) return { level: 2, streak: 0 };
    return { level: st.level, streak: st.level === 1 ? st.streak + 1 : 0 };
  }

  /* ---------- Read aloud (same voice rules as yard.js; see check_voices.js) ---------- */
  var VOICE_PREFERRED = [
    'daniel', 'serena', 'kate', 'martha', 'arthur', 'sonia', 'libby', 'ryan',
    'google uk english', 'samantha', 'alex', 'google us english'
  ];
  var VOICE_NOVELTY = [
    'bad news', 'good news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos',
    'jester', 'organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox',
    'albert', 'fred', 'junior', 'ralph', 'kathy', 'princess', 'deranged',
    'hysterical', 'grandma', 'grandpa', 'rocko', 'shelley', 'sandy', 'flo',
    'eddy', 'reed'
  ];
  var chosenVoice = null;

  function pickVoice() {
    var all = [];
    try { all = window.speechSynthesis.getVoices() || []; } catch (e) { return null; }
    var english = all.filter(function (v) { return /^en([-_]|$)/i.test(v.lang || ''); });
    if (!english.length) return null;
    var plain = function (v) {
      var n = (v.name || '').toLowerCase();
      return !VOICE_NOVELTY.some(function (bad) { return n.indexOf(bad) !== -1; });
    };
    var british = english.filter(function (v) { return /^en[-_]gb/i.test(v.lang || ''); });
    var natural = function (v) { return /premium|enhanced/i.test((v.name || '') + ' ' + (v.voiceURI || '')); };
    // Best first: a British Premium or Enhanced voice (the natural ones a
    // device can download), then a plain British voice, then any plain
    // English one, then whatever English is left rather than another language.
    var pools = [british.filter(plain).filter(natural), british.filter(plain), english.filter(plain), british, english];
    for (var i = 0; i < pools.length; i++) {
      if (!pools[i].length) continue;
      for (var j = 0; j < VOICE_PREFERRED.length; j++) {
        var want = VOICE_PREFERRED[j];
        var hit = pools[i].filter(function (v) {
          return (v.name || '').toLowerCase().indexOf(want) !== -1;
        })[0];
        if (hit) return hit;
      }
      return pools[i][0];
    }
    return null;
  }

  /* getVoices() is empty until the engine has loaded them, so it is asked
     again on voiceschanged and again lazily on the first tap. */
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    chosenVoice = pickVoice();
    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', function () {
        chosenVoice = pickVoice();
      });
    }
  }

  function utter(text) {
    var u = new SpeechSynthesisUtterance(text);
    u.voice = chosenVoice;
    u.lang = chosenVoice.lang;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  /* Read aloud: the recorded MP3 for this exact text when audio/index.js
     has one (natural voices, made on the teacher's Mac and kept with the
     game), else the device's own voice. A file that is missing or won't play
     falls back to the device voice, so a pupil never gets silence. */
  var clip = null, spoken = 0;
  function speak(text) {
    spoken++;                                           // a pending device-voice retry for an older line gives up
    if (clip) { clip.pause(); clip = null; }            // one voice at a time
    var file = window.QUEST_AUDIO && window.QUEST_AUDIO[text];
    if (!file || !window.Audio) return deviceSpeak(text);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    var a = clip = new window.Audio(file), fell = false;
    var fallBack = function () {
      if (fell || clip !== a) return;
      fell = true;
      deviceSpeak(text);
    };
    a.addEventListener('error', fallBack);
    var played = a.play();
    if (played && played.catch) played.catch(fallBack);
  }

  function deviceSpeak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (!chosenVoice) chosenVoice = pickVoice();
    if (chosenVoice) return utter(text);
    var settled = false, mine = spoken;
    var retry = function () {
      if (settled || mine !== spoken) return;
      settled = true;
      chosenVoice = pickVoice();
      if (chosenVoice) utter(text);
      else noEnglishVoice();
    };
    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', retry, { once: true });
    }
    setTimeout(retry, 400);
  }

  function noEnglishVoice() {
    var live = document.getElementById('live');
    if (live) {
      live.textContent = 'This device has no English voice installed, so reading aloud is off.';
    }
  }

  /* ---------- Small DOM helpers ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function icon(id, cls) {
    return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  }
  function sayButton(text) {
    var b = el('button', 'say');
    b.type = 'button';
    b.setAttribute('aria-label', 'Read this to me');
    b.innerHTML = icon('i-speaker');
    b.addEventListener('click', function () { speak(typeof text === 'function' ? text() : text); });
    return b;
  }
  function plural(n) { return n === 1 ? 'gem' : 'gems'; }

  /* ---------- Questions ----------
     Points for a chest (Zoe, 2026-10-01): 2 if right first time, 1 on the
     second go, 0 after that. Asking Wafi for the hint first caps it at 1,
     the same as a lucky guess is worth on average, so asking never costs
     more than guessing. */
  function chestPoints(tries, helped) {
    var pts = Math.max(0, 2 - tries);
    return helped ? Math.min(pts, 1) : pts;
  }
  function ask(host, cfg) {
    var box = el('div', 'ask');
    var qId = 'q' + Math.random().toString(36).slice(2, 8);
    var q = el('label', 'ask-q', cfg.prompt);
    q.id = qId;
    var fb = el('p', 'ask-fb');
    fb.setAttribute('role', 'status');
    var tries = 0, helped = false;

    /* Wafi gives the hint: when asked, or by himself after two goes. */
    var tip = el('div', 'wafi-tip');
    tip.hidden = true;
    var tipText = el('p', 'wafi-say');
    tipText.setAttribute('role', 'status');
    var askWafi = el('button', 'btn ghost small ask-wafi');
    askWafi.type = 'button';
    if (window.MNSArt) {
      var face = el('span', 'wafi-face');
      face.innerHTML = window.MNSArt.wafi('head');
      tip.appendChild(face);
      askWafi.innerHTML = '<span class="wafi-face">' + window.MNSArt.wafi('head') + '</span>';
    }
    askWafi.appendChild(el('span', '', 'Ask Wafi'));
    tip.appendChild(tipText);
    tip.appendChild(sayButton(function () { return tipText.textContent; }));
    function showTip() {
      tipText.textContent = cfg.hint;
      tip.hidden = false;
      askWafi.hidden = true;
    }
    askWafi.addEventListener('click', function () { helped = true; showTip(); });

    function right() {
      var pts = chestPoints(tries, helped);
      box.classList.add('solved');
      askWafi.hidden = true;
      fb.textContent = pts === 2 ? 'Brilliant! Right first time: 2 points.'
        : pts === 1 ? 'Well done! 1 point.' : 'You got it! The chest is open.';
      if (cfg.onSolve) cfg.onSolve(pts);
    }
    function wrong() {
      tries++;
      fb.textContent = cfg.nudge;
      if (tries >= 2 && cfg.hint) showTip();
      if (cfg.onWrong) cfg.onWrong();
    }

    var head = el('div', 'ask-head');
    head.appendChild(q);
    box.appendChild(head);
    if (cfg.choices) {
      var group = el('div', 'choices');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-labelledby', qId);
      cfg.choices.forEach(function (c) {
        var b = el('button', 'choice', c);
        b.type = 'button';
        b.addEventListener('click', function () {
          if (box.classList.contains('solved') || b.dataset.state) return;
          if (cfg.accept(c)) {
            b.dataset.state = 'right';
            Array.prototype.forEach.call(group.querySelectorAll('.choice'),
              function (o) { o.disabled = o !== b; });
            right();
          } else {
            b.dataset.state = 'wrong';
            wrong();
          }
        });
        group.appendChild(b);
      });
      box.appendChild(group);
      head.appendChild(sayButton(cfg.prompt + ' ' + cfg.choices.join(', or ') + '?'));
    } else {
      var row = el('div', 'ask-row');
      var input = el('input', 'ask-in');
      input.id = qId + 'in';
      q.htmlFor = input.id;
      input.type = 'text';
      input.autocomplete = 'off';
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('autocorrect', 'off');
      input.spellcheck = false;
      if (cfg.type === 'number') input.inputMode = 'numeric';
      var check = el('button', 'btn', 'Check');
      check.type = 'button';
      var submit = function () {
        if (box.classList.contains('solved')) return;
        var v = input.value.trim();
        if (!v) { fb.textContent = 'Type your answer first.'; input.focus(); return; }
        if (cfg.accept(v)) { input.disabled = true; check.disabled = true; right(); }
        else { wrong(); input.select(); }
      };
      check.addEventListener('click', submit);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
      row.appendChild(input);
      row.appendChild(check);
      row.appendChild(sayButton(cfg.prompt));
      box.appendChild(row);
    }
    box.appendChild(fb);
    if (cfg.hint) { box.appendChild(askWafi); box.appendChild(tip); }
    host.appendChild(box);
    return { el: box };
  }

  /* ---------- The chest inside every pipe ----------
     Drawn back to front: the open lid (hidden until solved) sits behind
     the gem, the gem rises out of the box, the closed lid covers it all. */
  function chestSvg() {
    return '' +
      '<svg class="chest" viewBox="0 0 120 112" aria-hidden="true">' +
        '<ellipse cx="60" cy="106" rx="50" ry="5" class="chest-shadow"/>' +
        '<g class="open-lid">' +
          '<path d="M14 52 L20 16 Q60 2 100 16 L106 52 Z" class="open-lid-in"/>' +
          '<path d="M19 22 Q60 8 101 22" class="chest-band-line"/>' +
        '</g>' +
        '<circle cx="60" cy="30" r="30" class="gem-glow"/>' +
        '<g class="gem-in">' +
          '<polygon points="60,18 76,34 60,58 44,34" class="gem-body"/>' +
          '<polygon points="60,18 66,34 60,58 54,34" class="gem-shine"/>' +
          '<path d="M44 34 H76" class="gem-line"/>' +
        '</g>' +
        '<rect x="12" y="50" width="96" height="52" rx="8" class="chest-wood"/>' +
        '<rect x="15" y="50" width="90" height="6" class="chest-mouth"/>' +
        '<rect x="12" y="64" width="96" height="9" class="chest-band"/>' +
        '<rect x="26" y="56" width="8" height="46" class="chest-strap"/>' +
        '<rect x="86" y="56" width="8" height="46" class="chest-strap"/>' +
        '<g class="closed-lid">' +
          '<path d="M12 52 V36 Q12 14 60 14 Q108 14 108 36 V52 Z" class="chest-wood"/>' +
          '<path d="M26 18.5 V52 M94 18.5 V52" class="chest-strap-line"/>' +
          '<rect x="12" y="42" width="96" height="9" class="chest-band"/>' +
        '</g>' +
        '<g class="lock"><rect x="51" y="46" width="18" height="20" rx="4"/>' +
          '<circle cx="60" cy="54" r="2.6" class="keyhole"/><path d="M60 55 v6" class="keyhole-line"/></g>' +
      '</svg>';
  }

  var Quest = {
    ask: ask, chestPoints: chestPoints, draw: draw, nextLevel: nextLevel, speak: speak, icon: icon, el: el, plural: plural,
    chestSvg: chestSvg, sayButton: sayButton,
    YEARS: YEARS, YEAR_LIST: YEAR_LIST, HOUSES: HOUSES, THEME: THEME
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Quest; return; }
  window.Quest = Quest;
})();
