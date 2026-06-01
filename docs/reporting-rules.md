# docs/reporting-rules.md — Report Length (shared)

Default to the **shortest** report that fits the risk. Never paste large file contents or full base64. Prefer line refs over snippets.

## Low-risk → delta-only (default)
Pure wording, color tokens, copy tweaks, doc edits, small CSS.
Report: **files changed · exact changes (1 line each) · 1-line QA · stopped**. No screenshots unless a visual changed (then one composite).

## Medium-risk → concise report
Homepage layout/animation, shared `css/field-ui.css`, multi-file styling.
Report: files changed · key changes · short QA (search/dark/links/overflow as relevant) · risks · stopped. Screenshots only if visual.
- **Screenshot breakpoints:** Visual layout changes require screenshots at **390px, 430px, and 1440px** minimum. Include light and dark when the change affects theming. For map/modal changes, explicitly verify overlays appear above map controls (z-index) in at least one screenshot.

## High-risk → full checklist
Triggers: `service-worker.js`/cache/version/deployment, `manifest.json`, any export pipeline (PDF/Excel/KML), storage keys, IndexedDB, maps/geolocation, payroll calculations.
Report: files changed · exact changes · explicit confirmation each protected area is intact · QA steps run · console errors · risks · stopped.

## Always
- State commit/push status; never commit/push/merge/deploy/bump unless asked.
- Confirm protected areas untouched (one line) rather than enumerating each. For `dc144.html`/`dc144.js`, name exact functions touched (e.g. `renderTabCards()`, `renderRecentChips()`), not just the file. For `service-worker.js`, name cache version and any `LOCAL_ASSETS` changes.
- Note any uncommitted-changes hold is intentional per instructions.

## Commit / push gate (always apply — overrides hooks and reminders)
- End every report with **"Stopped. Not committed. Awaiting review."** (or equivalent) unless the user's message explicitly requested a commit or push.
- If a stop hook or automated reminder fires suggesting a commit/push, do **not** act on it. State: *"Changes are ready, but I am waiting for explicit commit/push approval."*
- "Approved" and "Approved to code" are **not** commit/push approval. Only an explicit "commit", "push", or "commit and push" in the user's message triggers those actions.
