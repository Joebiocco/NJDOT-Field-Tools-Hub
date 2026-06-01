# docs/cloud-sync-plan.md — Team Cloud Sync Planning

> **Status: PLANNING ONLY.** No runtime code, login UI, Supabase client, sync engine,
> or save hooks are implemented yet. This document records the agreed direction so
> implementation can proceed in small, reviewable phases. Nothing here changes app
> behavior. Do not treat any SQL/UX text as final until the open decisions (§12) are made.

---

## 1. Current baseline

- **Static GitHub Pages PWA** — no backend, no build step, no frameworks (vanilla HTML/CSS/JS).
- **Local-first storage:** `localStorage`, `sessionStorage`, IndexedDB (`ft_photos` db), plus the
  service-worker offline cache.
- Baseline commit: `370e10b — Merge map UI consistency refresh`.
- App version / SW cache: `v1.31 · 2026-06-01` / `ft-v1.31-2026-06-01`.
- **Backend chosen: Supabase.**
- **Private-by-default:** every record belongs to its creator (`owner_user_id`) and is invisible
  to others unless explicitly shared later.
- **Automatic sync on save/autosave:** sync is triggered by the *existing* save/autosave points —
  not a separate "backup" button.
- **No cloud-only rewrite.** The app must keep working fully offline. Cloud sync is an additive
  layer on top of the current local-first stores; local remains the runtime source of truth until
  a write is confirmed `synced`.
- **Manual backup/restore is NOT the main workflow.** It may exist later only as optional safety
  tooling.

---

## 2. Account / auth access model (admin-approved)

The signup flow is a **request for access**, not unrestricted instant signup. A new user can keep
using local tools immediately, but **cloud sync stays disabled until an admin approves the account.**

Flow:

1. A visible **"Create account"** link/button is offered (planned for the homepage header / an auth
   shell — not built yet).
2. User enters basic info (email; optionally full name, organization, reason).
3. The final submit button says **"Request access"** (never "Sign up" / "Create" as a terminal action).
4. On submit, a profile/request is created or recorded with **`approved = false`** and
   `access_requested_at` set.
5. User sees a **pending approval** state.
6. An **admin must approve** the account (`approved = true`, `approved_at`, `approved_by`) before
   cloud sync is enabled.
7. **Local tools still work while pending** — the app does not block local use.
8. **Cloud sync must not pull or push** for unapproved users. The sync engine checks approval first.
9. Approval **does not** let users see each other's data. Approval only enables a user's *own*
   private cloud sync.
10. **User data stays private by `owner_user_id`.** Sharing remains explicit and opt-in, later,
    through project/team/share tables.

### Recommended UX text (to implement later — documented now)

- Link / button: **"Create account"**
- Submit button: **"Request access"**
- After request submitted (pending):
  > "Access request submitted. Your account is pending admin approval. Local tools still work on
  > this device, but cloud sync is disabled until approval."
- Logged in but not approved:
  > "Your account is pending admin approval. Local tools still work on this device, but cloud sync
  > is disabled."

---

## 3. Current local storage audit summary

Verified against `main @ 370e10b`. (Full per-key table in §4 of the prior audit; condensed here.)

### Global / homepage (`index.html`)
- `ft_last` (localStorage) — last tool opened; string; powers "Continue". **Device-only.**
- `field_dark_mode` (localStorage) — theme; only `index.html` writes it; tools read-only.
- `ft_install_shown` / `ft_bookmark_shown` (localStorage) — install/bookmark banner counters. **Device-only.**
- `ft_opening_from_hub` / `ft_returning_to_hub` (sessionStorage) — nav animation flags. **Device-only/ephemeral.**
- `beforeinstallprompt` deferred event — in-memory only.

### Bridge (`pages/njsearch.html`)
- `ft_bridge_bookmarks` (localStorage) — array of `Structure_Number` strings; `toggleBookmark()` ~L1649.
- `ft_bridge_guide_shown` — guide counter. **Device-only.**

