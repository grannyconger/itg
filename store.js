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

    subscribeState: (cc, cb, err) => lesson(cc).onSnapshot((s) => cb(s.exists ? s.data() : { unlocked: ["pre"] }), err),
    setState: (cc, state) => lesson(cc).set(state, { merge: true }),

    async loadStudent(cc, k) {
      const s = await timeout(stu(cc, k).get({ source: "server" }), 15000, "Cannot reach the server");
      return s.exists ? s.data() : null;
    },
    saveStudent(cc, k, patch) {
      return track(stu(cc, k).set(Object.assign({}, patch, { ownerUid: auth.currentUser.uid, classCode: cc, updatedAt: Date.now() }), { merge: true }));
    },
    subscribeScore: (cc, k, cb) => lesson(cc).collection("scores").doc(k).onSnapshot((s) => cb(s.exists ? s.data() : {}), (e) => console.warn("score listener", e)),
    score: (cc, k, kind) => call("/itg/score", { cc, key: k, kind }),
    coach: (cc, k, p) => call("/itg/coach", Object.assign({ cc, key: k }, p)),

    // teacher only
    subscribeAll(cc, name, cb, err) {
      return lesson(cc).collection(name).onSnapshot((q) => { const m = {}; q.forEach((d) => (m[d.id] = d.data())); cb(m); }, err);
    },
    patchScore: (cc, k, patch) => lesson(cc).collection("scores").doc(k).set(patch, { merge: true }),
    release: (cc, k) => stu(cc, k).set({ ownerUid: null }, { merge: true }),
    remove: async (cc, k) => { await lesson(cc).collection("scores").doc(k).delete(); await stu(cc, k).delete(); }
  };
})();
