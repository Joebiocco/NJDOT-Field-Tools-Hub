# Standards provenance and recurring-fix register

This page records the completed chat themes and local evidence that informed
the current documentation set. It is an audit trail, not a competing source
of truth. Current code, rendered behavior, and protected contracts always win.

## Contents

- [Scope and cutoff](#scope-and-cutoff)
- [Completed chat inputs](#completed-chat-inputs)
- [Timesheet redesign input](#timesheet-redesign)
- [Standards recorded](#standards-recorded)
- [Recurring fixes converted into rules](#recurring-fixes-converted-into-rules)
- [Local evidence](#local-evidence)
- [Use and maintenance](#use-and-maintenance)

## Scope and cutoff

Revision: 2026-08-06. The completed recent local website chats were read
through their final answers and relevant file changes before their lessons
were recorded. The payroll chat was intentionally excluded while it was
running and was reconciled only after its final turn completed. The same
cutoff applies to any future running chat.

## Completed chat inputs

### Dashboard and index styling

Recorded lessons:

- the hub remains a command-center dashboard, not an editorial concept;
- navigation order is Home, Field Ops, Documentation, Time & Admin,
  Resources, Alerts & Updates;
- Resources stays before Alerts & Updates;
- active-section tracking uses document coordinates and pins the clicked
  destination through side-by-side panel scrolling;
- utility links are action cards with group accents and external-link icons;
- 511NJ traffic and NWS alerts are separate expandable feed panels with
  source-specific fields and severity language.

### Bridge Navigator

Recorded lessons:

- statewide records remain available without a presentation cap;
- one buffered canvas renders points, with Leaflet handling selected detail;
- selected markers must not be duplicated;
- partial search must not auto-select the first result;
- search collapses only after actual selection;
- chunked data, bookmarks, GPS, share/copy, map dock, and detail order are
  compatibility behavior.

### Weather

Recorded lessons:

- NWS current/forecast/alert source language is explicit;
- manual location wins over delayed GPS;
- radar uses official time-enabled reflectivity, cached/prefetched frames,
  stale-request cancellation, scrubbing/playback, and a clear observed/
  forecast distinction;
- alert cards expose severity, area, timing, impacts, actions, and the full
  official link;
- settings remain local and area-specific;
- static push reception is not the same as a complete closed-app
  notification backend.

### Navigation and page transition cleanup

Recorded lessons:

- hub/tool transitions must have guarded completion cleanup;
- no transition: all;
- no persistent body transform/will-change/contain: layout/filter;
- final keyframes end at transform none;
- reduced motion, bfcache, stale inline styles, fixed overlays, and safe-area
  behavior are part of the transition contract;
- tutorials use a consistent accessible Payroll-style modal treatment.

### Emergency and roadway/milepost audit

Recorded lessons:

- PARENT_SRI is the authoritative signed-route identity;
- distinct spur/suffix identities must not collapse;
- route subtype/role filtering is conservative;
- ambiguous GPS evidence abstains rather than inventing a route;
- permission warnings are centered, retryable, and aria-hidden while closed;
- the map can fail without crashing the underlying coordinate/matching path;
- Emergency and Milepost share the same matcher and regression evidence.

### Timesheet redesign

The completed payroll chat established:

- pages/timesheet-redesign.html is the new visual/runtime transition target;
- it reads/writes ft_ts_entries, ft_ts_settings, and ft_ts_ppoffset and
  normalizes stored entries, with seeded preview data only when storage is
  absent;
- the redesign uses 40 regular worked hours per workweek before Normal
  overtime, excludes lunch and separate commute segments, and ends OT before
  commute home;
- new times use 10-minute increments while existing quarter-hour entries can
  be preserved; lunch is at least 30 minutes;
- Cash uses 1.5x base pay, XP credits at 1.5x, and Emergency uses a per-entry
  rate;
- 14-day periods use the May 30, 2026 Saturday anchor and produce 26 starts
  in 2026;
- the five-night seeded check is 44.50 payable, 40.00 regular, 4.50 OT, with
  Friday OT from 5:00–9:30 AM before commute home;
- month/calendar controls, functional entry wizard, backup, settings,
  negative-value guards, mobile table scrolling, marker alignment, and clean
  console output were verified.

The legacy timesheet page remains a separate protected implementation and is
not treated as the redesign's visual or calculation reference.

## Standards recorded

The above lessons are now expressed in:

- docs/ui-style-guide.md — design language and interaction rules;
- docs/protected-areas.md — fragile contracts and regression gates;
- docs/site-inventory.md — as-built page/data map;
- docs/qa-checklist.md — repeatable prevention checks;
- docs/project-reference.md — current architecture and rationale;
- docs/new-tool-page-template.html — safe copyable page scaffold;
- docs/BRIDGE_INDEX_CHUNK_ARCHITECTURE.md and
  docs/BRIDGE_DATA_EXTRACTION_PLAN.md — current Bridge data boundary;
- AGENTS.md and CLAUDE.md — task-specific routing;
- docs/INDEX.md — navigable source-of-truth map.

## Recurring fixes converted into rules

| Repeated defect | Permanent rule |
| --- | --- |
| White flash during hub/tool navigation | Pre-paint background, explicit transition, guarded cleanup, final opacity 1/transform none |
| Fixed modal/toast trapped by body transform | Never animate body; fixed UI uses viewport, 100dvh, and safe area |
| Hidden dialog exposed to assistive technology | aria-hidden is initialized and toggled with visibility |
| Mobile controls clipped or covered | 44px targets, no page overflow, bottom-nav/toast padding |
| Adjacent hub sections highlight the wrong nav item | Coordinate tracking plus pinned clicked destination |
| Bridge map has duplicate/cropped selected points | One buffered canvas layer and one deliberate selected state |
| Partial Bridge search selects a guess | Selection requires a real user choice |
| Roadway card shows a nearby but wrong route | Authoritative identity, evidence thresholds, safe abstention |
| Weather update flashes the whole page | Update the affected card; cancel stale radar/feed work |
| Alert copy repeats the title or hides action | Separate severity, area, timing, impacts, action, and source link |
| Legacy payroll page is used as new design reference | New work targets the timesheet redesign; legacy remains compatibility |
| Detailed protected export behavior is compressed into generic wording | Keep active DC-144 template, cell-map, row-limit, appendix, autosave, signature, and export-review invariants in protected docs and QA; omit only transient class history |
| Large files are read wholesale | Use INDEX routing, rg, focused ranges, and avoid Work Order dump |

## Local evidence

The standards were cross-checked against:

- current rendered hub, Bridge, Milepost, Emergency, timesheet redesign, and
  Weather pages at mobile and desktop widths;
- current css/field-ui.css tokens and shared shell selectors;
- current service-worker.js cache strategy and manifest paths;
- current page/data/script inventory;
- post-change localhost browser pass at 390px and 1440px for the hub,
  Bridge, redesign, Weather, and Emergency pages: no page overflow, no
  console errors/warnings, correct pre-paint backgrounds and page headings;
- redesign Month control opened August 2026 without overflow, and the entry
  drawer opened/closed with aria-hidden=false/true and three wizard steps;
- Bridge validator: 6,823 source/index records, 21 county chunks, no missing
  coordinates, duplicate identifiers, or excluded records;
- roadway classifier: 5,000 seeded fixes, 14/14 targeted checks, zero unsafe
  family/route suggestions;
- Milepost adapter: 100 randomized cases passed in the completed audit;
- redesign payroll: 40-hour weekly threshold, 14-day/26-period math, seeded
  totals, month view, mobile scrolling, marker alignment, settings/wizard,
  negative guards, and console checks passed;
- docs link, contents, stale-pattern, and diff whitespace checks.

The evidence supports the standards; it does not turn static tests into
real-world guarantees for GPS, external feeds, or map services.

## Use and maintenance

Do not add a lesson here from a running chat. When a related chat completes,
read its final answer and changed files, verify the current checkout, then
update this register plus the relevant detailed document. Remove or mark a
lesson obsolete if the implementation intentionally changes.

If this page and the current code disagree, fix the documentation or code
after determining which is authoritative; do not silently carry both rules.
