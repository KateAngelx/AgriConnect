-- AgriConnect schema for the Supabase SQL editor.
-- Setup:
--   1. Run this file in Supabase → SQL → New query.
--   2. Run supabase/seed.sql to load starter marketplace data (optional but recommended for preview).
--   3. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local.
--
-- The app loads all records from Supabase on the server (no hardcoded catalog in the app).
-- Writes use SUPABASE_SERVICE_ROLE_KEY. Do not expose the service role key in NEXT_PUBLIC_* variables.

create table if not exists profiles (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('buyer', 'seller', 'delivery', 'admin')),
  status text not null check (status in ('approved', 'pending', 'rejected', 'suspended')),
  seller_id text,
  service_area text default '',
  created_at timestamptz default now()
);

-- Run on existing databases: stores multi-role access (buyer + seller + delivery + admin).
alter table profiles add column if not exists roles jsonb default '["buyer"]'::jsonb;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists phone_verified boolean default false;
alter table profiles add column if not exists delivery_addresses jsonb default '[]'::jsonb;
-- For new installs, prefer nullable email + partial unique indexes (see supabase/migrations/002_phone_profiles.sql).

create table if not exists categories (
  id text primary key,
  name text not null,
  description text default '',
  image jsonb default '{}'::jsonb
);

create table if not exists sellers (
  id text primary key,
  farm_name text not null,
  location text default '',
  status text not null,
  description text default '',
  owner_id text,
  image jsonb default '{}'::jsonb
);

create table if not exists products (
  id text primary key,
  name text not null,
  description text default '',
  price numeric not null,
  unit text not null,
  stock integer not null default 0,
  location text default '',
  status text not null default 'active',
  pickup boolean not null default true,
  delivery boolean not null default true,
  category_id text,
  seller_id text,
  created_at timestamptz default now(),
  images jsonb default '[]'::jsonb
);

create table if not exists orders (
  id text primary key,
  reference text not null,
  buyer_id text not null,
  buyer_name text default '',
  buyer_email text default '',
  fulfillment text not null,
  contact_number text default '',
  delivery_address text default '',
  instructions text default '',
  payment_method text not null,
  payment_status text not null,
  status text not null,
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  created_at timestamptz default now(),
  items jsonb not null default '[]'::jsonb
);

create table if not exists deliveries (
  id text primary key,
  order_id text not null,
  courier_id text,
  status text not null,
  commission numeric not null default 0,
  commission_status text not null default 'pending',
  note text default '',
  updates jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists payments (
  id text primary key,
  order_id text not null,
  method text not null,
  amount numeric not null,
  status text not null,
  provider text not null,
  provider_reference text default '',
  created_at timestamptz default now()
);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  title text not null,
  body text default '',
  href text default '',
  read boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists carts (
  id text primary key,
  buyer_id text not null unique,
  items jsonb not null default '[]'::jsonb
);

create table if not exists wishlist_items (
  id text primary key,
  buyer_id text not null,
  product_id text not null,
  unique (buyer_id, product_id)
);

create table if not exists sessions (
  token text primary key,
  user_id text not null
);

create table if not exists role_applications (
  id text primary key,
  user_id text not null,
  application_type text not null check (application_type in ('seller', 'delivery')),
  status text not null check (status in ('draft', 'pending', 'under-review', 'approved', 'rejected', 'needs-info')),
  payload jsonb not null default '{}'::jsonb,
  admin_note text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists role_applications_user_id_idx on role_applications (user_id);
create index if not exists role_applications_status_idx on role_applications (status);

alter table profiles enable row level security;
alter table categories enable row level security;
alter table sellers enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table deliveries enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;
alter table carts enable row level security;
alter table wishlist_items enable row level security;
alter table sessions enable row level security;
alter table role_applications enable row level security;

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);

drop policy if exists "public read approved sellers" on sellers;
create policy "public read approved sellers" on sellers for select using (status = 'approved');

drop policy if exists "public read active products" on products;
create policy "public read active products" on products for select using (status = 'active');

-- Server sync uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS, still needs table GRANTs).
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
