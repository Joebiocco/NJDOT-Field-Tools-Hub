# Documentation index and task router

Revision: 2026-08-06 — refreshed from the completed recent site chats and a
local rendered-page audit. Running chats are intentionally excluded.

This directory is the source of written standards for Field Tools Hub. Start
here after reading the applicable root entrypoint. Every document below has a
purpose, a stable route, and a navigable contents section so an agent can read
only the needed part.

## Contents

- [Source-of-truth order](#source-of-truth-order)
- [Task routing](#task-routing)
- [Document map](#document-map)
- [Current file map](#current-file-map)
- [Default workflow](#default-workflow)
- [Hard reminders](#hard-reminders)

## Source-of-truth order

When sources disagree, use this order:

1. Current checked-out HTML/CSS/JavaScript/data and rendered browser behavior.
2. Protected contracts in docs/protected-areas.md.
3. Canonical visual and interaction rules in docs/ui-style-guide.md.
4. Current page/data inventory in docs/site-inventory.md.
5. Architecture and historical context in docs/project-reference.md and the
   bridge-specific documents.
6. Completed chat summaries and screenshots. Running chats are never a source
   for new guidance.

This order prevents a historical document or concept rendering from
overriding the implementation that is actually being maintained.

## Task routing

| Task | Read in this order |
| --- | --- |
| UI/design/layout | ui-style-guide.md → site-inventory.md → qa-checklist.md |
| New page/tool | new-tool-page-template.html → ui-style-guide.md → protected-areas.md → qa-checklist.md |
| Homepage/feed/navigation | ui-style-guide.md → site-inventory.md → qa-checklist.md |
| Bridge/Fuel | protected-areas.md → BRIDGE_INDEX_CHUNK_ARCHITECTURE.md → BRIDGE_DATA_EXTRACTION_PLAN.md → qa-checklist.md |
| Milepost/emergency | protected-areas.md → site-inventory.md → qa-checklist.md |
| Weather/radar/alerts | protected-areas.md → site-inventory.md → ui-style-guide.md → qa-checklist.md |
| Timesheet/payroll | protected-areas.md → site-inventory.md → ui-style-guide.md → qa-checklist.md; active runtime is pages/timesheet.html |
| Work Order/DC-144/PWA/storage | protected-areas.md → project-reference.md → qa-checklist.md |
| Repository orientation | site-inventory.md → project-reference.md |
| Report/handoff | reporting-rules.md |
| Standards maintenance | INDEX.md → project-reference.md → qa-checklist.md |

Do not read the entire project reference by default. Use its contents links
and this router to select sections.

## Document map

| Document | Canonical purpose |
| --- | --- |
| ui-style-guide.md | Shared design language, tokens, component rules, responsive behavior, accessibility, animation safety, and page-family exceptions |
| site-inventory.md | As-built page, data, script, infrastructure, ownership, and compatibility map |
| qa-checklist.md | Repeatable visual, functional, accessibility, storage, data, PWA, and regression checks |
| new-tool-page-template.html | Copyable static-page starter with the required shell, pre-paint theme, transitions, modal, toast, and accessibility patterns |
| protected-areas.md | Fragile systems, immutable contracts, regression checks, rollback boundaries, storage/IDB/PWA inventory |
| project-reference.md | Current architecture and historical context in searchable sections; not a default full read |
| standards-provenance.md | Completed-chat evidence, recurring-fix register, and documentation audit trail |
| BRIDGE_INDEX_CHUNK_ARCHITECTURE.md | As-built Bridge index/chunk schemas and runtime behavior |
| BRIDGE_DATA_EXTRACTION_PLAN.md | Bridge data provenance, migration history, validation, and future-safe extraction rules |
| reporting-rules.md | Token-saving status and final-report format |

## Current file map

### Application shell and PWA

- index.html — Field Tools Hub command center.
- css/field-ui.css — shared shell/tokens/components.
- service-worker.js — protected cache, offline, update, and notification
  receiver.
- manifest.json — protected install metadata.
- assets/icons/ — app icons and favicons.
- assets/hero/ — existing lightweight hub hero art.

### Pages

- pages/njsearch.html — Bridge Navigator.
- pages/njfuel.html — Fuel Finder.
- pages/milemarker.html — Milepost Finder.
- pages/emergency.html — Emergency Assistance.
- pages/weather.html — Weather/radar/alerts.
- pages/timesheet.html — active Timesheet Tracker payroll runtime.
- pages/dc144.html and js/dc144.js — DC-144.
- pages/WorkOrderCloseout.html — Work Order PDF; inspect sparingly.

### Data and logic

- data/bridges/index.json and data/bridges/chunks/by-county/ — Bridge index
  and full county records.
- data/njfuel.json — Fuel stations.
- data/mileposts/ — Milepost source/index/chunks.
- data/roadways/index.json and data/roadways/chunks/ — generated roadway
  centerlines, route identity, role, and calibrated measures.
- data/dc144-template.xlsx — DC-144 export template.
- js/milepost-lookup.js — shared milepost lookup adapter.
- js/roadway-lookup.js — shared conservative roadway matcher.
- tools/ — validators, index builders, and deterministic regression tests.
- cloudflare/njdot-511-proxy.js — optional 511NJ RSS proxy with short caching.

Timesheet payroll note: the redesign uses additive redesign* settings and
entry fields for Monday-Sunday allocation, optional 35-hour agreements,
lunch/commute deductions, holiday credit, Cash/XP overtime, Emergency rates,
and carry-over segments. Read protected-areas.md and qa-checklist.md before
changing either calculator.

The hub shows a one-time, index-only release summary for the current update;
it has no persistent visible trigger and records dismissal with the additive
localStorage key ft_hub_whats_new_2026_08_v1.

The redesign also stores an additive per-entry calculation snapshot for pay
inputs that affect historical results. Later rate, threshold, lunch, or
holiday-default changes apply to new entries without rewriting completed
calculations. Its current-day leave countdown includes commute-in and unpaid
lunch only for the active day, and the page grid is background-only with
reduced-motion support.

## Default workflow

1. Read the root routing file and this index.
2. Use rg to find the relevant symbol, key, class, path, or data field.
3. Read the routed document sections before changing code.
4. Check git status and preserve unrelated user changes.
5. For protected work, write a short plan, make the smallest change, and run
   the documented regression checks.
6. For UI work, inspect at least one mobile and one desktop rendering.
7. Run docs/qa-checklist.md checks appropriate to the surface.
8. Audit the diff, links, keys, and stale references before reporting.

## Hard reminders

- Never dump pages/WorkOrderCloseout.html.
- Never rename or clear existing localStorage, sessionStorage, or IndexedDB
  contracts.
- Do not add visible agency branding without an approved official asset.
- Timesheet design work uses the active pages/timesheet.html route, which
  must preserve the shared payroll storage contract.
- Running chats do not provide standards. Re-check their final state before
  recording guidance.
- For chat-derived standards or recurring fixes, use
  docs/standards-provenance.md, then update the detailed routed document.
- Do not commit, push, merge, deploy, or bump version without explicit
  authorization in the latest user message.