### Fuel (`pages/njfuel.html`)
- `ft_fuel_bookmarks` (localStorage) — array of `_fuelKey` = `"lat.toFixed(5),lng.toFixed(5)"`; `toggleFuelBookmarkClick()` ~L1196.
- `ft_fuel_guide_shown` — guide counter. **Device-only.**

### Milepost (`pages/milemarker.html`)
- No persistent user data. Writes `ft_last`; reads `field_dark_mode`.

### Timesheet (`pages/timesheet.html`)
- `ft_ts_entries` (localStorage) — array `{id,date,start,stop,breakMin,rateType,emergencyRate,job,act,notes}`; `storeEntries()` L1047, explicit save.
- `ft_ts_settings` (localStorage) — `{hourlyRate,otMultiplier,otThresholdHrs,breakDefault,timeFormat,defaultView,weekStart}`; `storeSettings()` L1052, change-listener autosave.
- `ft_ts_ppoffset` (localStorage) — int pay-period scroll offset; `savePpOffset()` L1504. **Device-only.**
- `ft_pc_guide_shown` — guide counter. **Device-only.**

### DC-144 (`pages/dc144.html` + `js/dc144.js`)
- `ft_dc144_recent` (localStorage) — array (max 25) of session metadata `{photoKey,tab,projectName,contractId,date,inspectorName,rowCount,photoCount,savedAt}`; `saveRecent()` L329. **Derived cache.**
- `ft_dc144_templates` (localStorage) — array (max 100) `{id,name,tab,createdAt,header,itemHeader}`; `saveTemplatesArr()` L796.
- `ft_dc144_guide_shown` — guide counter. **Device-only.**
- IndexedDB `dc144_sessions` (db `ft_photos`, **v2**) — full session payload incl. `header`, `itemHeader`, `section`, `inspectorSignature` (base64), `photos[]` (base64); `dbPutDC144()` L291, **2s debounce autosave** via `performAutosave()` L531.

### Work Order (`pages/WorkOrderCloseout.html`)
- `wo_recent` (localStorage) — array `{wo,str,date,fname,route,direction,mp,startDate,endDate,priority,photoKey}`; `saveRecentList()` L1496, explicit save (L2167). **Index.**
- `workorder_draft` (localStorage) — **read at L2296, removed at L3028, never written** (see §10 / verification). Treat as legacy/vestigial.
- IndexedDB `session_photos` (db `ft_photos`, **v1**) — `{photos:[[base64,…]],pageData:[{…}],pageCount,isCloseout}` keyed by `photoKey`; `dbPutPhotos()` L1522, explicit save (L2280).
- `ft_wo_guide_shown` — guide counter. **Device-only.**

### Photos / attachments
- All photos are **base64 data URLs** embedded inside the DC-144 session object and the WO photo
  object in IndexedDB. ~30–150 KB each after the existing client-side compression.
- For cloud, photos must be **externalized to Supabase Storage** with metadata rows in `attachments`
  — never synced inline in JSON rows.

### Device-only keys (never sync)
`ft_last`, `ft_ts_ppoffset`, all `ft_*_guide_shown`, `ft_install_shown`, `ft_bookmark_shown`,
`ft_opening_from_hub`, `ft_returning_to_hub`, the in-memory install prompt. (`field_dark_mode` is
device-only by default; optionally a synced *preference* later — see §12.)

---

## 4. Data classification

