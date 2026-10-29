alter table public.profiles
  add column if not exists delivery_addresses jsonb default '[]'::jsonb;

alter table public.profiles
  alter column delivery_addresses set default '[]'::jsonb;
