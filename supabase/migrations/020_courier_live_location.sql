-- Courier live location for an active delivery, so buyers and admins can see where the
-- courier is. Written by the courier's phone every few seconds while sharing is on.
alter table deliveries add column if not exists courier_lat double precision;
alter table deliveries add column if not exists courier_lng double precision;
alter table deliveries add column if not exists courier_location_at timestamptz;
