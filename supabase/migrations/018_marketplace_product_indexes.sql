create index if not exists products_active_created_idx
  on products (created_at desc)
  where status = 'active';

create index if not exists products_seller_created_idx
  on products (seller_id, created_at desc);
