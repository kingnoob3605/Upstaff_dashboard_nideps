-- supabase/migrations/20260508_audit_log.sql
-- Week 4 — audit log for sensitive actions (invites, password changes, role changes).

create table if not exists public.audit_log (
  id        bigserial primary key,
  user_id   uuid references auth.users(id) on delete set null,
  action    text not null,
  detail    jsonb default '{}'::jsonb,
  ip        text,
  ts        timestamptz not null default now()
);

create index if not exists audit_log_user_id_idx on public.audit_log (user_id);
create index if not exists audit_log_action_idx  on public.audit_log (action);
create index if not exists audit_log_ts_idx      on public.audit_log (ts desc);

alter table public.audit_log enable row level security;

-- HR can read everything, others read only their own rows.
drop policy if exists audit_log_select_self on public.audit_log;
create policy audit_log_select_self on public.audit_log
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'hr'
    )
  );

-- Inserts only happen via service-role-key (edge functions). No anon insert.
drop policy if exists audit_log_no_anon_insert on public.audit_log;
create policy audit_log_no_anon_insert on public.audit_log
  for insert with check (false);
