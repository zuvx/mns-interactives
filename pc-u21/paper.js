/* Unit 21 3D shapes Progress Check (Collins Stage 3, 32 marks), Thursday 19 November 2026, for the
   Support Player (Learning Tools/support-player). The paper isn't changed: same seven questions,
   same order, same marks. What changes is how he gets to it (CLAUDE.md, "Actividades adaptadas
   para Hasan"). The steps are the cards of build_hasan_w11_pc.js, adapted to the tablet, and the
   same no-reveal rule holds: no shape name, count, face shape or definition in a step.
   Pictures are the Toy Box Workshop's own drawings (solids.js), not Collins' artwork. Q7's
   objects are drawn in index.html. Pupil code only: this page may be on a public link. */
window.PAPER = {
  id: "maths-u21-pc",
  title: "3D shapes: Progress Check",
  code: "S01",
  intro: "Seven questions. One at a time. An adult is with you.",
  audio: "",   // "audio/" once the Alice clips are recorded (ElevenLabs had no credits on 18 Nov); empty = the iPad's British voice
  adjust: { read: true, spell: true, dictate: true, other: ["real 3D shapes on the table", "steps checklist"] },
  evidenceNote: "Mark scheme: Collins Unit 21. The cylinder is 3 faces, 0 vertices, 2 edges and not a prism. Q7 golf ball: sphere (the scheme says cylinder). Tepee: pyramid or cone.",
  questions: [
    { id: "q1", n: 1, type: "letters", marks: 1, all: true,
      text: "Write the correct letter beside the name of each shape.",
      say: "Question 1. Write the correct letter beside the name of each shape. The names are: cuboid. Square-based pyramid. Cube. Cylinder. Sphere. Triangular-based pyramid.",
      steps: ["Look at the first name.", "Look at the pictures. Find that shape. Hold the real one if you have it.", "Tap its letter. It is crossed off at the top.", "Next name. Are all six letters crossed off?"],
      pics: [["A", "cube"], ["B", "tetrahedron"], ["C", "sphere"], ["D", "sqpyramid"], ["E", "flatcuboid"], ["F", "cylinder"]],
      rows: [["cuboid", "E"], ["square-based pyramid", "D"], ["cube", "A"], ["cylinder", "F"], ["sphere", "C"], ["triangular-based pyramid", "B"]] },

    { id: "q2", n: 2, type: "table", marks: 20, max: 13,
      text: "Complete the table.",
      say: "Question 2. Complete the table. For each shape, write the number of faces, the shapes of the faces, the number of vertices, and the number of edges. The shapes are: cuboid. Cylinder. Square-based pyramid. Triangular-based pyramid. Cube.",
      steps: ["Do one row only. Your row is lit up.", "Read the name. Hold that real shape, or picture it in your head.", "Fill the row from left to right. Count, then tap the number.", "Careful: on this paper the vertices come before the edges.", "Row done? Tap a box in the next row."],
      cols: [{ h: "Number of faces", num: true }, { h: "Shapes of faces" }, { h: "Number of vertices", num: true }, { h: "Number of edges", num: true }],
      rows: [["cuboid", [6, null, 8, 12]], ["cylinder", [3, null, 0, 2]], ["square-based pyramid", [5, null, 5, 8]], ["triangular-based pyramid", [4, null, 4, 6]], ["cube", [6, null, 8, 12]]],
      note: "Shapes of faces: cuboid rectangles (or rectangles and squares); cylinder 2 circles and 1 curved; square-based pyramid 1 square, 4 triangles; triangular-based pyramid triangles; cube squares." },

    { id: "q3", n: 3, type: "pick", marks: 1,
      text: "Circle all the prisms.",
      say: "Question 3. Circle all the prisms. Tap a picture to circle it. Tap it again to take the circle off.",
      steps: ["Start at picture 1. Look at one picture at a time.", "Ask: is it a prism? Yes: tap it. No: leave it.", "Go to the next picture. Check all 12."],
      pics: ["pentprism", "octprism", "sqpyramid", "sphere", "triprism", "hexpyramid", "pentpyramid", "cylinder", "cuboid", "tetrahedron", "hexprism_lying", "cube"],
      key: [0, 1, 4, 8, 10, 11] },

    { id: "q4", n: 4, type: "write", marks: 2,
      text: "What is a prism?", say: "Question 4. What is a prism?",
      frame: "A prism is a 3D shape",
      steps: ["Picture a prism you held this week. Look at it in your head.", "Say what you see, quietly or to the adult.", "Type it, or tap the microphone on the keyboard and say it."] },

    { id: "q5", n: 5, type: "pick", marks: 1,
      text: "Circle all the pyramids.",
      say: "Question 5. Circle all the pyramids. These are the same pictures. Now you look for pyramids.",
      steps: ["New job: now look for pyramids. Start again at picture 1.", "Ask: is it a pyramid? Yes: tap it. No: leave it.", "Go to the next picture. Check all 12."],
      pics: ["pentprism", "octprism", "sqpyramid", "sphere", "triprism", "hexpyramid", "pentpyramid", "cylinder", "cuboid", "tetrahedron", "hexprism_lying", "cube"],
      key: [2, 5, 6, 9] },

    { id: "q6", n: 6, type: "write", marks: 2,
      text: "What is a pyramid?", say: "Question 6. What is a pyramid?",
      frame: "A pyramid is a 3D shape",
      steps: ["Picture a pyramid you held this week. Look at it in your head.", "Say what you see, quietly or to the adult.", "Type it, or tap the microphone on the keyboard and say it."] },

    { id: "q7", n: 7, type: "name", marks: 5,
      text: "Name the shape of each object.",
      say: "Question 7. Name the shape of each object.",
      steps: ["Look at one thing at a time.", "Imagine holding it. Flat faces or curved? Which real shape is it like?", "Say the name, then type it, or say it with the microphone."],
      items: [["glass", "cylinder"], ["dice", "cube"], ["tepee", ["pyramid", "cone"]], ["box", "cuboid"], ["golf ball", "sphere"]] },
  ],
};
