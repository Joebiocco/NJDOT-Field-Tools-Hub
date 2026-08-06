# Reporting rules

Use this document for status updates and final handoffs. The goal is a report
that is easy to scan without hiding important verification or known risk.

## Contents

- [Default report](#default-report)
- [Risk-based detail](#risk-based-detail)
- [Verification language](#verification-language)
- [Git and release gate](#git-and-release-gate)
- [Examples](#examples)

## Default report

Lead with the result. Then include:

1. What changed, grouped by user-visible outcome or file area.
2. What was verified, with exact checks or viewport/state coverage.
3. Known limitations, follow-up, or anything intentionally not changed.
4. Git state and whether commit/push was authorized.

Use links to real local files when useful. Do not paste giant files or raw
tool output. Prefer a short delta over a transcript.

## Risk-based detail

### Low-risk change

Use a concise delta:

- Result.
- Files.
- One verification line.
- Known limitation, if any.

### Medium-risk change

Add:

- behavior/state coverage;
- responsive or accessibility coverage when UI changed;
- storage/data/cache impact;
- any user-visible tradeoff.

### High-risk or protected change

Add:

- protected invariant preserved;
- focused regression commands/tests;
- browser states and widths;
- storage/IDB/PWA compatibility result;
- rollback or unresolved risk.

Protected examples include Work Order PDF, DC-144 export/photos, Bridge/Fuel
maps/chunks, roadway classification, payroll calculations/storage,
service-worker.js, and manifest.json.

## Verification language

Say “verified” only for something actually checked. Distinguish:

- “Parsed” — syntax or data parse passed.
- “Smoke-tested” — a focused interaction was exercised.
- “Audited” — a broader checklist was run and the result was reviewed.
- “Not tested” — the check remains outstanding.
- “Inferred” — a conclusion comes from code inspection, not execution.

For location, weather, and external feeds, do not claim real-world certainty
from seeded or static tests. State the safe-abstention behavior and source
limitations.

For chats, use only completed turns. If a related chat is still running, say
that its guidance was not incorporated and keep the goal active.

## Git and release gate

Do not commit or push unless the latest user message explicitly contains
commit, push, or commit and push. “Approved” and “approved to code” do not
authorize either action. Do not merge, deploy, or bump the version unless
explicitly requested.

If changes are ready but the gate is not open, use:

“Changes are ready, but I am waiting for explicit commit/push approval.”

Always report that changes remain uncommitted when that is the current state.

## Examples

### Short UI handoff

“Updated the emergency map frame and permission warning in
pages/emergency.html. Verified at 390px/1440px, keyboard focus, retry/Not now,
and no console warnings. Changes remain uncommitted.”

### Protected handoff

“Updated the roadway index/matcher while preserving PARENT_SRI identity and
abstention thresholds. Ran generated-index validation, 5,000 seeded fixes,
targeted spur/overlap cases, 100 adapter cases, and page integration checks.
No unsafe suggestions. Changes remain uncommitted.”
