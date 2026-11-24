// Projector page. Reads only the class state, so no names or scores can appear here.
(function () {
  const L = window.LESSON, { h, remaining, clock, current, garden, plan, BEDS } = window.UI;
  const app = document.getElementById("app");
  const q = new URLSearchParams(location.search).get("cc");
  const cc = [...L.classCodes, "TEST"].includes(q) ? q : null;
  let st = null, err = "";
  const DO = {
    pre: ["Work on your own. This is not graded.", "Make your best guess.", "Write all three parts: Claim, Evidence, Reasoning."],
    hook: ["Pick your guess, then press Confirm.", "Write the real number on your notes sheet."],
    table: ["Watch the video.", "Fill in your notes sheet.", "Finish the quick check."],
    lab: ["Write your prediction first.", "Jordan: use the S&P 500 calculator.", "Casey: run 10 years, 5 times.", "Write your results on your notes sheet."],
    cer: ["Read the everyday example.", "Work through the 8 practice items.", "Ask: can I point to it, or does it explain why?"],
    sort: ["Round 1: pick the label.", "Round 2: add your evidence and reasoning.", "Use the coach, then revise."],
    post: ["Work on your own. This is graded.", "Use a number from your notes sheet.", "Submit all three parts."],
    done: ["Turn in your notes sheet.", "Make sure your post-test is submitted."]
  };
  function draw() {
    if (!cc) { app.replaceChildren(h("div", { class: "s-main" }, h("h1", {}, "Pick a class"), h("p", { class: "s-sub" }, L.classCodes.map((c) => [h("a", { href: "?cc=" + c, style: "color:inherit" }, c), "   "])))); return; }
    if (!st) { app.replaceChildren(h("div", { class: "s-main" }, h("p", { class: "s-sub" }, err || "Connecting..."))); return; }
    const id = current(L, st), i = L.phases.findIndex((p) => p.id === id), p = L.phases[i], sc = st.screen || {}, view = st.eyes ? "eyes" : sc.view || (st.startedAt ? "now" : "join");
    const band = h("div", { class: "s-band", id: "band" });
    let main;
    if (view === "eyes") main = h("div", { class: "s-main" }, h("h1", { style: "font-size:clamp(60px,10vw,180px)" }, "Eyes up here"));
    else if (view === "join") main = h("div", { class: "s-main s-join" }, h("div", { style: "display:grid;gap:3vh" }, h("h1", {}, L.title), h("p", { class: "s-sub" }, "Go to"), h("p", { class: "s-url" }, location.host + location.pathname.replace(/screen(\.html)?$/, "")), h("p", { class: "s-sub" }, `Sign in with your first name, last initial, and class ${cc}.`)), h("div", { class: "art" }, plan()));
    else if (view === "results") {
      const rows = sc.rows || [];
      main = h("div", { class: "s-main" }, h("h1", {}, sc.title || "Class results"), sc.sub ? h("p", { class: "s-sub" }, sc.sub) : null,
        sc.kind === "nums" ? h("div", { class: "s-nums" }, rows.map((r) => h("div", {}, h("b", {}, r.value), h("span", {}, r.label)))) :
        h("div", { class: "s-bars" }, rows.map((r, n) => h("div", { class: "s-bar" + (r.right ? " right" : "") }, h("span", {}, r.label), h("b", {}, r.value), h("div", { class: "track" }, h("i", { style: `width:${Math.round((r.frac || 0) * 100)}%;background:${BEDS[n % 8]}` }))))));
    } else main = h("div", { class: "s-main s-two" }, h("div", {}, h("h1", {}, p ? p.name : "Hang tight"), h("div", { class: "s-clock", id: "clk" })), h("ul", { class: "s-list" }, (DO[id] || []).map((x) => h("li", {}, x))));
    app.replaceChildren(band, main, h("div", {}, st.message ? h("div", { class: "s-msg" }, st.message) : null, err ? h("div", { class: "s-err" }, err) : null));
    tick();
  }
  function tick() {
    if (!st) return;
    const id = current(L, st), i = L.phases.findIndex((p) => p.id === id), r = remaining(st), band = document.getElementById("band"), clk = document.getElementById("clk");
    const len = st.plan || (L.phases[i] ? L.phases[i].minutes * 60000 : 1);
    if (band) band.replaceChildren(garden(L.phases.length, i, r == null ? 0 : 1 - r / len, { H: 60 }));
    if (clk) { clk.textContent = r == null ? "" : r > 0 ? clock(r) : "Time"; clk.classList.toggle("over", r != null && r <= 0); }
  }
  setInterval(tick, 1000);
  document.addEventListener("dblclick", () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); });
  draw();
  if (cc) (function connect() {
    window.Store.signInStudent().then(() => window.Store.subscribeState(cc, (x) => { st = x; err = ""; draw(); }, (e) => { console.warn(e); err = "Connection lost. Refresh this page."; draw(); }))
      .catch(() => { err = "Cannot reach the server. Trying again..."; draw(); setTimeout(connect, 5000); });
  })();
})();
