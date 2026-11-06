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

create index if not exists products_active_created_idx
  on products (created_at desc)
  where status = 'active';

create index if not exists products_seller_created_idx
  on products (seller_id, created_at desc);

create table if not exists product_reviews (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  moderation_status text not null default 'published' check (moderation_status in ('published', 'hidden', 'removed')),
  created_at timestamptz not null default now()
);

create index if not exists product_reviews_product_created_idx
  on product_reviews (product_id, created_at desc);

alter table product_reviews add column if not exists updated_at timestamptz not null default now();

create table if not exists product_review_moderation (
  review_id text primary key,
  moderation_history jsonb not null default '[]'::jsonb
);

create table if not exists product_review_owners (
  review_id text primary key references product_reviews(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  reviewer_id text not null references profiles(id) on delete cascade,
  unique (product_id, reviewer_id)
);

create table if not exists buyer_feedback (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  submitter_role text not null default 'buyer' check (submitter_role in ('buyer', 'seller')),
  subject text not null,
  category text not null check (category in ('general-feedback', 'suggestion', 'bug-report', 'user-experience', 'other-concern')),
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'under-review', 'responded', 'resolved')),
  admin_response text not null default '',
  response_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists buyer_feedback_user_created_idx
  on buyer_feedback (user_id, created_at desc);
create index if not exists buyer_feedback_status_created_idx
  on buyer_feedback (status, created_at desc);

create table if not exists buyer_reports (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  reporter_role text not null default 'buyer' check (reporter_role in ('buyer', 'seller')),
  report_type text not null check (report_type in ('product', 'seller', 'order', 'buyer', 'delivery-personnel', 'suspicious-activity')),
  target_id text not null default '',
  target_label text not null default '',
  reason text not null,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'under-review', 'resolved', 'rejected')),
  admin_response text not null default '',
  administrative_actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists buyer_reports_user_created_idx
  on buyer_reports (user_id, created_at desc);
create index if not exists buyer_reports_status_created_idx
  on buyer_reports (status, created_at desc);

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
  platform_fee numeric not null default 0,
  platform_fee_status text not null default 'none',
  created_at timestamptz default now(),
  items jsonb not null default '[]'::jsonb
);

create index if not exists orders_buyer_created_idx
  on orders (buyer_id, created_at desc);
create index if not exists orders_buyer_status_created_idx
  on orders (buyer_id, status, created_at desc);
create index if not exists orders_items_gin_idx
  on orders using gin (items jsonb_path_ops);

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

create index if not exists deliveries_courier_status_updated_idx
  on deliveries (courier_id, status, updated_at desc);
create index if not exists deliveries_order_id_idx
  on deliveries (order_id);

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

create index if not exists payments_order_created_idx
  on payments (order_id, created_at desc);

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
  items jsonb not null default '[]'::jsonb,
  revision bigint not null default 0
);

create table if not exists wishlist_items (
  id text primary key,
  buyer_id text not null,
  product_id text not null,
  unique (buyer_id, product_id)
);

create table if not exists wishlist_versions (
  buyer_id text primary key,
  revision bigint not null default 0
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

create table if not exists platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists role_applications_user_id_idx on role_applications (user_id);
create index if not exists role_applications_status_idx on role_applications (status);

alter table profiles enable row level security;
alter table categories enable row level security;
alter table sellers enable row level security;
alter table products enable row level security;
alter table product_reviews enable row level security;
alter table product_review_moderation enable row level security;
alter table product_review_owners enable row level security;
alter table buyer_feedback enable row level security;
alter table buyer_reports enable row level security;
alter table orders enable row level security;
alter table deliveries enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;
alter table carts enable row level security;
alter table wishlist_items enable row level security;
alter table wishlist_versions enable row level security;
alter table sessions enable row level security;
alter table role_applications enable row level security;
alter table platform_settings enable row level security;

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);

drop policy if exists "public read approved sellers" on sellers;
create policy "public read approved sellers" on sellers for select using (status = 'approved');

drop policy if exists "public read active products" on products;
create policy "public read active products" on products for select using (
  status = 'active'
  and exists (
    select 1 from sellers
    where sellers.id = products.seller_id
      and sellers.status = 'approved'
  )
);

