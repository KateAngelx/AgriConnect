alter table public.profiles
  add column if not exists delivery_addresses jsonb default '[]'::jsonb;

alter table public.profiles
  alter column delivery_addresses set default '[]'::jsonb;

notify pgrst, 'reload schema';

-- Verification: run the following separately if the API still cannot see the column.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'delivery_addresses';
