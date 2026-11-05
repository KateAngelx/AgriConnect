create index if not exists orders_buyer_created_idx
  on orders (buyer_id, created_at desc);

create index if not exists orders_buyer_status_created_idx
  on orders (buyer_id, status, created_at desc);

create index if not exists orders_items_gin_idx
  on orders using gin (items jsonb_path_ops);

create index if not exists deliveries_courier_status_updated_idx
  on deliveries (courier_id, status, updated_at desc);

create index if not exists deliveries_order_id_idx
  on deliveries (order_id);

create index if not exists payments_order_created_idx
  on payments (order_id, created_at desc);
