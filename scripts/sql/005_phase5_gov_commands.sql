-- StreeFlood — Phase 5 schema (government data slash commands)
-- Run after 004_phase4_chat_commands.sql.
--
-- Adds a 'gov' message type for the /tmdwarning, /tmdforecast, /rainfall,
-- /river, /floodalert, and /reservoir chat commands. The row stores WHICH
-- card was posted (`gov_kind`) plus a snapshot of that section's data at
-- post time (`gov_payload`), so the card always shows the figures from the
-- moment the user typed the command — not whatever is current on reload.

alter table messages add column if not exists gov_kind text;
alter table messages add column if not exists gov_payload jsonb;

alter table messages drop constraint if exists messages_type_check;
alter table messages add constraint messages_type_check check (type in ('text', 'ai', 'sensor', 'gov'));

-- No RLS changes needed — same insert/select policies as every other
-- message type from 002_phase2_community.sql.
