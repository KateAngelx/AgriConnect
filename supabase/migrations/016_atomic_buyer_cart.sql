alter table carts
  add column if not exists revision bigint not null default 0;

create table if not exists wishlist_versions (
  buyer_id text primary key,
  revision bigint not null default 0
);

alter table wishlist_versions enable row level security;
revoke all on wishlist_versions from public, anon, authenticated;
grant select, insert, update, delete on wishlist_versions to service_role;

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
  next_revision bigint;
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

  select * into cart_row
  from carts
  where buyer_id = p_buyer_id
  for update;

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

    if p_operation = 'replace' then
      cart_items := '[]'::jsonb;
    end if;

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

    next_quantity := case
      when p_operation = 'replace' then p_quantity
      else current_quantity + p_quantity
    end;
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
      cart_items := jsonb_set(
        cart_items,
        array[item_index::text, 'quantity'],
        to_jsonb(next_quantity),
        false
      );
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
      cart_items := jsonb_set(
        cart_items,
        array[item_index::text, 'quantity'],
        to_jsonb(p_quantity),
        false
      );
    end if;
  end if;

  update carts
  set items = cart_items,
      revision = revision + 1
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

revoke all on function public.mutate_buyer_cart(text, text, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.mutate_buyer_cart(text, text, text, text, integer, text)
  to service_role;

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
  select revision into current_revision
  from wishlist_versions
  where buyer_id = p_buyer_id;
  if not found then current_revision := 0; end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', id, 'productId', product_id) order by product_id),
    '[]'::jsonb
  ) into wishlist
  from wishlist_items
  where buyer_id = p_buyer_id;

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
  if nullif(trim(p_buyer_id), '') is null or nullif(trim(p_product_id), '') is null
    or p_saved is null then
    raise exception 'A buyer, product, and save choice are required.' using errcode = '22023';
  end if;

  insert into wishlist_versions (buyer_id, revision)
  values (p_buyer_id, 0)
  on conflict (buyer_id) do nothing;

  select revision into current_revision
  from wishlist_versions
  where buyer_id = p_buyer_id
  for update;

  if p_saved then
    if not exists (
      select 1
      from products
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
    delete from wishlist_items
    where buyer_id = p_buyer_id
      and product_id = p_product_id;
    get diagnostics changed_rows = row_count;
  end if;

  if changed_rows > 0 then
    update wishlist_versions
    set revision = revision + 1
    where buyer_id = p_buyer_id
    returning revision into current_revision;
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', id, 'productId', product_id) order by product_id),
    '[]'::jsonb
  ) into wishlist
  from wishlist_items
  where buyer_id = p_buyer_id;

  return jsonb_build_object('revision', current_revision, 'items', wishlist);
end;
$$;

revoke all on function public.read_buyer_wishlist(text) from public, anon, authenticated;
revoke all on function public.set_buyer_wishlist_item(text, text, boolean) from public, anon, authenticated;
grant execute on function public.read_buyer_wishlist(text) to service_role;
grant execute on function public.set_buyer_wishlist_item(text, text, boolean) to service_role;
