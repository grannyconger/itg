// Data layer. Firestore for shared work, the Cloudflare Worker for scoring and AI.
(function () {
  const cfg = window.ITG_CONFIG, L = window.LESSON;
  const teacher = !!window.ITG_TEACHER;
  // The teacher page uses its own Firebase app, so testing both pages in one browser never mixes sign-ins.
  const appName = teacher ? "itg-teacher" : window.ITG_SCREEN ? "itg-screen" : null;
  const app = appName ? firebase.initializeApp(cfg.firebase, appName) : firebase.initializeApp(cfg.firebase);
  const auth = app.auth(), db = app.firestore();
  try { db.settings({ ignoreUndefinedProperties: true, experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) {}
  if (cfg.emu) { auth.useEmulator("http://localhost:9099"); db.useEmulator("localhost", 8080); }

  const key = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const lesson = (cc) => db.collection("itgLessons").doc(`${L.id}_${cc}`);
  const stu = (cc, k) => lesson(cc).collection("students").doc(k);
  const listeners = [];
  let pendingWrites = 0, failed = false;
  const tell = () => listeners.forEach((f) => f({ pending: pendingWrites, failed }));
  function track(p) {
    pendingWrites++; tell();
    return p.then((x) => { failed = false; return x; }, (e) => { failed = true; console.warn("save failed", e); throw e; }).finally(() => { pendingWrites--; tell(); });
  }
  function timeout(p, ms, msg) { return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error(msg)), ms))]); }

  async function call(path, body, ms) {
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms || 45000);
    try {
      const r = await fetch(cfg.worker + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ idToken }, body)), signal: c.signal });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Server error " + r.status);
      return j;
    } finally { clearTimeout(t); }
  }

  // ---------- class state over plain requests ----------
  // Firestore's own client queues writes without saying so when its connection drops.
  // A section change has to reach the server or say that it did not.
  const restUrl = (cc) => (cfg.emu ? "http://localhost:8080" : "https://firestore.googleapis.com") + `/v1/projects/${cfg.firebase.projectId}/databases/(default)/documents/itgLessons/${L.id}_${cc}`;
  const enc = (v) => v === null ? { nullValue: null } : typeof v === "boolean" ? { booleanValue: v } : typeof v === "number" ? (Number.isSafeInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
    : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : typeof v === "object" ? { mapValue: { fields: encAll(v) } } : { stringValue: String(v) };
  const encAll = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, enc(v)]));
  const dec = (v) => "integerValue" in v ? Number(v.integerValue) : "doubleValue" in v ? Number(v.doubleValue) : "stringValue" in v ? v.stringValue : "booleanValue" in v ? v.booleanValue
    : "arrayValue" in v ? (v.arrayValue.values || []).map(dec) : "mapValue" in v ? decAll(v.mapValue.fields || {}) : null;
  const decAll = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, dec(v)]));
  async function rest(cc, opt, force) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 8000);
    try {
      if (!auth.currentUser) throw new Error("Signed out");
      const token = await timeout(auth.currentUser.getIdToken(!!force), 8000, "Sign in check timed out");
      const r = await fetch(restUrl(cc) + (opt.q || ""), { method: opt.method || "GET", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: opt.body, cache: "no-store", signal: c.signal });
      if (r.status === 404 && !opt.method) return null;
      if (!r.ok) throw new Error("Server said " + r.status);
      return decAll((await r.json()).fields || {});
    } finally { clearTimeout(t); }
  }
  let chain = Promise.resolve();
  function writeState(cc, x) {
    const q = "?" + Object.keys(x).filter((k) => x[k] !== undefined).map((k) => "updateMask.fieldPaths=" + k).join("&"), opt = { method: "PATCH", q, body: JSON.stringify({ fields: encAll(x) }) };
    const run = () => rest(cc, opt).catch(() => rest(cc, opt, true)).catch((e) => { throw new Error("That change did NOT reach the class (" + (e.name === "AbortError" ? "no answer from the server" : e.message) + "). Check the Wi-Fi and try again. If it keeps failing, reload this page and sign in again."); });
    const p = chain.then(run); chain = p.catch(() => {}); return p;
  }
  const stable = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
  // A listener that errors is dead for good, so start a new one.
  function listen(ref, next, err) {
    let off = () => {}, stop = false, wait = 2000, timer;
    const go = () => { if (!stop) off = ref.onSnapshot((s) => { wait = 2000; next(s); }, (e) => { if (err) err(e); timer = setTimeout(async () => { try { await auth.currentUser.getIdToken(true); } catch (x) {} go(); }, wait); wait = Math.min(30000, wait * 2); }); };
    go();
    return () => { stop = true; clearTimeout(timer); off(); };
  }

  window.Store = {
    key, call,
    onSaveStatus: (f) => listeners.push(f),
    authReady: () => new Promise((res) => { const off = auth.onAuthStateChanged((u) => { off(); res(u); }); }),
    async signInStudent() {
      const u = await timeout(this.authReady(), 10000, "Cannot reach the server");
      if (!u) await timeout(auth.signInAnonymously(), 15000, "Cannot reach the server");
      return auth.currentUser.uid;
    },
    async signInTeacher(pin) {
      const { token } = await call("/itg/pin", { pin });
      await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
      await auth.signInWithCustomToken(token);
    },
    signOut: () => auth.signOut(),

    // Live listener, plus a slow check in case the listener stalls without an error.
    subscribeState(cc, cb, err) {
      let last = null, seen = 0, timer, stop = false;
      const got = (d) => { seen++; const k = stable(d); if (k === last) return; last = k; cb(d); };
      const off = listen(lesson(cc), (s) => got(s.exists ? s.data() : { unlocked: ["pre"] }), err);
      const poll = () => { timer = setTimeout(async () => { const n = seen; try { const d = await rest(cc, {}); if (!stop && n === seen) got(d || { unlocked: ["pre"] }); } catch (e) { console.warn("state check", e); } if (!stop) poll(); }, 35000 + Math.random() * 15000); };
      poll();
      return () => { stop = true; clearTimeout(timer); off(); };
    },
    setState: writeState,

    async loadStudent(cc, k) {
      const s = await timeout(stu(cc, k).get({ source: "server" }), 15000, "Cannot reach the server");
      return s.exists ? s.data() : null;
    },
    saveStudent(cc, k, patch) {
      return track(stu(cc, k).set(Object.assign({}, patch, { ownerUid: auth.currentUser.uid, classCode: cc, updatedAt: Date.now() }), { merge: true }));
    },
    subscribeScore: (cc, k, cb) => listen(lesson(cc).collection("scores").doc(k), (s) => cb(s.exists ? s.data() : {}), (e) => console.warn("score listener", e)),
    score: (cc, k, kind) => call("/itg/score", { cc, key: k, kind }),
    coach: (cc, k, p) => call("/itg/coach", Object.assign({ cc, key: k }, p)),

    // teacher only
    subscribeAll(cc, name, cb, err) {
      return listen(lesson(cc).collection(name), (q) => { const m = {}; q.forEach((d) => (m[d.id] = d.data())); cb(m); }, err);
    },
    patchScore: (cc, k, patch) => lesson(cc).collection("scores").doc(k).set(patch, { merge: true }),
    release: (cc, k) => stu(cc, k).set({ ownerUid: null }, { merge: true }),
    remove: async (cc, k) => { await lesson(cc).collection("scores").doc(k).delete(); await stu(cc, k).delete(); }
  };
})();
