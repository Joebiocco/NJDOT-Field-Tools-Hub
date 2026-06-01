-- docs/cloud-sync-schema-draft.sql
-- =============================================================================
-- Team Cloud Sync — Supabase schema DRAFT (planning only)
-- =============================================================================
-- THIS IS A DRAFT SKETCH. Do NOT run against a production database.
-- It is intentionally minimal (not an enterprise system) and is meant to be
-- reviewed/edited before any test deployment.
--
-- Design principles encoded below:
--   * Local-first: the app keeps working offline; the cloud is a sync target.
--   * Private-by-default: every user-data row is owned by `owner_user_id`
--     (defaults to auth.uid()) and is invisible to other users.
--   * Admin-approved access: cloud sync (read/write) is gated on an APPROVED
--     profile. A logged-in but unapproved user must not be able to read or
--     write any synced data.
--   * Normal users CANNOT approve themselves (approval columns are not
--     self-updatable; approval is done via Supabase Dashboard first, or a
--     secure server-side Edge Function later — never with a privileged key in
--     the browser).
--   * Sharing is explicit and additive (projects / project_members), and never
--     rewrites ownership.
--   * No service-role / secret key is ever assumed in client/browser logic.
--     The frontend uses only the Supabase URL + anon/publishable key; RLS does
--     the enforcement.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Helper: is the current user an APPROVED, non-disabled profile?
-- SECURITY DEFINER so it can read `profiles` without recursive RLS issues.
-- Referenced by every sync-data policy so unapproved users get nothing.
-- -----------------------------------------------------------------------------
create or replace function public.is_approved(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and p.approved = true
      and p.disabled_at is null
  );
$$;

-- Helper: is the current user an admin? (admins may approve others)
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin' and p.disabled_at is null
  );
$$;

-- Helper: does the user have at least `min_role` on a project?
-- (Kept SECURITY DEFINER to avoid recursive RLS on project_members.)
create or replace function public.has_project_access(pid uuid, uid uuid, min_role text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = pid
      and m.user_id = uid
      and case min_role
            when 'viewer' then m.role in ('viewer','editor','owner')
            when 'editor' then m.role in ('editor','owner')
            else m.role = 'owner'
          end
  );
$$;


-- =============================================================================
-- profiles — one row per user; identity + APPROVAL fields + preferences.
-- id == auth user id (auth.users.id).
-- =============================================================================
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  full_name           text,            -- optional
  organization        text,            -- optional
  reason              text,            -- optional: why access is requested
  role                text not null default 'user',   -- 'user' | 'admin'
  approved            boolean not null default false,  -- CLOUD SYNC GATE
  access_requested_at timestamptz default now(),
  approved_at         timestamptz,
  approved_by         uuid references public.profiles (id),
  disabled_at         timestamptz,
  prefs               jsonb default '{}'::jsonb,        -- e.g. {"dark":true}
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read their own profile (to see pending/approved state).
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

-- Admins can read all profiles (for an approval workflow / future admin panel).
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin(auth.uid()));

-- A user can insert ONLY their own profile row (the "Request access" step),
-- and only as an unapproved, non-admin user. They cannot self-approve.
create policy profiles_insert_self on public.profiles
  for insert with check (
    id = auth.uid()
    and approved = false
    and role = 'user'
    and approved_by is null
    and approved_at is null
  );

-- A user may update only "safe" fields on their own profile (name/org/prefs).
-- NOTE: RLS USING/WITH CHECK cannot by itself forbid changing approved/role.
-- Enforce that with a BEFORE UPDATE trigger (below) so normal users cannot
-- escalate approved/role/approved_by/approved_at/disabled_at.
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Admins may update any profile (this is how approval happens server-side /
-- via Dashboard or a secure Edge Function — never a browser privileged key).
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin(auth.uid()));

-- Trigger: block self-escalation of privileged columns by non-admins.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    -- normal users cannot change any approval/role columns
    if new.approved   is distinct from old.approved   or
       new.role       is distinct from old.role        or
       new.approved_by is distinct from old.approved_by or
       new.approved_at is distinct from old.approved_at or
       new.disabled_at is distinct from old.disabled_at then
      raise exception 'not authorized to change approval/role fields';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_guard_profile_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();


-- =============================================================================
-- devices — registered devices per user (for sync diagnostics).
-- =============================================================================
create table public.devices (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  device_id     text not null,        -- matches the local ft_device_id
  label         text,
  last_seen     timestamptz default now(),
  created_at    timestamptz not null default now(),
  unique (owner_user_id, device_id)
);

alter table public.devices enable row level security;

create policy devices_owner_all on public.devices
  for all
  using (owner_user_id = auth.uid() and public.is_approved(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_approved(auth.uid()));


-- =============================================================================
-- projects + project_members — optional, explicit sharing unit (for LATER).
-- Private data does not require a project. Sharing is additive only.
-- =============================================================================
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name          text not null,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  deleted_at    timestamptz
);

alter table public.projects enable row level security;

