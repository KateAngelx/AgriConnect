alter table sellers add column if not exists landmark text default '';
alter table sellers add column if not exists pickup_lat double precision;
alter table sellers add column if not exists pickup_lng double precision;

alter table orders add column if not exists delivery_landmark text default '';
alter table orders add column if not exists delivery_lat double precision;
alter table orders add column if not exists delivery_lng double precision;

-- Optional: seed demo pickup pins (adjust if your seller ids differ)
update sellers set pickup_lat = 14.1723, pickup_lng = 121.2417, landmark = 'Near municipal hall' where id = 'laguna-greens' and pickup_lat is null;
update sellers set pickup_lat = 16.4023, pickup_lng = 120.5960, landmark = 'Highland market road' where id = 'benguet-growers' and pickup_lat is null;
update sellers set pickup_lat = 15.5784, pickup_lng = 121.0340, landmark = 'Rice mill gate' where id = 'nueva-ecija-rice' and pickup_lat is null;
