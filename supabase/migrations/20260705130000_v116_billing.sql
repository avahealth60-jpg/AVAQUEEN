-- 20260705130000_v116_billing.sql
-- Fase C: monetisasi — langganan premium + catatan pembayaran.
--
-- ARSITEKTUR JUJUR (anti self-grant):
--   • Pelanggan boleh MEMBUAT & MEMBACA pembayaran miliknya (status 'pending')
--     dan MEMBACA langganannya, tapi TIDAK boleh menulis langsung ke
--     subscriptions atau menandai pembayaran 'paid'. Itu wewenang verifikasi.
--   • Aktivasi langganan HANYA lewat fungsi konfirmasi pembayaran (SECURITY
--     DEFINER). Di sini `mock_confirm_payment` menyimulasikan webhook provider
--     (Midtrans/Xendit — keputusan terbuka #3). Di produksi, fungsi ini diganti
--     Edge Function webhook ber-service_role, dan versi mock ini dihapus.

create table if not exists subscriptions (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references profiles(id) on delete cascade,
  plan         text not null default 'free' check (plan in ('free','premium')),
  status       text not null default 'active' check (status in ('active','expired','cancelled')),
  started_at   timestamptz not null default now(),
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (customer_id)
);

create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references profiles(id) on delete cascade,
  purpose      text not null check (purpose in ('subscription','consultation')),
  ref_id       uuid,                                  -- mis. consultation_id
  amount       numeric not null check (amount >= 0),
  currency     text not null default 'IDR',
  provider     text not null default 'mock',
  status       text not null default 'pending' check (status in ('pending','paid','failed')),
  external_id  text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

create index if not exists idx_subscriptions_customer on subscriptions(customer_id);
create index if not exists idx_payments_customer on payments(customer_id);

alter table subscriptions enable row level security;
alter table payments      enable row level security;

-- Langganan: pelanggan hanya MEMBACA miliknya. Penulisan lewat fungsi (definer).
drop policy if exists "customer reads own subscription" on subscriptions;
create policy "customer reads own subscription" on subscriptions
  for select using (customer_id = auth.uid());
drop policy if exists "admin reads subscriptions" on subscriptions;
create policy "admin reads subscriptions" on subscriptions
  for select using (app.is_admin());

-- Pembayaran: pelanggan boleh MEMBUAT & MEMBACA miliknya (status awal 'pending').
drop policy if exists "customer creates own payment" on payments;
create policy "customer creates own payment" on payments
  for insert with check (customer_id = auth.uid() and status = 'pending');
drop policy if exists "customer reads own payments" on payments;
create policy "customer reads own payments" on payments
  for select using (customer_id = auth.uid());
drop policy if exists "admin reads payments" on payments;
create policy "admin reads payments" on payments
  for select using (app.is_admin());

-- Konfirmasi pembayaran (SIMULASI webhook). Menandai 'paid' & mengaktifkan
-- langganan bila purpose='subscription'. Diikat ke pemilik pembayaran.
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
  end if;
  return true;
end;
$$;

-- Batalkan langganan sendiri (definer, karena klien tak punya write policy).
create or replace function public.cancel_my_subscription()
returns boolean language plpgsql security definer set search_path = public, app as $$
begin
  update public.subscriptions
     set status = 'cancelled'
   where customer_id = auth.uid() and status = 'active';
  return found;
end;
$$;

grant select, insert on payments to authenticated;
grant select on subscriptions to authenticated;
grant execute on function public.mock_confirm_payment(uuid) to authenticated;
grant execute on function public.cancel_my_subscription() to authenticated;
