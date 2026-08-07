# Field Tools Hub project reference

Revision: 2026-08-06. This reference describes the current local checkout;
verify code and completed regression results before treating a detail as
current.

This is the current architecture reference for agents who need more context
than the task router provides. It is organized for targeted reading; do not
read it end-to-end for an ordinary bug fix. Use docs/INDEX.md first.

## Contents

- [Reading policy](#reading-policy)
- [Product and hosting](#product-and-hosting)
- [Repository map](#repository-map)
- [Page architecture](#page-architecture)
- [Shared UI and interaction system](#shared-ui-and-interaction-system)
- [Data architecture](#data-architecture)
- [Storage architecture](#storage-architecture)
- [PWA and external services](#pwa-and-external-services)
- [Payroll transition](#payroll-transition)
- [Completed design decisions](#completed-design-decisions)
- [Maintenance playbook](#maintenance-playbook)

## Reading policy

The root AGENTS.md and CLAUDE.md files are short routers. docs/INDEX.md
selects the detailed document. Use this reference for cross-page orientation,
data/storage relationships, or historical rationale. Use
docs/protected-areas.md for fragile implementation contracts and
docs/ui-style-guide.md for visual decisions.

The current code and rendered behavior outrank this document. If a page
changes, update this reference only after verifying the code and tests.
Running chats are not evidence to record here.

## Product and hosting

Field Tools Hub is a static internal field-worker PWA hosted on GitHub Pages.
There is no backend, build step, framework, or package dependency in the
repository. HTML pages contain their page-local CSS/JavaScript; the shared
shell is in css/field-ui.css and the service worker is in service-worker.js.

The visible product name is Field Tools Hub. Internal manifest names, paths,
data fields, and compatibility keys may still contain NJDOT/njdot. Do not
add visible agency branding without an approved optimized official asset.

The application is designed for phones/tablets and desktop. The minimum
visual verification target is 390px and 1440px, with 430px, 768px, 900px,
1024px, and 1240px used for meaningful breakpoints.

## Repository map

### Shell and install

- index.html — command-center hub.
- css/field-ui.css — shared light/dark tokens, standard topbar, buttons,
  focus, dialogs, toasts, local notices, and map dark controls.
- service-worker.js — protected cache strategy, update protocol, offline
  fallback, and notification receiver.
- manifest.json — protected install metadata, scope, start URL, theme, and
  icons.
- assets/icons/ — favicon, app, and maskable icons.
- assets/hero/ — existing bridge/NJ hero art.
- assets/wo-pdf-logo.png — protected Work Order PDF logo.

### Pages

- pages/njsearch.html — Bridge Navigator.
- pages/njfuel.html — Fuel Finder.
- pages/milemarker.html — Milepost Finder.
- pages/emergency.html — Emergency Assistance.
- pages/weather.html — Weather, radar, and alerts.
- pages/timesheet.html — active Timesheet Tracker payroll runtime.
- pages/dc144.html and js/dc144.js — DC-144 form/export.
- pages/WorkOrderCloseout.html — Work Order PDF; inspect sparingly.

### Data, scripts, and tools

- data/bridges/index.json and data/bridges/chunks/by-county/ — Bridge
  lightweight search and full records.
- data/njfuel.json — Fuel station records.
- data/mileposts/ — Milepost source/index/chunks.
- data/roadways/index.json and data/roadways/chunks/ — generated NJ roadway
  geometry, route identity/role, and calibrated measures.
- data/dc144-template.xlsx — DC-144 workbook template.
- js/milepost-lookup.js — shared page-facing adapter.
- js/roadway-lookup.js — shared conservative roadway matcher.
- tools/validate-bridge-data.js — Bridge validator.
- tools/build-roadway-index.py — Roadway generator.
- tools/test-emergency-route-classifier.js — route safety regression.
- tools/test-milepost-roadway-adapter.js — adapter regression.
- cloudflare/njdot-511-proxy.js — optional short-cache 511NJ RSS proxy.

## Page architecture

### Hub

The hub is a command center with:

- navy/gold topbar and section navigation;
- bridge/NJ blueprint hero;
- grouped tool cards and Coming Soon area;
- Continue state from ft_last;
- search, install, and bookmark helper surfaces;
- field_dark_mode preference;
- 511NJ traffic and NWS active-alert feed panels.

The group taxonomy is Field Ops teal/green-blue, Documentation
purple/indigo, Time & Admin gold, and Coming Soon muted. Those accents belong
to the hub and should not be used to argue that every tool must use the same
accent.

Hub navigation tracks section coordinates and keeps the clicked destination
stable through smooth scroll. Resources precedes Alerts & Updates. Adjacent
panels must not cause active underline/highlight drift.

### Bridge

Bridge uses a statewide lightweight index plus county chunks. The current
index represents 6,823 points. Runtime search is partial-match aware and does
not select the first result. A single buffered canvas draws points; Leaflet
handles basemap, selection bubble, and map state. A grid helps hit detection.
The selected bridge is elevated and is not duplicated by a second marker.

Bridge bookmarks and shared structure identifiers are compatibility surfaces.
All indexed records remain available; do not add a presentation cap to hide
records.

### Fuel

Fuel uses data/njfuel.json, local search/detail state, Leaflet,
geolocation, bookmarks, and navigation/source links. It shares the standard
shell and map safety language, not the Bridge data/chunk model.

### Milepost and Emergency

The shared roadway layer is generated from the NJDOT NJ Roadway Network File,
August 2025 release. The current index records 3,250 segments and 7,702 tile
entries. PARENT_SRI is the canonical signed-route identity; associated
carriageways group under the parent while preserving direction/measures.

js/roadway-lookup.js applies route subtype/role rules and conservative
distance/accuracy/overlap decisions. js/milepost-lookup.js adapts the
result to the page. A route or milepost is shown only when evidence supports
one identity; local/ramp/connector/ambiguous states abstain. Emergency and
Milepost must not drift into separate classifiers.

Emergency adds immediate safety actions, GPS permission/status recovery,
location map/marker/accuracy, shareable report fields, and guidance. Milepost
focuses on the finder result and map. Both have a graceful map-library
failure path where the data workflow can continue.

### Weather

Weather is a specialized NWS/radar dashboard. It keeps manual location
selection ahead of delayed GPS results, uses local/DST-aware time, and
separates current/hourly/period forecasts, alerts, settings, and radar.
Radar uses official time-enabled reflectivity with caching/prefetch,
stale-request cancellation, scrubbing/playback, and an observed/forecast
distinction.

Alert cards expose severity, affected area, timing/facts, details, impact,
recommended action, and the official link. Settings are local and
area-specific. The page can receive/present notification events through the
service worker, but there is no subscription sender/backend and no guarantee
of closed-app push delivery.

### Work Order and DC-144

Work Order is an html2canvas/jsPDF capture workflow with an external logo,
draft/recent state, photos, signatures, and session behavior. DC-144 is a
form-to-workbook adapter with cell maps, signatures, photos, templates,
recent sessions, and IndexedDB. Read protected-areas.md before either.

### Payroll

pages/timesheet.html is the active Timesheet Tracker payroll runtime. It uses
the shared payroll keys and normalizes stored entries; demonstration data
only appears when explicitly loaded from Settings, never automatically. It
has a workspace rail on desktop, dashboard/log/period/summary/settings
views, a category-first shift dialog, functional create/edit/delete, backup
import/export, a calculation breakdown, and mobile bottom navigation.

Its verified payroll language is 40 regular worked hours per workweek before
Normal overtime; lunch and commute are excluded; commute to work and home
are separate; overtime ends before commute home; Cash uses 1.5x base pay; XP
credits worked hours at 1.5x; Emergency uses a per-entry rate. New time
inputs use 10-minute increments while existing quarter-hour records can be
preserved. Its pay periods use a May 30, 2026 Saturday anchor and 14-day
math, yielding 26 starts in 2026. The verified seeded example is 44.50
payable, 40.00 regular, and 4.50 overtime.

pages/timesheet.html remains the legacy compatibility implementation. Both
use ft_ts_entries, ft_ts_settings, and ft_ts_ppoffset. The legacy page has its
own current calculation/rate/export contract and is not the visual reference
for new work; keep it in the regression set until explicit cutover. Exact
redesign and legacy invariants belong in protected-areas.md.

## Shared UI and interaction system

css/field-ui.css provides:

- light tokens #eef0f4 background, white surface, #d1d9e0 border,
  #1a56db accent, #111827 text, #6b7280 muted;
- dark tokens #0f1117 background, #1c1e26 surface, #2d3748 border, warm
  readable text/muted colors;
- 58px standard navy/gold topbar;
- primary/secondary buttons and coarse-pointer target sizing;
- focus rings;
- notices, dialogs, and safe-area/dvh toast containers;
- dark Leaflet controls.

Every page may specialize its layout but must retain:

- pre-paint background and dark-mode read;
- visible focus and accessible names/state;
- no transition: all;
- no persistent body/html/shell transform, will-change, contain: layout, or
  filter;
- final keyframe transform none and cleanup of JS-set body styles;
- fixed overlays/toasts against the viewport with safe-area insets;
- reduced-motion behavior.

Hub/tool transitions use guarded animation cleanup. bfcache restores must
remove stale classes/inline styles and leave opacity 1, transform none.

## Data architecture

### Bridges

The lightweight index contains search/map metadata; full records are in
county chunks. The runtime keeps an in-memory chunk cache and loads chunks
as needed. Structure-number formatting and bookmarks remain compatible.
See both Bridge documents for fields and validation.

### Roadways

data/roadways/index.json describes source, coordinate/measure scales, route
subtypes, classification fields, segment count, tile count, and chunk files.
Each record carries source/route identity, subtype, role, direction, bounds,
encoded path/measures, canonical name/number, and PARENT_SRI-derived identity.
The matcher is intentionally conservative and can return no decision.

### External feeds

511NJ is read through the optional Cloudflare proxy when configured. NWS
forecast/alerts/radar are fetched by the Weather page. Feed/source failure
must not make the hub or weather shell unusable.

## Storage architecture

Preserve the following exact compatibility names:

- localStorage: field_dark_mode, ft_last, ft_ts_entries, ft_ts_settings,
  ft_ts_ppoffset, ft_bridge_bookmarks, ft_fuel_bookmarks, wo_recent,
  workorder_draft, ft_dc144_recent, ft_dc144_templates, ft_weather_last,
  ft_weather_alert_settings, ft_install_shown, ft_bookmark_shown,
  ft_bridge_guide_shown, ft_fuel_guide_shown, ft_dc144_guide_shown,
  ft_pc_guide_shown, ft_wo_guide_shown.
- sessionStorage: ft_opening_from_hub, ft_returning_to_hub.
- IndexedDB: ft_photos database version 2; session_photos and dc144_sessions
  stores.

index.html writes field_dark_mode; tool pages read it. ft_last values include
njsearch, njfuel, milemarker, emergency, weather, timesheet, dc144, and the
existing Work Order closeout value. Do not rename or clear any of these.

## PWA and external services

Current service-worker cache is ft-v1.33-2026-06-01. HTML uses network-first
with cache fallback. Local static data/icons/manifest use cache-first.
External CDN libraries use network-first. The worker cleans old caches,
supports update/reload messaging, and receives notification events. Work
Order has a deliberate fallback exception during reload behavior.

The current precache list includes the hub, standard production pages, core
data, roadway scripts/index, Weather, hero art, and Work Order logo, including
pages/timesheet.html. Changing the precache list is a deliberate cache/release
decision, not an incidental documentation change.

manifest.json and icon paths are install contracts. Do not alter cache names,
versioning, scope/start URL, icons, or notification behavior without a
protected plan and explicit release scope.

## Payroll transition

The user-facing design standard is the redesign page. The compatibility
standard is the shared storage contract and verified calculation behavior.
During transition:

1. Build new visual/interaction work in the redesign.
2. Preserve existing keys and data shapes.
3. Keep the legacy page operational.
4. Run both implementations against representative saved data.
5. Record a cutover only when the user explicitly authorizes it.

Do not call the redesign production/offline-ready based solely on the file's
existence; its service-worker precache and final payroll audit are separate
release decisions.

## Completed design decisions

These decisions have been verified in the current repository and should not
be casually reversed:

- the hub remains a command center rather than an editorial concept;
- hub group colors are stable and independent from tool-specific accents;
- Resources appears before Alerts & Updates;
- hub/tool transitions use explicit cleanup with no transition: all;
- fixed overlays/toasts use viewport/dvh/safe-area rules;
- Bridge point rendering uses one buffered canvas with Leaflet selection;
- Bridge partial search does not auto-select the first item;
- roadway results abstain when route identity is not uniquely supported;
- Emergency permission warning is centered, retryable, and accessible;
- Milepost can continue its data path if Leaflet is unavailable;
- Weather alert/radar updates preserve page state and cancel stale work;
- the redesign is the timesheet visual target during transition.

## Maintenance playbook

For a new page, read the HTML template, UI guide, protected areas, and QA
checklist. For a data change, update the schema/source note, validator or
regression, inventory, and protected contract if applicable. For a universal
rule, update both root entrypoints, docs/INDEX.md, the relevant detailed doc,
and QA.

Before handoff:

- search for stale filenames, keys, old navigation names, and obsolete caps;
- check links and document contents indexes;
- run git diff --check;
- preserve unrelated changes;
- state what was verified and what remains untested;
- leave the worktree uncommitted unless explicit commit/push authorization
  appears in the latest user message.
