create table if not exists platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table platform_settings enable row level security;

alter table orders add column if not exists platform_fee numeric not null default 0;
alter table orders add column if not exists platform_fee_status text not null default 'none';
