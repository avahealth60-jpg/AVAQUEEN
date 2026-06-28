-- 0006_badge_issuance.sql
-- Penerbitan badge sebagai AKSI SISTEM, bukan privilege pengguna.
-- Saat lab menyimpan QC 'lulus' (diizinkan RLS "lab writes qc for own
-- calibrations"), trigger SECURITY DEFINER ini menerbitkan badge — sehingga
-- lab tidak butuh hak tulis langsung ke tabel badges (tetap milik admin/sistem).
--
-- Konsisten dengan @ava/domain.decideBadge:
--   - hanya 'lulus' yang menerbitkan badge;
--   - masa berlaku = next_due_at kalibrasi (= performed_at + interval model).

create or replace function app.issue_badge_on_qc()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_device uuid;
  v_due    date;
begin
  if new.result = 'lulus' then
    select c.device_id, c.next_due_at
      into v_device, v_due
      from calibrations c
     where c.id = new.calibration_id;

    -- Nonaktifkan badge aktif lama untuk alat ini (satu badge aktif per alat).
    update badges set status = 'expired'
     where device_id = v_device and status = 'active';

    insert into badges(device_id, calibration_id, status, expires_at)
    values (v_device, new.calibration_id, 'active', v_due);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_issue_badge_on_qc on qc_results;
create trigger trg_issue_badge_on_qc
  after insert on qc_results
  for each row execute function app.issue_badge_on_qc();