drop policy if exists "public read reviews for active products" on product_reviews;
create policy "public read reviews for active products" on product_reviews for select using (
  exists (
    select 1
    from products
    join sellers on sellers.id = products.seller_id
    where products.id = product_reviews.product_id
      and product_reviews.moderation_status = 'published'
      and products.status = 'active'
      and sellers.status = 'approved'
  )
);

create or replace function public.mutate_buyer_cart(
  p_buyer_id text,
  p_operation text,
  p_product_id text default null,
  p_item_id text default null,
  p_quantity integer default null,
  p_cart_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cart_row carts%rowtype;
  product_row products%rowtype;
  cart_items jsonb;
  item_record jsonb;
  item_index integer;
  current_quantity integer;
  next_quantity integer;
  item_product_id text;
begin
  if nullif(trim(p_buyer_id), '') is null then
    raise exception 'A buyer is required.' using errcode = '22023';
  end if;
  if p_operation is null or p_operation not in ('add', 'replace', 'set', 'clear') then
    raise exception 'Invalid cart operation.' using errcode = '22023';
  end if;
  if p_operation in ('add', 'replace') and (
    nullif(trim(p_product_id), '') is null or p_quantity is null or p_quantity < 1
  ) then
    raise exception 'A product and positive quantity are required.' using errcode = '22023';
  end if;

  insert into carts (id, buyer_id, items)
  values (gen_random_uuid()::text, p_buyer_id, '[]'::jsonb)
  on conflict (buyer_id) do nothing;
  select * into cart_row from carts where buyer_id = p_buyer_id for update;
  if p_cart_id is not null and cart_row.id <> p_cart_id then
    raise exception 'Cart not found.' using errcode = 'P0002';
  end if;

  cart_items := coalesce(cart_row.items, '[]'::jsonb);
  if jsonb_typeof(cart_items) <> 'array' then
    raise exception 'Cart data is invalid.' using errcode = '22023';
  end if;

  if p_operation = 'clear' then
    cart_items := '[]'::jsonb;
  elsif p_operation in ('add', 'replace') then
    select products.* into product_row
    from products
    join sellers on sellers.id = products.seller_id
    where products.id = p_product_id
      and products.status = 'active'
      and sellers.status = 'approved'
    for update of products;
    if not found then
      raise exception 'That product is not available.' using errcode = 'P0002';
    end if;

    if p_operation = 'replace' then cart_items := '[]'::jsonb; end if;
    item_index := null;
    current_quantity := 0;
    select (entry.ordinality - 1)::integer, entry.value
      into item_index, item_record
    from jsonb_array_elements(cart_items) with ordinality as entry(value, ordinality)
    where coalesce(entry.value->>'productId', entry.value->'product'->>'id') = product_row.id
    order by entry.ordinality
    limit 1;
    if item_index is not null then
      current_quantity := greatest(0, coalesce((item_record->>'quantity')::integer, 0));
    end if;
    next_quantity := case when p_operation = 'replace' then p_quantity else current_quantity + p_quantity end;
    if next_quantity > product_row.stock then
      raise exception 'The requested quantity exceeds available stock.' using errcode = '22023';
    end if;
    if item_index is null then
      cart_items := cart_items || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid()::text,
        'productId', product_row.id,
        'quantity', next_quantity
      ));
    else
      cart_items := jsonb_set(cart_items, array[item_index::text, 'quantity'], to_jsonb(next_quantity), false);
    end if;
  else
    if nullif(trim(p_item_id), '') is null or p_quantity is null or p_quantity < 0 then
      raise exception 'A cart item and non-negative quantity are required.' using errcode = '22023';
    end if;
    item_index := null;
    item_record := null;
    select (entry.ordinality - 1)::integer, entry.value
      into item_index, item_record
    from jsonb_array_elements(cart_items) with ordinality as entry(value, ordinality)
    where entry.value->>'id' = p_item_id
    limit 1;
    if item_index is null then
      raise exception 'Cart item not found.' using errcode = 'P0002';
    end if;
    if p_quantity = 0 then
      cart_items := cart_items - item_index;
    else
      item_product_id := coalesce(item_record->>'productId', item_record->'product'->>'id');
      select products.* into product_row
      from products
      join sellers on sellers.id = products.seller_id
      where products.id = item_product_id
        and products.status = 'active'
        and sellers.status = 'approved'
      for update of products;
      if not found then
        raise exception 'That product is not available.' using errcode = 'P0002';
      end if;
      if p_quantity > product_row.stock then
        raise exception 'The requested quantity exceeds available stock.' using errcode = '22023';
      end if;
      cart_items := jsonb_set(cart_items, array[item_index::text, 'quantity'], to_jsonb(p_quantity), false);
    end if;
  end if;

  update carts
  set items = cart_items, revision = revision + 1
  where buyer_id = p_buyer_id
  returning * into cart_row;
  return jsonb_build_object(
    'id', cart_row.id,
    'buyer', cart_row.buyer_id,
    'items', cart_row.items,
    'revision', cart_row.revision
  );
