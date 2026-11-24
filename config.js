// Public Firebase web config, safe to commit. Access is enforced by Firestore rules.
// The Claude key, answer keys, and teacher PIN are secrets on the Worker, never here.
window.ITG_CONFIG = {
  firebase: {
    apiKey: "AIzaSyBcTY_BhroqcbESNNK89hlPEEFxeDJRagU",
    authDomain: "roll-with-the-market.firebaseapp.com",
    projectId: "roll-with-the-market",
    storageBucket: "roll-with-the-market.firebasestorage.app",
    messagingSenderId: "141117435692",
    appId: "1:141117435692:web:61a782a323e20168190689"
  },
  worker: "https://roll-with-the-market-assessor.rollwiththemarket.workers.dev"
};
// Local testing only: localhost with ?emu talks to the Firebase emulators.
if (location.hostname === "localhost" && new URLSearchParams(location.search).has("emu")) {
  window.ITG_CONFIG.emu = true;
  window.ITG_CONFIG.worker = "http://localhost:8787";
}
