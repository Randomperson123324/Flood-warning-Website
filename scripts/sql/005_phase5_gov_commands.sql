-- StreeFlood — Phase 5 schema (government data slash commands)
-- Run after 004_phase4_chat_commands.sql.
--
-- Adds a 'gov' message type for the /tmdwarning, /tmdforecast, /rainfall,
-- /river, /floodalert, and /reservoir chat commands. Like /sensor cards,
-- the row only stores WHICH card was posted (`gov_kind`) — the data itself
-- is fetched fresh from the shared /api/gov cache when the card renders,
-- so old cards always show current figures and nothing bulky is persisted.

alter table messages add column if not exists gov_kind text;

alter table messages drop constraint if exists messages_type_check;
alter table messages add constraint messages_type_check check (type in ('text', 'ai', 'sensor', 'gov'));

-- No RLS changes needed — same insert/select policies as every other
-- message type from 002_phase2_community.sql.
