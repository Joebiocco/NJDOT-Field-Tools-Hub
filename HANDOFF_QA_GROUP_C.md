# Field Tools Hub — QA Handoff (Group C changes, session of 2026-08-11)

Paste this whole file as your first message in a new session to continue
testing. It is self-contained — you do not need the original planning
conversation. It covers everything that shipped in this session's 18 commits
(Step 0 baseline commit + C1/C2/C3-Tier1/C4/C5 from the Group C execution
plan). It does **not** cover anything left deferred (C3 Tiers 2/3, Playwright
in CI, font self-hosting, or empirical device profiling of the new 30-page
cap) — those were intentionally not built this session.

## Before you start

- Confirm the app version reads **v1.36** in the hub's hero strip and footer
  (`index.html`). If it doesn't, you're not testing the latest build.
- Test at **390px** (phone) and **1440px** (desktop) minimum, light and dark
  mode, per this repo's own `docs/qa-checklist.md` convention.
- Read `CLAUDE.md` and `docs/protected-areas.md` first if you're going to
  edit anything in response to a failure — several of these pages (DC-144,
  Work Order, Bridge/Fuel maps, service-worker.js) are protected surfaces
  with their own regression lists.

## 1. Work Order Closeout (`pages/WorkOrderCloseout.html`)

**Page cap (new):**
- Add pages one at a time using each of the 3 add-page buttons (bottom "Add
  Documentation Page" button, top bar button, floating "+" button) until you
  hit **30 pages**.
- At page 30: all three add buttons should visually grey out/disable, and a
  red note should appear near the bottom button saying the limit was
  reached. You should also see a one-time toast.
- Remove a page (any "Remove Page" button) — the buttons should re-enable
  and the red note should disappear.
- Try clicking a disabled add button — nothing should happen (no 31st page).

**Backup export/import (new):**
- Click "Export backup" near Recent Sessions — should download a `.json`
  file.
- Click "Import backup" and select that file — should restore sessions,
  with a toast confirming how many.
- Try importing a garbage/invalid file — should show a clear "invalid file"
  error, not crash.

**Guide/tutorial popup (rebuilt — now shared code):**
- Clear `localStorage` for this site, load the page fresh — the tutorial
  should auto-open after ~0.6s **only if the closeout is empty**.
- Build a page first, then reload — tutorial should **not** auto-open (this
  is a page-specific rule, worth double-checking it survived the rebuild).
- Open manually via the "?" header button. Close via the × button, the "Got
  it" button, clicking outside the popup, and the Escape key — all four
  should work.
- While open, press Tab repeatedly — focus should stay trapped inside the
  popup, not escape to the page behind it.

**5-session limit disclosure (new):** the "Saved on this device only..."
note near Recent Sessions should now say only the latest 5 sessions are
kept and saving a 6th deletes the oldest.

## 2. DC-144 Field Form (`pages/dc144.html`)

- **Guide popup:** same open/close/focus-trap checks as above (header "?"
  button, storage key `ft_dc144_guide_shown`).
- **Other modals now also have real focus trapping** — open the Drafts
  panel, the signature pad, and the Export Review modal one at a time; Tab
  should stay contained inside each, and focus should return to whatever
  button opened it when you close it.
- **Backup export/import:** same pattern as Work Order — export button near
  Recent Drafts, import via file picker, garbage-file rejection.
- **Save-failure handling:** hard to trigger normally (needs storage
  actually failing), but check that autosave status shows "Saving…" then
  clears normally during regular use — no red "Not saved" state should
  appear under normal conditions.
- **Mobile progress tracker (new):** at 390px width, open any form tab —
  you should see small dots + a label sticky below the top bar tracking
  which section you're scrolled to.

## 3. Bridge Navigator (`pages/njsearch.html`)

- **Bookmark export/import (new):** header has two new icon buttons
  (export/import) next to "?". Export downloads a `.json`, import merges
  bookmarks back in with a toast showing the count.
- **Guide popup:** same open/close/focus-trap checks (storage key
  `ft_bridge_guide_shown`).
- **Map failure guard (new):** open browser dev tools → Network tab → block
  requests to `unpkg.com` → reload the page. The map area should show a
  plain message ("The map library is unavailable...") instead of staying
  blank or breaking. Search should still work normally.
- **Pinch-zoom should now work** on mobile (the old zoom lock was removed)
  — this applies site-wide, not just this page.

## 4. Fuel Station Finder (`pages/njfuel.html`)

- **Bookmark export/import (fixed):** this had a real bug — the buttons in
  the bookmark card were dead (duplicate IDs meant clicks did nothing).
  Confirm the "Export/import bookmarks from the header" buttons **actually
  work now**.
- **Guide popup:** same checks (storage key `ft_fuel_guide_shown`).
- **Map failure guard + fixed bug:** block `unpkg.com` like above, then
  click "Find Near Me." Before the fix, this showed a misleading "Failed to
  load station data. Check your connection." error. Now: the station list
  should still populate normally, and only the map area shows the "map
  unavailable" message — no misleading network error.

## 5. Timesheet (`pages/timesheet.html`)

- **Corrupt-data handling (new):** the old orange "demo data" banner is
  gone, replaced by a red "corrupt data" banner that only appears if saved
  entries/settings fail to parse. Hard to trigger deliberately without
  hand-editing localStorage — if you want to force it, corrupt the
  `ft_ts_entries` key manually and reload; you should see the new banner
  with export/reset options instead of the app silently wiping your data.
- **KPI layout:** the summary tiles at the top should now be grouped under
  labeled sections (e.g. "Time" / "Pay") instead of one flat row.

## 6. Weather, Emergency, Milepost

(`pages/weather.html`, `pages/emergency.html`, `pages/milemarker.html`)

- These only got the pinch-zoom unlock — confirm zoom/pinch works on
  mobile, everything else should look and behave exactly as before.
- Weather also got a quieter fix: if the alert-settings save silently fails
  (storage full), it should now show an error message instead of pretending
  it saved. Not easily testable without simulating storage failure — low
  priority to chase down.

## 7. Site-wide / offline behavior

- **Offline fallback (new):** with dev tools open, go to Network tab →
  "Offline" → try navigating to a page not already cached. You should land
  on a proper "You're offline" page (`offline.html`) instead of a broken
  load or the old stale-hub fallback.
- **Update flow:** since the version bumped to v1.36, reloading the app (or
  reopening the installed PWA) should trigger the normal update-available
  flow without errors.

## Not manually testable (automated, but worth knowing about)

- **CI gate:** a GitHub Actions workflow now runs on every push — checks
  bridge data, the roadway/milepost matcher (5,000 + 100 randomized test
  cases), and static site correctness (syntax, duplicate IDs, broken asset
  links). You'll see this as pass/fail checks next time this repo pushes to
  GitHub, nothing to click-test in the app.

## Reporting back

For each item above, record: page, viewport, light/dark mode, pass/fail,
and — for any failure — the console error message and whether it's
reproducible. Follow `docs/reporting-rules.md` for the final report format.
Do not fix anything found here without checking `docs/protected-areas.md`
first for the affected page.
