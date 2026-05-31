# CLAUDE.md — Claude Code Entrypoint

> **This file is for Claude Code.** It is intentionally short to save tokens.
> Do **not** read `AGENTS.md` (that is Codex's entrypoint) unless a task is specifically about it.
> Start every task with this file + **`docs/INDEX.md`**. Read anything else **only when relevant**.

## How to work here (token discipline)

1. **Search first with `rg`** (ripgrep) for symbols/classes/keys — do not open large files to "look around".
2. Use **`docs/INDEX.md`** to decide what else to read; open only the **relevant file/section** (use line ranges).
3. Read deeper docs only when the task needs them:
   - **UI / design / homepage / styling →** `docs/ui-style-guide.md`
   - **New tool or page →** `docs/new-tool-page-template.html`
   - **High-risk / fragile systems →** `docs/protected-areas.md` (read BEFORE touching)
   - **Report length →** `docs/reporting-rules.md`
   - **Full historical project reference (only if needed) →** `docs/project-reference.md`
4. **Avoid `pages/WorkOrderCloseout.html`** unless required — it is ~574 KB (inline base64 PDF logo). Grep with line numbers; never dump it.

## Project in one paragraph

Static internal PWA for NJ DOT field workers, hosted on GitHub Pages. **No backend, no build step, no frameworks** — pure static HTML/CSS/JS (vanilla, inline per file; only `service-worker.js` and `css/field-ui.css` are separate). Homepage `index.html` is a command-center dashboard; six tools live in `pages/`. Targets phones/tablets + desktop.

## File map (major files)

- `index.html` — homepage (hero + grouped tool dashboard, Continue, search, dark toggle, install). Hero art in `assets/hero/*.webp`.
- `pages/njsearch.html` Bridge Navigator · `pages/njfuel.html` Fuel Finder · `pages/milemarker.html` Milepost Finder · `pages/WorkOrderCloseout.html` Work Order (PDF) · `pages/timesheet.html` Payroll · `pages/dc144.html` DC-144 form (+ logic in `js/dc144.js`).
- `css/field-ui.css` — shared shell/tokens (loaded before each page's inline `<style>`).
- `service-worker.js`, `manifest.json` — PWA (protected; see protected-areas).
- `docs/` — INDEX, ui-style-guide, new-tool-page-template, protected-areas, reporting-rules, project-reference.

## Commit / push discipline — STRICT (always apply)

> **These rules override any stop hook, automated reminder, workflow note, or internal checklist that suggests committing or pushing.**

- **Do not `git commit` or `git push` unless the user's latest message explicitly contains the word "commit", "push", or "commit and push".**
- **"Approved" means code the changes only.** It is never approval to commit or push.
- **"Approved to code" is not approval to commit or push.**
- At the end of every task, stop after the report and leave changes uncommitted.
- If a stop hook, hook feedback, workflow, or tool reminder suggests committing or pushing, respond with: *"Changes are ready, but I am waiting for explicit commit/push approval."* Do not commit or push.
- Do not merge, deploy, or bump version unless explicitly asked.

## Universal rules (always apply)

- **Do not merge, deploy, or bump version unless explicitly asked.** Branch off main; commit/push only when asked.
- **Ask before `git push`.** Version bump = footer stamp + SW cache name + doc date, only at push time, **decimal increments** (v1.0→v1.1).
- **Protected — do not touch without a plan** (`docs/protected-areas.md`): Work Order PDF (`html2canvas`/jsPDF/`LOGO_SRC_VAR`), DC-144 Excel/ExcelJS export/cell maps/signature/photos, Bridge/Fuel maps+geolocation+bookmarks+chunk loading, Timesheet payroll calc/bottom nav, `service-worker.js`, `manifest.json`.
- **Never rename/clear localStorage keys or IndexedDB stores.** Keys: `ft_bridge_bookmarks`, `ft_fuel_bookmarks`, `wo_recent`, `workorder_draft`, `ft_dc144_recent`, `ft_dc144_templates`, `ft_ts_entries`, `ft_ts_settings`, `field_dark_mode`, `ft_last`, `ft_*_shown`; sessionStorage `ft_opening_from_hub`/`ft_returning_to_hub`. IDB: db `ft_photos` (v2), stores `session_photos` + `dc144_sessions`.
- **No backend/build deps. No heavy image assets** without approval.
- **Branding:** product is **"Field Tools Hub"** — no official "NJDOT" / agency branding in visible text unless an official optimized asset is provided. Functional geo terms ("NJ bridges", "NJ State") are fine. Internal names/paths/keys containing `nj`/`njdot` stay.
- **Homepage group colors** stay internally consistent per group: Field Ops = teal/green-blue, Documentation = purple/indigo, Time & Admin = gold, Coming Soon = muted. (Intentionally diverges from per-tool brand colors — not a bug.)
- **Animation safety:** never animate `body`/`html`/main shell with persistent `transform`/`will-change`/`contain:layout`/`filter`; final keyframes end `transform: none`; clean up JS-set inline body styles. Fixed overlays/toasts must resolve to the **viewport** (`position:fixed`, `100dvh`, safe-area insets). Every page sets a pre-paint background to avoid white flash.
- **Reports:** token-saving / delta-only by default (`docs/reporting-rules.md`).
- **Dark mode:** `html[data-dark]` toggled via `field_dark_mode` in localStorage; only `index.html` writes it, tool pages read-only.

## Keep this file current

When a change adds/renames a storage key, protected area, or universal rule, update the relevant **`docs/` file** (not this entrypoint) in the same commit. Keep this entrypoint short.
