alter table deliveries
  add column if not exists proof_of_delivery jsonb;

alter table deliveries
  add column if not exists courier_payment_status text not null default 'pending';
alter table deliveries
  add column if not exists courier_released_at timestamptz;
alter table deliveries
  add column if not exists courier_released_by text;

alter table orders
  add column if not exists buyer_confirmed_at timestamptz;
alter table orders
  add column if not exists seller_payment_status text not null default 'pending';
alter table orders
  add column if not exists seller_released_at timestamptz;
alter table orders
  add column if not exists seller_released_by text;

create unique index if not exists deliveries_order_id_unique_idx
  on deliveries (order_id);
