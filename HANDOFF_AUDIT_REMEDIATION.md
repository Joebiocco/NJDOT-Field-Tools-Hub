# Handoff: Field Tools Hub audit remediation — remaining work

Paste this whole file as your first message in a new session to continue. It
is self-contained — you do not need the original audit PDF/markdown to do
this work, though it lives at
`NJDOT_Field_Tools_Hub_Audit_2026-08-07.md` if you want the full source text
for any finding.

## Orientation (read before touching anything)

1. Read `CLAUDE.md` and `docs/INDEX.md` first, then `docs/protected-areas.md`
   before editing any protected surface (payroll calc, DC-144 export,
   Bridge/Fuel maps, roadway matching, service worker, manifest).
2. **The audit this file is based on is now stale relative to HEAD.** Two
   prior remediation sessions already landed fixes since it was written.
   Before "fixing" anything below, grep the current source and confirm the
   defect still exists as described — several audit findings turned out to
   already be resolved or simply inapplicable to current code. Trust what
   you read in the file over what this document or the audit claims.
3. Do not commit, push, merge, deploy, or bump the service-worker cache
   version unless the user's message explicitly asks for it.
4. This is a big backlog. Don't try to do all of it in one pass — pick a
   section, do it properly with the regression checks it names, verify in
   the browser, then stop and report before moving to the next section.

## What's already done — do not re-implement

Two remediation passes already closed all P1 (critical) findings and most
P2 findings that were confirmed still live against current source:

**Fixed and verified:** FT-004 (XP overtime — first 8h/entry pays Regular,
overflow beyond entered XP hours falls back to Cash OT instead of vanishing),
FT-005 (holiday credit capped at one daily entitlement per date), FT-006
(corrupt localStorage quarantined + recovery banner in `pages/timesheet.html`),
FT-007 (atomic, version-gated backup import with rollback), FT-008
(service-worker core-asset install failure now blocks `skipWaiting`), FT-045
(cache cleanup scoped to `ft-` prefix), FT-044 (`offline.html` dedicated
fallback), FT-070 (manifest `orientation` unlocked), FT-009 (zoom lock
removed from all 8 pages), FT-010/FT-011 (DC-144 save-failure handling in
`js/dc144.js`), FT-043/FT-018/FT-031/FT-033/FT-041 (verified-success
messaging across Timesheet/DC144), FT-022/FT-024 (Bridge/Fuel bookmark JSON
export+import), FT-038 (DC144 + Work Order full backup/restore), FT-053/
FT-032 (shared focus-trap utility in `js/dc144.js`, wired into all 6 DC144
overlays), FT-055 (`aria-pressed` on Timesheet segmented controls), FT-013/
FT-015 (Hub build-version sync, softened offline-ready language), FT-046/
FT-081 (notification click same-origin guard in `service-worker.js`), FT-017
(rate-not-confirmed labeling in Timesheet), FT-019 (noscript + runtime-error
panel in Timesheet), FT-036 (legacy-snapshot warning shown before saving an
edit), FT-048 (DC144 XLSX missing-library guard), FT-080 (import hardening —
size caps + `Object.create(null)` maps — across all 5 import paths), FT-082
(secret scan — clean), FT-025 (Fuel map/offline distinction), FT-052 (pay
estimate disclaimer), FT-062/FT-063 (removed `tools/__pycache__`, added
`.gitignore` rule, added root `README.md`), FT-069 (manifest description
synced to actual tool set), FT-077/FT-078/FT-079 (public-hosting disclosure
in README, export privacy notes near backup buttons).

**Confirmed already resolved in current source, no action taken:** FT-002/
FT-003 (demo data is already opt-in via Settings, never automatic), FT-012
(no hardcoded holiday-date table exists at all — moot as described), FT-020
(mobile agenda view — `.mobile-entry-list` — is already the default;
`state.periodMode` defaults to `'list'` not `'calendar'`), FT-035 (Timesheet's
back-button hijack is an intentional, identically-implemented pattern shared
across 5 pages — njfuel/njsearch/WorkOrderCloseout/milemarker/timesheet, all
with the same "Intercept browser back button to play Hub-return animation"
comment — removing it from one page would be a regression, not a fix), FT-039
(Timesheet Settings already states "New settings apply to future entries"),
FT-054 (no `role="button"` exists anywhere in the repo — the wizard concept
was removed when the entry dialog became "category-first... not a
multi-step wizard"), FT-057/FT-058/FT-061/FT-073 (disabled legacy runtimes
and the duplicate `timesheet-redesign.html` were already deleted in commit
`de4c866`, before this remediation even started), Emergency Assistance
"missing from Hub" (it's present as `index.html`'s `.emergency-banner`),
FT-037 (leave-calculator arithmetic already overflows correctly past
midnight — `leaveAt`/`homeAt` are plain millisecond timestamps derived from
`startOfDay + minutes`, so a shift crossing midnight just produces a later
timestamp; verified by reading `updateLeaveEstimator()` in
`pages/timesheet.html`, not by adding new code).

