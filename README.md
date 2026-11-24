# Invest, Trade, or Bet?

A live classroom lesson. Students: `student.html`. Teacher: `teacher.html`.

- Hosting: GitHub Pages. Data: Firestore in the Roll with the Market project. AI and scoring: the RWM Cloudflare Worker, `/itg/` routes.
- Students sign in with a name and class. No accounts.
- Answer keys, the teacher PIN, and the Claude key are Worker secrets. Never commit them.
- Student text lives in `content.js`. If you change s7 to s12, the CER prompts, or the rubric, update `worker/itg-content.js` in RWM and redeploy the Worker.
- After editing a script or stylesheet, raise the `?v=` number in both HTML pages so browsers load the new one.

## Grading
1. Students see a preliminary score, under review.
2. Tap a name, check the CER, change the score if needed, mark reviewed.
3. Publish reviewed scores. The best attempt counts.

## Reattempts
Reopen Post-test, then allow a reattempt for one student (tap the name) or for everyone who finished. If a student is on a different computer, use Release name.

## Practice run
Open `student.html?cc=TEST` and pick TEST on the dashboard.
