# AGENTS.md — Codex entrypoint

This is the Codex routing file for Field Tools Hub. Read this file and
docs/INDEX.md at the start of every task. Read only the routed documents that
match the task. The repository is a static, framework-free PWA: there is no
build step, backend, package manager, or component framework.

## Contents

- [Fast task router](#fast-task-router)
- [Current product map](#current-product-map)
- [Non-negotiable rules](#non-negotiable-rules)
- [Protected work](#protected-work)
- [Completion and reporting](#completion-and-reporting)
- [Keeping the map current](#keeping-the-map-current)

## Fast task router

| Task | Read before editing |
| --- | --- |
| Any task | docs/INDEX.md, then search with rg |
| UI, styling, layout, responsive behavior, visual polish | docs/ui-style-guide.md, docs/site-inventory.md, docs/qa-checklist.md |
| New page or tool | docs/new-tool-page-template.html, docs/ui-style-guide.md, docs/protected-areas.md, docs/qa-checklist.md |
| Bridge Navigator or Fuel Finder | docs/protected-areas.md, docs/BRIDGE_INDEX_CHUNK_ARCHITECTURE.md, docs/BRIDGE_DATA_EXTRACTION_PLAN.md, docs/ui-style-guide.md |
| Milepost Finder or emergency roadway matching | docs/protected-areas.md, docs/site-inventory.md, docs/ui-style-guide.md, docs/qa-checklist.md |
| Weather, radar, NWS alerts, or alert settings | docs/protected-areas.md, docs/site-inventory.md, docs/ui-style-guide.md, docs/qa-checklist.md |
| Timesheet/payroll | docs/protected-areas.md, docs/site-inventory.md, docs/ui-style-guide.md, docs/qa-checklist.md; active runtime is pages/timesheet.html |
| Work Order PDF, DC-144 export/photos, storage, or offline behavior | docs/protected-areas.md, then docs/project-reference.md |
| Service worker, manifest, icons, install, or cache | docs/protected-areas.md, docs/project-reference.md |
| Project orientation or cross-page refactor | docs/site-inventory.md, docs/project-reference.md |
| Report length or handoff | docs/reporting-rules.md |
| Updating these entrypoints or the standards | docs/INDEX.md, docs/standards-provenance.md, docs/project-reference.md, docs/qa-checklist.md |

Do not infer requirements from an unfinished chat or an old concept rendering.
Use completed-chat findings only after they agree with the current files. Code
and runtime behavior are the final source of truth.

## Current product map

- index.html is the Field Tools Hub command center: hero, grouped tools,
  continue card, search, install/bookmark prompts, dark mode, live 511NJ
  traffic, and NWS alert feeds.
- pages/njsearch.html is Bridge Navigator. It uses a statewide lightweight
  index, county chunks, one buffered canvas point layer, Leaflet selection,
  bookmarks, share/copy, and GPS lookup.
- pages/njfuel.html is Fuel Finder. It uses local station data, Leaflet,
  geolocation, bookmarks, and map/detail interactions.
- pages/milemarker.html is Milepost Finder. Its lookup layer is shared with
  Emergency Assistance through js/milepost-lookup.js and
  js/roadway-lookup.js, using the generated data/roadways index and chunks.
- pages/emergency.html is Emergency Assistance. It provides call/share/copy
  actions, GPS status and permission recovery, a Leaflet location map, and
  conservative roadway/milepost matching. Ambiguous evidence must abstain.
- pages/weather.html is Weather: NWS conditions, hourly/period forecast,
  alerts, location selection, radar animation/scrubbing, map alerts, local
  alert settings, and dark mode.
- pages/timesheet.html is the active Timesheet Tracker payroll runtime. It is
  the tested redesign cut over onto the existing hub and service-worker route,
  and it preserves the shared storage contract. pages/timesheet-redesign.html
  remains as a matching transition/reference copy. The active runtime uses a
  40-hour weekly regular threshold by default, minimum 30-minute lunch,
  separate commute deductions, 10-minute new times, and exact OT blocks
  before commute home.
- pages/dc144.html plus js/dc144.js is the protected DC-144 form/export and
  photo/session workflow.
- pages/WorkOrderCloseout.html is the protected PDF closeout page. Do not
  dump it: it contains a large inline/base64 payload.
- css/field-ui.css is the shared tool-shell layer. Most page-specific styles
  remain inline by design. service-worker.js and manifest.json are protected.
- data/ contains bridge, fuel, milepost, roadway, and DC-144 assets. cloudflare/
  contains the optional 511NJ RSS proxy; core tools remain static.

## Non-negotiable rules

- Product-facing UI says Field Tools Hub. Do not add visible agency branding
  without an approved optimized official asset. Internal nj/njdot paths,
  filenames, data fields, and keys are compatibility names and stay unchanged.
- No backend, build dependency, framework, heavy image asset, deploy, merge, or
  version bump unless explicitly requested.
- Never rename, clear, migrate, or silently change the shape of existing
  storage. The compatibility contract includes:
  - localStorage: field_dark_mode, ft_last, ft_ts_entries, ft_ts_settings,
    ft_ts_ppoffset, ft_bridge_bookmarks, ft_fuel_bookmarks, wo_recent,
    workorder_draft, ft_dc144_recent, ft_dc144_templates, ft_weather_last,
    ft_weather_alert_settings, ft_install_shown, ft_bookmark_shown,
    ft_bridge_guide_shown, ft_fuel_guide_shown, ft_dc144_guide_shown,
    ft_pc_guide_shown, ft_wo_guide_shown.
  - sessionStorage: ft_opening_from_hub, ft_returning_to_hub.
  - IndexedDB: database ft_photos, version 2; stores session_photos and
    dc144_sessions. Work Order photo records use the existing photoKey
    relationship.
- Tool pages read field_dark_mode; index.html is the owner that writes the
  dark-mode preference. Do not add a competing writer casually.
- Preserve the PWA cache/version, precache list, notification receiver,
  manifest install behavior, and offline fallbacks unless the task explicitly
  includes a planned release of those protected files.
- Use explicit CSS transitions. Never use transition: all. Do not leave
  transform, will-change, contain: layout, or filter permanently on body,
  html, or the main shell. Final keyframe state is transform: none. Remove
  JavaScript-set body styles after transitions.
- Fixed overlays, dialogs, and toasts belong to the viewport, use 100dvh and
  safe-area insets where appropriate, and expose correct aria-hidden/dialog
  state. Every page needs a pre-paint background.
- Touch controls are at least 44px high/wide. No page may introduce
  horizontal overflow at 390px or 430px. Use reduced-motion behavior for
  nonessential animation.
- Homepage group colors remain consistent: Field Ops teal/green-blue,
  Documentation purple/indigo, Time & Admin gold, Coming Soon muted.
  Individual tools may retain functional map/weather severity colors.
- Map and roadway tools prefer a safe empty/abstain state over an invented
  route or milepost. PARENT_SRI is the authoritative signed-route identity;
  route subtype and role filtering must remain conservative.

## Protected work

Read docs/protected-areas.md before touching any protected area. The most
fragile areas are Work Order PDF capture, DC-144 Excel/cell maps/signatures/
photos, Bridge/Fuel map and chunk behavior, roadway classification, both
timesheet calculation/storage implementations, service-worker.js, and
manifest.json. Protected means plan, make the smallest scoped change, run the
listed regression checks, and document any contract change.

## Completion and reporting

Search first with rg; inspect large files by line range. Avoid dumping
pages/WorkOrderCloseout.html. Run the relevant checks in docs/qa-checklist.md
and finish with a delta-only report following docs/reporting-rules.md.

Do not git commit or git push unless the latest user message explicitly
contains commit, push, or commit and push. “Approved” or “approved to code” is
not permission. Do not merge, deploy, or bump version unless explicitly asked.
If a branch is explicitly requested, branch from the intended base and use the
codex/ prefix by default; do not merge automatically.
If a hook suggests otherwise, say: “Changes are ready, but I am waiting for
explicit commit/push approval.”

## Keeping the map current

When a page, storage key, protected surface, data contract, or universal rule
changes, update docs/INDEX.md and the relevant routed document in the same
working change. Keep this file a routing map, not a history log.