**One open verification gap:** the last session's live browser tool went
flaky (stuck on `chrome-error://chromewebdata/` across a server restart and
a fresh tab, while server logs showed clean 200/304 responses — an
environment issue, not a code issue). Every touched file passed Node syntax
validation, and most of Phase 1 was live-tested earlier in that session, but
these specific newer additions were only code-reviewed, not click-tested:
- Timesheet: rate-not-confirmed banner, noscript fallback, legacy-snapshot
  warning, corrupt-storage export/reset buttons.
- DC144: the new backup export/import buttons and the focus-trap wiring on
  all 6 overlays (template modal, signature pad, export review, drafts
  panel, templates panel, guide overlay).
- Work Order: the new backup export/import buttons.
- Bridge/Fuel: the new bookmark export/import buttons.

**Do this first in the new session:** start the `field-tools` dev server
(`.claude/launch.json` already has it configured), open each of the above
pages, and click through create/export/import once per tool before doing
anything else. If anything's broken, fix it before starting new work below.

## Two questions that block further payroll work — ask the user, don't guess

- **FT-049 (Emergency 8-hour qualifier for 35-hour employees):** the source
  requires 480 qualifying Normal minutes before Emergency-rate treatment
  applies, even for an employee on the 35-hour/7-hour-day profile. Is this
  always literally 8 actual hours regardless of profile, or should it scale
  to the employee's scheduled day length? Needs an NJDOT payroll answer, not
  a code guess.
- **FT-050 (pay-period boundary policy):** Regular/holiday minutes stay in
  the entry's start-date pay period while Cash/XP/Emergency overtime splits
  at the actual midnight/period boundary. Confirm this is the intended rule,
  particularly for a shift that starts in one pay period and crosses into
  the next.

## Remaining work, grouped by what it actually takes

### Group A — real device/browser testing (not code changes)

- **FT-056** — WCAG 2.2 touch-target (24×24 min, 44×44 preferred) and
  light/dark contrast verification across every interactive state (text,
  borders, focus, disabled, warning, error, selected). This needs an actual
  browser/device pass with a contrast checker, not a source-code guess.
- The full viewport matrix from the original audit's Section F/R
  (320×568 through 1920×1080, landscape, keyboard-open, dark mode, 200%
  zoom) for every route — genuinely needs real devices or a device lab, not
  something to fake from responsive CSS alone.

### Group B — needs a design/policy decision before touching code

- **FT-021** — Timesheet summary sheet's dense hour labels (worked time vs.
  pay-period allocation vs. XP credit vs. money) could use grouped headings
  and reconciliation totals. This is a genuine layout redesign of
  `renderSummary()`/`kpis()` in `pages/timesheet.html` — get a mockup or at
  least explicit direction on grouping before touching the shared summary
  layout, since it's used by both screen and print.
- **FT-016** — Hub tool cards (`index.html`, the `.tool-card` blocks and the
  card-builder functions around line 1090+) should each state whether
  records are device-only, whether backup/restore exists now (it does, for
  Bridge/Fuel/DC144/Work Order/Timesheet as of this handoff), and what
  clearing browser data does. Straightforward once you decide the exact
  wording/placement per card — 7 card blocks to touch.

### Group C — architecture, each is its own multi-hour project

Do not attempt these piecemeal inside an unrelated change. Each needs its
own plan, its own smallest-diff approach, and the full regression list from
`docs/protected-areas.md` for that surface.