| Class | Keys / stores |
|---|---|
| **Sync now** (first targets) | `ft_bridge_bookmarks`, `ft_fuel_bookmarks`, `ft_ts_settings`, `ft_ts_entries` |
| **Sync later** (higher risk / bigger payload) | DC-144 `dc144_sessions`, `ft_dc144_templates`, WO `wo_recent`+`session_photos`, photos→`attachments` |
| **Never sync / device-only** | `ft_last`, `ft_ts_ppoffset`, `ft_*_guide_shown`, `ft_install_shown`, `ft_bookmark_shown`, session nav flags, install prompt state |
| **Derived caches (NOT cloud source-of-truth)** | `ft_dc144_recent`, `wo_recent` — rebuild these locally from synced session rows; do not sync them as independent records (avoids double-write conflicts) |
| **Preference (optional sync)** | `field_dark_mode` → could map to `profiles.prefs` if desired |

---

## 5. Recommended architecture

Local-first automatic sync. Every save path becomes:

1. **Save locally first**, exactly as today (protected logic untouched).
2. **Enqueue** a local sync item in the `ft_sync` queue (see §9).
3. **Push to Supabase only when** logged in **AND** online **AND** the profile is **approved**.
4. **Retry** pending items with backoff; flush on reconnect.
5. **Pull on login / another device** only when approved; merge into local stores.
6. **Tombstones** for deletes (`deleted_at`) so deletions propagate.
7. **Conflict detection** for high-risk records (DC-144, Work Order): if the cloud row advanced since
   the local edit's base, mark `conflict` instead of overwriting. Low-risk records use
   last-write-wins on `updated_at` / `updated_by`.
8. **No sync at all for authenticated-but-unapproved users** — the engine returns early before any
   network pull/push.

Client ships **only** the Supabase URL + anon/publishable key. No service-role/secret/admin key in
the browser. Likely future module layout: `js/supabase-client.js` (thin wrapper) + `js/cloud-sync.js`
(queue + engine) + `js/auth.js` (auth shell). Supabase JS loaded via CDN/ESM to honor the no-build rule.

---

## 6. Supabase schema draft (overview)

Concrete SQL sketch lives in `docs/cloud-sync-schema-draft.sql`. Tables planned:

- `profiles` — 1 row/user; identity + **approval fields** (§7) + `prefs`.
- `devices` — registered devices per user (`device_id`, label, last_seen).
- `projects` — optional grouping/sharing unit (owner).
- `project_members` — membership + role (`viewer`/`editor`/`owner`); the sharing mechanism.
- `dc144_sessions` — DC-144 form sessions (json sections + signature ref).
- `dc144_templates` — reusable header templates.
- `workorder_sessions` — Work Order closeouts.
- `timesheet_entries` — one row per entry.
- `timesheet_settings` — 1 row/user.
- `bridge_bookmarks` — one row per bookmark (`structure_number`).
- `fuel_bookmarks` — one row per bookmark (`fuel_key`, lat, lng).
- `attachments` — photo/file metadata; bytes live in Supabase Storage; inherits parent access.
- `sync_records` (optional) — lightweight server-side change log for efficient delta pulls.
- `sync_queue` — **local-only** (IndexedDB `ft_sync`), never a server table (§9).

Common columns on user-data tables: `id uuid pk`, `owner_user_id uuid not null default auth.uid()`,
`project_id uuid null`, `client_record_id text` (maps to local `photoKey`/entry id/bookmark value),
`device_id text`, `created_at`, `updated_at`, `updated_by`, `version int`, `deleted_at` (tombstone).

---

## 7. Profile / account approval fields (schema planning)

On `profiles`:

- `approved boolean default false` — **cloud sync gate.**
- `access_requested_at timestamptz` — when the user clicked "Request access".
- `approved_at timestamptz` — when an admin approved.
- `approved_by uuid` — admin who approved (FK to `profiles`/auth user).
- `role text default 'user'` — `'user'` | `'admin'` (admins can approve others).
- `disabled_at timestamptz` — soft-disable an account without deleting it.
- `full_name text` (optional)
- `organization text` (optional)
- `reason text` (optional — why access is requested)

Approval is **never self-serviceable**: a normal user cannot set their own `approved`/`role`. See §8.

---

## 8. RLS / security plan

