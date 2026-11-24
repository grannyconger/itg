# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
A CTE teacher running a live 60 minute Personal Finance lesson (classes 2B and 4B), and the 9th and 10th graders in the room on school computers.

## Product Purpose
Pre-test, activities, CER writing practice, and a graded post-test, in one paced lesson. Success: the teacher can pace the room without hunting for controls, and grade every post-test CER quickly and fairly.

## Operating Context
The teacher uses a laptop with an extended display (confirmed). The dashboard stays private on the laptop and a separate page goes on the projector. The teacher's priorities are pacing and CER grading (confirmed).

## Capabilities and Constraints
Static GitHub Pages site, no build step. Firestore for data, a shared Cloudflare Worker for AI and scoring. No student accounts. Answer keys, PIN, and API key are Worker secrets. Firestore rules are shared with Roll with the Market. A published score is always reviewed by the teacher.

## Brand Commitments
Classy, tropical theme that is not too vibrant (user's words). No em-dashes or semicolons in UI copy.

## Product Principles
- The teacher's next action is always the most obvious thing on the screen.
- Nothing private ever reaches the projector.
- Feedback asks questions, it does not hand over answers.
- Student writing is never lost.
