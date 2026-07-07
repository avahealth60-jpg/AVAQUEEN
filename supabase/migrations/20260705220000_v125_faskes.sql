-- 20260705220000_v125_faskes.sql
-- Modul Faskes (fasilitas kesehatan): dokter bergabung ke faskes (keanggotaan
-- organisasi), admin faskes melihat AGREGAT operasional dokternya.
--
-- PRIVASI: admin faskes TIDAK melihat data kesehatan pasien atau isi konsultasi.
-- Hanya ringkasan jumlah/rating/pendapatan (fungsi definer faskes_summary).
--
-- kind='faskes' & organizations.join_code sudah ada (migrasi awal + v118).

-- Anggota organisasi boleh melihat sesama anggota (mis. admin faskes → dokternya).
drop policy if exists "member reads co-members" on organization_members;
create policy "member reads co-members" on organization_members
  for select using (app.is_member_of(organization_id));

-- Dokter bergabung ke faskes via kode (SECURITY DEFINER; RLS members tak
-- mengizinkan insert langsung). Hanya profil berperan 'doctor'.
create or replace function public.join_faskes(code text)
returns uuid language plpgsql security definer set search_path = public, app as $$
declare fid uuid;
begin
  if app.current_role() <> 'doctor' then return null; end if;
  select id into fid from public.organizations where kind = 'faskes' and join_code = code;
  if fid is null then return null; end if;
  insert into public.organization_members(organization_id, profile_id)
  values (fid, auth.uid())
  on conflict do nothing;
  return fid;
end;
$$;

-- Admin faskes mengatur/mengacak kode gabung dokter.
create or replace function public.faskes_set_join_code(p_faskes uuid, p_code text)
returns text language plpgsql security definer set search_path = public, app as $$
declare final text;
begin
  if not app.is_member_of(p_faskes) then return null; end if;
  final := nullif(regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g'), '');
  if final is null then final := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)); end if;
  update public.organizations set join_code = final where id = p_faskes and kind = 'faskes';
  return final;
end;
$$;

-- Ringkasan AGREGAT faskes (hanya anggota/admin). Tak pernah data pasien.
create or replace function public.faskes_summary(p_faskes uuid)
returns table(doctors int, consultations int, completed int, avg_rating numeric, gross numeric)
language plpgsql stable security definer set search_path = public, app as $$
begin
  if not (app.is_member_of(p_faskes) or app.is_admin()) then
    return;
  end if;
  return query
  with docs as (
    select om.profile_id as id
    from public.organization_members om
    join public.profiles p on p.id = om.profile_id and p.role = 'doctor'
    where om.organization_id = p_faskes
  ), cons as (
    select c.status, c.rating, c.fee from public.consultations c
    where c.doctor_id in (select id from docs)
  )
  select
    (select count(*)::int from docs),
    (select count(*)::int from cons),
    (select count(*)::int from cons where status = 'completed'),
    (select round(avg(rating), 1) from cons where rating is not null),
    (select coalesce(sum(fee), 0) from cons where status = 'completed');
end;
$$;

grant execute on function public.join_faskes(text) to authenticated;
grant execute on function public.faskes_set_join_code(uuid, text) to authenticated;
grant execute on function public.faskes_summary(uuid) to authenticated;