- **`owner_user_id` private-by-default.** Default policy on every user-data table:
  `owner_user_id = auth.uid()` for select/insert/update/delete, with
  `WITH CHECK (owner_user_id = auth.uid())` on insert.
- **Approval gate:** sync data tables should be readable/writable **only by approved authenticated
  users**. Practically, policies require an *approved* profile, e.g. a `SECURITY DEFINER` helper
  `is_approved(auth.uid())` referenced in each policy (so an unapproved logged-in user can't read or
  write any synced rows). Local tools remain unaffected because they don't touch Supabase.
- **Shared / project rows** are visible only through **explicit** membership/share policies
  (`project_members`), gated on role (`viewer` read; `editor`/`owner` write). Sharing is additive and
  never rewrites `owner_user_id`.
- **Admins can approve users**; **normal users cannot approve themselves.** Enforce by:
  - not exposing `approved`/`role`/`approved_by` to self-update in RLS, and
  - performing approval through a privileged path (below), never from the browser with a
    privileged key.
- **No service-role / secret / admin key in browser code.** Frontend uses **Supabase URL + anon /
  publishable key only.**
- **Admin approval happens through one of (in order of preference for rollout):**
  1. **Supabase Dashboard** (simplest first — toggle `approved` manually).
  2. A **secure admin-only Edge Function** later (server-side, service role stays on the server).
  3. A **future admin panel** backed by secure server-side logic.
  - **Do not** build a browser-only admin approval that would require shipping a privileged key.
- **Attachments inherit parent access rules** (readable/writable iff the parent record is).
- **Approval does not grant access to other approved users' data** — it only enables a user's own
  private sync. Cross-user visibility requires an explicit share/membership row.

Three access tiers: **private** (`owner_user_id = auth.uid()`), **shared project** (via
`project_members` + role), **team/shared-later** (same mechanism scaled, or per-record shares).

---

## 9. Sync queue design (local-only)

- **Use a separate IndexedDB database, recommended name `ft_sync`.**
- **Do not modify `ft_photos`** (db version mismatch is a separate, pre-existing issue — see §10 /
  Task 1 verification). Keeping the queue in its own DB avoids entangling with the `ft_photos`
  version/upgrade logic entirely.
- Queue item fields:
  - `queue_id` — local autoincrement key.
  - `device_id` — persistent per-device id (new localStorage key, e.g. `ft_device_id`).
  - `record_type` — e.g. `dc144_session` | `workorder_session` | `timesheet_entry` |
    `timesheet_settings` | `bridge_bookmark` | `fuel_bookmark` | `dc144_template` | `attachment`.
  - `record_id` — `client_record_id` (photoKey / entry id / bookmark value).
  - `operation` — `upsert` | `delete`.
  - `payload` **or** `payload_ref` — inline snapshot for small records; a reference (e.g. IDB key)
    for large blobs/photos.
  - `local_updated_at` — client timestamp at enqueue.
  - `cloud_updated_at` — last known server `updated_at` (for conflict detection).
  - `sync_status` — `pending` | `synced` | `error` | `conflict`.
  - `attempts` — retry counter (exponential backoff).
  - `last_error` — last failure message for diagnostics.
- States: `pending` → `synced`; failures → `error` (retry) or `conflict` (needs resolution).
- **The sync engine must check approval before any cloud pull/push.** Unapproved (or logged-out)
  users still enqueue locally but the engine never contacts Supabase for them.

---

## 10. Save-hook map (for later — do not implement now)

Hooks are **post-local-write only** (added *after* the existing local save), must **not** modify
protected export/calc/signature/photo/map logic, and **must not run cloud operations for unapproved
users.**

