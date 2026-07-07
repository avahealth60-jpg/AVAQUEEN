-- ============================================================================
-- AVA Health — CEK / VERIFIKASI SKEMA DB
-- Jalankan di Supabase SQL Editor SETELAH setup.sql. Setiap blok mengembalikan
-- satu tabel hasil; targetnya SEMUA baris ✅ (tak ada ❌ HILANG / OFF).
-- ============================================================================

-- 1) Tabel inti & fitur baru harus ADA -----------------------------------------
select t.name as tabel,
       case when to_regclass('public.' || t.name) is not null then '✅ ada' else '❌ HILANG' end as status
from (values
  ('profiles'),('organizations'),('organization_members'),
  ('device_models'),('devices'),('calibrations'),('qc_results'),('badges'),
  ('health_readings'),('analysis_results'),('consultations'),('commissions'),
  ('consents'),('audit_logs'),('notifications'),
  ('panels'),('parameters'),('reference_ranges'),('checkups'),('checkup_values'),
  ('knowledge_entries'),
  ('wearable_connections'),
  ('wellness_enrollments'),('wellness_checkins'),
  ('caregiver_links'),
  ('subscriptions'),('payments'),
  ('product_listings'),('orders'),('order_items'),
  ('employer_enrollments'),
  ('consultation_messages'),('push_subscriptions')
) t(name)
order by status desc, tabel;

-- 2) Fungsi (RPC & helper) harus ADA -------------------------------------------
select f.name as fungsi,
       case when exists (
         select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where p.proname = f.name and n.nspname in ('public','app')
       ) then '✅ ada' else '❌ HILANG' end as status
from (values
  ('claim_caregiver_invite'),('is_active_caregiver_of'),
  ('mock_confirm_payment'),('cancel_my_subscription'),
  ('verified_listing_ids'),('owns_order'),('vendor_in_order'),
  ('join_employer'),('employer_wellness_summary'),('set_employer_join_code'),
  ('guard_profile_update'),('delete_my_account'),
  ('current_role'),('is_member_of'),('is_admin'),
  ('is_consult_participant'),('vendor_set_order_status'),
  ('join_faskes'),('faskes_set_join_code'),('faskes_summary'),
  ('set_doctor_verification')
) f(name)
order by status desc, fungsi;

-- 3) Kolom baru harus ADA ------------------------------------------------------
select c.tbl || '.' || c.col as kolom,
       case when exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = c.tbl and column_name = c.col
       ) then '✅ ada' else '❌ HILANG' end as status
from (values
  ('profiles','birth_date'),('profiles','sex'),('profiles','height_cm'),('profiles','weight_kg'),
  ('profiles','str_no'),('profiles','sip_no'),('profiles','doctor_status'),
  ('consultations','doctor_note'),('consultations','fee'),('consultations','rating'),
  ('organizations','join_code'),
  ('payments','purpose'),('payments','status')
) c(tbl,col)
order by status desc, kolom;

-- 4) RLS harus AKTIF di tabel sensitif -----------------------------------------
select c.relname as tabel,
       case when c.relrowsecurity then '✅ RLS aktif' else '❌ RLS OFF' end as status
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname in (
    'profiles','health_readings','analysis_results','consents','consultations',
    'wearable_connections','wellness_enrollments','wellness_checkins',
    'caregiver_links','subscriptions','payments','orders','order_items',
    'product_listings','employer_enrollments','notifications'
  )
order by status desc, tabel;

-- 5) Jumlah policy per tabel (harus > 0 untuk tabel ber-RLS) --------------------
select tablename as tabel, count(*) as jumlah_policy
from pg_policies where schemaname = 'public'
group by tablename order by tablename;

-- 6) Trigger penting harus ADA -------------------------------------------------
select t.name as trigger,
       case when exists (select 1 from pg_trigger where tgname = t.name and not tgisinternal)
            then '✅ ada' else '❌ HILANG' end as status
from (values
  ('trg_guard_profile_update'),   -- anti-eskalasi peran
  ('trg_record_commission'),      -- komisi saat konsultasi selesai
  ('trg_issue_badge_on_qc'),      -- badge otomatis dari QC lulus
  ('trg_new_user_profile')        -- profil otomatis saat signup (jika dinamai begitu)
) t(name)
order by status desc, trigger;

-- 7) Ringkasan cepat -----------------------------------------------------------
select
  (select count(*) from pg_tables where schemaname='public')            as total_tabel,
  (select count(*) from pg_policies where schemaname='public')          as total_policy,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname in ('public','app'))                               as total_fungsi_app;
