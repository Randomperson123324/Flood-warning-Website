-- StreeFlood — Phase 2 schema (community features)
-- Run after 001_phase1_schema.sql.
--
-- RLS pattern: same as Phase 1 — public SELECT, but INSERT is restricted to
-- the authenticated owner (`user_id = auth.uid()`) rather than to role='dev',
-- since these are user-generated content tables, not sensor/config tables.

-- ── messages ─────────────────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  content text not null,
  reply_to uuid references messages(id) on delete set null,
  created_at timestamptz default now(),
  reply_to_content text,
  reply_to_username text
);

create index if not exists idx_messages_created_at on messages(created_at desc);

alter table messages enable row level security;
create policy "Anyone can read messages" on messages for select using (true);
create policy "Authenticated users can send messages" on messages for insert
  with check (auth.uid() = user_id);
create policy "Users can delete their own messages" on messages for delete
  using (auth.uid() = user_id);

-- Server-side rate limit: reject a message if the same user posted one less
-- than 3 seconds ago. Enforced as a trigger (not just client-side throttling)
-- so it can't be bypassed by calling the API directly.
create or replace function check_message_rate_limit() returns trigger as $$
declare
  last_sent_at timestamptz;
begin
  select created_at into last_sent_at
  from messages
  where user_id = new.user_id
  order by created_at desc
  limit 1;

  if last_sent_at is not null and (now() - last_sent_at) < interval '3 seconds' then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_message_rate_limit on messages;
create trigger trg_message_rate_limit
  before insert on messages
  for each row execute function check_message_rate_limit();

-- ── message_reactions ─────────────────────────────────────────────────────
create table if not exists message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz default now(),
  unique (message_id, user_id, reaction_type)
);

alter table message_reactions enable row level security;
create policy "Anyone can read reactions" on message_reactions for select using (true);
create policy "Authenticated users can react" on message_reactions for insert
  with check (auth.uid() = user_id);
create policy "Users can remove their own reaction" on message_reactions for delete
  using (auth.uid() = user_id);

-- ── flood_reports ────────────────────────────────────────────────────────
create table if not exists flood_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  area_name text not null,
  severity text not null check (severity in ('low', 'moderate', 'high', 'critical')),
  description text not null,
  created_at timestamptz default now()
);

create index if not exists idx_flood_reports_created_at on flood_reports(created_at desc);

alter table flood_reports enable row level security;
create policy "Anyone can read flood reports" on flood_reports for select using (true);
create policy "Authenticated users can submit reports" on flood_reports for insert
  with check (auth.uid() = user_id);
-- Inserts additionally go through /api/flood-reports, which verifies a
-- Cloudflare Turnstile token server-side before writing (see lib/turnstile.ts).

-- ── weather_votes ────────────────────────────────────────────────────────
create table if not exists weather_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  is_raining boolean,
  location text,
  created_at timestamptz default now(),
  visitor_id text
);

create index if not exists idx_weather_votes_visitor on weather_votes(visitor_id);
create index if not exists idx_weather_votes_created_at on weather_votes(created_at desc);

alter table weather_votes enable row level security;
create policy "Anyone can read weather votes" on weather_votes for select using (true);
-- Voting doesn't require an account — anonymous visitors are tracked by
-- visitor_id (a random id persisted client-side), logged-in users by user_id.
create policy "Anyone can cast a weather vote" on weather_votes for insert
  with check (
    (user_id is not null and auth.uid() = user_id) or
    (user_id is null and visitor_id is not null)
  );

-- ── announcements ────────────────────────────────────────────────────────
create table if not exists announcements (
  id bigint generated always as identity primary key,
  message text not null,
  type varchar(20) not null default 'info',
  created_at timestamptz default now(),
  is_active boolean default true
);

alter table announcements enable row level security;
create policy "Anyone can read active announcements" on announcements for select using (true);
create policy "Devs can manage announcements" on announcements for all
  using (exists (select 1 from users where users.id = auth.uid() and users.role = 'dev'));

-- ── Realtime ─────────────────────────────────────────────────────────────
-- Supabase requires tables to be added to the `supabase_realtime` publication
-- before postgres_changes subscriptions will fire. Includes Phase 1 tables
-- too, in case 001 was run before realtime was needed.
do $$
begin
  alter publication supabase_realtime add table water_readings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table message_reactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table announcements;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table flood_reports;
exception when duplicate_object then null;
end $$;
