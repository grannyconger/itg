(function () {
  const L = window.LESSON, Store = window.Store;
  const app = document.getElementById("app"), nav = document.getElementById("nav");
  const S = { cc: null, name: null, k: null, rec: {}, score: {}, state: { unlocked: ["pre"] }, phase: null, seen: null, offs: [] };
  const banner = document.getElementById("banner");
  Store.onSaveStatus(({ pending, failed }) => {
    const el = document.getElementById("save");
    el.textContent = failed ? "Not saved, check your connection" : pending ? "Saving..." : "Saved";
    el.classList.toggle("bad", failed);
  });

  // ---------- helpers ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v;
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((c) => { if (c == null || c === false) return; el.append(c.nodeType ? c : document.createTextNode(c)); });
    return el;
  }
  const money = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString();
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const get = (path, dflt) => path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), S.rec) ?? dflt;
  function setPath(obj, path, val) { const ks = path.split("."); let o = obj; ks.slice(0, -1).forEach((k) => { o[k] = o[k] || {}; o = o[k]; }); o[ks[ks.length - 1]] = val; }
  function save(path, val) {
    setPath(S.rec, path, val);
    const patch = {}; setPath(patch, path, val);
    patch.phase = S.phase;
    Store.saveStudent(S.cc, S.k, patch).catch(() => {});
    if (S.state) renderNav();
  }
  function errNode() { return h("div", { class: "err" }); }

  // ---------- shuffle: same order every time for one student, different between students ----------
  function shuffled(n, seed) {
    let x = 2166136261;
    for (const c of seed) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); }
    const rand = () => { x = (x + 0x6d2b79f5) | 0; let y = Math.imul(x ^ (x >>> 15), 1 | x); y = (y + Math.imul(y ^ (y >>> 7), 61 | y)) ^ y; return ((y ^ (y >>> 14)) >>> 0) / 4294967296; };
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---------- drafts: on this computer right away, in the cloud every 15 seconds ----------
  const draftKey = (id) => `itg-draft:${L.id}:${S.cc}:${S.k}:${id}`;
  const dirty = {};
  let flushTimer = null;
  function getDraft(id) {
    try { const d = JSON.parse(localStorage.getItem(draftKey(id))); if (d) return d; } catch (e) {}
    return get("drafts." + id, null) || {};
  }
  function setDraft(id, val) {
    try { localStorage.setItem(draftKey(id), JSON.stringify(val)); } catch (e) {}
    dirty[id] = val; setPath(S.rec, "drafts." + id, val);
    if (!flushTimer) flushTimer = setTimeout(flushDrafts, 15000);
  }
  function flushDrafts() {
    clearTimeout(flushTimer); flushTimer = null;
    if (!S.k || !Object.keys(dirty).length) return;
    const drafts = Object.assign({}, dirty);
    Object.keys(dirty).forEach((k) => delete dirty[k]);
    Store.saveStudent(S.cc, S.k, { drafts }).catch(() => Object.keys(drafts).forEach((k) => { if (!(k in dirty)) dirty[k] = drafts[k]; }));
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) flushDrafts(); });
  window.addEventListener("pagehide", flushDrafts);

  // ---------- sign in ----------
  function signIn(message) {
    nav.classList.add("hidden"); banner.classList.add("hidden");
    S.offs.forEach((f) => f()); S.offs = []; S.k = null; S.phase = null; S.seen = null;
    document.getElementById("who").replaceChildren();
    const q = new URLSearchParams(location.search), codes = q.get("cc") === "TEST" ? ["TEST"] : L.classCodes;
    const name = h("input", { type: "text", id: "nm", placeholder: "First name and last initial", maxlength: 30, autocomplete: "off" });
    const sel = h("select", { id: "cls" }, h("option", { value: "" }, "Pick your class"), codes.map((c) => h("option", { value: c }, c)));
    const err = errNode(); if (message) err.textContent = message;
    const btn = h("button", { class: "btn", onclick: async () => {
      if (Store.key(name.value).length < 2) { err.textContent = "Enter your first name and last initial"; return; }
      if (!sel.value) { err.textContent = "Pick your class"; return; }
      btn.disabled = true; btn.textContent = "Signing in...";
      await start(name.value.trim(), sel.value, (m) => { err.textContent = m; btn.disabled = false; btn.textContent = "Start"; });
    } }, "Start");
    [name, sel].forEach((x) => { x.addEventListener("input", () => (err.textContent = "")); x.addEventListener("keydown", (e) => { if (e.key === "Enter") btn.click(); }); });
    app.replaceChildren(h("div", { class: "card", style: "max-width:460px;margin:40px auto" },
      h("h2", {}, "Sign in"),
      h("p", { class: "muted" }, "Use the same name every time so your work comes back."),
      h("label", { for: "nm" }, "Name"), name, h("div", { style: "height:10px" }),
      h("label", { for: "cls" }, "Class"), sel, err, h("div", { style: "height:14px" }), btn));
  }

  async function start(name, cc, fail) {
    const k = Store.key(name);
    let rec;
    try {
      const uid = await Store.signInStudent();
      rec = await Store.loadStudent(cc, k);
      const base = { name: (rec && rec.name) || name, joinedAt: (rec && rec.joinedAt) || Date.now() };
      if (!rec || rec.ownerUid !== uid || !rec.name) await Store.saveStudent(cc, k, base);
      rec = Object.assign({}, rec, base);
    } catch (e) {
      console.warn(e);
      return fail(e.code === "permission-denied" ? "That name is in use on another computer. If it is yours, ask your teacher to release it. If not, add more of your last name." : "Cannot reach the server. Check the Wi-Fi and try again.");
    }
    Object.assign(S, { name: rec.name, cc, k, rec, phase: null, seen: null });
    try { localStorage.setItem("itg-me", JSON.stringify({ name: S.name, cc })); } catch (e) {}
    document.getElementById("who").replaceChildren(h("span", {}, `${S.name}, ${cc} `), h("button", { class: "link", onclick: () => { flushDrafts(); try { localStorage.removeItem("itg-me"); } catch (e) {} signIn(); } }, "Sign out"));
    S.offs.push(Store.subscribeState(cc, (st) => {
      S.state = st || { unlocked: ["pre"] };
      const open = S.state.unlocked || [], fresh = S.seen ? open.filter((x) => !S.seen.includes(x)) : [];
      S.seen = open.slice();
      if (!S.phase || !isOpen(S.phase)) { S.phase = lastOpen(); hideBanner(); render(); }
      else {
        renderNav();
        const next = L.phases.filter((p) => fresh.includes(p.id) && p.id !== S.phase).pop();
        if (next) showBanner(next);
        else if (S.bannerFor && !isOpen(S.bannerFor)) hideBanner();
      }
    }, (e) => console.warn(e)));
    S.offs.push(Store.subscribeScore(cc, k, (sc) => {
      const test = S.phase === "pre" || S.phase === "post";
      const was = JSON.stringify(S.score), slot = test && slotFor(S.phase); S.score = sc;
      if (test && was !== JSON.stringify(sc) && (isSubmitted(S.phase) || slotFor(S.phase) !== slot)) renderMain();
    }));
  }
  function goPhase(id) { flushDrafts(); S.phase = id; hideBanner(); save("phase", id); render(); }
  function showBanner(p) {
    S.bannerFor = p.id;
    banner.replaceChildren(h("span", {}, "Next section is open: " + p.name), h("button", { class: "btn", onclick: () => goPhase(p.id) }, "Go there"));
    banner.classList.remove("hidden");
  }
  function hideBanner() { S.bannerFor = null; banner.classList.add("hidden"); }
  const isOpen = (id) => (S.state.unlocked || []).includes(id);
  const lastOpen = () => { const open = L.phases.filter((p) => isOpen(p.id)); return open.length ? open[open.length - 1].id : null; };

  function render() {
    renderNav();
    renderMain();
  }
  function renderNav() {
    nav.classList.remove("hidden");
    nav.replaceChildren(...L.phases.map((p, i) => h("button", {
      class: (S.phase === p.id ? "on " : "") + (get(p.id + ".done") ? "done" : ""),
      disabled: !isOpen(p.id),
      onclick: () => goPhase(p.id)
    }, `${i + 1}. ${p.name}`)));
  }
  function renderMain() {
    app.dataset.phase = S.phase || "";
    if (!S.phase) { app.replaceChildren(h("div", { class: "card locked" }, h("h2", {}, "Hang tight"), h("p", { class: "muted" }, "Your teacher will open the first section in a moment."))); return; }
    const fn = { pre: () => test("pre"), hook, table, lab, cer, sort, post: () => test("post"), done }[S.phase];
    app.replaceChildren(fn());
    window.scrollTo(0, 0);
  }

  // ---------- reusable CER writer ----------
  function cerWriter(existing, changed) {
    const box = h("div", {});
    const fields = {};
    ["C", "E", "R"].forEach((k) => {
      const names = { C: "Claim", E: "Evidence", R: "Reasoning" };
      const ta = h("textarea", { placeholder: L.cer.tests[k] });
      ta.value = (existing && existing[k]) || "";
      ta.setAttribute("aria-label", names[k]); ta.maxLength = 1400;
      ta.addEventListener("input", changed);
      fields[k] = ta;
      box.append(h("div", { class: "cer-box " + k },
        h("div", {}, h("span", { class: "tag t-" + k }, names[k]), " ", h("span", { class: "small muted" }, L.cer.tests[k])),
        h("div", { class: "openers" }, L.cer.openers[k].map((o) => h("button", { type: "button", onclick: () => { ta.value = (ta.value ? ta.value.trim() + " " : "") + o.replace(/\.\.\.$/, " "); ta.focus(); ta.dispatchEvent(new Event("input")); } }, o))),
        ta));
    });
    return { el: box, val: () => ({ C: fields.C.value.trim(), E: fields.E.value.trim(), R: fields.R.value.trim() }), fields };
  }

  // ---------- PRE / POST TEST ----------
  // Post-test attempts are a1, a2... The teacher opens attempt 2 after office hours.
  const allowed = () => Number(S.score.allowed) || 1;
  function slotFor(kind) {
    if (kind === "pre") return "pre";
    let n = 1;
    while (n < allowed() && (get("submit.a" + n) || S.score["a" + n])) n++;
    return "a" + n;
  }
  const isSubmitted = (kind) => { const s = slotFor(kind); return !!(get("submit." + s) || S.score[s]); };
  const scoring = {};
  async function requestScore(kind, tries) {
    const slot = slotFor(kind);
    if (scoring[slot] && !tries) return;
    scoring[slot] = true;
    try { await Store.score(S.cc, S.k, kind); } catch (e) {
      console.warn("score", e);
      if ((tries || 0) < 4) return setTimeout(() => requestScore(kind, (tries || 0) + 1), 6000 * ((tries || 0) + 1));
    }
    scoring[slot] = false;
  }

  function test(kind) {
    const T = L[kind], slot = slotFor(kind);
    const wrap = h("div", {});
    wrap.append(h("h2", {}, kind === "pre" ? "Pre-test" : "Post-test" + (slot === "a1" ? "" : ", attempt " + slot.slice(1))),
      h("p", { class: "muted" }, kind === "pre" ? "This is NOT graded. Answer what you think right now. It's fine to guess." : "This is graded. Use your notes sheet for numbers."));

    if (isSubmitted(kind)) {
      wrap.append(result(kind, T));
      if (!S.score[slot] || S.score[slot].cerScore == null) requestScore(kind);
      return wrap;
    }

    const draft = Object.assign({ mc: {}, cer: {} }, getDraft(slot));
    const answers = Object.assign({}, draft.mc);
    const keep = () => setDraft(slot, { mc: Object.assign({}, answers), cer: cw.val() });
    T.mc.forEach((q, i) => {
      const order = shuffled(q.choices.length, S.k + S.cc + slot + q.id);
      const btns = order.map((ci, pos) => h("button", { type: "button", class: "choice" + (answers[q.id] === ci ? " sel" : ""), "aria-pressed": String(answers[q.id] === ci), onclick: () => {
        answers[q.id] = ci;
        btns.forEach((b, bi) => { b.classList.toggle("sel", bi === pos); b.setAttribute("aria-pressed", String(bi === pos)); });
        keep();
      } }, String.fromCharCode(65 + pos) + ". " + q.choices[ci]));
      wrap.append(h("div", { class: "card" }, h("h3", {}, `${i + 1}. ${q.q}`), h("div", { class: "choices" }, btns)));
    });
    const cw = cerWriter(draft.cer, () => keep());
    const cerCard = h("div", { class: "card" }, h("h3", {}, `${T.mc.length + 1}. ${T.cer.prompt}`));
    if (T.cer.factBox) cerCard.append(h("div", { class: "fb info" }, h("b", {}, "Facts you can use"), h("ul", { style: "margin:6px 0 0" }, T.cer.factBox.map((f) => h("li", {}, f)))));
    cerCard.append(cw.el);
    wrap.append(cerCard);
    const err = errNode();
    const btn = h("button", { class: "btn", onclick: async () => {
      const missing = T.mc.filter((q) => answers[q.id] === undefined).length;
      const v = cw.val();
      if (missing) { err.textContent = `Answer all multiple-choice questions first (${missing} left)`; return; }
      if (!v.C || !v.E || !v.R) { err.textContent = "Write all three parts: Claim, Evidence, and Reasoning"; return; }
      err.textContent = ""; btn.disabled = true; btn.textContent = "Submitting...";
      const rec = { mc: answers, cer: v, at: Date.now() };
      try {
        await Promise.race([Store.saveStudent(S.cc, S.k, { submit: { [slot]: rec }, [kind]: { done: true }, phase: S.phase }), new Promise((_, r) => setTimeout(() => r(new Error("slow")), 12000))]);
      } catch (e) {
        err.textContent = "Not submitted yet. Your answers are kept on this computer. Check the Wi-Fi and tap Submit again.";
        btn.disabled = false; btn.textContent = "Submit"; return;
      }
      setPath(S.rec, "submit." + slot, rec); setPath(S.rec, kind + ".done", true);
      try { localStorage.removeItem(draftKey(slot)); } catch (e) {}
      delete dirty[slot];
      if (S.phase === kind) render();
    } }, "Submit");
    wrap.append(btn, err);
    return wrap;
  }

  function result(kind, T) {
    const card = h("div", { class: "card" }, h("h3", {}, "Submitted"));
    if (kind === "pre") { card.append(h("p", { class: "muted" }, "Your answers are in. Wait for your teacher to open the next section.")); return card; }
    const f = S.score.published;
    if (f) {
      card.append(h("h3", {}, "Final score, reviewed by your teacher"),
        h("p", { class: "big" }, `Multiple choice: ${f.mc} out of ${T.mc.length}`), h("p", { class: "big" }, `CER: ${f.cer} out of 4`));
      if (f.note) card.append(h("div", { class: "fb info" }, f.note));
    }
    for (let n = allowed(); n >= 1; n--) {
      const a = S.score["a" + n], sub = get("submit.a" + n);
      if (!a && !sub) continue;
      if (f && f.attempt === n) { if (a && a.feedback) card.append(h("div", { class: "fb info" }, h("b", {}, "Think about this: "), a.feedback)); continue; }
      const head = h("h3", {}, (n > 1 || allowed() > 1 ? `Attempt ${n}: ` : "") + "Preliminary score, under review");
      if (!a || a.cerScore == null) card.append(head, h("p", { class: "muted" }, "Scoring your work. You do not need to resubmit."));
      else card.append(head, h("p", { class: "big" }, `Multiple choice: ${a.mcScore} out of ${T.mc.length}`), h("p", { class: "big" }, `CER: ${a.cerScore} out of 4`),
        h("p", { class: "muted" }, "This is not your grade yet. Your teacher will review it first."),
        h("div", { class: "fb info" }, h("b", {}, "Think about this: "), a.feedback || ""));
    }
    return card;
  }

  // ---------- HOOK ----------
  function hook() {
    const Hk = L.hook, picked = get("hook.choice");
    const wrap = h("div", {}, h("h2", {}, "Question of the day"));
    const fb = h("div", {});
    const btns = Hk.choices.map((c, i) => h("button", { type: "button", class: "choice", onclick: () => { save("hook", { choice: i, done: true }); render(); } }, c));
    if (picked !== undefined) {
      btns.forEach((b, i) => { b.disabled = true; if (i === Hk.answer) b.classList.add("right"); else if (i === picked) b.classList.add("wrong"); });
      fb.append(h("div", { class: "fb " + (picked === Hk.answer ? "ok" : "info") }, Hk.reveal), h("p", { class: "small muted" }, "Write $109 billion on your notes sheet."));
    }
    wrap.append(h("div", { class: "card" }, h("h3", {}, Hk.q), h("div", { class: "choices" }, btns), fb));
    return wrap;
  }

  // ---------- TABLE ----------
  function table() {
    const T = L.table;
    const wrap = h("div", {}, h("h2", {}, "Three ways to use money"), h("p", { class: "muted" }, "Watch the video, then use this table to fill in your notes sheet."));
    wrap.append(h("div", { class: "card" }, h("table", { class: "t" },
      h("tr", {}, h("th", {}, ""), h("th", {}, h("span", { class: "tag t-investing" }, "Investing")), h("th", {}, h("span", { class: "tag t-trading" }, "Trading")), h("th", {}, h("span", { class: "tag t-gambling" }, "Gambling"))),
      T.rows.map((r) => h("tr", {}, h("th", {}, r.label), h("td", {}, r.investing), h("td", {}, r.trading), h("td", {}, r.gambling))))));
    const card = h("div", { class: "card" }, h("h3", {}, "Quick check"));
    T.blanks.forEach((b) => {
      const inp = h("input", { type: "text", style: "max-width:220px" }); inp.value = get("table." + b.id, "");
      const fb = h("span", { class: "small" });
      const check = () => {
        const ok = b.answers.includes(norm(inp.value));
        fb.textContent = ok ? " Correct" : " Try again"; fb.style.color = ok ? "var(--ok)" : "var(--bad)";
        save("table." + b.id, inp.value);
        if (T.blanks.every((x) => x.answers.includes(norm(get("table." + x.id))))) save("table.done", true);
      };
      inp.addEventListener("change", check);
      card.append(h("p", {}, b.text), h("div", { class: "row" }, inp, h("button", { class: "btn ghost", onclick: check }, "Check"), fb));
    });
    wrap.append(card);
    return wrap;
  }

  // ---------- LAB ----------
  function lab() {
    const J = L.lab.jordan, C = L.lab.casey;
    const wrap = h("div", {}, h("h2", {}, "Simulation lab: Jordan vs. Casey"),
      h("p", {}, "Jordan and Casey are both 28. Each has $300 a month. Jordan invests it in an S&P 500 index fund. Casey bets $10 a day on sports. What happens over 10 years?"));

    // Jordan
    const fin = h("input", { type: "number", placeholder: "Final portfolio value", style: "max-width:260px" });
    fin.value = get("lab.jordanFinal", "");
    const jOut = h("div", {});
    const jErr = errNode();
    const showJ = () => {
      const v = Number(get("lab.jordanFinal"));
      jOut.replaceChildren();
      if (v) jOut.append(h("div", { class: "grid3", style: "margin-top:10px" },
        h("div", { class: "stat" }, h("div", { class: "k" }, "Put in"), h("div", { class: "v" }, money(J.invested))),
        h("div", { class: "stat" }, h("div", { class: "k" }, "Ended with"), h("div", { class: "v" }, money(v))),
        h("div", { class: "stat" }, h("div", { class: "k" }, "Profit"), h("div", { class: "v", style: "color:var(--ok)" }, money(v - J.invested)))));
    };
    wrap.append(h("div", { class: "card" },
      h("h3", {}, h("span", { class: "tag t-investing" }, "Jordan"), " invests $300 a month"),
      h("ol", {}, J.steps.map((s) => h("li", {}, s))),
      h("button", { class: "btn ghost", onclick: () => window.open(J.url, "_blank") }, "Open the S&P 500 calculator"),
      h("div", { style: "height:12px" }),
      h("div", { class: "row" }, fin, h("button", { class: "btn", onclick: () => {
        const v = Number(fin.value);
        if (!v || v < 1000) { jErr.textContent = "Type the final value from the calculator, for example 95000"; return; }
        jErr.textContent = ""; save("lab.jordanFinal", Math.round(v)); showJ(); checkLab();
      } }, "Save")), jErr, jOut));
    showJ();

    // Casey
    const runs = get("lab.caseyRuns", []);
    const cOut = h("div", {});
    const drawCasey = () => {
      const rs = get("lab.caseyRuns", []);
      cOut.replaceChildren();
      if (!rs.length) return;
      cOut.append(h("table", { class: "t", style: "margin-top:10px" },
        h("tr", {}, h("th", {}, "Run"), h("th", {}, "Profit or loss"), h("th", {}, "% of months with a profit"), h("th", {}, "Profitable years (of 10)")),
        rs.map((r, i) => h("tr", {}, h("td", {}, i + 1), h("td", { style: "color:" + (r.total < 0 ? "var(--bad)" : "var(--ok)") }, money(r.total)), h("td", {}, r.pctMonthsUp + "%"), h("td", {}, r.yearsUp)))));
      if (rs.length >= C.runs) {
        const avg = rs.reduce((a, r) => a + r.total, 0) / rs.length;
        const losses = rs.filter((r) => r.total < 0).length;
        cOut.append(h("div", { class: "fb info" }, `Average result: ${money(avg)}. Casey lost money in ${losses} out of ${rs.length} runs. Write these on your notes sheet.`));
      }
    };
    const runBtn = h("button", { class: "btn", onclick: () => {
      const rs = get("lab.caseyRuns", []).slice();
      if (rs.length >= C.runs) return;
      const r = window.Sims.casey(C);
      rs.push({ total: r.total, pctMonthsUp: r.pctMonthsUp, yearsUp: r.yearsUp });
      save("lab.caseyRuns", rs);
      drawCasey(); runBtn.textContent = rs.length >= C.runs ? "All 5 runs done" : `Run 10 years again (${rs.length}/${C.runs})`;
      checkLab();
    } }, runs.length >= C.runs ? "All 5 runs done" : runs.length ? `Run 10 years again (${runs.length}/${C.runs})` : "Run 10 years of betting");
    wrap.append(h("div", { class: "card" },
      h("h3", {}, h("span", { class: "tag t-gambling" }, "Casey"), " bets $10 a day"),
      h("p", {}, "If Casey wins a bet, he gets $9. If he loses, he loses $10. He wins about half his bets. The missing dollar is the ", h("b", {}, "house edge"), ": the sportsbook's built-in cut."),
      h("p", { class: "small muted" }, "Top professional bettors win about 53-55% of the time. Casey needs about 53% just to break even."),
      runBtn, cOut));
    drawCasey();

    // Jordan and Casey side by side
    const vs = h("div", {});
    const drawVs = () => {
      const j = Number(get("lab.jordanFinal")), rs = get("lab.caseyRuns", []);
      vs.replaceChildren();
      if (!j || rs.length < C.runs) return;
      const c = J.invested + rs.reduce((a, r) => a + r.total, 0) / rs.length, top = Math.max(j, c, 1);
      const line = (who, cls, v, note) => h("div", { class: "vs" }, h("div", { class: "row" }, h("span", { class: "tag " + cls }, who), h("b", { class: "vsv" }, money(v))),
        h("div", { class: "vsbar" }, h("i", { class: cls, style: `width:${Math.max(2, (v / top) * 100)}%` })), h("div", { class: "small muted" }, note));
      const diff = (v) => (v >= J.invested ? "Gained " : "Lost ") + money(Math.abs(v - J.invested)) + " on " + money(J.invested);
      vs.append(h("div", { class: "card" }, h("h3", {}, "Ending balances after 10 years"),
        line("Jordan", "t-investing", j, diff(j)), line("Casey (average of 5 runs)", "t-gambling", c, diff(c)),
        h("div", { class: "fb info" }, `Both started with the same $300 a month. The gap is ${money(Math.abs(j - c))}. What was Jordan's money doing that Casey's was not?`)));
    };
    wrap.append(vs);

    // Powerball
    const pick = get("lab.pbPick", null);
    const inputs = [...Array(6)].map((_, i) => h("input", { type: "number", min: 1, max: i < 5 ? 69 : 26, class: i === 5 ? "pb" : "", placeholder: i < 5 ? "1-69" : "PB" }));
    if (pick) { pick.white.forEach((n, i) => (inputs[i].value = n)); inputs[5].value = pick.pb; }
    const pbErr = errNode(), pbOut = h("div", {});
    const readPick = () => {
      const w = inputs.slice(0, 5).map((x) => Number(x.value)), pb = Number(inputs[5].value);
      if (w.some((n) => !Number.isInteger(n) || n < 1 || n > 69)) return "White balls must be whole numbers from 1 to 69";
      if (new Set(w).size < 5) return "No repeats in the white balls";
      if (!Number.isInteger(pb) || pb < 1 || pb > 26) return "Powerball must be 1 to 26";
      return { white: w, pb };
    };
    const drawPB = () => {
      const t = get("lab.pb", null); pbOut.replaceChildren();
      if (!t) return;
      pbOut.append(h("div", { class: "grid3", style: "margin-top:10px" },
        h("div", { class: "stat" }, h("div", { class: "k" }, `Spent (${t.tickets.toLocaleString()} tickets)`), h("div", { class: "v" }, money(t.spent))),
        h("div", { class: "stat" }, h("div", { class: "k" }, `Won (${t.wins} small prizes)`), h("div", { class: "v" }, money(t.won))),
        h("div", { class: "stat" }, h("div", { class: "k" }, "Net"), h("div", { class: "v", style: "color:" + (t.won - t.spent < 0 ? "var(--bad)" : "var(--ok)") }, money(t.won - t.spent)))),
        h("p", { class: "small muted" }, `Biggest single prize: ${money(t.biggest)}. Jackpot: ${t.jackpot ? "YES (1 in 292 million!)" : "no"}.`));
    };
    const play = (budget) => {
      const p = readPick(); if (typeof p === "string") { pbErr.textContent = p; return; }
      pbErr.textContent = ""; save("lab.pbPick", p);
      const r = window.Sims.powerball(p, budget / L.lab.powerball.ticket);
      const prev = get("lab.pb", { tickets: 0, spent: 0, won: 0, wins: 0, biggest: 0, jackpot: false });
      save("lab.pb", { tickets: prev.tickets + r.tickets, spent: prev.spent + r.spent, won: prev.won + r.won, wins: prev.wins + r.wins, biggest: Math.max(prev.biggest, r.biggest), jackpot: prev.jackpot || r.jackpot });
      drawPB(); checkLab();
    };
    wrap.append(h("div", { class: "card" },
      h("h3", {}, h("span", { class: "tag t-gambling" }, "Bonus"), " Win the Powerball?"),
      h("p", {}, "Pick 5 white balls (1-69) and 1 red Powerball (1-26). Each ticket costs $2."),
      h("div", { class: "balls" }, inputs, h("button", { class: "btn ghost", onclick: () => { const d = window.Sims.draw(); d.white.forEach((n, i) => (inputs[i].value = n)); inputs[5].value = d.pb; } }, "Quick pick")),
      pbErr, h("div", { class: "row", style: "margin-top:10px" }, L.lab.powerball.budgets.map((b) => h("button", { class: "btn", onclick: () => play(b) }, `Spend ${money(b)}`))),
      h("p", { class: "small muted" }, "Odds of winning ANY prize: about 1 in 25 (most are $4). Odds of the jackpot: about 1 in 292 million."),
      pbOut));
    drawPB();
    drawVs();
    function checkLab() {
      drawVs();
      if (get("lab.jordanFinal") && get("lab.caseyRuns", []).length >= C.runs) save("lab.done", true); }
    return wrap;
  }

  // ---------- CER PRACTICE ----------
  function cer() {
    const P = L.cer;
    const wrap = h("div", {}, h("h2", {}, "CER: you already do this every day"),
      h("div", { class: "fb info" }, P.detective));
    wrap.append(h("div", { class: "card" }, ["C", "E", "R"].map((k) => h("div", { class: "cer-box " + k }, P.tests[k]))));
    const ex = h("div", { class: "card" }, h("h3", {}, "Everyday examples"));
    P.dailyLife.forEach((d) => ex.append(h("div", { style: "margin-bottom:14px" }, h("b", {}, d.topic),
      h("div", { class: "cer-box C" }, h("span", { class: "tag t-C" }, "C"), " ", d.C),
      h("div", { class: "cer-box E" }, h("span", { class: "tag t-E" }, "E"), " ", d.E),
      h("div", { class: "cer-box R" }, h("span", { class: "tag t-R" }, "R"), " ", d.R))));
    wrap.append(ex);
    wrap.append(h("div", { class: "card" }, h("h3", {}, "Sentence openers"), h("div", { class: "grid3" },
      ["C", "E", "R"].map((k) => h("div", {}, h("span", { class: "tag t-" + k }, { C: "Claim", E: "Evidence", R: "Reasoning" }[k]), h("ul", { class: "small", style: "padding-left:18px" }, P.openers[k].map((o) => h("li", {}, o))))))));
    wrap.append(h("h2", {}, "Practice: 8 quick ones"));
    P.items.forEach((it, i) => wrap.append(practiceItem(it, i)));
    return wrap;
  }

  function record(id, correct) {
    const prev = get("cer.items." + id, null);
    const rec = prev ? Object.assign({}, prev, { attempts: prev.attempts + 1, correct: prev.correct || correct }) : { attempts: 1, firstTry: correct, correct };
    save("cer.items." + id, rec);
    if (L.cer.items.every((x) => get("cer.items." + x.id + ".correct") || (x.type === "short" && get("cer.items." + x.id)))) save("cer.done", true);
  }

  function practiceItem(it, i) {
    const card = h("div", { class: "card" }, h("h3", {}, `${i + 1}. ${it.title}`), h("p", { style: "white-space:pre-line" }, it.prompt));
    const fb = h("div", {});
    const say = (ok, msg) => fb.replaceChildren(h("div", { class: "fb " + (ok ? "ok" : "no") }, msg));
    if (it.type === "match" || it.type === "label") {
      const picks = {};
      it.sentences.forEach((s, si) => {
        let ctl;
        if (it.type === "match") {
          ctl = h("select", { style: "max-width:160px" }, h("option", { value: "" }, "Choose..."), ["C", "E", "R"].map((k) => h("option", { value: k }, { C: "Claim", E: "Evidence", R: "Reasoning" }[k])));
          ctl.addEventListener("change", () => (picks[si] = ctl.value));
        } else {
          const bs = ["C", "E", "R"].map((k) => h("button", { type: "button", class: k, onclick: () => { picks[si] = k; bs.forEach((b) => b.classList.toggle("sel", b.textContent === k)); } }, k));
          ctl = h("span", { class: "lbl-btns" }, bs);
        }
        card.append(h("div", { class: "sent" }, h("span", {}, s.text), ctl));
      });
      card.append(h("button", { class: "btn", style: "margin-top:10px", onclick: () => {
        if (Object.keys(picks).filter((k) => picks[k]).length < it.sentences.length) { say(false, "Label every sentence first"); return; }
        const wrong = it.sentences.filter((s, si) => picks[si] !== s.answer).length;
        record(it.id, wrong === 0);
        say(wrong === 0, wrong === 0 ? "All correct. Evidence = what you can point to. Reasoning = why it matters." : `${wrong} not right yet. Ask: can I point to it (Evidence)? Does it explain WHY (Reasoning)?`);
      } }, "Check"));
    } else if (it.type === "mc") {
      const btns = it.choices.map((c, ci) => h("button", { type: "button", class: "choice", onclick: () => {
        btns.forEach((b) => b.classList.remove("right", "wrong"));
        const ok = ci === it.answer; btns[ci].classList.add(ok ? "right" : "wrong");
        record(it.id, ok); say(ok, (ok ? "Yes. " : "Not quite. ") + it.explain);
      } }, String.fromCharCode(65 + ci) + ". " + c));
      card.append(h("div", { class: "choices" }, btns));
    } else if (it.type === "fill") {
      const inp = h("input", { type: "text", style: "max-width:260px" });
      card.append(h("div", { class: "row" }, inp, h("button", { class: "btn", onclick: () => {
        if (!inp.value.trim()) { say(false, "Type an answer first"); return; }
        const ok = it.answers.includes(norm(inp.value)); record(it.id, ok);
        say(ok, (ok ? "Correct. " : "Hint: it's two words, and the sportsbook has it. ") + (ok ? it.explain : ""));
      } }, "Check")));
    } else if (it.type === "short") {
      const ta = h("textarea", { placeholder: "This shows... because..." });
      ta.value = get("cer.items." + it.id + ".text", "");
      card.append(h("div", { class: "openers" }, L.cer.openers.R.map((o) => h("button", { type: "button", onclick: () => { ta.value = (ta.value ? ta.value.trim() + " " : "") + o.replace(/\.\.\.$/, " "); ta.focus(); ta.dispatchEvent(new Event("input")); } }, o))), ta,
        h("button", { class: "btn", style: "margin-top:8px", onclick: () => {
          const t = ta.value.trim();
          if (t.split(/\s+/).length < 6) { say(false, "Write a full sentence, at least 6 words"); return; }
          const hasWhy = it.keywords.some((k) => new RegExp("\\b" + k + "\\b", "i").test(t));
          const prev = get("cer.items." + it.id, null);
          save("cer.items." + it.id, { attempts: (prev ? prev.attempts : 0) + 1, firstTry: prev ? prev.firstTry : hasWhy, correct: hasWhy, text: t });
          if (L.cer.items.every((x) => get("cer.items." + x.id + ".correct") || (x.type === "short" && get("cer.items." + x.id)))) save("cer.done", true);
          fb.replaceChildren(h("div", { class: "fb " + (hasWhy ? "ok" : "no") }, hasWhy ? "Good, you explained WHY. Compare yours to this one:" : "Your sentence needs a WHY word like because, so, or this means. Compare to this one:", h("div", { class: "cer-box R", style: "margin-top:6px" }, it.model)));
        } }, "Check"));
    }
    card.append(fb);
    return card;
  }

  // ---------- SORTER ----------
  const LABELS = ["investing", "trading", "gambling"];
  function sort() {
    const SO = L.sorter;
    const wrap = h("div", {}, h("h2", {}, "Scenario sorter"),
      h("p", {}, "Round 1: just pick the label. Round 2: pick the label (that's your Claim), then write your Evidence and Reasoning. The AI coach gives you feedback."));
    wrap.append(h("h3", {}, "Round 1: speed sort"));
    SO.round1.forEach((s, i) => {
      const prev = get("sort." + s.id + ".label");
      const fb = h("div", {});
      const bs = LABELS.map((lb) => h("button", { type: "button", class: lb + (prev === lb ? " sel" : ""), onclick: () => {
        bs.forEach((b) => b.classList.toggle("sel", b.textContent === lb));
        const ok = lb === s.answer;
        if (!get("sort." + s.id)) save("sort." + s.id, { label: lb, correct: ok, firstTry: ok });
        else save("sort." + s.id + ".label", lb);
        fb.replaceChildren(h("div", { class: "fb " + (ok ? "ok" : "no") }, ok ? "Yes. " + s.why : "Look again. How long is the money in? Who sets the odds? What would have to happen for this person to come out ahead?"));
        checkSort();
      } }, lb));
      wrap.append(h("div", { class: "card" }, h("p", { style: "margin-top:0" }, `${i + 1}. ${s.text}`), h("span", { class: "lbl-btns" }, bs), fb));
    });
    wrap.append(h("h3", {}, "Round 2: Claim, Evidence, Reasoning"));
    SO.round2.forEach((s, i) => wrap.append(sorterCER(s, SO.round1.length + i + 1)));
    function checkSort() { if ([...SO.round1, ...SO.round2].every((s) => get("sort." + s.id + ".label"))) save("sort.done", true); }
    return wrap;
  }

  function sorterCER(s, n) {
    const prev = get("sort." + s.id, {});
    const dr = Object.assign({ label: prev.label || null, evidence: prev.evidence || "", reasoning: prev.reasoning || "" }, getDraft(s.id));
    let label = dr.label;
    const keep = () => setDraft(s.id, { label, evidence: ev.ta.value, reasoning: rs.ta.value });
    const bs = LABELS.map((lb) => h("button", { type: "button", class: lb + (label === lb ? " sel" : ""), onclick: () => { label = lb; bs.forEach((b) => b.classList.toggle("sel", b.textContent === lb)); keep(); } }, lb));
    const mk = (k, ph) => {
      const ta = h("textarea", { placeholder: ph, style: "min-height:52px" }); ta.value = dr[k] || ""; ta.maxLength = 1400; ta.addEventListener("input", () => keep()); ta.setAttribute("aria-label", k);
      const ops = h("div", { class: "openers" }, L.cer.openers[k === "evidence" ? "E" : "R"].slice(0, 5).map((o) => h("button", { type: "button", onclick: () => { ta.value = (ta.value ? ta.value.trim() + " " : "") + o.replace(/\.\.\.$/, " "); ta.focus(); ta.dispatchEvent(new Event("input")); } }, o)));
      return { ta, el: h("div", { class: "cer-box " + (k === "evidence" ? "E" : "R") }, h("span", { class: "tag t-" + (k === "evidence" ? "E" : "R") }, k === "evidence" ? "Evidence" : "Reasoning"), ops, ta) };
    };
    const ev = mk("evidence", "What detail in the scenario can you point to?"), rs = mk("reasoning", "Why does that detail make it this label?");
    const fb = h("div", {});
    if (prev.ai) fb.append(aiFb(prev.ai));
    const err = errNode();
    const btn = h("button", { class: "btn", style: "margin-top:8px", onclick: async () => {
      if (!label) { err.textContent = "Pick a label first"; return; }
      if (!ev.ta.value.trim() || !rs.ta.value.trim()) { err.textContent = "Write both your Evidence and your Reasoning"; return; }
      err.textContent = ""; btn.disabled = true; btn.textContent = "Coach is reading...";
      let ai;
      try { ai = await Store.coach(S.cc, S.k, { sid: s.id, label, evidence: ev.ta.value.trim(), reasoning: rs.ta.value.trim() }); }
      catch (e) {
        console.warn("coach", e);
        ai = { score: null, unavailable: true, feedback: "Your answer is saved. The coach is not available right now. Ask yourself: can I point to my evidence in the scenario? Does my reasoning say why it matters?" };
      }
      const attempts = (prev.attempts || 0) + 1;
      const rec = { label, evidence: ev.ta.value.trim(), reasoning: rs.ta.value.trim(), ai, attempts, correct: (s.accept || [s.answer]).includes(label) };
      if (!prev.first && !ai.unavailable) rec.first = { label, score: ai.score, mixedUp: !!ai.mixedUp };
      if (prev.firstTry === undefined) rec.firstTry = rec.correct;
      save("sort." + s.id, Object.assign({}, prev, rec)); Object.assign(prev, rec);
      fb.replaceChildren(aiFb(ai));
      btn.disabled = false; btn.textContent = "Revise and get feedback again";
      if ([...L.sorter.round1, ...L.sorter.round2].every((x) => get("sort." + x.id + ".label"))) save("sort.done", true);
    } }, prev.ai ? "Revise and get feedback again" : "Get feedback");
    return h("div", { class: "card" }, h("p", { style: "margin-top:0" }, `${n}. ${s.text}`),
      h("div", { class: "small muted" }, "Claim (pick one):"), h("span", { class: "lbl-btns" }, bs), ev.el, rs.el, btn, err, fb);
  }
  function aiFb(ai) {
    if (ai.unavailable) return h("div", { class: "fb info" }, ai.feedback);
    const good = ai.score >= 3;
    return h("div", { class: "fb " + (good ? "ok" : "info") }, h("b", {}, `Coach score: ${ai.score || "?"} / 4. `), ai.feedback || "", ai.mixedUp ? h("div", { class: "small", style: "margin-top:4px" }, "Which of your two sentences can you point to in the scenario? Which one answers why?") : null);
  }

  // ---------- WRAP ----------
  function done() {
    if (!get("done.done")) save("done.done", true);
    return h("div", { class: "card", style: "text-align:center" }, h("h2", {}, "Nice work today"),
      h("p", {}, "Investing = long term, you own something that can grow. Trading = short term, you're guessing price swings. Gambling = the house has the edge."),
      h("p", { class: "muted" }, "Next week: why Jordan's money grew so fast. Simple vs. compound interest."));
  }

  // ---------- boot ----------
  let me = null; try { me = JSON.parse(localStorage.getItem("itg-me")); } catch (e) {}
  const q0 = new URLSearchParams(location.search);
  if (me && me.name && me.cc && !q0.has("new") && !(q0.get("cc") === "TEST" && me.cc !== "TEST")) {
    app.replaceChildren(h("div", { class: "card locked" }, "Loading your work..."));
    start(me.name, me.cc, (m) => signIn(m));
  } else signIn();
})();
