alter table orders add column if not exists seller_pickup jsonb;
alter table orders add column if not exists estimated_arrival_at timestamptz;

notify pgrst, 'reload schema';
