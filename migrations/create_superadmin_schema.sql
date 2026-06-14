-- ── Superadmin database schema ────────────────────────────────────────────────

-- Custom roles (user-created roles beyond built-ins)
create table if not exists public.custom_roles (
  id          text primary key,           -- slug, e.g. "regional_manager"
  label       text not null,              -- display name
  description text,
  created_at  timestamptz default now()
);
alter table public.custom_roles enable row level security;
create policy "superadmins_manage_custom_roles" on public.custom_roles
  for all using (exists (select 1 from public.users where id = auth.uid() and role = 'superadmin'));

-- Role permissions matrix
create table if not exists public.role_permissions (
  id      uuid primary key default gen_random_uuid(),
  role    text not null,    -- role slug (built-in or custom)
  module  text not null,    -- e.g. "users", "programs", "channels"
  action  text not null,    -- "view" | "create" | "edit" | "delete"
  unique (role, module, action)
);
alter table public.role_permissions enable row level security;
create policy "superadmins_manage_role_permissions" on public.role_permissions
  for all using (exists (select 1 from public.users where id = auth.uid() and role = 'superadmin'));
-- All authenticated users can read permissions (for frontend enforcement)
create policy "users_read_role_permissions" on public.role_permissions
  for select using (auth.role() = 'authenticated');

-- Support tickets
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  subject     text not null,
  body        text,
  status      text not null default 'open',  -- open | in_progress | resolved | closed
  priority    text not null default 'medium', -- low | medium | high | urgent
  user_id     uuid references auth.users(id),
  user_email  text,
  assigned_to uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.support_tickets enable row level security;
create policy "users_view_own_tickets" on public.support_tickets
  for select using (user_id = auth.uid() or exists (select 1 from public.users where id = auth.uid() and role in ('superadmin','admin')));
create policy "users_create_tickets" on public.support_tickets
  for insert with check (auth.role() = 'authenticated');
create policy "admins_update_tickets" on public.support_tickets
  for update using (exists (select 1 from public.users where id = auth.uid() and role in ('superadmin','admin')));

-- Ticket replies
create table if not exists public.ticket_replies (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid references public.support_tickets(id) on delete cascade,
  author_id   uuid references auth.users(id),
  body        text not null,
  is_internal boolean default false,
  created_at  timestamptz default now()
);
alter table public.ticket_replies enable row level security;
create policy "ticket_reply_access" on public.ticket_replies
  for all using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = auth.uid()))
    or exists (select 1 from public.users where id = auth.uid() and role in ('superadmin','admin'))
  );

-- Channels (broadcast channels / streams)
create table if not exists public.channels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  type        text not null default 'vod',   -- live | vod
  stream_url  text,
  status      text not null default 'active', -- active | inactive
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
);
alter table public.channels enable row level security;
create policy "admins_manage_channels" on public.channels
  for all using (exists (select 1 from public.users where id = auth.uid() and role in ('superadmin','admin')));
create policy "users_view_channels" on public.channels
  for select using (auth.role() = 'authenticated');

-- EPG schedule (Electronic Programme Guide)
create table if not exists public.epg_schedule (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid references public.channels(id) on delete cascade,
  program_id  uuid,            -- references programs table if needed
  title       text not null,
  description text,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  created_at  timestamptz default now()
);
alter table public.epg_schedule enable row level security;
create policy "admins_manage_epg" on public.epg_schedule
  for all using (exists (select 1 from public.users where id = auth.uid() and role in ('superadmin','admin')));
create policy "users_view_epg" on public.epg_schedule
  for select using (auth.role() = 'authenticated');
