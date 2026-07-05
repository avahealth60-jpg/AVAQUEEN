-- 20260705150000_v118_corporate.sql
-- Wellness korporat / B2B.
--
-- FIREWALL PRIVASI (inti pilar ini):
--   • Pemberi kerja HANYA melihat AGREGAT teranonimkan lewat fungsi
--     employer_wellness_summary — TIDAK PERNAH data kesehatan individu.
--   • K-anonimitas: bila peserta < 5, angka disembunyikan (suppressed) agar
--     individu tak bisa dikenali.
--   • Tidak ada kebijakan RLS yang memberi pemberi kerja akses ke health_readings
--     / analysis_results / wellness_* karyawan. Default DENY tetap berlaku.

-- Izinkan organisasi berjenis 'employer' + kode gabung untuk karyawan.
alter table organizations drop constraint if exists organizations_kind_check;
alter table organizations add constraint organizations_kind_check
  check (kind in ('faskes','vendor','lab','employer'));
alter table organizations add column if not exists join_code text unique;

-- Keikutsertaan karyawan pada program wellness pemberi kerja.
create table if not exists employer_enrollments (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references profiles(id) on delete cascade,
  status      text not null default 'active' check (status in ('active','left')),
  joined_at   timestamptz not null default now(),
  unique (employer_id, customer_id)
);
create index if not exists idx_employer_enroll_employer on employer_enrollments(employer_id);
create index if not exists idx_employer_enroll_customer on employer_enrollments(customer_id);

alter table employer_enrollments enable row level security;

-- Karyawan mengelola keikutsertaannya sendiri.
drop policy if exists "employee manages own enrollment" on employer_enrollments;
create policy "employee manages own enrollment" on employer_enrollments
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Admin pemberi kerja (anggota org employer) MELIHAT daftar keikutsertaan
-- (jumlah/kepesertaan) — BUKAN data kesehatan (tak ada policy lintas-tabel).
drop policy if exists "employer admin sees enrollments" on employer_enrollments;
create policy "employer admin sees enrollments" on employer_enrollments
  for select using (app.is_member_of(employer_id) or app.is_admin());

-- Karyawan boleh melihat identitas pemberi kerja yang diikutinya (nama saja).
drop policy if exists "employee reads own employer org" on organizations;
create policy "employee reads own employer org" on organizations
  for select using (
    kind = 'employer' and exists (
      select 1 from employer_enrollments e
      where e.employer_id = organizations.id
        and e.customer_id = auth.uid() and e.status = 'active'
    )
  );

grant select, insert, update, delete on employer_enrollments to authenticated;

-- Karyawan bergabung via kode pemberi kerja (SECURITY DEFINER; RLS pemberi
-- kerja tak mengizinkan menulis atas nama karyawan).
create or replace function public.join_employer(code text)
returns uuid language plpgsql security definer set search_path = public, app as $$
declare emp uuid;
begin
  select id into emp from public.organizations
   where kind = 'employer' and join_code = code;
  if emp is null then
    return null;
  end if;
  insert into public.employer_enrollments (employer_id, customer_id, status)
  values (emp, auth.uid(), 'active')
  on conflict (employer_id, customer_id) do update set status = 'active';
  return emp;
end;
$$;

-- Ringkasan AGREGAT untuk pemberi kerja — dengan k-anonimitas. Mengembalikan
-- HANYA hitungan; tak pernah baris individu. Hanya admin employer / ava_admin.
create or replace function public.employer_wellness_summary(p_employer uuid)
returns table(participants int, suppressed boolean, active_wellness int)
language plpgsql stable security definer set search_path = public, app as $$
declare k constant int := 5; n int; aw int;
begin
  if not (app.is_member_of(p_employer) or app.is_admin()) then
    return; -- tak berhak → himpunan kosong
  end if;

  select count(*) into n from public.employer_enrollments e
   where e.employer_id = p_employer and e.status = 'active';

  if n < k then
    participants := n; suppressed := true; active_wellness := null;
    return next; return;
  end if;

  select count(distinct e.customer_id) into aw
    from public.employer_enrollments e
    join public.wellness_enrollments w
      on w.customer_id = e.customer_id and w.status = 'active'
   where e.employer_id = p_employer and e.status = 'active';

  participants := n; suppressed := false; active_wellness := aw;
  return next;
end;
$$;

-- Admin pemberi kerja mengatur/mengacak kode gabung (SECURITY DEFINER; klien
-- tak boleh menulis organizations langsung). Kode dinormalkan A–Z/0–9.
create or replace function public.set_employer_join_code(p_employer uuid, p_code text)
returns text language plpgsql security definer set search_path = public, app as $$
declare final text;
begin
  if not app.is_member_of(p_employer) then
    return null; -- hanya admin pemberi kerja
  end if;
  final := nullif(regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g'), '');
  if final is null then
    final := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)); -- acak
  end if;
  update public.organizations set join_code = final
   where id = p_employer and kind = 'employer';
  return final;
end;
$$;

grant execute on function public.join_employer(text) to authenticated;
grant execute on function public.employer_wellness_summary(uuid) to authenticated;
grant execute on function public.set_employer_join_code(uuid, text) to authenticated;
