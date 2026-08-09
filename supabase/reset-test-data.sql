begin;

create schema if not exists vporkpay_reset_backup;

create table if not exists vporkpay_reset_backup.orders_20260809
as table public.orders with data;

create table if not exists vporkpay_reset_backup.order_items_20260809
as table public.order_items with data;

create table if not exists vporkpay_reset_backup.order_events_20260809
as table public.order_events with data;

create table if not exists vporkpay_reset_backup.cart_items_20260809
as table public.cart_items with data;

create table if not exists vporkpay_reset_backup.products_20260809
as table public.products with data;

truncate table
  public.order_events,
  public.order_items,
  public.cart_items,
  public.orders
restart identity;

delete from public.products where id not in (1, 2, 3, 4, 5, 6);

insert into public.products
  (id, name, cut, seller, location, price_usdc, stock_kg, minimum_kg, category, image_path, active)
values
  (1, 'Premium Pork Belly', 'Skin-on · Fresh', 'Green Valley Farm', '12 km', 6.80, 84, 2, 'Belly', 'assets/pork-belly.jpg', true),
  (2, 'Bone-in Pork Chops', 'Center cut · Chilled', 'Minh Phat Butchery', '7 km', 5.40, 42, 2, 'Lean cuts', 'assets/pork-chops.jpg', true),
  (3, 'Meaty Pork Ribs', 'Spare ribs · Fresh', 'An Hoa Foods', '18 km', 7.20, 31, 3, 'Ribs', 'assets/pork-ribs.jpg', true),
  (4, 'Lean Pork Shoulder', 'Boneless · Chilled', 'Green Valley Farm', '12 km', 5.90, 68, 2, 'Lean cuts', 'assets/pork-shoulder.jpg', true),
  (5, 'Pork Tenderloin', 'Trimmed · Premium', 'Dalat Fresh Foods', '24 km', 8.60, 26, 1, 'Lean cuts', 'assets/pork-tenderloin.jpg', true),
  (6, 'Ground Pork', '80/20 · Made today', 'Minh Phat Butchery', '7 km', 4.70, 55, 2, 'Ground', 'assets/ground-pork.jpg', true)
on conflict (id) do update set
  name = excluded.name,
  cut = excluded.cut,
  seller = excluded.seller,
  location = excluded.location,
  price_usdc = excluded.price_usdc,
  stock_kg = excluded.stock_kg,
  minimum_kg = excluded.minimum_kg,
  category = excluded.category,
  image_path = excluded.image_path,
  active = true,
  updated_at = now();

commit;

select 'cart_items' as table_name, count(*) as row_count from public.cart_items
union all
select 'orders', count(*) from public.orders
union all
select 'order_items', count(*) from public.order_items
union all
select 'order_events', count(*) from public.order_events
union all
select 'products', count(*) from public.products
order by table_name;
