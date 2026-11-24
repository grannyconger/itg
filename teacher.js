(function () {
  const L = window.LESSON, Store = window.Store, cfg = window.ITG_CONFIG || {};
  const app = document.getElementById("app");
  const T = { cc: null, state: { unlocked: [] }, students: [], recs: {}, scores: {}, key: null, offs: [], reteach: null, tab: "run", sort: "name", dir: 1, find: "", item: null, gradeBy: "ai", drafts: {}, lastDone: null };
  const NOTES = window.NOTES, $ = (id) => document.getElementById(id);
  const panel = document.getElementById("panel");

  const { h, icon, remaining, clock, garden } = window.UI;
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
  function alertBar(m) { $("bar").replaceChildren(...(m ? [h("span", {}, m), h("button", { class: "btn ghost", onclick: () => alertBar("") }, "Dismiss")] : [])); }
  // Shows the change only after the server confirms it.
  const stateSet = (x) => { const cc = T.cc; return Store.setState(cc, x).then((d) => { alertBar(""); if (d && cc === T.cc) { T.state = d; draw(); } }, problem); };
  const minute = 60000, phaseAt = (id) => L.phases.findIndex((p) => p.id === id);
  const now = () => window.UI.current(L, T.state);

  // ---------- PIN ----------
  function gate() {
    $("tabs").replaceChildren(); $("cls").replaceChildren(); $("bell").replaceChildren(); $("band").replaceChildren();
    const inp = h("input", { type: "password", id: "pin", autocomplete: "off" }), err = h("div", { class: "err", role: "alert" });
    const go = async () => {
      err.textContent = "Checking...";
      try { await Store.signInTeacher(inp.value.trim()); await ready(); } catch (e) { err.textContent = e.message; }
    };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    app.replaceChildren(h("div", { class: "card gate" }, h("h2", {}, "Teacher sign in"), h("label", { for: "pin" }, "PIN"), inp, err, h("button", { class: "btn", onclick: go }, "Open dashboard")));
    inp.focus();
  }
  async function ready() { T.key = await Store.call("/itg/key", {}); pickClass(); }

  // Redraw at most once a second. Never while a text box is in use or the mouse is down.
  let timer = null, down = false;
  document.addEventListener("pointerdown", () => (down = true), true);
  ["pointerup", "pointercancel"].forEach((e) => document.addEventListener(e, () => setTimeout(() => (down = false), 60), true));
  window.addEventListener("blur", () => (down = false));
  const typing = () => { const a = document.activeElement; return a && /SELECT|TEXTAREA|INPUT/.test(a.tagName); };
  function schedule() {
    if (timer) return;
    timer = setTimeout(() => { timer = null; if (down || typing()) return schedule(); draw(); }, 700);
  }
  function merge() {
    T.students = Object.keys(T.recs).map((k) => Object.assign({ _id: k }, T.recs[k], { sc: T.scores[k] || {} })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    schedule(); liveHook();
  }
  function pickClass(cc) {
    T.cc = cc || T.cc || L.classCodes[0];
    $("cls").replaceChildren(h("select", { "aria-label": "Class", onchange: (e) => { e.target.blur(); pickClass(e.target.value); } }, [...L.classCodes, "TEST"].map((c) => h("option", { value: c, selected: c === T.cc }, "Class " + c))));
    T.offs.forEach((f) => f());
    Object.assign(T, { gotStudents: false, recs: {}, scores: {}, students: [], state: { unlocked: [] }, reteach: null, item: null, drafts: {}, lastDone: null });
    closePanel(); draw();
    T.offs = [
      Store.subscribeState(T.cc, (st) => { T.state = st; merge(); }, problem),
      Store.subscribeAll(T.cc, "students", (m) => { T.recs = m; T.gotStudents = true; merge(); }, problem),
      Store.subscribeAll(T.cc, "scores", (m) => { T.scores = m; merge(); }, problem)
    ];
  }

  // ---------- pacing ----------
  const inOrder = (u) => L.phases.map((p) => p.id).filter((x) => u.includes(x));
  function setOpen(u) { return stateSet({ unlocked: inOrder(u) }); }
  // The projector goes back to the clock and the last result clears when a section starts.
  function goTo(id) {
    const p = L.phases[phaseAt(id)], t = Date.now();
    stateSet({ unlocked: inOrder([...(T.state.unlocked || []), id]), phase: id, startedAt: t, plan: p.minutes * minute, endsAt: t + p.minutes * minute, left: null, eyes: false, screen: id === "hook" ? hookScreen(!!T.state.hookReveal) : { view: "now", rows: [] } });
  }
  function addTime(ms) {
    if (typeof T.state.left === "number") stateSet({ left: T.state.left + ms, plan: T.state.plan + ms });
    else if (T.state.endsAt) { const t = T.state.endsAt < Date.now() && ms > 0 ? Date.now() : T.state.endsAt; stateSet({ endsAt: t + ms, plan: Math.max(minute, (T.state.plan || 0) + ms) }); }
  }
  function pause() {
    const r = remaining(T.state);
    if (typeof T.state.left === "number") stateSet({ left: null, endsAt: Date.now() + T.state.left });
    else stateSet({ left: r });
  }
  // How far one student is in one section: [done, total]
  function progress(s, id) {
    const fin = g(s, id + ".done"), n = (arr) => arr.filter(Boolean).length;
    if (id === "pre" || id === "post") {
      const all = attempts(s).length, slot = id === "pre" ? "pre" : "a" + Math.min(g(s, "sc.allowed") || 1, all + 1);
      if (g(s, "submit." + slot) || g(s, "sc." + slot)) return [8, 8];
      const d = g(s, "drafts." + slot) || {};
      return [Math.min(7, Object.keys(d.mc || {}).length + n(["C", "E", "R"].map((k) => g(d, "cer." + k)))), 8];
    }
    if (id === "hook") return [fin ? 1 : 0, 1];
    if (id === "cer") return [n(L.cer.items.map((x) => g(s, "cer.items." + x.id + ".correct") || (x.type === "short" && g(s, "cer.items." + x.id)))), L.cer.items.length];
    if (id === "sort") { const a = [...L.sorter.round1, ...L.sorter.round2]; return [n(a.map((q) => g(s, "sort." + q.id + ".label"))), a.length]; }
    return [fin ? 1 : 0, 1];
  }
  const tracked = (id) => L.saved.includes(id) || id === "hook";
  const finished = (s, id) => { const [d, t] = progress(s, id); return d >= t; };
  // Who to walk over to, most urgent first.
  function checkIns() {
    const id = now(), out = [];
    if (!id || !tracked(id)) return out;
    const started = T.state.startedAt || 0, since = Date.now() - started;
    T.students.forEach((s) => {
      const [d, t] = progress(s, id);
      if (d >= t) return;
      const idle = Math.floor((Date.now() - Math.max(s.updatedAt || 0, started)) / minute), none = d === 0;
      if (none && since > 3 * minute) out.push({ s, why: "Nothing saved here yet", rank: 3 });
      else if (idle >= 3 && idle < 240) out.push({ s, why: `No saves for ${idle} min`, rank: 2 + idle / 100 });
      else if (since > T.state.plan * .6 && d / t < .34) out.push({ s, why: `${d} of ${t} done`, rank: 1 });
    });
    return out.sort((a, b) => b.rank - a.rank);
  }

  // ---------- question of the day: live totals, then the reveal ----------
  function hookScreen(reveal) {
    const a = T.students.map((s) => g(s, "hook.choice")).filter((x) => x !== undefined);
    return { view: "results", kind: "bars", live: true, title: L.hook.q, sub: reveal ? L.hook.reveal : `${a.length} of ${T.students.length} guesses in`,
      rows: L.hook.choices.map((c, i) => { const n = a.filter((x) => x === i).length; return Object.assign({ label: c, value: String(n), frac: a.length ? n / a.length : 0 }, reveal && i === L.hook.answer ? { right: true } : {}); }) };
  }
  let liveTimer = null, liveBusy = false;
  function liveHook() {
    if (liveTimer || T.state.phase !== "hook" || !(T.state.screen || {}).live) return;
    liveTimer = setTimeout(() => {
      liveTimer = null;
      const sc = T.state.screen || {};
      if (T.state.phase !== "hook" || !sc.live || !T.gotStudents) return;
      if (liveBusy) return liveHook();
      const next = hookScreen(!!T.state.hookReveal), sig = (x) => JSON.stringify([x.sub, (x.rows || []).map((r) => [r.label, r.value, !!r.right])]);
      if (sig(next) === sig(sc)) return;
      liveBusy = true;
      stateSet({ screen: next }).then(() => (liveBusy = false));
    }, 2000);
  }
  // ---------- projector results. Totals only, never names ----------
  function results(id) {
    const S = T.students;
    const bars = (title, rows, sub) => ({ view: "results", kind: "bars", title, sub: sub || "", rows });
    if (id === "hook") return hookScreen(!!T.state.hookReveal);
    if (id === "cer") {
      const rows = metrics().practice.filter((x) => x.n).map((x) => ({ label: x.title, value: pct(x.first), frac: x.first }));
      return rows.length ? bars("Right on the first try", rows) : null;
    }
    if (id === "sort") {
      // the scenario that split the room the most, without the answer
      let top = null;
      [...L.sorter.round1, ...L.sorter.round2].forEach((q) => {
        const a = S.map((s) => g(s, "sort." + q.id + ".first.label") || g(s, "sort." + q.id + ".label")).filter(Boolean);
        if (a.length < 3) return;
        const c = ["investing", "trading", "gambling"].map((l) => a.filter((x) => x === l).length), split = 1 - Math.max(...c) / a.length;
        if (!top || split > top.split) top = { q, c, n: a.length, split };
      });
      return top ? bars(top.q.text, ["Investing", "Trading", "Gambling"].map((l, i) => ({ label: l, value: String(top.c[i]), frac: top.c[i] / top.n })), "Where would you put it, and what can you point to?") : null;
    }
    return null;
  }

  // ---------- draw ----------
  const queue = () => {
    const list = T.students.flatMap((s) => attempts(s).filter((a) => !reviewed(s, a)).map((a) => ({ id: s._id + ":" + a.n, s, a })));
    const v = (x) => (x.a.cerScore == null ? 9 : x.a.cerScore + (x.a.mixedUp ? -.5 : 0));
    return T.gradeBy === "ai" ? list.sort((x, y) => v(x) - v(y)) : T.gradeBy === "time" ? list.sort((x, y) => (x.a.at || 0) - (y.a.at || 0)) : list;
  };
  const unpublished = () => T.students.filter((s) => { const b = best(s); if (!b || !reviewed(s, b) || cerFor(s, b) == null) return false; const p = g(s, "sc.published"); return !p || p.attempt !== b.n || p.cer !== cerFor(s, b) || p.mc !== b.mcScore || (p.note || "") !== (g(s, `sc.review.a${b.n}.note`) || ""); });
  const btn = (label, fn, cls) => h("button", { class: "btn " + (cls === undefined ? "ghost" : cls), onclick: fn }, label);

  function draw() {
    if (!T.cc) return;
    const keepId = document.activeElement && document.activeElement.id;
    const q = queue();
    $("tabs").replaceChildren(...[["run", "Run class"], ["students", "Students"], ["grade", "Grading"], ["insights", "Insights"]].map(([id, name]) =>
      h("button", { id: "tab-" + id, class: T.tab === id ? "on" : "", "aria-current": T.tab === id ? "page" : false, onclick: () => { T.tab = id; draw(); window.scrollTo(0, 0); } }, name, id === "grade" && q.length ? h("span", { class: "badge" }, q.length) : null)));
    drawBell();
    $("band").replaceChildren(...(T.tab === "run" ? [band()] : []));
    if (T.tab === "grade") drawGrade(q);
    else app.replaceChildren(T.tab === "run" ? runView() : T.tab === "students" ? studentsView() : insightsView());
    tick();
    if (keepId && $(keepId)) $(keepId).focus({ preventScroll: true });
  }

  // ---------- bell: will we finish on time? ----------
  const bellKey = () => "itg-bell:" + T.cc;
  function drawBell() {
    if ($("bell").contains(document.activeElement)) return;
    let v = ""; try { v = localStorage.getItem(bellKey()) || ""; } catch (e) {}
    $("bell").replaceChildren(h("span", { id: "pace" }), h("label", { for: "bellin" }, "Bell"), h("input", { type: "time", id: "bellin", value: v, onchange: (e) => { try { localStorage.setItem(bellKey(), e.target.value); } catch (x) {} tick(); } }));
  }
  function projected() {
    const at = phaseAt(now());
    if (at < 0 || !T.state.startedAt) return null;
    return Date.now() + Math.max(0, remaining(T.state) || 0) + L.phases.slice(at + 1).reduce((t, p) => t + p.minutes * minute, 0);
  }
  function behind() {
    const end = projected(), v = $("bellin") && $("bellin").value;
    if (!end || !v) return null;
    const [hh, mm] = v.split(":").map(Number), b = new Date(); b.setHours(hh, mm, 0, 0);
    const over = Math.round((end - b) / minute);
    return Math.abs(over) > 180 ? null : over;   // a bell time from another part of the day
  }
  function band() {
    const open = T.state.unlocked || [], id = now();
    return h("div", { class: "in" }, h("div", { id: "bandart" }), h("div", { class: "cells" }, L.phases.map((p) => {
      const o = open.includes(p.id);
      return h("div", { class: "cell" + (p.id === id ? " on" : "") }, h("b", {}, p.name), h("button", { id: "lk-" + p.id, class: o ? "open" : "", "aria-pressed": String(o), title: o ? "Close this section for students" : "Open this section without moving the class clock", onclick: () => toggle(p) }, icon(o ? "open" : "lock"), ` ${p.minutes} min, ${o ? "open" : "closed"}`));
    })));
  }
  function toggle(p) {
    const open = T.state.unlocked || [], o = open.includes(p.id);
    if (o && T.students.length && !confirm(`Close ${p.name}? Any student in it moves out.`)) return;
    const u = o ? open.filter((x) => x !== p.id) : [...open, p.id];
    // keep the class pointer where it is, so opening one for a single student moves nobody
    stateSet(Object.assign({ unlocked: inOrder(u) }, o && T.state.phase === p.id ? { phase: null, startedAt: null, endsAt: null, left: null } : !T.state.phase && now() ? { phase: now() } : {}));
  }
  function tick() {
    if (!T.cc) return;
    const r = remaining(T.state), at = phaseAt(now()), bc = $("bigclock"), art = $("bandart"), pace = $("pace");
    if (bc) { bc.textContent = r == null ? "Clock not started" : clock(r); bc.className = "bigclock" + (r == null ? " idle" : r <= 0 ? " over" : ""); }
    if (art) art.replaceChildren(garden(L.phases.length, at, r == null ? 0 : 1 - r / (T.state.plan || minute), { W: 1376, H: 72 }));
    if (pace) {
      const end = projected(), b = behind();
      pace.className = b > 0 ? "late" : "";
      pace.textContent = !end ? "" : "Ends " + new Date(end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + (b == null ? "" : b > 0 ? `, ${b} min over` : b < 0 ? `, ${-b} min to spare` : ", on time");
      const tr = $("trim"); if (tr) tr.classList.toggle("hidden", !(b > 0));
    }
  }
  setInterval(tick, 1000);
  setInterval(() => { if (T.tab === "run") schedule(); }, 30000);

  // ---------- RUN ----------
  function runView() {
    const id = now(), at = phaseAt(id), p = L.phases[at], nx = L.phases[at + 1], N = NOTES[id] || {}, started = !!T.state.startedAt, n = T.students.length;
    const done = p ? T.students.filter((s) => finished(s, id)).length : 0, list = checkIns(), sc = T.state.screen || {}, res = results(id), view = sc.view || (started ? "now" : "join");
    const setView = (v) => stateSet({ screen: Object.assign({ view: v, kind: "", title: "", sub: "", rows: [] }) });
    const msg = h("input", { type: "text", id: "msg", maxlength: 140, placeholder: "Short note to the class", "aria-label": "Note to the class", value: T.state.message || "" });
    const send = () => { const v = msg.value.trim(); msg.blur(); stateSet({ message: v }); };
    msg.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });

    const left = h("section", { class: "now" }, h("h1", {}, p ? p.name : "No section is open"), h("div", { id: "bigclock", class: "bigclock", role: "timer" }),
      p && !tracked(id) ? h("div", { class: "muted" }, "Work in this section is not saved, so there is no count.") : p ? [h("div", { class: "muted" }, n ? `${done} of ${n} finished` : "No students signed in yet"), h("div", { class: "meter" }, h("i", { style: `width:${n ? (done / n) * 100 : 0}%` }))] : null,
      !p ? h("button", { id: "mainbtn", class: "btn main", onclick: () => goTo(L.phases[0].id) }, "Start lesson") :
      !started ? h("button", { id: "mainbtn", class: "btn main", onclick: () => goTo(id) }, "Start " + p.name) :
      nx ? h("button", { id: "mainbtn", class: "btn main", onclick: () => goTo(nx.id) }, "Open next: " + nx.name, icon("next")) : h("p", { class: "muted" }, "Last section. Grade from the Grading tab when you are ready."),
      started ? h("div", { class: "seg" }, btn([icon(typeof T.state.left === "number" ? "play" : "pause"), typeof T.state.left === "number" ? "Resume" : "Pause"], pause), btn("+1 min", () => addTime(minute)), btn("+5 min", () => addTime(5 * minute)), btn("-1 min", () => addTime(-minute)), btn("Restart clock", () => goTo(id))) : null,
      h("div", { class: "seg", style: "margin-top:6px" }, btn(T.state.eyes ? "Return to work" : "Eyes up", () => stateSet({ eyes: !T.state.eyes }), T.state.eyes ? "on" : "ghost")),
      h("details", { style: "margin-top:22px" }, h("summary", {}, "More lesson controls"), h("div", { class: "seg" },
        at > 0 ? btn("Back to " + L.phases[at - 1].name, () => goTo(L.phases[at - 1].id)) : null,
        btn("Open every section", () => { if (confirm("Open every section for this class, post-test too?")) stateSet({ unlocked: L.phases.map((x) => x.id), phase: id || "pre" }); }),
        btn("Reset class to the pre-test", () => { if (confirm("Close every section except the pre-test? Student work stays.")) stateSet({ unlocked: ["pre"], phase: null, startedAt: null, endsAt: null, left: null, eyes: false, hookReveal: false, message: "", screen: { view: "join", rows: [] } }); }))));
    const ul = (a) => h("ul", {}, a.map((x) => h("li", {}, x)));
    const mid = h("section", { class: "script" }, !p ? h("p", { class: "muted" }, "Press Start lesson to open the pre-test and start the clock.") : [h("h2", {}, "Say"), h("p", {}, N.say), h("h2", {}, "Do"), ul(N.run || []), (N.ask || []).length ? [h("h2", {}, "Ask"), ul(N.ask)] : null, h("h2", {}, "Watch for"), h("p", { style: "font-size:18px" }, N.watch), h("p", { class: "trim hidden", id: "trim" }, "Running over. " + N.trim)]);
    const url = "screen.html?cc=" + T.cc;
    const said = T.students.filter((s) => g(s, "hook.choice") !== undefined), shown = !!T.state.hookReveal;
    const guesses = id === "hook" ? [h("h2", {}, `Guesses: ${said.length} of ${n}`),
      h("div", { class: "list" }, L.hook.choices.map((c, i) => { const w = said.filter((s) => s.hook.choice === i); return h("div", { style: "padding:6px 0" }, h("b", {}, `${c}${i === L.hook.answer ? " (answer)" : ""}: ${w.length}`), h("div", { class: "muted" }, w.map((s) => s.name || s._id).join(", "))); })),
      h("div", { class: "seg" }, h("button", { id: "reveal", class: "btn" + (shown ? " ghost" : ""), onclick: () => stateSet({ hookReveal: !shown, screen: hookScreen(!shown) }) }, shown ? "Hide the answer" : "Reveal the answer"))] : null;
    const right = h("section", {}, guesses, h("h2", {}, "Needs a check-in"),
      list.length ? h("div", { class: "list" }, list.slice(0, 7).map((x) => h("button", { onclick: () => openPanel(x.s._id) }, h("b", {}, x.s.name || x.s._id), h("span", {}, x.why)))) : h("p", { class: "muted" }, id && !tracked(id) ? "Not tracked in this section." : n ? "Everyone is on track." : "Students show up here if they stall or fall behind."),
      list.length > 7 ? h("p", { class: "muted" }, `and ${list.length - 7} more`) : null,
      h("h2", {}, "On the projector"),
      h("div", { class: "seg" }, [["join", "Sign in"], ["now", "Clock"]].map(([v, t]) => btn(t, () => setView(v), view === v ? "" : "ghost")), h("button", { class: "btn " + (view === "results" ? "" : "ghost"), disabled: !res, title: res ? "" : "No class results for this section yet", onclick: () => stateSet({ screen: res }) }, view === "results" ? "Refresh results" : "Class results")),
      h("p", { style: "margin:10px 0 0" }, h("a", { href: url, target: "_blank", rel: "noopener" }, "Open projector page"), h("span", { class: "muted" }, " and drag it to the big screen. Double click it for full screen.")),
      h("h2", {}, "Note to the class"), h("p", { class: "muted", style: "margin:0" }, "Shows on the projector and every student page."), h("div", { class: "msg" }, msg, btn(T.state.message ? "Update" : "Send", send)), T.state.message ? h("button", { class: "link", style: "padding-left:0", onclick: () => stateSet({ message: "" }) }, "Clear note") : null);
    return h("div", { class: "run" }, left, mid, right);
  }

  // ---------- STUDENTS ----------
  const COLS = [["name", "Name"], ["phase", "Last saved"], ["prog", "Progress"], ["preMC", "Pre MC"], ["preCER", "Pre CER"], ["practice", "Practice"], ["r1", "Sort 1"], ["r2", "Sort 2"], ["postMC", "Post MC"], ["postCER", "Post CER"], ["growth", "Growth"], ["status", "Grade"]];
  function studentsView() {
    const val = (x, k) => { const v = k === "prog" ? x.frac : k === "phase" ? phaseAt(x.s.phase) : x.r[k]; return v == null || v === "-" ? -99 : typeof v === "string" && /^[+-]?\d/.test(v) ? parseFloat(v) : v; };
    const all = T.students.map((s) => { const [d, t] = progress(s, s.phase); return { s, r: studentRow(s), prog: s.phase ? `${d}/${t}` : "-", frac: s.phase ? d / t : null }; });
    const body = h("tbody", {});
    const fill = () => {
      const rows = all.filter((x) => String(x.r.name).toLowerCase().includes(T.find.toLowerCase())).sort((a, b) => { const x = val(a, T.sort), y = val(b, T.sort); return T.dir * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))); });
      body.replaceChildren(...rows.map((x) => h("tr", {}, COLS.map(([k], i) => i === 0 ? h("td", {}, h("button", { class: "link", style: "padding:4px 0", onclick: () => openPanel(x.s._id) }, x.r.name || x.s._id)) : h("td", { class: i > 1 && k !== "status" ? "num" : "" }, (k === "prog" ? x.prog : x.r[k]) ?? "-")))));
    };
    fill();
    const find = h("input", { type: "search", placeholder: "Find a student", "aria-label": "Find a student", style: "max-width:240px", value: T.find });
    find.addEventListener("input", () => { T.find = find.value; fill(); });
    const open = T.students.filter((s) => attempts(s).length);
    return h("div", {}, h("div", { class: "row" }, h("h2", { style: "margin:0" }, `${T.students.length} students`), find, h("span", { class: "push" }), btn("Export CSV", csv),
      btn("Release all names", () => { if (confirm("Let every student in this class sign in on a new computer? Their work stays.")) T.students.forEach((s) => Store.release(T.cc, s._id).catch(problem)); }),
      h("button", { class: "btn ghost", disabled: !open.length, onclick: () => { if (confirm("Give a new post-test attempt to every student who has finished one? The post-test opens if it is closed.")) allowMore(open); } }, "Reattempt for everyone")),
      T.students.length ? h("div", { class: "students scroll" }, h("table", { class: "t" }, h("thead", {}, h("tr", {}, COLS.map(([k, n], i) => h("th", { class: i > 1 && k !== "status" ? "num" : "", "aria-sort": T.sort === k ? (T.dir > 0 ? "ascending" : "descending") : false }, h("button", { id: "s-" + k, onclick: () => { T.dir = T.sort === k ? -T.dir : 1; T.sort = k; draw(); } }, n))))), body)) : h("p", { class: "muted" }, "No one has signed in yet. Show Sign in on the projector to give students the link."));
  }

  // ---------- GRADING ----------
  // The open student stays put while others submit. Only the list and buttons refresh.
  function drawGrade(q) {
    let item = q.find((x) => x.id === T.item);
    if (!item && T.item && T.drafts[T.item] && T.drafts[T.item].hold) item = findItem(T.item);
    if (!item) { item = q[0]; T.item = item ? item.id : null; }
    const unpub = unpublished(), stuck = T.students.filter((s) => waiting(s).length);
    const top = h("div", { class: "row", style: "margin-bottom:22px" }, h("h2", { style: "margin:0" }, q.length ? `${q.length} to review` : "All caught up"),
      h("label", { class: "row", style: "gap:8px" }, "Order", h("select", { style: "width:auto", "aria-label": "Review order", onchange: (e) => { T.gradeBy = e.target.value; T.item = null; e.target.blur(); draw(); } }, [["ai", "Needs the most help first"], ["time", "First submitted"], ["name", "By name"]].map(([v, t]) => h("option", { value: v, selected: T.gradeBy === v }, t)))),
      h("span", { class: "push" }), T.lastDone ? btn("Undo last review", undo) : null,
      stuck.length ? btn(`Score ${stuck.length} waiting`, () => stuck.forEach((s) => [...new Set(waiting(s))].forEach((kind) => Store.score(T.cc, s._id, kind).catch(problem)))) : null,
      h("button", { class: "btn", disabled: !unpub.length, onclick: () => { if (confirm(`Show final scores to ${unpub.length} student${unpub.length === 1 ? "" : "s"}?`)) Promise.all(unpub.map(publish)).catch(problem); } }, `Publish reviewed scores (${unpub.length})`));
    const list = h("div", { class: "list" }, q.map((x) => h("button", { id: "q-" + x.id, class: x.id === T.item ? "on" : "", onclick: () => { T.item = x.id; draw(); } }, h("span", { style: "color:inherit;text-align:left" }, x.s.name || x.s._id, x.a.n > 1 ? `, try ${x.a.n}` : ""), h("span", {}, x.a.cerScore == null ? "Scoring" : `${x.a.mixedUp ? "Mixed up, " : ""}AI ${x.a.cerScore}`))));
    app.replaceChildren(top, item ? h("div", { class: "grade" }, list, ...gradePane(item)) : h("p", { class: "muted" }, T.students.length ? "New post-tests show up here as students submit. Published scores stay editable from the Students tab." : "No students have signed in yet."));
  }
  const findItem = (id) => { const [k, n] = id.split(":"), s = T.students.find((x) => x._id === k), a = s && attempts(s).find((x) => x.n === Number(n)); return a ? { id, s, a } : null; };
  function draftFor(x) {
    const rv = g(x.s, "sc.review.a" + x.a.n) || {};
    return (T.drafts[x.id] = T.drafts[x.id] || { cer: rv.cer || null, note: rv.note || "" });
  }
  function gradePane(x) {
    const { s, a } = x, d = draftFor(x), pick = () => d.cer || a.cerScore;
    const missed = L.post.mc.filter((m) => g(a, "mc." + m.id) !== T.key.post[m.id]).map((m) => m.tag), pre = g(s, "sc.pre");
    const work = h("section", { class: "work" }, h("h2", {}, s.name || s._id, a.n > 1 ? `, attempt ${a.n}` : ""),
      h("p", { class: "muted", style: "font-size:18px;margin-bottom:12px" }, L.post.cer.prompt),
      ["C", "E", "R"].map((k) => h("div", { class: "cer-box " + k }, h("span", { class: "tag t-" + k }, { C: "Claim", E: "Evidence", R: "Reasoning" }[k]), h("p", {}, g(a, "cer." + k) || "Left blank"))),
      h("p", { style: "font-size:18px;margin-top:16px" }, `Multiple choice: ${a.mcScore} of ${L.post.mc.length}. Missed: ${missed.join(", ") || "none"}.`),
      h("p", { style: "font-size:18px;margin-top:8px" }, h("b", {}, "AI read: "), a.cerScore == null ? "still scoring. You can score it yourself now." : `${a.cerScore} of 4${a.mixedUp ? ", evidence and reasoning mixed up" : ""}. ${a.teacherNote || ""}`),
      a.feedback ? h("p", { class: "muted", style: "font-size:18px" }, "Student saw: " + a.feedback) : null,
      pre && pre.cer ? h("details", { style: "margin-top:12px" }, h("summary", {}, `Pre-test CER, AI ${pre.cerScore ?? "pending"}`), ["C", "E", "R"].map((k) => h("div", { class: "cer-box " + k }, h("span", { class: "tag t-" + k }, k), " ", pre.cer[k]))) : null);
    const note = h("textarea", { id: "gnote", "aria-label": "Note to the student", placeholder: "Note to the student (optional)" }); note.value = d.note;
    note.addEventListener("input", () => (d.note = note.value));
    const bs = [4, 3, 2, 1].map((n) => h("button", { id: "sc-" + n, "aria-pressed": String(pick() === n), class: pick() === n ? "on" : "", onclick: () => setScore(x, n) }, h("b", {}, n), h("span", {}, a.cerScore === n ? h("em", {}, "AI score") : null, L.rubric[n])));
    const side = h("div", { class: "side" }, h("div", { class: "scores", role: "group", "aria-label": "CER score" }, bs),
      h("div", { class: "openers", style: "margin:0" }, window.QUICK_NOTES.map((t) => h("button", { onclick: () => { d.note = note.value = (note.value.trim() ? note.value.trim() + " " : "") + t; } }, t))), note,
      h("button", { id: "ok", class: "btn", onclick: () => approve(x) }, "Mark reviewed, next student", icon("next")),
      h("p", { class: "muted small", style: "margin:0" }, h("kbd", {}, "1"), " to ", h("kbd", {}, "4"), " score, ", h("kbd", {}, "Enter"), " review and next, ", h("kbd", {}, "N"), " note, ", h("kbd", {}, "J"), " ", h("kbd", {}, "K"), " move"));
    return [work, side];
  }
  function setScore(x, n) { draftFor(x).cer = n; draw(); }
  let saving = false;
  async function approve(x) {
    const d = draftFor(x), cer = d.cer || x.a.cerScore;
    if (!cer) { alertBar("Pick a CER score first"); return; }
    if (saving) return;
    saving = true;
    const q = queue(), i = q.findIndex((y) => y.id === x.id), nxt = q[i + 1] || q.find((y) => y.id !== x.id);
    try {
      await Store.patchScore(T.cc, x.s._id, { review: { ["a" + x.a.n]: { cer, note: d.note.trim(), ok: true } } });
      alertBar(""); T.lastDone = x.id; delete T.drafts[x.id];
      T.item = nxt ? nxt.id : null;
      const sc = T.scores[x.s._id]; if (sc) { sc.review = Object.assign({}, sc.review, { ["a" + x.a.n]: { cer, note: d.note.trim(), ok: true } }); }
      if (document.activeElement) document.activeElement.blur();
      draw(); window.scrollTo(0, 0);
    } catch (e) { problem(e); }
    saving = false;
  }
  async function undo() {
    const id = T.lastDone, x = id && findItem(id);
    if (!x) return;
    try { await Store.patchScore(T.cc, x.s._id, { review: { ["a" + x.a.n]: { ok: false } } }); T.lastDone = null; T.item = id; schedule(); } catch (e) { problem(e); }
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (document.activeElement && document.activeElement.id === "gnote") document.activeElement.blur(); else closePanel(); return; }
    if (T.tab !== "grade" || !panel.classList.contains("hidden") || e.metaKey || e.ctrlKey || e.altKey || e.repeat || typing()) return;
    const x = T.item && findItem(T.item); if (!x) return;
    const a = document.activeElement;
    if (/^[1-4]$/.test(e.key)) setScore(x, Number(e.key));
    else if (e.key === "Enter" && !(a && /BUTTON|A|SUMMARY/.test(a.tagName) && !/^(sc-|q-|tab-grade$)/.test(a.id))) { e.preventDefault(); approve(x); }
    else if (/^n$/i.test(e.key)) { e.preventDefault(); $("gnote").focus(); }
    else if (/^[jk]$/i.test(e.key)) { const q = queue(), i = q.findIndex((y) => y.id === T.item), n = q[i + (/j/i.test(e.key) ? 1 : -1)]; if (n) { T.item = n.id; draw(); } }
  });

  // ---------- INSIGHTS ----------
  function insightsView() {
    const m = metrics();
    const bars = (rows) => h("div", { class: "bars" }, rows.map((r) => h("div", { class: "r" + (r.v < .6 ? " low" : "") }, h("span", {}, r.label), h("b", {}, pct(r.v)), h("div", { class: "meter" }, h("i", { style: `width:${Math.round(r.v * 100)}%` })))));
    const none = (t) => h("p", { class: "muted" }, t);
    const box = T.reteach ? h("ol", {}, (T.reteach.summary || []).map((x) => h("li", { style: "margin:8px 0" }, x))) : null;
    const rBtn = h("button", { class: "btn", disabled: !m.n, onclick: async () => {
      rBtn.disabled = true; rBtn.textContent = "Thinking...";
      const cc = T.cc;
      try { const r = await Store.call("/itg/reteach", { payload: reteachPayload(metrics()) }); if (cc === T.cc) T.reteach = r; } catch (e) { problem(e); }
      draw();
    } }, T.reteach ? "Refresh reteach plan" : "Get AI reteach plan");
    const scen = m.scen.filter((x) => x.n).sort((a, b) => a.acc - b.acc), prac = m.practice.filter((x) => x.n);
    return h("div", { class: "two" }, h("div", {},
      h("section", {}, h("h2", {}, "Growth"), h("table", { class: "t" }, h("tr", {}, h("th", {}, ""), h("th", { class: "num" }, "Pre"), h("th", { class: "num" }, "Post")), h("tr", {}, h("td", {}, "Multiple choice, of 5"), h("td", { class: "num" }, fmt(m.preMC)), h("td", { class: "num" }, fmt(m.postMC))), h("tr", {}, h("td", {}, "CER, of 4"), h("td", { class: "num" }, fmt(m.preCER)), h("td", { class: "num" }, fmt(m.postCER))), m.mcItems.map((x) => h("tr", {}, h("td", {}, "Question on " + x.tag), h("td", { class: "num" }, pct(x.pre)), h("td", { class: "num" }, pct(x.post))))), h("p", {}, m.mix == null ? "" : `${pct(m.mix)} of answers mix up evidence and reasoning.`)),
      h("section", {}, h("h2", {}, "Reteach plan"), h("p", { class: "muted" }, "Sends class totals and a few anonymous answers to the AI. No names."), box, rBtn)),
      h("div", {}, h("section", {}, h("h2", {}, "Scenario sorter, right on first try"), scen.length ? bars(scen.map((x) => ({ label: x.text, v: x.acc }))) : none("No sorter answers yet.")),
        h("section", {}, h("h2", {}, "CER practice, right on first try"), prac.length ? bars(prac.map((x) => ({ label: x.title, v: x.first }))) : none("No practice answers yet."))));
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
  function publish(s) {
    const b = best(s);
    return Store.patchScore(T.cc, s._id, { published: { attempt: b.n, mc: b.mcScore, cer: cerFor(s, b), note: g(s, `sc.review.a${b.n}.note`) || "", at: Date.now() } });
  }
  function allowMore(list) {
    list.forEach((s) => Store.patchScore(T.cc, s._id, { allowed: attempts(s).length + 1 }).catch(problem));
    if (!(T.state.unlocked || []).includes("post")) setOpen([...(T.state.unlocked || []), "post"]);
  }
  // ---------- one student ----------
  let panelFrom = null;
  function closePanel() { if (panel.classList.contains("hidden")) return; panel.classList.add("hidden"); panel.replaceChildren(); if (panelFrom && panelFrom.isConnected) panelFrom.focus(); }
  function openPanel(id) {
    const s = T.students.find((x) => x._id === id); if (!s) return;
    panelFrom = document.activeElement;
    const close = btn("Close", closePanel), list = attempts(s), name = s.name || id;
    const r2 = L.sorter.round2.map((q) => ({ q, x: g(s, "sort." + q.id) })).filter((y) => y.x && y.x.evidence);
    const box = h("div", {}, h("div", { class: "row" }, h("h2", {}, name), h("span", { class: "push" }), close),
      h("table", { class: "t" }, L.phases.filter((p) => tracked(p.id)).map((p) => { const [d, t] = progress(s, p.id); return h("tr", {}, h("td", {}, p.name, s.phase === p.id ? h("b", {}, ", last saved") : null), h("td", { class: "num" }, `${d} of ${t}`)); })),
      list.length ? [...list].reverse().map((a) => h("div", { style: "margin-top:22px" }, h("div", { class: "row" }, h("h3", { style: "margin:0" }, `Post-test attempt ${a.n}`), h("span", { class: "push" }), btn(reviewed(s, a) ? "Change score" : "Grade", () => { const k = id + ":" + a.n; delete T.drafts[k]; T.drafts[k] = Object.assign(draftFor({ id: k, s, a }), { hold: true }); T.item = k; T.tab = "grade"; closePanel(); draw(); })),
        h("p", {}, `Multiple choice ${a.mcScore} of ${L.post.mc.length}. CER ${cerFor(s, a) ?? "pending"}${reviewed(s, a) ? ", reviewed" : ", not reviewed"}.`))) : h("p", { class: "muted" }, "No post-test yet."),
      r2.length ? h("details", { style: "margin:14px 0" }, h("summary", {}, `Scenario writing (${r2.length})`), r2.map(({ q, x }) => h("div", { style: "margin:14px 0" }, h("p", { style: "margin:0 0 4px" }, q.text), h("span", { class: "tag t-" + x.label }, x.label), h("div", { class: "cer-box E" }, x.evidence), h("div", { class: "cer-box R" }, x.reasoning)))) : null,
      h("h3", { style: "margin-top:26px" }, "Manage"), h("div", { class: "seg" },
        list.length ? btn("Allow 1 reattempt", () => { allowMore([s]); closePanel(); }) : null,
        btn("Release name", () => { Store.release(T.cc, id).catch(problem); closePanel(); }),
        btn("Delete all work", () => { if (confirm("Delete all work for " + name + "? This cannot be undone.")) { Store.remove(T.cc, id).catch(problem); closePanel(); } }, "ghost danger")));
    panel.replaceChildren(box); panel.classList.remove("hidden"); panel.scrollTop = 0; close.focus();
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
    const head = ["Name", "Class", "Phase", "Pre MC", "Pre CER", "Practice first try", "Sort R1", "Sort R2 avg", "Post MC", "Post CER (AI)", "Post CER (final)", "CER growth", "Attempt counted", "Status", "Post Claim", "Post Evidence", "Post Reasoning"];
    const q = (v) => { v = String(v ?? ""); if (/^[=+@]|^-\D/.test(v)) v = "'" + v; return `"${v.replace(/"/g, '""')}"`; };
    const lines = [head.map(q).join(",")];
    T.students.forEach((s) => {
      const r = studentRow(s), b = best(s) || {};
      lines.push([r.name, T.cc, r.phase, r.preMC, r.preCER, r.practice, r.r1, r.r2, r.postMC, b.cerScore, r.postCER, r.growth, b.n, r.status, g(b, "cer.C"), g(b, "cer.E"), g(b, "cer.R")].map(q).join(","));
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `invest-trade-bet_${T.cc}.csv`; a.click();
  }

  Store.authReady().then((u) => (u ? ready().catch(() => Store.signOut().then(gate)) : gate()));
})();
