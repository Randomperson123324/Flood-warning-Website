-- StreeFlood — Phase 1 schema
-- Run this once in the Supabase SQL editor (or `supabase db push`) on a
-- fresh project. Phase 2 adds a follow-up script for community features
-- (messages, flood_reports, weather_votes, announcements) once auth lands.
--
-- Design notes:
--  * RLS pattern used throughout: anyone can SELECT (this is public-safety
--    data), only users.role = 'dev' can INSERT/UPDATE/DELETE.
--  * `sensors` is the source of truth for "where is this sensor and what
--    are its thresholds" — site_settings is kept only for any
--    still-unmigrated single-sensor deployments and is not read by the app.

create extension if not exists "pgcrypto";

-- ── users ──────────────────────────────────────────────────────────────────
-- Minimal shape now; Phase 2 (auth) adds the signup flow that populates
-- this from auth.users. role='dev' is what every RLS write-policy below
-- checks against.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  username text not null,
  is_online boolean default false,
  last_seen timestamptz default now(),
  created_at timestamptz default now(),
  role varchar(20) not null default 'user'
);

alter table users enable row level security;
create policy "Users can read all profiles" on users for select using (true);
create policy "Users can update their own profile" on users for update using (auth.uid() = id);

-- ── sensors ─────────────────────────────────────────────────────────────────
create table if not exists sensors (
  id uuid primary key default gen_random_uuid(),
  sensor_id varchar(50) unique not null,
  label text not null,
  lat numeric(10, 6) not null,
  lon numeric(10, 6) not null,
  height_cm numeric(6, 2) not null default 19,
  warning_level_cm numeric(6, 2) not null default 5,
  danger_level_cm numeric(6, 2) not null default 10,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Only one sensor may be the default at a time.
create unique index if not exists idx_sensors_single_default
  on sensors (is_default) where is_default = true;

alter table sensors enable row level security;
create policy "Anyone can read sensors" on sensors for select using (true);
create policy "Devs can manage sensors" on sensors for all
  using (exists (select 1 from users where users.id = auth.uid() and users.role = 'dev'));

-- ── water_readings ──────────────────────────────────────────────────────────
create table if not exists water_readings (
  id bigint generated always as identity primary key,
  "timestamp" timestamptz default now(),
  level numeric not null,
  temperature numeric,
  sensor_id varchar(50) not null references sensors(sensor_id) on delete cascade,
  created_at timestamptz default now()
);

create index if not exists idx_water_readings_timestamp on water_readings("timestamp" desc);
create index if not exists idx_water_readings_sensor_time on water_readings(sensor_id, "timestamp" desc);

alter table water_readings enable row level security;
create policy "Anyone can read water readings" on water_readings for select using (true);
create policy "Devs can write water readings" on water_readings for insert
  with check (exists (select 1 from users where users.id = auth.uid() and users.role = 'dev'));
-- Ingestion services (the sensor's own writer) should use the service_role
-- key server-side, which bypasses RLS entirely — the policy above only
-- governs writes made as an authenticated app user (e.g. from Dev Settings).

-- ── affected_areas ───────────────────────────────────────────────────────────
create table if not exists affected_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  water_level_threshold numeric not null,
  lat numeric(10, 6),
  lon numeric(10, 6),
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table affected_areas enable row level security;
create policy "Anyone can read affected areas" on affected_areas for select using (true);
create policy "Devs can manage affected areas" on affected_areas for all
  using (exists (select 1 from users where users.id = auth.uid() and users.role = 'dev'));

-- ── site_settings (legacy single-sensor config; kept for compatibility) ─────
create table if not exists site_settings (
  id uuid primary key default gen_random_uuid(),
  warning_level_cm numeric(6, 2) not null default 5,
  danger_level_cm numeric(6, 2) not null default 10,
  sensor_label text default 'จุดวัดน้ำ',
  sensor_lat numeric(10, 6),
  sensor_lon numeric(10, 6),
  updated_at timestamptz default now()
);

alter table site_settings enable row level security;
create policy "Anyone can read site settings" on site_settings for select using (true);
create policy "Devs can update site settings" on site_settings for update
  using (exists (select 1 from users where users.id = auth.uid() and users.role = 'dev'));

-- ── Seed: one default sensor so a fresh install isn't empty ─────────────────
insert into sensors (sensor_id, label, lat, lon, warning_level_cm, danger_level_cm, is_default)
select 'sensor-1', 'จุดวัดน้ำหลัก', 13.7563, 100.5018, 5, 10, true
where not exists (select 1 from sensors limit 1);
