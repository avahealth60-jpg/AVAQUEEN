-- 20260705190000_v122_push_subscriptions.sql
-- Web Push (E1): simpan langganan push browser per pengguna.
-- Pengiriman dilakukan Edge Function (send-push) ber-service_role memakai VAPID.
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_push_subs_customer on push_subscriptions(customer_id);

alter table push_subscriptions enable row level security;

-- Pemilik mengelola langganan push-nya sendiri.
drop policy if exists "customer manages own push subs" on push_subscriptions;
create policy "customer manages own push subs" on push_subscriptions
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

grant select, insert, update, delete on push_subscriptions to authenticated;