create policy projects_owner_all on public.projects
  for all
  using (owner_user_id = auth.uid() and public.is_approved(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_approved(auth.uid()));

-- Members can read projects they belong to.
create policy projects_member_select on public.projects
  for select using (
    public.is_approved(auth.uid())
    and public.has_project_access(id, auth.uid(), 'viewer')
  );

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null default 'viewer',   -- 'viewer' | 'editor' | 'owner'
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.project_members enable row level security;

-- A user can see their own memberships.
create policy pm_select_self on public.project_members
  for select using (user_id = auth.uid());

-- Project owners manage membership (insert/update/delete).
create policy pm_owner_manage on public.project_members
  for all
  using (
    public.is_approved(auth.uid())
    and exists (select 1 from public.projects p
                where p.id = project_id and p.owner_user_id = auth.uid())
  )
  with check (
    public.is_approved(auth.uid())
    and exists (select 1 from public.projects p
                where p.id = project_id and p.owner_user_id = auth.uid())
  );


-- =============================================================================
-- Reusable column set for user-data tables (documented, not a real macro):
--   id              uuid pk default gen_random_uuid()
--   owner_user_id   uuid not null default auth.uid()  -- private-by-default
--   project_id      uuid null                         -- optional sharing
--   client_record_id text                             -- maps to local key
--   device_id       text                              -- last writer device
--   created_at      timestamptz default now()
--   updated_at      timestamptz
--   updated_by      uuid
--   version         int default 1                     -- conflict detection
--   deleted_at      timestamptz                       -- tombstone (soft delete)
--
-- Standard policy pattern for each table (private + approved, plus optional
-- shared-project read/write). Shown in full for dc144_sessions; the same
-- pattern applies to the others (abbreviated to keep this draft readable).
-- =============================================================================


-- =============================================================================
-- dc144_sessions — DC-144 form sessions (JSON sections; signature ref).
-- HIGH conflict risk -> keep `version`/`updated_at` for conflict detection.
-- =============================================================================
create table public.dc144_sessions (
  id               uuid primary key default gen_random_uuid(),
  owner_user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id       uuid references public.projects (id) on delete set null,
  client_record_id text,             -- local photoKey (e.g. 'pk_169...')
  device_id        text,
  tab              text,             -- a|b|c|d
  header           jsonb,
  item_header      jsonb,
  section          jsonb,
  signature_ref    text,             -- attachments path or null
  summary          jsonb,            -- rowCount/photoCount to rebuild local recent cache
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  updated_by       uuid,
  version          int not null default 1,
  deleted_at       timestamptz,
  unique (owner_user_id, client_record_id)
);

alter table public.dc144_sessions enable row level security;

-- Owner full access (only when approved).
create policy dc144_owner_all on public.dc144_sessions
  for all
  using (owner_user_id = auth.uid() and public.is_approved(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_approved(auth.uid()));

-- Shared-project read (viewer+).
create policy dc144_project_select on public.dc144_sessions
  for select using (
    public.is_approved(auth.uid())
    and project_id is not null
    and public.has_project_access(project_id, auth.uid(), 'viewer')
  );

-- Shared-project write (editor+).
create policy dc144_project_write on public.dc144_sessions
  for update using (
    public.is_approved(auth.uid())
    and project_id is not null
    and public.has_project_access(project_id, auth.uid(), 'editor')
  ) with check (
    public.is_approved(auth.uid())
    and project_id is not null
    and public.has_project_access(project_id, auth.uid(), 'editor')
  );


-- =============================================================================
-- dc144_templates — reusable header templates (small).
-- =============================================================================
create table public.dc144_templates (
  id               uuid primary key default gen_random_uuid(),
  owner_user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id       uuid references public.projects (id) on delete set null,
  client_record_id text,             -- local tpl id
  name             text not null,
  tab              text,
  header           jsonb,
  item_header      jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  updated_by       uuid,
  version          int not null default 1,
  deleted_at       timestamptz,
  unique (owner_user_id, client_record_id)
);
alter table public.dc144_templates enable row level security;
create policy dc144_tpl_owner_all on public.dc144_templates
  for all using (owner_user_id = auth.uid() and public.is_approved(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_approved(auth.uid()));
-- (optional shared-project read/write policies mirror dc144_sessions)


-- =============================================================================
-- workorder_sessions — Work Order closeouts. HIGH conflict risk.
-- =============================================================================
create table public.workorder_sessions (
  id               uuid primary key default gen_random_uuid(),
  owner_user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id       uuid references public.projects (id) on delete set null,
  client_record_id text,             -- local photoKey
  device_id        text,
  top              jsonb,            -- wo, str, route, direction, mp, dates, priority
  pages            jsonb,            -- per-page non-photo field data
  page_count       int,
  is_closeout      boolean,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  updated_by       uuid,
  version          int not null default 1,
  deleted_at       timestamptz,
  unique (owner_user_id, client_record_id)
);
alter table public.workorder_sessions enable row level security;
create policy wo_owner_all on public.workorder_sessions
  for all using (owner_user_id = auth.uid() and public.is_approved(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_approved(auth.uid()));
-- (optional shared-project read/write policies mirror dc144_sessions)


-- =============================================================================
-- timesheet_entries — one row per entry (low conflict risk; LWW acceptable).
-- =============================================================================
create table public.timesheet_entries (
  id               uuid primary key default gen_random_uuid(),
  owner_user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  client_record_id text,             -- local entry id (e.g. 'e169...')
  device_id        text,
  entry_date       date,
  start_time       text,             -- 'HH:MM'
  stop_time        text,
  break_min        int,
  rate_type        text,             -- Normal | Cash | XP | Emergency
  emergency_rate   numeric,
  job              text,
  act              text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  updated_by       uuid,
  deleted_at       timestamptz,
  unique (owner_user_id, client_record_id)
);
alter table public.timesheet_entries enable row level security;
-- Timesheet data is typically personal-only (rarely shared).
create policy ts_entries_owner_all on public.timesheet_entries
  for all using (owner_user_id = auth.uid() and public.is_approved(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_approved(auth.uid()));


-- =============================================================================
-- timesheet_settings — exactly one row per user.
-- =============================================================================
create table public.timesheet_settings (
  owner_user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  settings         jsonb not null default '{}'::jsonb,  -- rate, otMultiplier, etc.
  device_id        text,
  updated_at       timestamptz default now()
);
alter table public.timesheet_settings enable row level security;
create policy ts_settings_owner_all on public.timesheet_settings
  for all using (owner_user_id = auth.uid() and public.is_approved(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_approved(auth.uid()));


-- =============================================================================
-- bridge_bookmarks / fuel_bookmarks — one row per bookmark (LWW; low risk).
-- =============================================================================
create table public.bridge_bookmarks (
  id               uuid primary key default gen_random_uuid(),
  owner_user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id       uuid references public.projects (id) on delete set null,
  structure_number text not null,    -- raw Structure_Number
  device_id        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  deleted_at       timestamptz,
  unique (owner_user_id, structure_number)
);
alter table public.bridge_bookmarks enable row level security;
create policy bridge_bm_owner_all on public.bridge_bookmarks
  for all using (owner_user_id = auth.uid() and public.is_approved(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_approved(auth.uid()));

create table public.fuel_bookmarks (
  id               uuid primary key default gen_random_uuid(),
  owner_user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id       uuid references public.projects (id) on delete set null,
  fuel_key         text not null,    -- 'lat.toFixed(5),lng.toFixed(5)' composite
  lat              numeric,
  lng              numeric,
  device_id        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  deleted_at       timestamptz,
  unique (owner_user_id, fuel_key)
);
alter table public.fuel_bookmarks enable row level security;
create policy fuel_bm_owner_all on public.fuel_bookmarks
  for all using (owner_user_id = auth.uid() and public.is_approved(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_approved(auth.uid()));


-- =============================================================================
-- attachments — photo/file METADATA only. Bytes live in Supabase Storage.
-- Access INHERITS the parent record (same owner / same project).
-- =============================================================================
create table public.attachments (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  record_type   text not null,       -- 'dc144_session' | 'workorder_session'
  record_id     uuid not null,       -- FK-by-convention to the parent row id
  project_id    uuid references public.projects (id) on delete set null,
  storage_path  text not null,       -- path in the private Storage bucket
  mime          text,
  bytes         bigint,
  caption       text,
  section_key   text,
  photo_index   int,
  width_px      int,
  height_px     int,
  captured_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  deleted_at    timestamptz
);
alter table public.attachments enable row level security;

-- Owner access (approved). For shared-project inheritance, add a policy that
-- checks has_project_access(project_id, auth.uid(), 'viewer'/'editor').
create policy attachments_owner_all on public.attachments
  for all using (owner_user_id = auth.uid() and public.is_approved(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_approved(auth.uid()));
-- NOTE: the Storage bucket itself must be PRIVATE, with Storage RLS keyed on a
-- path prefix that encodes owner_user_id (and project membership for shares).


-- =============================================================================
-- sync_records (OPTIONAL) — lightweight server-side change log to support
-- efficient delta pulls ("what changed since my last pull?"). Self-only.
-- =============================================================================
create table public.sync_records (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  record_type   text not null,
  record_id     uuid not null,
  operation     text not null,       -- 'upsert' | 'delete'
  updated_at    timestamptz not null default now()
);
alter table public.sync_records enable row level security;
create policy sync_records_owner_all on public.sync_records
  for all using (owner_user_id = auth.uid() and public.is_approved(auth.uid()))
  with check (owner_user_id = auth.uid() and public.is_approved(auth.uid()));


-- =============================================================================
-- sync_queue — DOES NOT LIVE IN POSTGRES.
-- The outbound queue is LOCAL ONLY, stored in a separate IndexedDB database
-- named `ft_sync` on the client. It is never created as a Supabase table.
-- Fields (for reference): queue_id, device_id, record_type, record_id,
-- operation, payload|payload_ref, local_updated_at, cloud_updated_at,
-- sync_status (pending|synced|error|conflict), attempts, last_error.
-- The sync engine MUST verify the profile is approved before any cloud push/pull.
-- =============================================================================
