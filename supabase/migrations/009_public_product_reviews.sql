
create table if not exists product_reviews (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists product_reviews_product_created_idx
  on product_reviews (product_id, created_at desc);

alter table product_reviews enable row level security;

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
      and products.status = 'active'
      and sellers.status = 'approved'
  )
);
