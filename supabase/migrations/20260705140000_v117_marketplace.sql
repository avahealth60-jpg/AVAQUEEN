-- 20260705140000_v117_marketplace.sql
-- Marketplace alat ber-badge: menutup flywheel QC → pembelian.
--
-- Prinsip kepercayaan: sebuah listing hanya "AVA Verified" bila vendornya punya
-- unit dari model itu dengan BADGE AKTIF. Status verifikasi diturunkan langsung
-- dari data badge (fungsi verified_listing_ids), bukan flag yang bisa basi.

create table if not exists product_listings (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references organizations(id) on delete cascade,
  model_id    uuid not null references device_models(id),
  title       text not null,
  description text,
  price       numeric not null check (price >= 0),
  stock       int not null default 0 check (stock >= 0),
  status      text not null default 'active' check (status in ('active','inactive')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_listings_vendor on product_listings(vendor_id);
create index if not exists idx_listings_status on product_listings(status);

create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled')),
  total       numeric not null check (total >= 0),
  created_at  timestamptz not null default now()
);
create index if not exists idx_orders_customer on orders(customer_id);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  listing_id  uuid not null references product_listings(id),
  vendor_id   uuid not null references organizations(id),
  title       text not null,
  qty         int not null check (qty > 0),
  unit_price  numeric not null check (unit_price >= 0)
);
create index if not exists idx_order_items_order  on order_items(order_id);
create index if not exists idx_order_items_vendor on order_items(vendor_id);

-- Helper SECURITY DEFINER untuk memutus rekursi antar-policy orders↔order_items
-- (masing-masing mengecek keberadaan di tabel lain TANPA memicu RLS tabel itu).
create or replace function app.owns_order(p_order uuid)
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (select 1 from public.orders o where o.id = p_order and o.customer_id = auth.uid());
$$;
create or replace function app.vendor_in_order(p_order uuid)
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from public.order_items oi where oi.order_id = p_order and app.is_member_of(oi.vendor_id)
  );
$$;

alter table product_listings enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;

-- Listing: publik boleh melihat yang AKTIF; vendor mengelola miliknya.
drop policy if exists "public reads active listings" on product_listings;
create policy "public reads active listings" on product_listings
  for select using (status = 'active');
drop policy if exists "vendor manages own listings" on product_listings;
create policy "vendor manages own listings" on product_listings
  for all using (app.is_member_of(vendor_id)) with check (app.is_member_of(vendor_id));

-- Order: pelanggan mengelola miliknya; vendor MELIHAT order yang memuat itemnya.
drop policy if exists "customer manages own orders" on orders;
create policy "customer manages own orders" on orders
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
drop policy if exists "vendor sees orders with own items" on orders;
create policy "vendor sees orders with own items" on orders
  for select using (app.vendor_in_order(id));
drop policy if exists "admin reads orders" on orders;
create policy "admin reads orders" on orders for select using (app.is_admin());

-- Order items: pelanggan (via ordernya) & vendor (item miliknya).
-- Memakai helper definer agar tak memicu RLS tabel orders (anti-rekursi).
drop policy if exists "customer manages items of own order" on order_items;
create policy "customer manages items of own order" on order_items
  for all using (app.owns_order(order_id)) with check (app.owns_order(order_id));
drop policy if exists "vendor sees own order items" on order_items;
create policy "vendor sees own order items" on order_items
  for select using (app.is_member_of(vendor_id));

-- Verifikasi listing dari badge aktif (selalu segar; tak bisa basi).
create or replace function public.verified_listing_ids()
returns setof uuid language sql stable security definer set search_path = public, app as $$
  select pl.id from public.product_listings pl
  where pl.status = 'active'
    and exists (
      select 1 from public.devices d
      join public.badges b on b.device_id = d.id
      where d.vendor_id = pl.vendor_id and d.model_id = pl.model_id and b.status = 'active'
    );
$$;

-- Perluas tujuan pembayaran untuk mencakup 'order'.
alter table payments drop constraint if exists payments_purpose_check;
alter table payments add constraint payments_purpose_check
  check (purpose in ('subscription','consultation','order'));

-- Perbarui konfirmasi pembayaran (mock webhook) agar juga menandai order 'paid'.
create or replace function public.mock_confirm_payment(p_id uuid)
returns boolean language plpgsql security definer set search_path = public, app as $$
declare pay record;
begin
  select * into pay from public.payments
   where id = p_id and customer_id = auth.uid() and status = 'pending';
  if not found then
    return false;
  end if;

  update public.payments set status = 'paid', paid_at = now() where id = pay.id;

  if pay.purpose = 'subscription' then
    insert into public.subscriptions (customer_id, plan, status, started_at, expires_at)
    values (pay.customer_id, 'premium', 'active', now(), now() + interval '30 days')
    on conflict (customer_id) do update
      set plan = 'premium', status = 'active', started_at = now(),
          expires_at = now() + interval '30 days';
  elsif pay.purpose = 'order' and pay.ref_id is not null then
    update public.orders set status = 'paid'
     where id = pay.ref_id and customer_id = auth.uid() and status = 'pending';
  end if;
  return true;
end;
$$;

grant select on product_listings to anon, authenticated;
grant insert, update, delete on product_listings to authenticated;
grant select, insert, update, delete on orders to authenticated;
grant select, insert, update, delete on order_items to authenticated;
grant execute on function public.verified_listing_ids() to anon, authenticated;
