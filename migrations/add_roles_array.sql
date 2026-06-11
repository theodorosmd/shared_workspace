-- Add roles[] column to support multiple roles per user
alter table public.users
  add column if not exists roles text[] default '{}';

-- Populate from existing single role
update public.users
  set roles = array[role]
  where roles is null or roles = '{}';
