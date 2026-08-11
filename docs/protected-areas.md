# Protected areas and fragile contracts

This document is the safety gate for changes that can silently break field
workflows, saved data, exports, maps, payroll, or offline behavior. Read the
relevant section before editing a protected surface. Protected does not mean
untouchable; it means plan first, change the smallest surface, run the named
checks, and record any contract change.

## Contents

- [Protected edit protocol](#protected-edit-protocol)
- [Protection matrix](#protection-matrix)
- [Work Order PDF](#work-order-pdf)
- [DC-144](#dc-144)
- [DC-144 export and session invariants](#dc-144-export-and-session-invariants)
- [Bridge and Fuel](#bridge-and-fuel)
- [Emergency and roadway matching](#emergency-and-roadway-matching)
- [Milepost Finder](#milepost-finder)
- [Timesheet and payroll](#timesheet-and-payroll)
- [Weather and alerts](#weather-and-alerts)
- [PWA and external feed](#pwa-and-external-feed)
- [Storage contracts](#storage-contracts)
- [Animation and overlay safety](#animation-and-overlay-safety)
- [Rollback and verification](#rollback-and-verification)

## Protected edit protocol

1. Read this section and the routed architecture/style document.
2. Search with rg for the symbol, key, selector, or file before opening code.
3. Check git status. Existing uncommitted changes belong to the user unless
   clearly created by the current task; do not overwrite unrelated work.
4. Write down the invariant being preserved and the smallest intended change.
5. Run focused parse/data/browser tests before and after the edit.
6. Test at least 390px and 1440px for UI changes, plus the page-specific
   states below.
7. Check storage names, data schemas, service-worker assets, and diff scope.
8. Update this document and docs/INDEX.md if a protected contract changes.

Do not commit, push, merge, deploy, or bump the version unless the latest user
message explicitly requests it.

## Protection matrix

| Surface | Files | Why protected | Minimum verification |
| --- | --- | --- | --- |
| Work Order PDF | pages/WorkOrderCloseout.html, assets/wo-pdf-logo.png | html2canvas/jsPDF capture, external logo, session/photo records | focused parse, PDF capture/export, photo/session check, mobile overlay check |
| DC-144 | pages/dc144.html, js/dc144.js, data/dc144-template.xlsx | Excel cell maps, signatures, photos, templates, IndexedDB | parse, field/edit, signature, photo, export/open workbook, reload |
| Bridge | pages/njsearch.html, data/bridges | chunks, statewide index, canvas/Leaflet selection, GPS/bookmarks/share | data validator, search/select/map/GPS/bookmark/share, 390/1440 |
| Fuel | pages/njfuel.html, data/njfuel.json | geolocation, map, bookmarks, station data | load/search/select/GPS/bookmark/navigation, 390/1440 |
| Roadway matcher | pages/emergency.html, js/roadway-lookup.js, data/roadways, tests | unsafe route/milepost suggestions are a field-safety issue | index checks, 5,000 seeded fixes, targeted collisions, page integration |
| Milepost | pages/milemarker.html, js/milepost-lookup.js, data/mileposts, data/roadways | shared automatic match, calibrated measures, map fallback | adapter regression, script parse, map/no-map GPS/result check |
| Payroll | pages/timesheet.html | overtime/commute calculation, saved entries, responsive bottom nav | calculation scenarios, CRUD/reload, storage compatibility, mobile/desktop |
| Weather | pages/weather.html, service-worker.js | NWS/radar time state, alert settings, cache and notification behavior | location/forecast/radar/alerts, settings, offline shell, reduced motion |
| PWA | service-worker.js, manifest.json, icons | install, cache/version, offline fallback, notification receiver | asset paths, cache strategy, install metadata, update behavior |

## Work Order PDF

pages/WorkOrderCloseout.html contains a large inline/base64 payload and a
fragile PDF capture workflow. Do not dump the file into a terminal or report.
Search it by line number or inspect a focused range.

Preserve:

- html2canvas/jsPDF loading and the existing capture wait.
- LOGO_SRC_VAR pointing to the external assets/wo-pdf-logo.png file.
- PDF page sizing, image scaling, field order, and filename behavior.
- Draft/session behavior, recent closeouts, and photo associations.
- The existing guide overlay, transition cleanup, and mobile safe-area
  behavior.

After a change, create a representative PDF, inspect page count/positioning,
check the logo and signatures, reload the draft, and test the photo/session
path. Do not replace the capture implementation with a generic document
renderer without a separate plan.

## DC-144

The DC-144 page is both a field form and an Excel export adapter. Treat
data/dc144-template.xlsx, cell maps, date/number formatting, signature
placement, photo/session persistence, recent sessions, and custom templates
as one contract.

Preserve localStorage keys ft_dc144_recent and ft_dc144_templates. Preserve
IndexedDB database ft_photos version 2 and stores session_photos and
dc144_sessions. Do not change field IDs or export coordinates casually.

Minimum regression:

- Fill required and optional fields, including dates/numbers.
- Add/edit/remove a signature and at least one photo.
- Save, reload, and restore a session.
- Export and open the workbook; verify representative cells, image/signature
  placement, and filename.
- Test empty, partial, and long text values.
- Test the tutorial/modal at mobile width and with keyboard focus.

### DC-144 export and session invariants

This is a live implementation contract for `pages/dc144.html`, `js/dc144.js`,
and `data/dc144-template.xlsx`. It intentionally records functional export
constraints, not transient CSS/class history. Search for the named symbols
before changing them.

- `data/dc144-template.xlsx` is the required official workbook. Each export
  loads a fresh copy through `loadDc144TemplateWorkbook()`; there is no
  blank-workbook or reconstructed-layout fallback. The a/b/c/d form sheets,
  logo, merged ranges, native formatting, print setup, and template images
  are part of the output contract.
- `DC144_CELL_MAP` is the sole source of writable Excel coordinates. Its row
  and column values are 1-based, matching ExcelJS. Do not move field IDs,
  reinterpret coordinates, or hand-write an alternate map without opening
  and inspecting representative workbooks.
- A saved session belongs to exactly one `tab`: a, b, c, or d. Maximum data
  rows are A=17, B=18, C=18, and D=24. Tab B must never write its
  formula-protected Excel row 33.
- The export builder writes values into the official template rather than
  rebuilding it. Cell writes must preserve template borders/alignment; do not
  expand official row heights or use broad formatting changes that erase
  underlines, merged-cell behavior, or print layout.
- Before download, retain the selected official form and `Photo Appendix`
  when photos exist, validate that the template and required appendix
  survived, prune unused blank forms, and request full workbook
  recalculation. The filename remains
  `DC-144-[TAB]-[YYYYMMDD]-[SafeProjectName].xlsx`.
- Photos belong only on the `Photo Appendix` sheet. Each photo keeps its
  caption, section/timestamp metadata, image, and spacer rows. The export
  must wait for `pendingPhotoOps` to finish; a failed image must clear its
  pending state and show an error rather than leaving export blocked. The
  appendix assertion verifies a sheet, image count, and caption.
- Inspector signatures are transparent PNGs stored with the session and
  embedded beside the printed inspector name. Preserve image aspect ratio,
  transparent background, and the existing signature/session compatibility
  fields; old sessions without a signature must still load.
- `ft_dc144_recent` retains metadata for at most 25 recent sessions and
  `ft_dc144_templates` retains at most 100 templates. Full sessions remain
  in `ft_photos` v2 / `dc144_sessions`, keyed by the existing `photoKey`.
  Autosave is debounced for two seconds, and `showDashboard()` flushes the
  active session immediately so Back to Reports cannot lose a recent edit.
- Export review treats blank header fields as warnings. A Tab A custom unit
  without its custom text is a critical error and blocks export. Keep that
  distinction so users can export an incomplete daily report intentionally
  but cannot silently export an invalid custom quantity unit.

## Bridge and Fuel

### Bridge Navigator

The Bridge dataset is a statewide lightweight index plus county chunks. The
current index represents 6,823 bridge points. Full records remain chunked;
do not embed the old large payload back into the page.

The runtime uses one buffered canvas point layer for the map, grid-assisted
hit detection, Leaflet for the basemap/bubble/detail treatment, and redraws
on resize/move/zoom. The selected point is elevated visually and must not
also receive a duplicate orange/blue Leaflet marker. Keep the canvas edges
buffered so panning/inertia cannot cut off the point layer.

Preserve:

- all-record availability; do not reintroduce a display cap such as “Show 50”
  that hides statewide records.
- partial search without automatic first-result selection.
- collapse only after a real selection; Change bridge reopens search.
- structure-number normalization and bookmark compatibility.
- county chunk loading/cache, share/copy detail fields, GPS nearest search,
  and the mobile map dock/detail order.
- active navigation and transition cleanup.

Use docs/BRIDGE_INDEX_CHUNK_ARCHITECTURE.md for the current schema and
docs/BRIDGE_DATA_EXTRACTION_PLAN.md for provenance/migration context.

### Fuel Finder

Preserve the local station data shape, Leaflet/map controls, geolocation
permission states, bookmarks, station detail, navigation links, and any KML
or source attribution behavior. Do not share Bridge-specific chunk or
structure-number assumptions with Fuel.

Minimum regression for either page:

- first load with normal and slow network;
- partial/empty/no-result search;
- selection, change-selection, detail, copy/share;
- map pan/zoom/resize and selected state;
- GPS allowed, denied, unavailable, stale, and retry;
- bookmark create/remove/reload;
- 390px and 1440px with no page overflow or duplicate marker.

## Emergency and roadway matching

Emergency Assistance and Milepost Finder share the authoritative roadway
layer. data/roadways/index.json currently describes the NJDOT NJ Roadway
Network File, August 2025 source release, 3,250 segments, 7,702 tile entries,
and a generated tile/chunk layout. PARENT_SRI is the canonical signed-route
identity. A secondary or associated carriageway may group under that parent,
but its direction and calibrated measures remain meaningful.

The matcher must:

- apply the indexed route subtype and role classification;
- keep state-family and county-family meaning distinct;
- exclude local, ramp, connector, and unknown records from automatic signed
  route selection where the data marks them ineligible;
- reject broad/stale/too-distant/overlapping evidence;
- return one route only when the GPS fix and route identity are uniquely
  supported;
- abstain rather than guess, with clear “verify/no decision” copy.

Do not solve a roadway data problem by adding page-local nearest-name logic.
The emergency and milepost pages must remain consistent. Any generator or
matcher change requires the deterministic route classifier, the generated
index validation, and the Milepost adapter regression. The current completed
audit covered 5,000 seeded GPS fixes, targeted route checks, and 100
randomized adapter cases with no unsafe suggestions; rerun these after any
roadway change.

Emergency UI invariants:

- Call 911, share/copy report, and open-in-maps actions remain obvious.
- Location status distinguishes live, last-known, blocked, and unavailable.
- The location warning opens centered, has retry and Not now, and toggles
  aria-hidden with its visibility.
- Map failure does not prevent a coordinate/report workflow when matching
  data remains available.
- Map wrappers retain the page-colored backing, rounded geometry, and
  responsive alignment.

## Milepost Finder

Milepost Finder uses js/milepost-lookup.js and js/roadway-lookup.js. The
current user-facing flow automatically evaluates the authoritative route
families and withholds a milepost when the evidence is not unique. The shared
API may retain explicit modes for compatibility and regression tests.

Preserve calibrated geometry/measure behavior, fresh GPS requirements,
accuracy display, distance units, route direction, user marker, accuracy
circle, result suppression for ambiguous candidates, and the graceful
Leaflet-unavailable path. A visual map is helpful but not the authority.

Run both page-facing integrations, parse both inline scripts, and test the
reported US 130/County Route 528 case plus a genuine county route, local road,
ramp/connector, overlap, poor accuracy, and unavailable-data case.

## Timesheet and payroll

pages/timesheet.html is the sole, active Timesheet Tracker route (its former
pages/timesheet-redesign.html transition/reference copy has been retired and
deleted). It uses a workspace/rail/bottom-navigation visual language, shared
payroll keys, and stored-entry normalization. With no saved entries it shows
an empty state; demonstration data only appears when explicitly loaded from
Settings ("Load demo data"), never automatically. The existing hub link and
service-worker route remain intact.

The page must preserve the existing localStorage contract: ft_ts_entries,
ft_ts_settings, and ft_ts_ppoffset. `normalizeEntry()`/`serializeEntry()` and
`settingsFromRaw()`/`storedSettings()` (all in pages/timesheet.html) form a
bidirectional compatibility shim: they read and write both the current
in-memory field names (`category`, `commuteIn`/`commuteOut`,
`overtimeMethod`, `holidayWork`, `snapshot`, `scheduleHours`, `otRule`,
`defaultOtMethod`, `holidayCreditHours`, `useCommuteDefaults`,
`defaultCommuteIn`/`defaultCommuteOut`) and the legacy wire-format field
names still written for storage compatibility (`entryKind`, `rateType`,
`otType`, `commuteToMin`/`commuteHomeMin`/`commuteMin`, `act`,
`redesignSnapshot`-shaped keys, `redesignWorkweekHours`, `redesignOtRule`,
`redesignLunchMode`, `redesignDefaultOtMethod`, `redesignHolidayCreditHours`,
`redesignEmergencyRates`, `breakDefault`, `commuteDefaultEnabled`,
`commuteToDefault`, `commuteHomeDefault`). Do not drop either side of this
shim without a separate compatibility review.

The active implementation uses these protected rules:

- payroll time inputs (shift start/stop) use 10-minute increments
  (`step="600"`); existing quarter-hour records remain editable without
  silent rounding;
- a shift requires distinct valid times; an earlier stop means overnight;
- lunch/break is at least 30 minutes and commute to work/home are separate,
  non-payable deductions;
- Normal overtime starts after 40 regular worked hours in the workweek, with
  lunch and commute excluded and exact overtime ending before commute home;
- Cash pays all payable hours at 1.5x base rate; XP credits hours worked at
  1.5x; Emergency uses a required per-entry emergency rate;
- the pay-period anchor is Saturday, May 30, 2026 with 14-day periods; 26
  periods start in calendar year 2026;
- the app supports dashboard, work log, pay period, Summary Sheet, and
  settings views, a category-first entry dialog (not a multi-step wizard),
  create/edit/delete, employee name, local backup export/import, and safe
  negative-value guards;
- the seeded night-shift regression is 44.50 payable, 40.00 regular, and
  4.50 overtime, with Friday overtime 5:00–9:30 AM before commute home;
- verification covers all views/settings, 390px, 430px, and 1440px layout,
  pay-period table scrolling, timeline marker alignment, and zero browser
  errors/warnings.

The payroll contract also includes the following additive rules:

- The workweek is fixed Monday-Sunday. A regular overnight entry is assigned
  to the week named by its start date, including time after midnight. The
  default threshold is 40 hours; a namespaced 35-hour profile is optional.
- A separate union-agreement setting can move the threshold to the scheduled
  profile hours. A 35-hour profile defaults to 7 holiday-credit hours, but
  lunch remains unpaid unless paid/on-duty lunch is explicitly enabled. This
  is an application policy choice, not a claim that New Jersey law
  universally changes statutory overtime to 35 hours.
- The entry-category pills are Regular shift, All-OT shift (Cash), XP OT,
  Emergency, and Holiday credit. All-OT shift pays the entire shift as
  overtime; a Regular shift's overflow past the threshold is credited via a
  separate "How overflow overtime is credited" dropdown (Cash or XP) so the
  two concepts read distinctly. Only the visible label/help text was
  reworded for this distinction; the underlying category `value=` attributes
  (`Normal`/`Cash`/`XP`/`Emergency`/`Holiday`) are unchanged. Cash, XP, and
  Emergency entries do not build the normal threshold. Emergency entries
  require eight qualifying Normal payable hours for the workday and use a
  saved role/code rate snapshot.
- Lunch is one duration-only deduction per shift, at least 30 minutes.
  Commute-in and commute-home are separate per-entry deductions and default
  to zero. Deductions are rejected when they consume the entire shift instead
  of being shortened automatically. Overlapping shifts, including overnight
  overlaps, are rejected with an explanation.
- Regular time stays in the pay period containing the entry start. Overtime,
  Cash, XP, and Emergency segments are allocated by the actual calendar
  segment and split at midnight/pay-period boundaries. Carry-over segments are
  labeled in period views and the Summary Sheet with exact start/end times.
- The 2026 built-in New Jersey holiday list is seeded from NJ.gov. A future or
  custom date can be marked Paid holiday per entry, and a holiday-only credit
  entry is supported. Holiday credit counts toward the configured weekly
  threshold; worked holiday time is Cash/XP overtime, while Emergency remains
  Emergency-rate work.
- New or newly touched entries carry a `snapshot` of the pay inputs used for
  calculation (rate, multiplier, threshold/profile, lunch mode, and holiday
  credit), read back via `calculationSettings()`. Settings changes therefore
  affect future entries, not historical pay. The Emergency role/code catalog
  is rendered inside the settings' "Holiday and emergency time" card; its
  selected rate is copied into the entry as the existing historical
  emergency-rate snapshot.
- The dashboard sidebar's "When can I leave?" utility (`leaveUtility()`,
  `updateLeaveEstimator()`, module-level `leaveDraft` state in
  pages/timesheet.html) is a standalone, presentation-only `<details>` tool:
  it does not read or write `ft_ts_entries` and does not require a saved
  work log. `leaveDraft` holds the Start/Lunch/Commute-in/Commute-home field
  values and the `<details>` open/closed state so they survive unrelated
  dashboard re-renders (the dashboard does a full `innerHTML` replace on
  most state changes); it is seeded once, from the current time and the
  saved settings defaults, and defaults `detailsOpen` to `true`. Leave-by
  time is Start + Commute-in + Lunch + scheduled day hours; Home-by time adds
  the Commute-home minutes. The live countdown (`clockCountdownText()`,
  ported from the prior calculator) is two-phase: it counts down to the
  leave time first, then automatically switches to counting down to the home
  time once the leave time has passed, showing "Done" and clearing its
  interval once both have passed. The interval is cleared at the top of
  every `render()` call and restarted only when the dashboard view renders,
  so navigating to another view never leaves an orphaned timer. It re-defaults
  on reload rather than persisting between sessions. The shared grid stays
  background-only, and animations must use explicit properties plus
  reduced-motion behavior.
- Page-local CSS custom properties are `--p-`-prefixed (`--p-red`,
  `--p-muted`, `--p-radius`, `--p-radius-sm`, etc.) specifically to avoid
  colliding with field-ui.css's own `--red`/`--muted`/`--radius`/
  `--radius-sm` tokens, which would otherwise silently shadow the shared
  values since the page's `<style>` loads after field-ui.css. Do not
  reintroduce an unprefixed page-local token name that already exists in
  field-ui.css.
- The `.hub-back` back-pill has no local color/hover override; it inherits
  field-ui.css's shared `.topbar-back, .hub-back, .ft-back-link,
  .ft-home-link` styling (including the solid-gold hover). Only the
  page-local icon sizing and the narrow-viewport icon-only collapse remain
  page-local.
- The `.switch` toggle control's hit area is 46x44px (a 26px-tall visual
  track centered inside a 44px-tall label) to meet the 44px minimum touch
  target; the "Worked on a paid holiday" toggle's description text is inside
  a `<label for="entry-holiday-work">` so tapping the text also toggles the
  control, matching the pattern already used by the three settings-row
  switches.

Minimum payroll regression:

- load with empty storage and with representative saved entries;
- create, edit, delete, cancel, and reload an entry;
- overnight shift, required lunch, commute defaults/overrides, and boundary
  dates;
- weekly-40 and legacy rule-set overtime/summary totals separately;
- invalid/missing input with preserved draft;
- settings persistence and pay-period navigation;
- leave-calculator countdown ticks live, switches phase at leave time, shows
  Done and stops after home time, survives unrelated dashboard re-renders
  without resetting or duplicating, and leaves no orphaned interval after
  navigating to another view;
- mobile bottom navigation, dialog/toast safe-area behavior, desktop rail,
  390px, 430px, and 1440px;
- verify legacy-format saved entries and settings still load correctly
  through the compatibility shim.

The current service worker already lists pages/timesheet.html in LOCAL_ASSETS,
so this implementation keeps the existing precache path and requires no
cache/version change; do not bump the cache casually.

## Weather and alerts

Weather has a larger specialized dashboard but preserves shared typography,
focus, dark-mode prepaint, safe-area, and transition rules. Preserve NWS
source attribution, local/DST-aware time labels, location priority (manual
selection must not be overwritten by a delayed GPS result), current/hourly/
period forecast, alert cards, radar controls, and local alert settings.

Radar uses official NWS time-enabled reflectivity with cached/prefetched
frames, stale-request cancellation, scrub/playback controls, and an
Observed/HRRR forecast distinction. Keep a sensible near-current default and
clear Current/+15m/-15m controls where present.

Alert cards should expose severity, affected area, timing/facts, details,
recommended action, and the full official link. Alert settings are local and
area-specific. Map alert toggles must stop event propagation so they do not
accidentally zoom the map.

The service worker can receive push events and route notification clicks, but
the static app has no PushManager subscription sender or backend. Do not
promise reliable closed-app notifications. Battery optimization cannot be
bypassed by page code.

## PWA and external feed

service-worker.js is currently cache name ft-v1.36-2026-08-11. HTML is
network-first with an offline.html fallback; local static assets are
cache-first; CDN libraries are network-first. Precached assets are split into
CORE_ASSETS (must all cache successfully or the new worker never calls
skipWaiting, so a previous complete worker stays in control instead of
activating a broken offline install) and OPTIONAL_ASSETS (best-effort; a
single failed fetch there is swallowed and does not block activation). The
activate handler scopes its cache cleanup to keys starting with the ft-
prefix rather than an exact CACHE match. The worker also handles update
messaging and a notification receiver/click path constrained to same-origin
targets. Preserve the cache name, CORE_ASSETS/OPTIONAL_ASSETS split, cleanup
behavior, no-cache HTML handling, Work Order fallback exception, and asset
paths unless the task is an explicit release/cache update.

**Cache-busting individual data files:** a handful of large data files
(bridge/roadway/milepost indexes) are precached by explicit URL in
CORE_ASSETS/OPTIONAL_ASSETS. When one of these files' *content* changes but
its filename does not, appending a manually-chosen query string to that one
entry (for example `./data/bridges/index.json?v=2026-08-05-coordinate-review`)
forces the service worker to treat it as a new cache entry on the next
CACHE version bump, without needing a build step or an auto-generated
manifest. This is a real, standing convention — not a one-off — apply it any
time a precached data file's content changes independently of a full
CACHE/index.html version bump. It only affects the one file whose query
string changes; every other precached asset keeps relying on the CACHE name
bump for freshness.

manifest.json and icon links are install contracts. If an icon changes, check
manifest paths, favicon/apple-touch links, CORE_ASSETS/OPTIONAL_ASSETS, and
actual HTTP 200 responses. Do not commit exported ZIP/readme artifacts as
icons.

cloudflare/njdot-511-proxy.js is an optional CORS proxy for the official
511NJ RSS feed. It allows the configured GitHub Pages origin plus localhost,
handles GET/OPTIONS and health/RSS paths, and caches upstream responses
briefly. It is not a database or a core app backend. Feed failure must leave
the hub usable.

## Storage contracts

Never rename, clear, or silently migrate these:

| Store | Names |
| --- | --- |
| localStorage | field_dark_mode, ft_last, ft_ts_entries, ft_ts_settings, ft_ts_ppoffset, ft_hub_whats_new_2026_08_v1, ft_bridge_bookmarks, ft_fuel_bookmarks, wo_recent, workorder_draft, ft_dc144_recent, ft_dc144_templates, ft_weather_last, ft_weather_alert_settings, ft_install_shown, ft_bookmark_shown, ft_bridge_guide_shown, ft_fuel_guide_shown, ft_dc144_guide_shown, ft_pc_guide_shown, ft_wo_guide_shown |
| sessionStorage | ft_opening_from_hub, ft_returning_to_hub |
| IndexedDB | ft_photos v2; session_photos; dc144_sessions |

Work Order photo records also rely on their existing photoKey links. An
additional key requires a docs update and a compatibility decision.

The hub release summary uses ft_hub_whats_new_2026_08_v1 only to prevent the
current update notice from reopening after it has been shown on a device. It
does not alter payroll, work-order, or other saved data.

## Animation and overlay safety

These rules apply even when the page is otherwise protected:

- no transition: all;
- no persistent transform, will-change, contain: layout, or filter on body,
  html, or the main shell;
- final keyframes end at transform: none;
- remove transition classes and JavaScript inline body styles after completion;
- fixed UI is viewport-fixed and uses 100dvh/safe-area insets;
- reduced motion removes nonessential smooth movement and infinite pulses;
- aria-hidden matches whether a dialog/drawer is actually exposed.

## Rollback and verification

If a protected test fails:

1. Stop expanding the change.
2. Capture the failing input, browser width, console error, and storage/data
   state.
3. Isolate whether the failure is presentation, data, cache, or contract.
4. Restore the smallest prior behavior without destructive git commands.
5. Report the blocker and update the relevant regression note.

Never use git reset --hard or git checkout -- to discard work unless the user
explicitly asks for that operation.
