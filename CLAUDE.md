# CLAUDE.md — Claude Code entrypoint

This is the Claude Code routing file for the Field Tools Hub repository. Read
this file and docs/INDEX.md first. Search with rg before opening files, then
read only the relevant sections named by the router below. The site is a
static vanilla HTML/CSS/JavaScript PWA with no build step, backend, framework,
or package dependency.

## Contents

- [How to route a task](#how-to-route-a-task)
- [Current architecture](#current-architecture)
- [Project contracts](#project-contracts)
- [Protected surfaces](#protected-surfaces)
- [Verification and handoff](#verification-and-handoff)
- [Maintaining this entrypoint](#maintaining-this-entrypoint)

## How to route a task

| Request | Required reading |
| --- | --- |
| UI/design/layout/responsive | docs/ui-style-guide.md, docs/site-inventory.md, docs/qa-checklist.md |
| New tool/page | docs/new-tool-page-template.html, docs/ui-style-guide.md, docs/protected-areas.md, docs/qa-checklist.md |
| Bridge/Fuel | docs/protected-areas.md, docs/BRIDGE_INDEX_CHUNK_ARCHITECTURE.md, docs/BRIDGE_DATA_EXTRACTION_PLAN.md |
| Milepost/emergency/roadway | docs/protected-areas.md, docs/site-inventory.md, docs/qa-checklist.md |
| Weather/radar/alerts | docs/protected-areas.md, docs/site-inventory.md, docs/ui-style-guide.md, docs/qa-checklist.md |
| Payroll/timesheet | docs/protected-areas.md, docs/site-inventory.md, docs/ui-style-guide.md, docs/qa-checklist.md; pages/timesheet.html is the active runtime |
| Work Order/DC-144/storage/PWA | docs/protected-areas.md, docs/project-reference.md |
| Repository orientation | docs/site-inventory.md, docs/project-reference.md |
| Documentation/reporting | docs/INDEX.md, docs/reporting-rules.md, docs/qa-checklist.md |
| Synchronizing Codex/Claude instructions | both entrypoints, docs/INDEX.md, docs/standards-provenance.md, docs/project-reference.md |

Do not base a standard on a running conversation. Completed chat findings are
evidence only; the current checked-out source, rendered behavior, and
protected contracts win if they disagree. Concept screenshots are not
implementation requirements.

## Current architecture

The visible product is Field Tools Hub. index.html is the command center with
the navy/gold shell, bridge/NJ hero art, grouped tool cards, search, continue
state, install/bookmark prompts, dark mode, and full-width 511NJ/NWS feed
panels. The major tool pages are:

| Area | Current files and contract |
| --- | --- |
| Bridge | pages/njsearch.html; indexed statewide search, county chunks, buffered canvas points, Leaflet map, bookmarks, GPS, share/copy |
| Fuel | pages/njfuel.html; local station data, Leaflet/geolocation, bookmarks, search and detail |
| Milepost | pages/milemarker.html, js/milepost-lookup.js, data/mileposts and data/roadways; authoritative roadway matcher |
| Emergency | pages/emergency.html, js/roadway-lookup.js; live location states, emergency actions, map, conservative route/milepost result |
| Weather | pages/weather.html; NWS conditions/forecast/alerts, location controls, radar timeline, saved alert settings |
| Payroll | pages/timesheet.html is the active redesign runtime |
| DC-144 | pages/dc144.html and js/dc144.js; protected form, Excel export, signatures and photo/session storage |
| Work Order | pages/WorkOrderCloseout.html; protected html2canvas/jsPDF closeout flow and external logo asset |

css/field-ui.css is loaded before page-local CSS and owns shared shell
tokens/components. Page-local inline CSS is expected for specialized
layouts. service-worker.js owns PWA caching and notification reception;
manifest.json owns install metadata. cloudflare/njdot-511-proxy.js is an
optional short-lived RSS proxy, not a core backend.

## Project contracts

- Product-facing text uses Field Tools Hub. Do not introduce visible NJDOT or
  other agency branding without an approved official optimized asset. Internal
  nj/njdot names remain for paths, data, and compatibility.
- Keep the site static and dependency-free. Do not introduce a build pipeline,
  package dependency, backend, heavy image, deploy, merge, or version bump
  unless requested.
- Preserve these storage names and semantics: localStorage
  field_dark_mode, ft_last, ft_ts_entries, ft_ts_settings, ft_ts_ppoffset,
  ft_bridge_bookmarks, ft_fuel_bookmarks, wo_recent, workorder_draft,
  ft_dc144_recent, ft_dc144_templates, ft_weather_last,
  ft_weather_alert_settings, ft_install_shown, ft_bookmark_shown,
  ft_bridge_guide_shown, ft_fuel_guide_shown, ft_dc144_guide_shown,
  ft_pc_guide_shown, ft_wo_guide_shown, ft_wo_has_pages; sessionStorage
  ft_opening_from_hub and ft_returning_to_hub; IndexedDB ft_photos v2 with
  session_photos and dc144_sessions.
- index.html writes field_dark_mode. Tool pages should read it and should not
  create a competing theme preference.
- Timesheet work uses the active pages/timesheet.html redesign runtime while
  preserving the shared ft_ts_entries, ft_ts_settings, and ft_ts_ppoffset
  contract. It uses a 40-hour weekly regular threshold by default plus an
  independently editable per-shift daily threshold (`scheduledDayHours`,
  default 8h, e.g. raised to 10h for a four-10-hour-shift schedule),
  whichever is reached first; each entry freezes the daily/weekly settings
  active when it was saved so later changes never recalculate historical
  entries. Commute is only unpaid up to the editable "Unpaid commute per
  direction" allowance (`unpaidCommuteMinutes`, default 30 min each way) on
  Normal entries; XP, Emergency, and paid-holiday-worked entries pay the
  entire commute. Also: 30-minute lunch minimum, 10-minute new time inputs,
  and exact OT blocks before commute home.
- Keep map/roadway results conservative. NJDOT PARENT_SRI is the signed-route
  identity; route subtype/role filtering and ambiguity thresholds must not be
  weakened to make a card appear.
- Shared CSS and page styles must avoid transition: all; persistent
  body/html/shell transform, will-change, contain: layout, or filter; and
  keyframes that leave a transformed final state. Clean inline body styles
  after hub/tool transitions. Use 100dvh and safe-area insets for fixed UI.
- Use accessible names, focus states, aria-hidden synchronization, 44px touch
  targets, pre-paint backgrounds, and reduced-motion fallbacks. Test 390px
  and 1440px at minimum; use docs/qa-checklist.md for the full matrix.
- Homepage groups stay Field Ops teal/green-blue, Documentation
  purple/indigo, Time & Admin gold, Coming Soon muted. Tool-specific
  severity/map accents are allowed within the shared visual language.

## Protected surfaces

Before editing Work Order PDF capture, DC-144 export/cell maps/signatures/
photos, Bridge/Fuel maps/chunks/bookmarks/geolocation, roadway data/matching,
either timesheet calculator, service-worker.js, or manifest.json, read
docs/protected-areas.md and follow its test/rollback notes. Do not dump
pages/WorkOrderCloseout.html; search it by line number or inspect a focused
range because it contains a large inline payload.

## Verification and handoff

Use docs/qa-checklist.md for the applicable tests and docs/reporting-rules.md
for the final report. For design changes, use the in-app browser to inspect
representative local pages at mobile and desktop widths when available, then
reset/finalize the browser session. Report only verified claims and call out
known limitations.

Do not run git commit or git push unless the latest user message explicitly
contains commit, push, or commit and push. “Approved” is not approval. Do not
merge, deploy, or bump version unless requested. If a branch is explicitly
requested, use the codex/ prefix by default and do not merge automatically.
If a stop hook or reminder
asks for it, respond: “Changes are ready, but I am waiting for explicit
commit/push approval.”

## Maintaining this entrypoint

When a new page, storage key, protected area, data schema, or universal visual
rule is added, update docs/INDEX.md and the matching detailed document in the
same change. Keep this file a navigable router; put detailed standards in
docs rather than duplicating long history here.