end;
$$;

create or replace function public.read_buyer_wishlist(p_buyer_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_revision bigint;
  wishlist jsonb;
begin
  select revision into current_revision from wishlist_versions where buyer_id = p_buyer_id;
  if not found then current_revision := 0; end if;
  select coalesce(
    jsonb_agg(jsonb_build_object('id', id, 'productId', product_id) order by product_id),
    '[]'::jsonb
  ) into wishlist
  from wishlist_items where buyer_id = p_buyer_id;
  return jsonb_build_object('revision', current_revision, 'items', wishlist);
end;
$$;

create or replace function public.set_buyer_wishlist_item(
  p_buyer_id text,
  p_product_id text,
  p_saved boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_revision bigint;
  changed_rows integer;
  wishlist jsonb;
begin
  if nullif(trim(p_buyer_id), '') is null or nullif(trim(p_product_id), '') is null or p_saved is null then
    raise exception 'A buyer, product, and save choice are required.' using errcode = '22023';
  end if;
  insert into wishlist_versions (buyer_id, revision)
  values (p_buyer_id, 0)
  on conflict (buyer_id) do nothing;
  select revision into current_revision
  from wishlist_versions where buyer_id = p_buyer_id for update;

  if p_saved then
    if not exists (
      select 1 from products
      join sellers on sellers.id = products.seller_id
      where products.id = p_product_id
        and products.status = 'active'
        and sellers.status = 'approved'
    ) then
      raise exception 'That product is not available.' using errcode = 'P0002';
    end if;
    insert into wishlist_items (id, buyer_id, product_id)
    values (gen_random_uuid()::text, p_buyer_id, p_product_id)
    on conflict (buyer_id, product_id) do nothing;
    get diagnostics changed_rows = row_count;
  else
    delete from wishlist_items where buyer_id = p_buyer_id and product_id = p_product_id;
    get diagnostics changed_rows = row_count;
  end if;
  if changed_rows > 0 then
    update wishlist_versions set revision = revision + 1
    where buyer_id = p_buyer_id returning revision into current_revision;
  end if;
  select coalesce(
    jsonb_agg(jsonb_build_object('id', id, 'productId', product_id) order by product_id),
    '[]'::jsonb
  ) into wishlist
  from wishlist_items where buyer_id = p_buyer_id;
  return jsonb_build_object('revision', current_revision, 'items', wishlist);
end;
$$;

-- Server sync uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS, still needs table GRANTs).
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
revoke all on product_review_moderation from public, anon, authenticated;
grant select, insert, update, delete on product_review_moderation to service_role;
revoke all on wishlist_versions from public, anon, authenticated;
grant select, insert, update, delete on wishlist_versions to service_role;
revoke all on function public.mutate_buyer_cart(text, text, text, text, integer, text)
  from public, anon, authenticated;
revoke all on function public.read_buyer_wishlist(text) from public, anon, authenticated;
revoke all on function public.set_buyer_wishlist_item(text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.mutate_buyer_cart(text, text, text, text, integer, text)
  to service_role;
grant execute on function public.read_buyer_wishlist(text) to service_role;
grant execute on function public.set_buyer_wishlist_item(text, text, boolean)
  to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