- **FT-059/FT-060/FT-023/FT-072** — `pages/njsearch.html` and
  `pages/njfuel.html` are each ~500KB of embedded CSS/JS; `pages/timesheet.html`
  is ~327KB (larger now with this remediation's additions); shared UI
  (dialogs, toasts, storage-error display, export status) is reimplemented
  per-page instead of factored into `css/field-ui.css` / a shared module.
  Splitting these safely requires byte/behavior snapshots before and after
  (protected-areas.md: "Preserve all-record availability... structure-number
  normalization and bookmark compatibility... county chunk loading" for
  Bridge specifically) — this is the highest-regression-risk item in the
  whole backlog. Plan it as its own dedicated session with a
  before/after checklist, not a quick pass.
- **FT-064** — no CI/release gate. Would mean adding automated syntax/
  link/duplicate-ID checks, the existing `tools/*.js` regression scripts,
  and ideally a Playwright smoke pass, wired into some CI runner. There's
  currently no CI config in this repo at all (no `.github/workflows`) — this
  is new infrastructure, confirm the user actually wants CI before building
  it (it's a static GitHub Pages site with no build step; decide whether
  that stays true).
- **FT-067** — service-worker cache freshness currently depends on manually
  bumping `CACHE` in `service-worker.js` (now `ft-v1.34-2026-08-10`).
  Building a real revision-manifest/content-hash system is a proper
  small-project: needs a generation step (this repo has no build tooling),
  which conflicts with the "no build step" contract in `CLAUDE.md` unless
  the user explicitly wants to introduce one. Ask before starting.
- **FT-074** — Work Order's `html2canvas`/`jsPDF` capture can spike memory
  on large photo sets. Fixing this properly means paginating content
  directly instead of screenshotting, and compressing photos before canvas
  use — a rewrite of the capture pipeline in the protected
  `pages/WorkOrderCloseout.html`. Read the "Work Order PDF" section of
  `docs/protected-areas.md` in full before starting; this file must not be
  dumped to a terminal, only read by line range.
- **FT-075** — external fonts (Google Fonts) and CDN libraries (Leaflet,
  html2canvas, jsPDF, ExcelJS) can delay or block first interaction.
  Mitigation is system-font-first rendering plus disabling dependent
  buttons until each library confirms loaded (partially done already for
  DC144 XLSX and Work Order PDF via the missing-library guards — extend the
  same pattern to Leaflet-dependent buttons on Bridge/Fuel/Milepost/
  Emergency, and consider self-hosting the fonts to drop the
  `fonts.googleapis.com` round-trip).

### Group D — smaller, self-contained, reasonable to pick up individually

- **FT-026** — Milepost result should keep showing its confidence label
  (exact/approximate/stale) after navigation or state restoration, not just
  on first computation. Check `pages/milemarker.html` +
  `js/milepost-lookup.js` for where a restored/revisited result loses that
  label.
- **FT-027/FT-028** — Weather (`pages/weather.html`) needs each data type
  (cached shell, previously-loaded forecast, live alert feed, radar tiles,
  location lookup) to show its own timestamp/source/connectivity state
  instead of one blended "current" status, and cached/stale forecasts must
  never use success styling. This is a real (if scoped) feature addition to
  a "larger specialized dashboard" per `docs/site-inventory.md` — read the
  Weather section of `docs/protected-areas.md` first (NWS attribution,
  DST-aware time labels, location-priority rules, radar scrub/playback
  controls are all protected).
- **FT-034** — DC-144's long forms need mobile section progress and sticky
  action-visibility validation at phone widths. Scoped to
  `pages/dc144.html`'s form-screen CSS/markup; test at 320×568 with the
  keyboard open, per the DC-144 minimum regression list in
  `docs/protected-areas.md`.
- **FT-042 (remainder)** — general "failure recovery less prominent than
  success" sweep for anything not already covered by this handoff's "already
  done" list (geolocation denial messaging, missing-CDN states on map pages
  beyond what FT-048/FT-075 already cover). Worth a fresh grep for silent
  `catch(_){}` / `catch(e){}` blocks across `pages/*.html` and `js/*.js`
  before assuming what's left — several were already closed this pass.
- **FT-051** — Timesheet's snapshot migration (when a legacy entry gets a
  snapshot backfilled on edit — see FT-036's new warning) isn't fully
  auditable: no recorded migration version/timestamp, no pre-migration
  backup. Given FT-036 already warns the user before it happens, a scoped
  follow-up is to also stamp the resulting snapshot with a
  `migratedAt`/`migratedFromVersion` field so it's forensically visible
  later, and offer a one-click export immediately before the save commits.
- **FT-071** — the service worker's `push`/`notificationclick` handlers
  exist with no subscription/backend to actually trigger them (documented
  as intentional/dormant in `docs/protected-areas.md`'s Weather section).
  Low priority; either leave as clearly-dormant (already true, already
  labeled "receiving half of that flow" in the code comment) or remove
  entirely if the user confirms push is not planned. Don't remove without
  asking — it's a deliberate placeholder per the docs.
- **FT-076** — profile whether Timesheet calendar/list re-renders and large
  DC144/Work Order forms do more DOM work than necessary on each keystroke/
  state change. Needs actual profiling data before changing anything —
  don't optimize blind.

## Ground rules (same as every prior session)

- Re-verify every finding above against current `HEAD` before touching
  code — this handoff itself may already be stale by the time you read it.
- `git status` before anything that could discard work; stash/commit
  unrelated in-progress changes rather than overwrite them.
- Protected surfaces (payroll calc, DC144 export, Bridge/Fuel maps, roadway
  matching, service worker, manifest) require the protected-edit protocol in
  `docs/protected-areas.md`: read the section, write down the invariant
  you're preserving, make the smallest change, run the named regression
  checks, update the doc if a contract changes.
- No commit/push/merge/deploy/cache-version-bump without an explicit
  request in the latest user message.
