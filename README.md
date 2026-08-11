# MNS Year 3 — class interactives

Offline-first maths and English activities for a Year 3 class at Multinational School Bahrain,
built to be opened by scanning a QR code in the classroom.

**Live:** https://zuvx.github.io/mns-interactives/

## What these are

Self-contained HTML pages. Each one loads and then runs entirely on the device.

- No network requests once the page has loaded — no fonts, no analytics, no CDN, nothing.
- No accounts, no logins, no tracking, nothing collected about any child.
- The only thing stored is an anonymous points tally in `sessionStorage`, which disappears when
  the tab closes.

## What is not here

This repository holds only the pupil-facing pages. Lesson plans, worksheets, presentations and
all Collins and Cambridge source material live in a private repository and are not published.

The activities are original. They are written against the Cambridge Primary Mathematics
curriculum framework and follow the Collins International Primary Maths teaching sequence, but
no Collins or Cambridge text, artwork or question is reproduced in these pages.

## Layout

| Path | Pathway |
|---|---|
| `maths-u1/` | Unit 1 · Counting and sequences (A) — The Sweet Factory |
| `maths-u3/` | Unit 3 · Reading and writing numbers to 1000 — The Number Post Office |
| `maths-u4/` | Unit 4 · Addition and subtraction (A) — Number Souq |
| `english-u1/` | Unit 1 · Danger — Rescue Station |

Lessons are also served under short names — `maths-u1/1.html` is Lesson 1 — because a shorter URL
makes a sparser QR code, and a sparse code scans off a wobbly iPad camera.

## Regenerating

Built from the private repository by `tools/unit-pipeline/build_qr_sheets.py --publish <dir> --copy`.
Do not edit files here by hand; they will be overwritten on the next publish.
