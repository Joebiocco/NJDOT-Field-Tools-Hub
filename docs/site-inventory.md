# As-built site inventory

This is the current file-to-feature map for the local website. It is intended
for fast orientation and targeted reads; it is not a replacement for the
protected contracts or the visual guide.

## Contents

- [Runtime shape](#runtime-shape)
- [Page inventory](#page-inventory)
- [Shared shell and cross-page behavior](#shared-shell-and-cross-page-behavior)
- [Data and logic inventory](#data-and-logic-inventory)
- [PWA and external services](#pwa-and-external-services)
- [Compatibility and storage](#compatibility-and-storage)
- [Change routing](#change-routing)

## Runtime shape

- Hosting model: static files on GitHub Pages with a service worker.
- Build model: none. HTML pages contain their page-local CSS and JavaScript.
- Shared code: css/field-ui.css, js/dc144.js, js/milepost-lookup.js,
  js/roadway-lookup.js, service-worker.js.
- External runtime libraries: page-specific CDN libraries such as Leaflet,
  html2canvas/jsPDF, ExcelJS, fonts, or NWS/511 sources. Core app behavior
  must degrade safely when an external source is unavailable.
- Product-facing name: Field Tools Hub. Existing internal filenames,
  manifest/path names, and data fields containing nj/njdot remain for
  compatibility.

## Page inventory

### Hub — index.html

The command center provides:

- navy/gold navigation with Home, Field Ops, Documentation, Time & Admin,
  Resources, and Alerts & Updates;
- bridge/NJ hero art and blueprint/grid treatment;
- grouped tool cards with stable group colors;
- Continue state using ft_last;
- search/filter and section navigation;
- install/bookmark helper surfaces;
- a one-time, index-only release summary covering the current site update;
- light/dark mode, with the preference in field_dark_mode;
- full-width 511NJ traffic and NWS active-alert feeds with refresh and
  expand/collapse behavior.

The hub is a distinct visual family. Do not treat it as a generic tool page.

### Bridge Navigator — pages/njsearch.html

The bridge page uses:

- data/bridges/index.json for lightweight statewide search metadata;
- data/bridges/chunks/by-county/ for full records;
- a single buffered canvas point layer and grid-assisted hit detection;
- Leaflet for basemap, map state, and selected bridge bubble;
- partial search, actual-selection state, result detail, bookmarks, share/
  copy, GPS nearest bridge, and change-selection flows.

Important contracts are in the Bridge docs and protected-areas.md. Do not
reintroduce an arbitrary result cap or first-partial auto-selection.

### Fuel Finder — pages/njfuel.html

Fuel uses data/njfuel.json plus local page logic for station search/detail,
Leaflet, geolocation, bookmarks, navigation, and source/map states. It shares
the standard tool shell but not the Bridge data schema.

### Milepost Finder — pages/milemarker.html

Milepost uses pages/milemarker.html with:

- js/milepost-lookup.js as the page-facing adapter;
- js/roadway-lookup.js as the shared authoritative matcher;
- data/mileposts/index.json and chunks for legacy/source milepost data;
- data/roadways/index.json and chunks for calibrated roadway geometry and
  route identity;
- Leaflet map, user location, accuracy circle, route/milepost result, and a
  contained map-unavailable path.

The current user-facing flow favors automatic conservative matching; a
unique supported route is required before showing a definitive result.

### Emergency Assistance — pages/emergency.html

Emergency provides:

- Call 911, share/copy report, and open-in-maps actions;
- live GPS, last-known, blocked, unavailable, timestamp, and accuracy states;
- permission warning with retry/Not now and synchronized aria-hidden;
- Leaflet location map, user marker, accuracy circle, recenter, and map key;
- shared roadway/milepost matching and conservative Route Type Check/report
  language;
- safety guidance and a no-guess fallback when the source/map fails.

The page depends on the route identity and classification rules in the
roadway data inventory. It must not add a separate nearest-name classifier.

### Weather — pages/weather.html

Weather is a specialized responsive dashboard for:

- NWS current conditions, hourly forecast, and period forecast;
- manual location, region chips, and automatic location with stale-result
  protection;
- alert cards and local area/type/lead-time/quiet-hour settings;
- radar map, official reflectivity timeline, caching/prefetch, scrubbing,
  playback, and observed/forecast mode;
- desktop sidebar/third-pane arrangements and mobile stacked/chip layouts;
- shared dark mode and page-safe transitions.

The static PWA has a push receiver/click handler but no sender/backend, so
closed-app notification delivery is not a guaranteed feature.

### Active Timesheet Tracker — pages/timesheet.html

This is the active payroll route and the design/runtime target for new payroll
work. It is a workspace-style page
with a desktop rail, overview/log/period/calendar/summary/settings views,
shift timeline vocabulary, functional three-step entry drawer, calculation
breakdown, stored-entry normalization, backup import/export, and fixed mobile
bottom navigation. With no saved entries it presents the verified seeded
preview; saved ft_ts_entries become the displayed source.

It reads and writes the shared payroll keys ft_ts_entries,
ft_ts_settings, and ft_ts_ppoffset. Its current calculation contract is
weekly 40 regular hours before Normal overtime, minimum 30-minute lunch,
separate non-payable commute segments, 10-minute new times, 1.5x Cash/XP
handling, and per-entry Emergency rate. See protected-areas.md for the full
tested contract.

The redesign keeps Monday-Sunday week assignment separate from the legacy
weekStart setting, supports an optional 35-hour profile and configurable
after-scheduled overtime agreement, and keeps lunch unpaid unless paid/on-duty
is explicitly enabled. Normal overtime can be Cash or XP per entry; holiday
credit, holiday-only entries, custom holidays, and Emergency role/code rate
snapshots are additive fields. Regular time stays with the entry-start pay
period while OT, Cash, XP, and Emergency segments split at actual midnight and
carry forward with labels. Period navigation uses a date jump rather than a
three-period window. The Summary Sheet is an overview with exact OT blocks,
and the work log/calendar expose the same job, activity, description, and
timeline details as the overview.

The Pay rules card also contains the Emergency role/code rate catalog. Saved
entries keep an additive calculation snapshot so later settings changes do not
change historical pay. The overview may show a current-day-only leave countdown
after a shift start, while the shared grid remains behind page content and
reduced-motion behavior is honored.

### Transition/reference copy — pages/timesheet-redesign.html

This file is retained as a matching transition/reference copy after the
redesign was cut over to pages/timesheet.html. It contains the same workspace
UI, calculation logic, entry drawer, period navigation, and shared storage
contract. Keep it synchronized with the active route when both are edited, or
remove it only as a separately approved cleanup.

### DC-144 — pages/dc144.html and js/dc144.js

The DC-144 workflow includes form input, Excel/template export, signature
capture, photos, recent/template storage, session restore, and IndexedDB.
It is a protected data/export surface.

### Work Order — pages/WorkOrderCloseout.html

This page creates a work-order closeout PDF using html2canvas/jsPDF, the
external assets/wo-pdf-logo.png, existing forms, draft/recent/session/photo
behavior, and tutorial/modal UI. The file is large because of its inline
payload; search it by line number only.

## Shared shell and cross-page behavior

- css/field-ui.css is loaded before page-local CSS and owns standard tool
  tokens, topbar, buttons, focus rings, dialogs, toasts, and dark map
  controls.
- Hub/tool navigation is animated with explicit transition cleanup; final
  page state is opacity 1 and transform none.
- field_dark_mode is written by the hub and read by tool pages.
- ft_last tracks the most recent tool for the hub Continue card.
- ft_opening_from_hub and ft_returning_to_hub are session-only transition
  signals.
- Fixed overlays and mobile navigation must use safe-area/dvh sizing and
  cannot depend on a transformed body.
- Standard tool pages use the shared navy/gold topbar; Weather and the
  timesheet redesign have specialized shells but follow the same focus,
  spacing, state, and transition rules.

## Data and logic inventory

| Path | Current role |
| --- | --- |
| data/bridges/index.json | Bridge lightweight index and chunk metadata |
| data/bridges/chunks/by-county/ | Bridge full records by county |
| data/njfuel.json | Fuel station records |
| data/mileposts/index.json and chunks | Milepost source/index data |
| data/roadways/index.json and chunks | Generated roadway geometry, route subtype/role, PARENT_SRI identity, measures |
| data/dc144-template.xlsx | DC-144 export template |
| js/milepost-lookup.js | Shared page-facing milepost adapter |
| js/roadway-lookup.js | Shared route-family/identity matcher |
| tools/validate-bridge-data.js | Bridge schema/data validation |
| tools/build-roadway-index.py | Roadway index/chunk generation |
| tools/test-emergency-route-classifier.js | Route-classifier safety regression |
| tools/test-milepost-roadway-adapter.js | Milepost adapter regression |

Roadway index facts currently recorded in data/roadways/index.json include
source release August 2025, 3,250 segments, 7,702 tile entries, route
subtypes, canonical PARENT_SRI, and primary/associated-carriageway roles.

## PWA and external services

- service-worker.js uses cache name ft-v1.33-2026-06-01. HTML is
  network-first; local static assets are cache-first; CDN assets are
  network-first. It precaches the current production page set, icons, core
  data, hero art, and Work Order logo.
- pages/timesheet.html remains the precached active payroll route. The matching
  transition/reference copy pages/timesheet-redesign.html is not in
  LOCAL_ASSETS; do not add it or bump the cache casually.
- manifest.json provides standalone install metadata and legacy-compatible
  internal names/paths. Visible app copy stays Field Tools Hub.
- cloudflare/njdot-511-proxy.js is an optional short-cache CORS proxy for the
  official 511NJ RSS feed. It has no persistent application data.
- NWS, Leaflet, map tiles, fonts, html2canvas/jsPDF, and ExcelJS are external
  dependencies at runtime. Every page must show a contained failure state
  when a dependency is missing.

## Compatibility and storage

Preserved names:

- localStorage: field_dark_mode, ft_last, ft_ts_entries, ft_ts_settings,
  ft_ts_ppoffset, ft_bridge_bookmarks, ft_fuel_bookmarks, wo_recent,
  workorder_draft, ft_dc144_recent, ft_dc144_templates, ft_weather_last,
  ft_weather_alert_settings, ft_install_shown, ft_bookmark_shown,
  ft_bridge_guide_shown, ft_fuel_guide_shown, ft_dc144_guide_shown,
  ft_pc_guide_shown, ft_wo_guide_shown.
- sessionStorage: ft_opening_from_hub, ft_returning_to_hub.
- IndexedDB: ft_photos version 2, stores session_photos and dc144_sessions.

Do not clear or rename these keys/stores. If a new key is necessary, document
its owner, shape, lifetime, migration behavior, and protected status before
using it.

## Change routing

- Styling or new UI: ui-style-guide.md and qa-checklist.md.
- Protected behavior: protected-areas.md first.
- Bridge data/schema: both Bridge documents and the data validator.
- Roadway/milepost: protected-areas.md plus the deterministic tests.
- PWA/cache/install: protected-areas.md and project-reference.md.
- Cross-page architecture: this inventory plus project-reference.md.
- Final report: reporting-rules.md.
