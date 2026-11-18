/* Support Player: one paper (a lesson activity or an assessment) with access supports built in.
   Generic: knows nothing about any subject, school or pupil. The page supplies
     window.PAPER  the questions (see README.md for the format)
     window.PIC    id -> SVG/HTML string for any picture the paper names
   Supports: read aloud (recorded mp3 in PAPER.audio, device voice as fallback), steps to tick,
   a tracker, "come back to it", spell check and keyboard dictation where the paper allows them,
   no time limit (time is recorded, never shown). Evidence: teacher view, CSV export, print.
   Everything stays on the device (localStorage) until the teacher clears it. */
(function () {
  "use strict";
  const P = window.PAPER, PIC = window.PIC || {}, A = P.adjust || {};
  const KEY = "support-player:" + P.id;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pic = id => PIC[id] || "";
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} },
    clear() { try { localStorage.removeItem(KEY); } catch {} },
  };
  const Q = P.questions;
  let S;            // {started, cur, ans:{}, secs:{}, reads:{}, flags:{}, steps:{}, seen:{}, marks:{}, finished}
  let t0 = 0;       // when the current question opened
  let active = {};  // table: {r, c} of the selected cell

  /* ---------- read aloud ---------- */
  let player;
  function read(key, text, q) {
    if (q) { S.reads[q.id] = (S.reads[q.id] || 0) + 1; save(); }
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (player) player.pause();
    const voice = () => {
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text); u.lang = "en-GB"; u.rate = 0.85;
      const vs = speechSynthesis.getVoices(), want = pickedVoice();
      const v = vs.find(v => v.name === want) || vs.find(v => v.lang.replace("_", "-") === "en-GB"); if (v) u.voice = v;
      speechSynthesis.speak(u);
    };
    if (!P.audio) return voice();
    player = new Audio(P.audio + key + ".mp3");
    player.play().catch(voice);
  }
  /* The teacher picks the device voice once on the start screen; the tablet remembers it. */
  const VKEY = "support-player:voice";
  const pickedVoice = () => { try { return localStorage.getItem(VKEY); } catch { return null; } };
  function voiceList() {
    const sel = $("#voice"); if (!sel || !window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices().filter(v => /^en[-_]GB/.test(v.lang));
    const all = vs.length ? vs : speechSynthesis.getVoices().filter(v => /^en/.test(v.lang));
    const want = pickedVoice();
    sel.innerHTML = all.map(v => `<option ${v.name === want ? "selected" : ""}>${esc(v.name)}</option>`).join("");
  }
  const sayBtn = (key, text, cls = "") => `<button class="say ${cls} noprint" data-say="${esc(key)}" data-text="${esc(text)}" aria-label="Read it to me">🔊</button>`;

  /* ---------- state ---------- */
  function save() { store.set(S); }
  function leave() { if (S && t0) { const q = Q[S.cur]; S.secs[q.id] = (S.secs[q.id] || 0) + Math.round((Date.now() - t0) / 1000); t0 = 0; save(); } }
  function go(i) { leave(); S.cur = i; S.seen[Q[i].id] = true; active = {}; save(); draw(); }
  const answered = q => {
    const a = S.ans[q.id];
    if (a == null) return false;
    if (q.type === "write") return !!String(a).trim();
    if (q.type === "pick") return a.length > 0;
    return Object.values(a).some(v => String(v ?? "").trim());
  };

  /* ---------- screens ---------- */
  function shell(body) {
    $("#app").innerHTML = `<header><div class="bricks"></div><div class="head"><h1>${esc(P.title)}</h1><span class="code">${esc(S?.code || P.code || "")}</span></div></header>${body}`;
  }

  function start() {
    shell(`<div class="card"><p class="big">${esc(P.title)}</p>
      <p>${esc(P.intro || "")}</p>
      <p class="hint">Adjustments on: ${esc(adjustText())}.</p>
      ${A.read && !P.audio ? `<p class="hint noprint">Voice: <select id="voice" class="txt" style="max-width:320px"></select> <button class="btn" id="try">Try it</button><br>More natural voices: iPad Settings → Accessibility → Read &amp; Speak (or Spoken Content) → Voices → English → UK, download an "Enhanced" or "Premium" one.</p>` : ""}
      <p class="hint">Pupil code (never a name): <input class="txt" id="code" style="max-width:200px" value="${esc(P.code || "S01")}"></p>
      <div class="foot"><span></span><button class="btn go" id="begin">Start</button></div></div>`);
    voiceList();
    if (window.speechSynthesis) speechSynthesis.onvoiceschanged = voiceList;
    const v = $("#voice");
    if (v) v.onchange = () => { try { localStorage.setItem(VKEY, v.value); } catch {} };
    if ($("#try")) $("#try").onclick = () => { if (v) try { localStorage.setItem(VKEY, v.value); } catch {} read("try", "Hello. I will read each question to you.", null); };
    $("#begin").onclick = () => {
      S = { code: $("#code").value.trim() || "S01", started: Date.now(), cur: 0, ans: {}, secs: {}, reads: {}, flags: {}, steps: {}, seen: {}, marks: {} };
      go(0);
    };
  }

  function adjustText() {
    return [A.read && "read aloud", A.spell && "spell check", A.dictate && "dictation (keyboard microphone)", "no time limit", ...(A.other || [])].filter(Boolean).join(", ");
  }

  function draw() {
    const q = Q[S.cur], n = S.cur;
    const next = Q[n + 1];
    const track = Q.map((x, i) => `<button data-go="${i}" class="${answered(x) ? "done" : ""} ${S.flags[x.id] ? "flag" : ""}" ${i === n ? 'aria-current="step"' : ""} aria-label="Question ${x.n ?? i + 1}">${x.n ?? i + 1}</button>`).join("");
    const steps = (q.steps || []).map((s, i) => `<div class="step"><button class="tick" data-step="${i}" aria-pressed="${!!(S.steps[q.id] || [])[i]}">${esc(s)}</button>${A.read ? sayBtn(`${q.id}-s${i}`, s, "sm") : ""}</div>`).join("");
    shell(`<nav class="track noprint" aria-label="Questions">${track}</nav>
      <p class="nownext">Now: <b>question ${q.n ?? n + 1}</b>${next ? ` · Next: question ${next.n ?? n + 2}` : " · Then: finish"}</p>
      <section class="card">
        <div class="qhead"><span class="qnum">${q.n ?? n + 1}</span><p class="qtext">${esc(q.text)}</p>${A.read ? sayBtn(q.id, q.say || q.text) : ""}</div>
        ${steps ? `<div class="steps"><h2>My steps</h2>${steps}</div>` : ""}
        <div id="w">${widget(q)}</div>
        <div class="foot">
          <button class="btn" id="flag" aria-pressed="${!!S.flags[q.id]}">● Stuck? Come back later</button>
          <button class="btn go" id="next">${next ? "Next question →" : "Finish"}</button>
        </div>
      </section>`);
    t0 = Date.now();
    wire(q);
  }

  /* ---------- widgets ---------- */
  function widget(q) {
    const a = S.ans[q.id];
    const sp = `spellcheck="${!!A.spell}" autocorrect="${A.spell ? "on" : "off"}" autocomplete="off" autocapitalize="off"`;
    const dict = A.dictate ? `<p class="hint">🎤 To say it: tap in the box, then the microphone on the keyboard.</p>` : "";
    switch (q.type) {
      case "letters": {   // pictures with letters; pick a letter for each name
        const used = new Set(Object.values(a || {}));
        return `<div class="pics">${q.pics.map(([l, id]) => `<div class="pic">${pic(id)}<span class="lab">${l}</span></div>`).join("")}</div>
          <div class="lettersused" aria-label="Letters used">${q.pics.map(([l]) => `<span class="${used.has(l) ? "used" : ""}">${l}</span>`).join("")}</div>
          ${q.rows.map(([name], r) => `<div class="lrow"><span class="name">${esc(name)}</span>${q.pics.map(([l]) => `<button class="choice" data-row="${r}" data-l="${l}" aria-pressed="${(a || {})[r] === l}">${l}</button>`).join("")}</div>`).join("")}`;
      }
      case "table": {     // one row lit at a time; number columns use the pad, text columns the keyboard
        const r0 = active.r ?? 0;
        return `<table class="tbl"><tr><th></th>${q.cols.map(c => `<th>${esc(c.h)}</th>`).join("")}</tr>
          ${q.rows.map(([name], r) => `<tr class="row ${r === r0 ? "on" : ""}"><td><b>${esc(name)}</b></td>${q.cols.map((c, k) => {
            const v = (a || {})[`${r}.${k}`] ?? "";
            return `<td>${c.num ? `<button class="cell ${active.r === r && active.c === k ? "on" : ""}" data-r="${r}" data-c="${k}" aria-label="${esc(name)}: ${esc(c.h)}">${esc(v) || "&nbsp;"}</button>`
              : `<input class="txt" data-r="${r}" data-c="${k}" value="${esc(v)}" ${sp} aria-label="${esc(name)}: ${esc(c.h)}">`}</td>`;
          }).join("")}</tr>`).join("")}</table>
          <div class="pad noprint" aria-label="Numbers">${Array.from({ length: (q.max ?? 13) + 1 }, (_, i) => `<button data-num="${i}">${i}</button>`).join("")}<button class="clr" data-num="">⌫</button></div>
          <p class="hint">Tap a box, then tap the number.</p>${q.cols.some(c => !c.num) ? dict : ""}`;
      }
      case "pick": {      // tap to circle; numbers keep the place
        const set = new Set(a || []);
        return `<div class="pics">${q.pics.map((id, i) => `<button class="pic" data-pick="${i}" aria-pressed="${set.has(i)}" aria-label="Picture ${i + 1}">${pic(id)}<span class="lab">${i + 1}</span></button>`).join("")}</div>`;
      }
      case "write":
        return `<p class="frame">${esc(q.frame || "")}</p><textarea class="txt" id="wr" ${sp} aria-label="${esc(q.text)}">${esc(a || "")}</textarea>${dict}`;
      case "name":
        return `<div class="names">${q.items.map(([id], i) => `<div class="pic">${pic(id)}<input class="txt" data-i="${i}" value="${esc((a || {})[i] || "")}" ${sp} aria-label="Name of thing ${i + 1}"></div>`).join("")}</div>${dict}`;
    }
    return "";
  }

  function wire(q) {
    const app = $("#app");
    app.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      const d = b.dataset;
      if (d.say) return read(d.say, d.text, q);
      if (d.go) return go(+d.go);
      if (d.step) { (S.steps[q.id] ||= [])[+d.step] = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", S.steps[q.id][+d.step]); return save(); }
      if (b.id === "flag") { S.flags[q.id] = !S.flags[q.id]; save(); return draw(); }
      if (b.id === "next") return S.cur + 1 < Q.length ? go(S.cur + 1) : finish();
      if (d.l) { (S.ans[q.id] ||= {})[d.row] = S.ans[q.id][d.row] === d.l ? undefined : d.l; save(); return redraw(q); }
      if (d.pick) { const s = new Set(S.ans[q.id] || []); const i = +d.pick; s.has(i) ? s.delete(i) : s.add(i); S.ans[q.id] = [...s]; save(); return redraw(q); }
      if (d.r != null && d.c != null) { active = { r: +d.r, c: +d.c }; return redraw(q); }
      if (d.num != null && active.r != null) {
        (S.ans[q.id] ||= {})[`${active.r}.${active.c}`] = d.num; save();
        const nextNum = q.cols.findIndex((c, k) => k > active.c && c.num);   // move along the row, never down
        if (nextNum > 0) active.c = nextNum;
        return redraw(q);
      }
    };
    app.oninput = e => {
      const t = e.target;
      if (t.id === "wr") S.ans[q.id] = t.value;
      else if (t.dataset.i != null) (S.ans[q.id] ||= {})[t.dataset.i] = t.value;
      else if (t.dataset.r != null) (S.ans[q.id] ||= {})[`${t.dataset.r}.${t.dataset.c}`] = t.value;
      save();
    };
    app.onfocusin = e => {   // a text cell in a table lights its row too
      const t = e.target;
      if (q.type === "table" && t.dataset.r != null && +t.dataset.r !== active.r) { active = { r: +t.dataset.r, c: +t.dataset.c }; document.querySelectorAll(".tbl tr.row").forEach((tr, i) => tr.classList.toggle("on", i === active.r)); }
    };
  }
  function redraw(q) {   // widget only, so the time and the steps don't reset
    $("#w").innerHTML = widget(q);
    document.querySelectorAll(".track button").forEach((b, i) => b.classList.toggle("done", answered(Q[i])));
  }

  function finish() {
    leave();
    const back = Q.filter(q => S.flags[q.id] || !answered(q));
    if (back.length && !S.checkedBack) {
      S.checkedBack = true; save();
      shell(`<div class="card center"><p class="big">Nearly done!</p>
        <p>Have another look at question ${back.map(q => q.n).join(", ")}.</p>
        <div class="foot noprint" style="justify-content:center">${back.map(q => `<button class="btn" data-go="${Q.indexOf(q)}">Question ${q.n}</button>`).join("")}<button class="btn go" id="done">I'm finished</button></div></div>`);
      $("#app").onclick = e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.go) go(+b.dataset.go); else if (b.id === "done") end(); };
      return;
    }
    end();
  }
  function end() {
    S.finished = Date.now(); save();
    shell(`<div class="card center"><p class="big">All done! ⭐</p><p>Well done. Give the tablet to your teacher.</p>
      <button class="btn noprint" id="teach" style="margin-top:40px">Teacher: results</button></div>`);
    $("#app").onclick = e => { if (e.target.id === "teach") teacher(); };
  }

  /* ---------- marking ---------- */
  const norm = s => String(s ?? "").trim().toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, " ");
  /* Auto mark where the paper gives a key; null = the teacher marks it. Exported for the check. */
  function auto(q, a) {
    if (q.type === "letters") { const ok = q.rows.every(([, k], r) => (a || {})[r] === k); return q.all ? (ok ? q.marks : 0) : q.rows.filter(([, k], r) => (a || {})[r] === k).length; }
    if (q.type === "pick") { const s = x => [...(x || [])].sort((p, r) => p - r).join(); return s(a) === s(q.key) ? q.marks : 0; }   // all of them, nothing else
    if (q.type === "table") { let m = 0; q.rows.forEach(([, keys], r) => q.cols.forEach((c, k) => { if (c.num && keys[k] != null && norm((a || {})[`${r}.${k}`]) === String(keys[k])) m++; })); return m; }
    if (q.type === "name") return q.items.filter(([, ok], i) => [].concat(ok).some(o => norm((a || {})[i]).includes(o))).length;
    return null;
  }
  function shown(q, a) {
    if (a == null) return "";
    if (q.type === "letters") return q.rows.map(([n], r) => `${n}: ${a[r] || "-"}`).join("; ");
    if (q.type === "table") return q.rows.map(([n], r) => `${n}: ${q.cols.map((c, k) => a[`${r}.${k}`] || "-").join(" / ")}`).join("; ");
    if (q.type === "pick") return "pictures " + [...a].sort((x, y) => x - y).map(i => i + 1).join(", ");
    if (q.type === "write") return `${q.frame || ""} ${a}`.trim();
    if (q.type === "name") return q.items.map(([id], i) => `${id}: ${a[i] || "-"}`).join("; ");
    return String(a);
  }
  const mark = q => S.marks[q.id] ?? auto(q, S.ans[q.id]);
  const autoNote = q => q.type === "table" && q.cols.some(c => !c.num) ? "numbers marked; add the text columns" : auto(q, S.ans[q.id]) == null ? "teacher marks" : "auto";

  function teacher() {
    const total = Q.reduce((t, q) => t + (+mark(q) || 0), 0), out = Q.reduce((t, q) => t + q.marks, 0);
    shell(`<div class="card teacher"><h2>Evidence</h2>
      <p class="noprint small">Pupil's name (goes only into the file and the printout, never stored): <input class="txt" id="name" style="max-width:300px"></p>
      <p class="printonly">Name: <b id="pname"></b></p>
      <p>Code ${esc(S.code)} · ${new Date(S.started).toLocaleDateString("en-GB")} · ${Math.round(((S.finished || Date.now()) - S.started) / 60000)} min in all · <b><span id="tot">${total}</span> / ${out}</b></p>
      <table><tr><th>Q</th><th>Answer</th><th>Mark</th><th>Time</th><th>Read aloud</th><th>Steps ticked</th><th>Come back</th></tr>
      ${Q.map(q => `<tr><td>${q.n}</td><td>${esc(shown(q, S.ans[q.id])) || "<i>no answer</i>"}${q.note ? `<div class="small"><i>${esc(q.note)}</i></div>` : ""}</td>
        <td><input class="mark" data-m="${q.id}" inputmode="numeric" value="${mark(q) ?? ""}"> / ${q.marks}<div class="small">${autoNote(q)}</div></td>
        <td>${Math.round((S.secs[q.id] || 0) / 60 * 10) / 10} min</td><td>${S.reads[q.id] || 0}×</td>
        <td>${(S.steps[q.id] || []).filter(Boolean).length} / ${(q.steps || []).length}</td><td>${S.flags[q.id] ? "yes" : ""}</td></tr>`).join("")}</table>
      <p class="small">Adjustments: ${esc(adjustText())}. Steps checklist and question tracker on screen. ${esc(P.evidenceNote || "")}</p>
      <div class="foot noprint"><button class="btn go" id="csv">Export for Excel (.csv)</button><button class="btn" id="print">Print / save PDF</button><button class="btn" id="clear">Finish and clear tablet</button></div></div>`);
    const app = $("#app");
    app.oninput = e => { if (e.target.id === "name") $("#pname").textContent = e.target.value; const m = e.target.dataset.m; if (m) { S.marks[m] = e.target.value === "" ? undefined : +e.target.value; save(); $("#tot").textContent = Q.reduce((t, q) => t + (+mark(q) || 0), 0); } };
    app.onclick = e => {
      const id = e.target.id;
      if (id === "print") window.print();
      if (id === "csv") download($("#name").value.trim());
      if (id === "clear" && confirm("Have you exported or printed the results? This clears them from the tablet.")) { store.clear(); location.reload(); }
    };
  }

  function csv(name) {
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const date = new Date(S.started).toLocaleDateString("en-GB");
    const rows = [["Name", "Code", "Date", "Paper", "Question", "Answer", "Mark", "Out of", "Minutes", "Times read aloud", "Steps ticked", "Come back", "Adjustments"],
      ...Q.map(x => [name, S.code, date, P.title, x.n, shown(x, S.ans[x.id]), mark(x) ?? "", x.marks, Math.round((S.secs[x.id] || 0) / 6) / 10, S.reads[x.id] || 0,
        `${(S.steps[x.id] || []).filter(Boolean).length}/${(x.steps || []).length}`, S.flags[x.id] ? "yes" : "", adjustText()])];
    return rows.map(r => r.map(q).join(",")).join("\r\n");
  }
  function download(name) {
    const blob = new Blob(["﻿" + csv(name)], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${P.title} ${name || S.code} ${new Date(S.started).toISOString().slice(0, 10)}.csv` });
    document.body.append(a); a.click(); a.remove();
  }

  /* ---------- boot: resume after a reload, otherwise the start screen ---------- */
  window.SupportPlayer = { auto };
  if (window.speechSynthesis) speechSynthesis.getVoices();   // Safari loads voices lazily
  S = store.get();
  if (S && S.finished) end();
  else if (S) go(S.cur);
  else start();
  addEventListener("pagehide", leave);
})();
