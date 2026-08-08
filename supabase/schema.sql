begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wallet_address text not null unique,
  display_name text,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (wallet_address ~ '^0x[0-9a-fA-F]{40}$')
);

create table if not exists public.products (
  id bigint primary key,
  name text not null,
  cut text not null,
  seller text not null,
  location text not null,
  price_usdc numeric(12,2) not null check (price_usdc >= 0),
  stock_kg numeric(12,2) not null check (stock_kg >= 0),
  minimum_kg numeric(12,2) not null check (minimum_kg > 0),
  category text not null,
  image_path text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  quantity_kg numeric(12,2) not null check (quantity_kg > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.orders (
  id text primary key,
  buyer_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  buyer_wallet text not null,
  total_usdc numeric(12,2) not null check (total_usdc >= 0),
  status text not null,
  fulfilment_status text not null default 'Awaiting acceptance',
  payment_tx_hash text,
  is_credit boolean not null default false,
  credit_order_id text,
  principal_usdc numeric(12,2) not null default 0 check (principal_usdc >= 0),
  onchain_status text,
  open_tx_hash text,
  approve_tx_hash text,
  repay_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_wallet ~ '^0x[0-9a-fA-F]{40}$')
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  product_name text not null,
  seller text not null,
  unit_price_usdc numeric(12,2) not null check (unit_price_usdc >= 0),
  quantity_kg numeric(12,2) not null check (quantity_kg > 0)
);

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id text not null references public.orders(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null default auth.uid(),
  event_type text not null,
  tx_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists orders_buyer_id_idx on public.orders (buyer_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_events_order_id_idx on public.order_events (order_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.current_vporkpay_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where user_id = auth.uid()), 'buyer');
$$;

create or replace function public.authenticated_wallet_address()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(coalesce(identity_data ->> 'address', provider_id))
  from auth.identities
  where user_id = auth.uid()
    and lower(coalesce(identity_data ->> 'address', provider_id, '')) ~ '^0x[0-9a-f]{40}$'
  order by created_at desc
  limit 1;
$$;

create or replace function public.assign_vporkpay_role()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  verified_wallet text := public.authenticated_wallet_address();
begin
  if verified_wallet is null or lower(new.wallet_address) <> verified_wallet then
    raise exception 'Wallet address does not match the authenticated Web3 identity';
  end if;
  new.wallet_address := verified_wallet;
  new.role := case
    when verified_wallet = '0xf2d062b3920b342f6c6c4ecfd22c39a79e1e33d0' then 'seller'
    else 'buyer'
  end;
  return new;
end;
$$;

drop trigger if exists profiles_assign_role on public.profiles;
create trigger profiles_assign_role before insert on public.profiles
for each row execute function public.assign_vporkpay_role();

create or replace function public.is_vporkpay_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_vporkpay_role() in ('seller', 'admin');
$$;

revoke all on function public.current_vporkpay_role() from public;
revoke all on function public.is_vporkpay_staff() from public;
revoke all on function public.authenticated_wallet_address() from public;
grant execute on function public.current_vporkpay_role() to authenticated;
grant execute on function public.is_vporkpay_staff() to authenticated;
grant execute on function public.authenticated_wallet_address() to authenticated;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
using (user_id = auth.uid() or public.is_vporkpay_staff());

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert to authenticated
with check (user_id = auth.uid() and wallet_address = public.authenticated_wallet_address());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and role = public.current_vporkpay_role()
  and wallet_address = public.authenticated_wallet_address()
);

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products for select to anon, authenticated
using (active = true);

drop policy if exists "products_staff_read" on public.products;
create policy "products_staff_read" on public.products for select to authenticated
using (public.is_vporkpay_staff());

drop policy if exists "products_staff_write" on public.products;
create policy "products_staff_write" on public.products for all to authenticated
using (public.is_vporkpay_staff()) with check (public.is_vporkpay_staff());

drop policy if exists "cart_owner" on public.cart_items;
create policy "cart_owner" on public.cart_items for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "orders_read" on public.orders;
create policy "orders_read" on public.orders for select to authenticated
using (buyer_id = auth.uid() or public.is_vporkpay_staff());

drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders for insert to authenticated
with check (
  buyer_id = auth.uid()
  and lower(buyer_wallet) = public.authenticated_wallet_address()
);

drop policy if exists "orders_update" on public.orders;
create policy "orders_update" on public.orders for update to authenticated
using (buyer_id = auth.uid() or public.is_vporkpay_staff())
with check (
  (buyer_id = auth.uid() and lower(buyer_wallet) = public.authenticated_wallet_address())
  or public.is_vporkpay_staff()
);

drop policy if exists "order_items_read" on public.order_items;
create policy "order_items_read" on public.order_items for select to authenticated
using (exists (select 1 from public.orders where orders.id = order_items.order_id));

drop policy if exists "order_items_insert" on public.order_items;
create policy "order_items_insert" on public.order_items for insert to authenticated
with check (exists (select 1 from public.orders where orders.id = order_items.order_id));

drop policy if exists "order_items_delete" on public.order_items;
create policy "order_items_delete" on public.order_items for delete to authenticated
using (exists (select 1 from public.orders where orders.id = order_items.order_id));

drop policy if exists "order_events_read" on public.order_events;
create policy "order_events_read" on public.order_events for select to authenticated
using (exists (select 1 from public.orders where orders.id = order_events.order_id));

drop policy if exists "order_events_insert" on public.order_events;
create policy "order_events_insert" on public.order_events for insert to authenticated
with check (actor_id = auth.uid() and exists (select 1 from public.orders where orders.id = order_events.order_id));

grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select, insert, update on public.orders to authenticated;
grant select, insert, delete on public.order_items to authenticated;
grant select, insert on public.order_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into public.products (id, name, cut, seller, location, price_usdc, stock_kg, minimum_kg, category, image_path)
values
  (1, 'Premium Pork Belly', 'Skin-on · Fresh', 'Green Valley Farm', '12 km', 6.80, 84, 2, 'Belly', 'assets/pork-belly-ai.jpg'),
  (2, 'Bone-in Pork Chops', 'Center cut · Chilled', 'Minh Phat Butchery', '7 km', 5.40, 42, 2, 'Lean cuts', 'assets/pork-chops-ai.jpg'),
  (3, 'Meaty Pork Ribs', 'Spare ribs · Fresh', 'An Hoa Foods', '18 km', 7.20, 31, 3, 'Ribs', 'assets/pork-ribs-ai.jpg'),
  (4, 'Lean Pork Shoulder', 'Boneless · Chilled', 'Green Valley Farm', '12 km', 5.90, 68, 2, 'Lean cuts', 'assets/pork-shoulder-ai.jpg'),
  (5, 'Pork Tenderloin', 'Trimmed · Premium', 'Dalat Fresh Foods', '24 km', 8.60, 26, 1, 'Lean cuts', 'assets/pork-tenderloin-ai.jpg'),
  (6, 'Ground Pork', '80/20 · Made today', 'Minh Phat Butchery', '7 km', 4.70, 55, 2, 'Ground', 'assets/ground-pork-ai.jpg')
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
  active = true;

commit;
