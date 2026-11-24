(function () {
  const L = window.LESSON, Store = window.Store, cfg = window.ITG_CONFIG || {};
  const app = document.getElementById("app");
  const T = { cc: null, state: { unlocked: [] }, students: [], recs: {}, scores: {}, key: null, offs: [], reteach: null, sel: null };
  const panel = document.getElementById("panel");

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((c) => { if (c == null || c === false) return; el.append(c.nodeType ? c : document.createTextNode(c)); });
    return el;
  }
  const g = (o, path) => path.split(".").reduce((a, k) => (a && a[k] !== undefined ? a[k] : undefined), o);
  const avg = (arr) => { const a = arr.filter((x) => typeof x === "number"); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; };
  const fmt = (n, d = 1) => (n == null ? "-" : Number(n).toFixed(d));
  const pct = (n) => (n == null ? "-" : Math.round(n * 100) + "%");
  // attempts, newest last
  const attempts = (s) => { const out = []; for (let n = 1; g(s, "sc.a" + n); n++) out.push(Object.assign({ n }, s.sc["a" + n])); return out; };
  const cerFor = (s, a) => { const o = g(s, "sc.review.a" + a.n + ".cer"); return typeof o === "number" ? o : a.cerScore; };
  const reviewed = (s, a) => !!g(s, "sc.review.a" + a.n + ".ok");
  // best attempt counts, by MC plus CER
  const best = (s) => attempts(s).reduce((b, a) => (!b || a.mcScore + (cerFor(s, a) || 0) > b.mcScore + (cerFor(s, b) || 0) ? a : b), null);
  const waiting = (s) => { const out = []; if (g(s, "submit.pre") && g(s, "sc.pre.cerScore") == null) out.push("pre"); for (let n = 1; n <= (g(s, "sc.allowed") || 1); n++) if (g(s, "submit.a" + n) && g(s, `sc.a${n}.cerScore`) == null) out.push("post"); return out; };
  const problem = (e) => { console.warn(e); alertBar(e.message || String(e)); };
  let barMsg = "";
  function alertBar(m) { barMsg = m; schedule(); }

  // ---------- PIN ----------
  function gate() {
    const inp = h("input", { type: "password", placeholder: "Teacher PIN", style: "max-width:220px" });
    const err = h("div", { class: "err" });
    const go = async () => {
      err.textContent = "Checking...";
      try { await Store.signInTeacher(inp.value.trim()); await ready(); } catch (e) { err.textContent = e.message; }
    };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    app.replaceChildren(h("div", { class: "card", style: "max-width:420px;margin:40px auto" }, h("h2", {}, "Teacher sign in"), inp, err, h("div", { style: "height:10px" }), h("button", { class: "btn", onclick: go }, "Open dashboard")));
  }

  async function ready() {
    T.key = await Store.call("/itg/key", {});
    pickClass();
  }
  // Redraw at most once a second, and never while a menu or text box is in use.
  let timer = null;
  function schedule() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      if (app.contains(document.activeElement) && /SELECT|TEXTAREA|INPUT/.test(document.activeElement.tagName)) return schedule();
      draw();
    }, 700);
  }
  function merge() {
    T.students = Object.keys(T.recs).map((k) => Object.assign({ _id: k }, T.recs[k], { sc: T.scores[k] || {} })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    schedule();
  }

  function pickClass(cc) {
    T.cc = cc || T.cc || L.classCodes[0];
    document.getElementById("who").replaceChildren(
      h("span", {}, "Class "),
      h("select", { style: "width:auto;padding:3px 8px", onchange: (e) => pickClass(e.target.value) }, [...L.classCodes, "TEST"].map((c) => h("option", { value: c, selected: c === T.cc }, c))));
    T.offs.forEach((f) => f()); T.recs = {}; T.scores = {}; T.state = { unlocked: [] }; T.reteach = null; closePanel(); merge(); draw();
    T.offs = [
      Store.subscribeState(T.cc, (st) => { T.state = st; draw(); }, problem),
      Store.subscribeAll(T.cc, "students", (m) => { T.recs = m; merge(); }, problem),
      Store.subscribeAll(T.cc, "scores", (m) => { T.scores = m; merge(); }, problem)
    ];
  }

  // ---------- metrics ----------
  function metrics() {
    const S = T.students;
    const allSort = [...L.sorter.round1, ...L.sorter.round2];
    const m = {
      n: S.length,
      preMC: avg(S.map((s) => g(s, "sc.pre.mcScore"))), postMC: avg(S.map((s) => g(s, "sc.a1.mcScore"))),
      preCER: avg(S.map((s) => g(s, "sc.pre.cerScore"))), postCER: avg(S.map((s) => { const a = attempts(s)[0]; return a ? cerFor(s, a) : null; }))
    };
    // E/R mix-ups across sorter round 2 first attempts + both tests
    let mixN = 0, mixY = 0;
    S.forEach((s) => {
      L.sorter.round2.forEach((q) => { const f = g(s, "sort." + q.id + ".first"); if (f) { mixN++; if (f.mixedUp) mixY++; } });
      ["pre", "a1"].forEach((k) => { if (g(s, `sc.${k}.cerScore`) != null) { mixN++; if (g(s, `sc.${k}.mixedUp`)) mixY++; } });
    });
    m.mix = mixN ? mixY / mixN : null;
    m.scen = allSort.map((q) => {
      const done = S.filter((s) => g(s, "sort." + q.id + ".label"));
      const first = done.map((s) => (g(s, "sort." + q.id + ".first") ? (q.accept || [q.answer]).includes(g(s, "sort." + q.id + ".first.label")) : g(s, "sort." + q.id + ".firstTry")));
      return { id: q.id, text: q.text, answer: q.answer, n: done.length, acc: first.length ? first.filter(Boolean).length / first.length : null };
    });
    m.practice = L.cer.items.map((it) => {
      const recs = S.map((s) => g(s, "cer.items." + it.id)).filter(Boolean);
      return { id: it.id, title: it.title, n: recs.length, first: recs.length ? recs.filter((r) => r.firstTry).length / recs.length : null };
    });
    m.mcItems = L.pre.mc.map((q, i) => {
      const pq = L.post.mc[i];
      const rate = (slot, kind, id) => { const d = S.filter((s) => g(s, `sc.${slot}`)); return d.length ? d.filter((s) => g(s, `sc.${slot}.mc.${id}`) === T.key[kind][id]).length / d.length : null; };
      return { tag: q.tag, pre: rate("pre", "pre", q.id), post: rate("a1", "post", pq.id) };
    });
    return m;
  }

  // ---------- draw ----------
  function draw() {
    if (!T.cc) return;
    const m = metrics();
    const open = T.state.unlocked || [];
    const toggle = (id) => {
      const u = open.includes(id) ? open.filter((x) => x !== id) : [...open, id];
      Store.setState(T.cc, { unlocked: L.phases.map((p) => p.id).filter((x) => u.includes(x)) });
    };
    const nextIdx = L.phases.findIndex((p) => !open.includes(p.id));

    const controls = h("div", { class: "card" }, h("h3", {}, "Phase controls"),
      h("p", { class: "small muted" }, "Green = open to students. Students already working see a Next section button. Closing a phase moves students out of it."),
      h("div", { class: "ctl" }, L.phases.map((p, i) => h("button", { class: open.includes(p.id) ? "open" : "", onclick: () => toggle(p.id) }, `${i + 1}. ${p.name} (${p.minutes}m)`))),
      h("div", { class: "row", style: "margin-top:10px" },
        h("button", { class: "btn", disabled: nextIdx < 0, onclick: () => Store.setState(T.cc, { unlocked: L.phases.slice(0, nextIdx + 1).map((p) => p.id) }) }, nextIdx < 0 ? "All phases open" : `Open next: ${L.phases[nextIdx].name}`),
        h("button", { class: "btn ghost", onclick: () => Store.setState(T.cc, { unlocked: L.phases.map((p) => p.id) }) }, "Open all"),
        h("button", { class: "btn ghost", onclick: () => Store.setState(T.cc, { unlocked: ["pre"] }) }, "Reset to pre-test")));

    const stats = h("div", { class: "stats" },
      stat("Students signed in", m.n),
      stat("Multiple choice, pre to post (of 5)", `${fmt(m.preMC)} → ${fmt(m.postMC)}`),
      stat("CER score, pre to post (of 4)", `${fmt(m.preCER)} → ${fmt(m.postCER)}`),
      stat("Evidence/Reasoning mix-up rate", pct(m.mix)));

    const insights = h("div", { class: "card" }, h("h3", {}, "Insights"),
      h("b", { class: "small" }, "Scenario sorter, first-try accuracy (lowest first)"),
      h("table", { class: "t", style: "margin:6px 0 14px" }, [...m.scen].filter((x) => x.n).sort((a, b) => a.acc - b.acc).map((x) =>
        h("tr", { class: x.acc < 0.6 ? "lowrow" : "" }, h("td", { class: "small" }, x.text), h("td", {}, h("span", { class: "tag t-" + x.answer }, x.answer)), h("td", { class: "num" }, pct(x.acc)))),
        m.scen.every((x) => !x.n) ? h("tr", {}, h("td", { class: "small muted" }, "No sorter answers yet")) : null),
      h("b", { class: "small" }, "CER practice, right on first try"),
      h("table", { class: "t", style: "margin:6px 0 14px" }, m.practice.map((x) => h("tr", { class: x.first != null && x.first < 0.6 ? "lowrow" : "" }, h("td", { class: "small" }, x.title), h("td", { class: "num" }, x.n ? pct(x.first) : "-")))),
      h("b", { class: "small" }, "Multiple choice by skill, pre vs post"),
      h("table", { class: "t", style: "margin-top:6px" }, h("tr", {}, h("th", {}, "Skill"), h("th", {}, "Pre"), h("th", {}, "Post")), m.mcItems.map((x) => h("tr", {}, h("td", {}, x.tag), h("td", { class: "num" }, pct(x.pre)), h("td", { class: "num" }, pct(x.post))))));

    const reteachBox = h("div", {});
    if (T.reteach) reteachBox.append(h("ol", {}, (T.reteach.summary || []).map((x) => h("li", {}, x))));
    const rBtn = h("button", { class: "btn", onclick: async () => {
      rBtn.disabled = true; rBtn.textContent = "Thinking...";
      try { T.reteach = await Store.call("/itg/reteach", { payload: reteachPayload(metrics()) }); } catch (e) { problem(e); }
      draw();
    } }, T.reteach ? "Refresh reteach summary" : "Get AI reteach summary");
    const reteach = h("div", { class: "card" }, h("h3", {}, "AI reteach summary"), h("p", { class: "small muted" }, "Sends class totals and a few anonymous answers (no names) to the AI."), rBtn, reteachBox);

    const btn = (label, fn) => h("button", { class: "btn ghost", onclick: fn }, label);
    const ready2 = T.students.filter((s) => { const b = best(s); return b && reviewed(s, b) && cerFor(s, b) != null; });
    const stuck = T.students.filter((s) => waiting(s).length);
    const unpub = ready2.filter((s) => { const b = best(s), p = g(s, "sc.published"); return !p || p.attempt !== b.n || p.cer !== cerFor(s, b) || p.mc !== b.mcScore || (p.note || "") !== (g(s, `sc.review.a${b.n}.note`) || ""); });
    const grading = h("div", { class: "card" }, h("h3", {}, "Post-test grades"),
      h("p", { class: "small muted" }, "Students see a preliminary score until you review it and publish. Tap a name to review. The best attempt counts."),
      h("div", { class: "row" },
        h("button", { class: "btn", disabled: !unpub.length, onclick: () => Promise.all(unpub.map(publish)).catch(problem) }, `Publish reviewed scores (${unpub.length})`),
        stuck.length ? btn(`Score ${stuck.length} waiting`, () => stuck.forEach((s) => [...new Set(waiting(s))].forEach((kind) => Store.score(T.cc, s._id, kind).catch(problem)))) : null,
        btn("Allow 1 reattempt for everyone who finished", () => { if (confirm("Give a new post-test attempt to every student who has finished one?")) T.students.filter((s) => attempts(s).length).forEach(allowMore); }),
        btn("Release all names", () => { if (confirm("Let every student in this class sign in on a new computer? Their work stays.")) T.students.forEach((s) => Store.release(T.cc, s._id).catch(problem)); })));

    const grid = h("div", { class: "card", style: "overflow-x:auto" }, h("div", { class: "row" }, h("h3", { style: "margin:0" }, "Live progress"), h("button", { class: "btn ghost", style: "margin-left:auto", onclick: csv }, "Export CSV")),
      h("table", { class: "t", style: "margin-top:10px" },
        h("tr", {}, ["Name", "On phase", "Pre MC", "Pre CER", "Practice 1st try", "Sort R1", "Sort R2 avg", "Post MC", "Post CER", "CER growth", "Grade status"].map((x) => h("th", {}, x))),
        T.students.map((s) => row(s))));

    app.replaceChildren(...[barMsg ? h("div", { class: "fb no" }, barMsg + " ", btn("Dismiss", () => { barMsg = ""; draw(); })) : null, controls, stats, h("div", { style: "height:16px" }), grading, h("div", { class: "cols" }, grid, h("div", {}, reteach, insights))].filter(Boolean));
  }
  function stat(k, v) { return h("div", { class: "stat" }, h("div", { class: "k" }, k), h("div", { class: "v" }, String(v))); }

  function studentRow(s) {
    const pr = L.cer.items.map((it) => g(s, "cer.items." + it.id)).filter(Boolean);
    const r1 = L.sorter.round1.map((q) => g(s, "sort." + q.id)).filter(Boolean);
    const r2 = L.sorter.round2.map((q) => g(s, "sort." + q.id + ".ai.score")).filter((x) => typeof x === "number");
    const b = best(s), preC = g(s, "sc.pre.cerScore"), postC = b ? cerFor(s, b) : null;
    return {
      name: s.name, phase: (L.phases.find((p) => p.id === s.phase) || {}).name || "-",
      preMC: g(s, "sc.pre.mcScore"), preCER: preC,
      practice: pr.length ? Math.round((pr.filter((x) => x.firstTry).length / L.cer.items.length) * 100) + "%" : "-",
      r1: r1.length ? `${r1.filter((x) => x.firstTry).length}/${L.sorter.round1.length}` : "-",
      r2: r2.length ? fmt(avg(r2)) : "-",
      status: g(s, "sc.published") ? "Published" : b && reviewed(s, b) ? "Reviewed" : waiting(s).includes("post") ? "Scoring" : b ? "To review" : "-",
      postMC: b ? b.mcScore : undefined, postCER: postC,
      growth: preC != null && postC != null ? (postC - preC >= 0 ? "+" : "") + (postC - preC) : "-"
    };
  }
  function row(s) {
    const r = studentRow(s);
    return h("tr", {}, h("td", {}, h("button", { class: "link", onclick: () => openPanel(s._id) }, r.name || s._id)), h("td", { class: "small" }, r.phase), h("td", { class: "num" }, r.preMC ?? "-"), h("td", { class: "num" }, r.preCER ?? "-"),
      h("td", { class: "num" }, r.practice), h("td", { class: "num" }, r.r1), h("td", { class: "num" }, r.r2), h("td", { class: "num" }, r.postMC ?? "-"), h("td", { class: "num" }, r.postCER ?? "-"), h("td", { class: "num" }, r.growth), h("td", { class: "small" }, r.status));
  }

  // ---------- review panel ----------
  function publish(s) {
    const b = best(s);
    return Store.patchScore(T.cc, s._id, { published: { attempt: b.n, mc: b.mcScore, cer: cerFor(s, b), note: g(s, `sc.review.a${b.n}.note`) || "", at: Date.now() } });
  }
  const allowMore = (s) => Store.patchScore(T.cc, s._id, { allowed: attempts(s).length + 1 }).catch(problem);
  function closePanel() { panel.classList.add("hidden"); panel.replaceChildren(); }
  function openPanel(id) {
    const s = T.students.find((x) => x._id === id); if (!s) return;
    const box = h("div", {}, h("div", { class: "row" }, h("h2", {}, s.name || id), h("button", { class: "btn ghost", style: "margin-left:auto", onclick: closePanel }, "Close")));
    const list = attempts(s);
    if (!list.length) box.append(h("p", { class: "muted" }, "No post-test yet."));
    [...list].reverse().forEach((a) => {
      const rv = g(s, "sc.review.a" + a.n) || {};
      const sel = h("select", {}, h("option", { value: "" }, a.cerScore == null ? "No AI score yet" : `Keep AI score: ${a.cerScore}`), [4, 3, 2, 1].map((n) => h("option", { value: n, selected: rv.cer === n }, `${n}: ${L.rubric[n]}`)));
      const note = h("textarea", { placeholder: "Note to the student (optional)" }); note.value = rv.note || "";
      box.append(h("div", { class: "card" }, h("h3", {}, `Attempt ${a.n}`), h("p", {}, `Multiple choice: ${a.mcScore} of ${L.post.mc.length}. Missed: ${L.post.mc.filter((q) => g(a, "mc." + q.id) !== T.key.post[q.id]).map((q) => q.tag).join(", ") || "none"}`),
        ["C", "E", "R"].map((k) => h("div", { class: "cer-box " + k }, h("b", {}, k + ": "), a.cer[k])),
        h("p", { class: "small muted" }, `AI: ${a.cerScore ?? "pending"}${a.mixedUp ? ", evidence and reasoning mixed up" : ""}. ${a.feedback || ""}`),
        h("label", {}, "Your CER score"), sel, h("div", { style: "height:8px" }), note, h("div", { style: "height:8px" }),
        h("button", { class: "btn", onclick: async () => {
          if (a.cerScore == null && !sel.value) { alertBar("Pick a CER score first"); return; }
          try {
            await Store.patchScore(T.cc, id, { review: { ["a" + a.n]: { cer: sel.value ? Number(sel.value) : null, note: note.value.trim(), ok: true } } });
            const nxt = T.students.find((x) => x._id !== id && best(x) && !reviewed(x, best(x)));
            nxt ? openPanel(nxt._id) : closePanel();
          } catch (e) { problem(e); }
        } }, "Mark reviewed, next student")));
    });
    box.append(h("div", { class: "row" },
      list.length ? h("button", { class: "btn ghost", onclick: () => { allowMore(s); closePanel(); } }, "Allow 1 reattempt") : null,
      h("button", { class: "btn ghost", onclick: () => { Store.release(T.cc, id).catch(problem); closePanel(); } }, "Release name"),
      h("button", { class: "btn ghost", onclick: () => { if (confirm("Delete all work for " + (s.name || id) + "? This cannot be undone.")) { Store.remove(T.cc, id).catch(problem); closePanel(); } } }, "Delete")));
    panel.replaceChildren(box); panel.classList.remove("hidden"); panel.scrollTop = 0;
  }

  function reteachPayload(m) {
    const samples = [];
    T.students.forEach((s) => {
      L.sorter.round2.forEach((q) => { const x = g(s, "sort." + q.id); if (x && x.first && x.first.mixedUp && samples.length < 8) samples.push({ scenario: q.text, label: x.label, evidence: x.evidence, reasoning: x.reasoning }); });
      const a = g(s, "sc.a1"); if (a && a.mixedUp && samples.length < 10) samples.push({ prompt: L.post.cer.prompt, claim: a.cer.C, evidence: a.cer.E, reasoning: a.cer.R });
    });
    return { classCode: T.cc, students: m.n, preMC: m.preMC, postMC: m.postMC, preCER: m.preCER, postCER: m.postCER, mixUpRate: m.mix,
      scenarios: m.scen.filter((x) => x.n).map((x) => ({ text: x.text, answer: x.answer, firstTryAccuracy: x.acc })),
      practice: m.practice.filter((x) => x.n).map((x) => ({ item: x.title, firstTry: x.first })), mcBySkill: m.mcItems, samples };
  }

  function csv() {
    const head = ["Name", "Class", "Phase", "Pre MC", "Pre CER", "Practice first try", "Sort R1", "Sort R2 avg", "Post MC", "Post CER (AI)", "Post CER (final)", "CER growth", "Attempt counted", "Status", "Post Claim", "Post Evidence", "Post Reasoning", "Jordan final", "Casey avg"];
    const q = (v) => { v = String(v ?? ""); if (/^[=+@]|^-\D/.test(v)) v = "'" + v; return `"${v.replace(/"/g, '""')}"`; };
    const lines = [head.map(q).join(",")];
    T.students.forEach((s) => {
      const r = studentRow(s), b = best(s) || {}, runs = g(s, "lab.caseyRuns") || [];
      lines.push([r.name, T.cc, r.phase, r.preMC, r.preCER, r.practice, r.r1, r.r2, r.postMC, b.cerScore, r.postCER, r.growth, b.n, r.status, g(b, "cer.C"), g(b, "cer.E"), g(b, "cer.R"), g(s, "lab.jordanFinal"), runs.length ? Math.round(avg(runs.map((x) => x.total))) : ""].map(q).join(","));
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `invest-trade-bet_${T.cc}.csv`; a.click();
  }

  Store.authReady().then((u) => (u ? ready().catch(() => Store.signOut().then(gate)) : gate()));
})();