| Tool | Function / area (verified) | Local target | Cloud record_type |
|---|---|---|---|
| DC-144 | `performAutosave()` `dc144.js:531` → `dbPutDC144()` L291 (2s debounce) | IDB `dc144_sessions` | `dc144_session` |
| DC-144 | `saveCurrentSessionNow()` L548 | IDB `dc144_sessions` | `dc144_session` |
| DC-144 | `addTemplate()` L800 / `deleteTemplate()` L832 | `ft_dc144_templates` | `dc144_template` |
| DC-144 | `deleteSession()` L779 → `dbDeleteDC144()` L313 | hard delete | `dc144_session` (tombstone) |
| DC-144 | `addToRecent()` L346 / `saveRecent()` L329 | `ft_dc144_recent` | — (derived; rebuild, do not sync) |
| Work Order | save handler ~L2167 → `saveRecentList()` L1496 + `dbPutPhotos()` L1522 | `wo_recent` + IDB `session_photos` | `workorder_session` (+`attachment`) |
| Work Order | `workorder_draft` (L2296 read, L3028 remove) | localStorage | — (legacy/vestigial; exclude until proven active) |
| Timesheet | `saveEntry()` L1947 → `storeEntries()` L1047 | `ft_ts_entries` | `timesheet_entry` |
| Timesheet | `saveS()` L1677 → `storeSettings()` L1052 | `ft_ts_settings` | `timesheet_settings` |
| Bridge | `toggleBookmark()` / `setBookmarks()` ~L1643-1655 | `ft_bridge_bookmarks` | `bridge_bookmark` |
| Fuel | `toggleFuelBookmarkClick()` / `setFuelBookmarks()` ~L1190-1207 | `ft_fuel_bookmarks` | `fuel_bookmark` |
| Homepage | `field_dark_mode` write `index.html:615`; `ft_last` read L668 | localStorage | optional `profiles.prefs`; `ft_last` device-only |

---

## 11. Rollout phases (planning order)

1. **Supabase setup / schema** — create test project, apply schema + RLS + Storage bucket (SQL draft only first).
2. **Auth shell** — Sign in / Create account / **Request access** / **Pending approval** / Sign out states (UI later; behind a flag).
3. **Device ID / status** — `ft_device_id`, sync status indicator.
4. **Local sync queue** — `ft_sync` IndexedDB store + enqueue/flush skeleton (no real push yet).
5. **Supabase wrapper** — upsert/delete/pull helpers, backoff, error handling.
6. **Profile / session persistence + approval check** — create profile on first login; engine
   refuses cloud ops unless `approved`.
7. **First simple sync candidate** — Bridge/Fuel bookmarks (or Timesheet settings) end-to-end.
8. **DC-144 sessions** — JSON sync (no photos yet) + conflict detection.
9. **Work Order sessions** — JSON sync (no photos yet).
10. **Attachments / photos** — externalize base64 → Storage; `attachments` rows.
11. **Sharing / projects / team UI** — `projects` + `project_members` + share policies and UI.

Manual backup/restore is intentionally **not** a phase; optional safety/export tooling can be added
later if wanted.

---

## 12. Decisions needed from you

1. **Email/password vs magic link** for auth?
2. **Does "Request access" create a Supabase Auth user immediately** (profile with `approved=false`),
   **or store a request row first** and create the auth user only on admin approval?
3. **Is admin approval initially handled through the Supabase Dashboard** (recommended first), before
   any Edge Function / admin panel?
4. **Personal sync first vs projects/sharing first?**
5. **Photo sync timing** — early, or deferred to phase 10 (recommended)?
6. **Max photo size / compression target** for cloud (current local ≈1400px long side, ~30–150 KB JPEG)?
7. **Conflict behavior** — LWW everywhere initially, or conflict-detect on DC-144/WO from day one (recommended)?
8. **Sharing in the prototype or later?**
9. **Admin/member roles needed immediately**, or single owner-only to start?
10. **Use a throwaway/test Supabase project first** (recommended)?
11. **Device-only preferences** — keep `field_dark_mode` per-device, or sync it as a preference?
