# Invest, Trade, or Bet?

A live classroom lesson. Students: `student.html`. Teacher: `teacher.html`. Projector: `screen.html?cc=2B` (class totals and the clock only, never names).

- Hosting: GitHub Pages. Data: Firestore in the Roll with the Market project. AI and scoring: the RWM Cloudflare Worker, `/itg/` routes.
- Students sign in with a name and class. No accounts.
- Saved to the database: pre-test, CER practice, scenario sorter, post-test, plus one question of the day guess per student. The list is `saved` in `content.js`.
- Answer keys, the teacher PIN, and the Claude key are Worker secrets. Never commit them.
- Student text lives in `content.js`. If you change s7 to s12, the CER prompts, or the rubric, update `worker/itg-content.js` in RWM and redeploy the Worker.
- After editing a script or stylesheet, raise the `?v=` number in all three HTML pages so browsers load the new one.

## Running class
1. Open the projector page from Run class and drag it to the big screen.
2. Type the bell time in the top bar. The bar shows if you will run over.
3. Press Start, then Open next. The clock, projector, and student pages follow.
Teaching notes live in `teacher-notes.js`.

## Grading
Keys: 1 to 4 score, Enter reviews and moves on, N opens the note, Escape leaves it, J and K move.

1. Students see a preliminary score, under review.
2. Open Grading, check the CER, change the score if needed, mark reviewed.
3. Publish reviewed scores. The best attempt counts.

## Reattempts
Reopen Post-test, then allow a reattempt for one student (tap the name) or for everyone who finished. If a student is on a different computer, use Release name.

## Practice run
Open `student.html?cc=TEST` and pick TEST on the dashboard.
