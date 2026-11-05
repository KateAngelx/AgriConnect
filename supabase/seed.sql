-- AgriConnect starter data (run after schema.sql in the Supabase SQL editor).
-- Demo login password for all seeded accounts: password1
-- Emails: buyer@, seller@, delivery@, and admin@ agriconnect.ph

-- scrypt hash for "password1" (salt:hash format used by the app)
-- Regenerate with: node -e "import('./src/server/passwords.js').then(m => console.log(m.hashPassword('password1')))"

-- Remove demo records without their own working account.
delete from products where seller_id = 'benguet-growers';
delete from sellers where id = 'benguet-growers';
delete from products where seller_id = 'nueva-ecija-rice';
delete from sellers where id = 'nueva-ecija-rice';

insert into categories (id, name, description, image) values
  ('vegetables', 'Vegetables', 'Leafy greens, tomatoes, and everyday market vegetables.', '{"url":"https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=900&q=80","alt":"Fresh vegetables"}'::jsonb),
  ('fruits', 'Fruits', 'Seasonal fruit from nearby farms.', '{"url":"https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=900&q=80","alt":"Fresh fruit"}'::jsonb),
  ('rice', 'Rice & grains', 'Milled rice and pantry grains.', '{"url":"https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=900&q=80","alt":"Rice grains"}'::jsonb),
  ('roots', 'Root crops', 'Potatoes, camote, and other root crops.', '{"url":"https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80","alt":"Potatoes"}'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  image = excluded.image;

insert into sellers (id, farm_name, location, status, description, owner_id, image) values
  ('laguna-greens', 'Laguna Greens Farm', 'Laguna', 'approved', 'A family farm growing vegetables and herbs for nearby households.', 'user-pedro', '{"url":"https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80","alt":"Laguna Greens Farm"}'::jsonb)
on conflict (id) do update set
  farm_name = excluded.farm_name,
  location = excluded.location,
  status = excluded.status,
  description = excluded.description,
  owner_id = excluded.owner_id,
  image = excluded.image;

insert into profiles (id, name, email, password_hash, role, status, seller_id, service_area, created_at) values
  ('user-maria', 'Maria Santos', 'buyer@agriconnect.ph', '141de44e01a05b9a2fc7394bcad856d0:4f469f16feb4f263ed20f7413e89927d54bf456da648f2203f411d2ff03bbbee', 'buyer', 'approved', null, '', '2026-10-01T00:00:00.000Z'),
  ('user-pedro', 'Pedro Reyes', 'seller@agriconnect.ph', '141de44e01a05b9a2fc7394bcad856d0:4f469f16feb4f263ed20f7413e89927d54bf456da648f2203f411d2ff03bbbee', 'seller', 'approved', 'laguna-greens', '', '2026-10-01T00:00:00.000Z'),
  ('user-liza', 'Liza Cruz', 'delivery@agriconnect.ph', '141de44e01a05b9a2fc7394bcad856d0:4f469f16feb4f263ed20f7413e89927d54bf456da648f2203f411d2ff03bbbee', 'delivery', 'approved', null, 'Laguna and Batangas', '2026-10-01T00:00:00.000Z'),
  ('user-ana', 'Ana Dela Cruz', 'admin@agriconnect.ph', '141de44e01a05b9a2fc7394bcad856d0:4f469f16feb4f263ed20f7413e89927d54bf456da648f2203f411d2ff03bbbee', 'admin', 'approved', null, '', '2026-10-01T00:00:00.000Z')
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  password_hash = excluded.password_hash,
  role = excluded.role,
  status = excluded.status,
  seller_id = excluded.seller_id,
  service_area = excluded.service_area;

insert into products (id, name, description, price, unit, stock, location, status, pickup, delivery, category_id, seller_id, created_at, images) values
  ('tomatoes', 'Market tomatoes', 'Ripe tomatoes harvested this week, sold by the kilogram.', 80, 'kilogram', 38, 'Laguna', 'active', true, true, 'vegetables', 'laguna-greens', '2026-10-20T08:00:00.000Z', '[{"id":"tomatoes-1","url":"https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1200&q=80","alt":"Red tomatoes"}]'::jsonb),
  ('kangkong', 'Kangkong bundle', 'Fresh water spinach, tied in market bundles.', 25, 'bundle', 60, 'Laguna', 'active', true, false, 'vegetables', 'laguna-greens', '2026-10-22T08:00:00.000Z', '[{"id":"kangkong-1","url":"https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=1200&q=80","alt":"Leafy greens"}]'::jsonb),
  ('bananas', 'Lakatan bananas', 'Ripe lakatan bananas, sold by the kilogram.', 70, 'kilogram', 35, 'Laguna', 'active', false, true, 'fruits', 'laguna-greens', '2026-10-18T08:00:00.000Z', '[{"id":"bananas-1","url":"https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=1200&q=80","alt":"Bananas"}]'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  unit = excluded.unit,
  stock = excluded.stock,
  location = excluded.location,
  status = excluded.status,
  pickup = excluded.pickup,
  delivery = excluded.delivery,
  category_id = excluded.category_id,
  seller_id = excluded.seller_id,
  images = excluded.images;

insert into orders (id, reference, buyer_id, buyer_name, buyer_email, fulfillment, contact_number, delivery_address, instructions, payment_method, payment_status, status, subtotal, delivery_fee, created_at, items) values
  (
    'order-demo-1',
    'AGR-DEMO1001',
    'user-maria',
    'Maria Santos',
    'buyer@agriconnect.ph',
    'delivery',
    '09171234567',
    '12 Rizal Street, San Pablo, Laguna',
    'Leave the crate at the gate.',
    'cash-on-delivery',
    'pending',
    'awaiting-delivery',
    160,
    49,
    '2026-10-25T02:00:00.000Z',
    '[{"id":"item-demo-1","sellerId":"laguna-greens","quantity":2,"unitPrice":80,"product":{"id":"tomatoes","name":"Market tomatoes","seller":{"id":"laguna-greens","farmName":"Laguna Greens Farm"}}}]'::jsonb
  )
on conflict (id) do update set
  reference = excluded.reference,
  status = excluded.status,
  payment_status = excluded.payment_status,
  items = excluded.items;

insert into deliveries (id, order_id, courier_id, status, commission, commission_status, note, updates, updated_at) values
  (
    'delivery-demo-1',
    'order-demo-1',
    null,
    'open',
    40,
    'pending',
    '',
    '[{"at":"2026-10-25T02:00:00.000Z","status":"open","note":"Waiting for a courier in Laguna."}]'::jsonb,
    '2026-10-25T02:00:00.000Z'
  )
on conflict (id) do update set
  status = excluded.status,
  commission = excluded.commission,
  updates = excluded.updates;

insert into payments (id, order_id, method, amount, status, provider, provider_reference, created_at) values
  ('pay-demo-1', 'order-demo-1', 'cash-on-delivery', 209, 'pending', 'cash', '', '2026-10-25T02:00:00.000Z')
on conflict (id) do update set
  amount = excluded.amount,
  status = excluded.status;

insert into notifications (id, user_id, title, body, href, read, created_at) values
  ('note-seller-1', 'user-pedro', 'Order AGR-DEMO1001 is ready for delivery', 'A courier can now accept the Laguna delivery.', '/seller/orders', false, '2026-10-25T02:00:00.000Z'),
  ('note-buyer-1', 'user-maria', 'Order AGR-DEMO1001 is awaiting a courier', 'Cash on delivery is due when the order arrives.', '/buyer/orders/order-demo-1', false, '2026-10-25T02:00:00.000Z')
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  read = excluded.read;
