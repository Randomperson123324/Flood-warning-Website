-- StreeFlood — Phase 4 schema (community chat slash commands)
-- Run after 002_phase2_community.sql.
--
-- Extends the existing `messages` table with a `type` discriminator so
-- `/AI` exchanges and `/sensor` info cards posted in community chat persist
-- and sync in realtime exactly like plain text messages, instead of living
-- only in client-side React state (which vanished on refresh).

alter table messages add column if not exists type text not null default 'text';
alter table messages add column if not exists ai_question text;
alter table messages add column if not exists ai_answer text;
alter table messages add column if not exists sensor_id text references sensors(sensor_id) on delete set null;

do $$
begin
  alter table messages add constraint messages_type_check check (type in ('text', 'ai', 'sensor'));
exception when duplicate_object then null;
end $$;

create index if not exists idx_messages_type on messages(type);

-- No RLS changes needed — the existing "Authenticated users can send
-- messages" (insert) and "Anyone can read messages" (select) policies from
-- 002_phase2_community.sql already cover these rows, since they're
-- inserted with the same `user_id = auth.uid()` shape as regular text.
