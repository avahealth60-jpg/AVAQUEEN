-- 0007_partner_policies.sql
-- Vendor berhak melihat hasil QC alatnya sendiri (simetris dengan kebijakan
-- "vendor reads calibrations of own devices"). Tanpa ini, portal vendor hanya
-- bisa menampilkan status badge, bukan alasan lulus/gagal QC-nya.

drop policy if exists "vendor reads qc of own devices" on qc_results;
create policy "vendor reads qc of own devices" on qc_results
  for select using (
    exists (
      select 1
      from calibrations c
      join devices d on d.id = c.device_id
      where c.id = qc_results.calibration_id
        and app.is_member_of(d.vendor_id)
    )
  );
