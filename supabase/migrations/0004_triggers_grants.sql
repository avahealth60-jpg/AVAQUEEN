-- 0004_triggers_grants.sql
-- Trigger audit + grant privilege ke role authenticated (RLS tetap menyaring baris).

-- Audit otomatis untuk perubahan badge (akuntabilitas jangka panjang).
create or replace function app.audit_badge() returns trigger
language plpgsql security definer set search_path = public, app as $$
begin
  insert into audit_logs(actor_id, action, entity, entity_id, detail)
  values (auth.uid(), tg_op, 'badges', coalesce(new.id, old.id),
          jsonb_build_object('status', coalesce(new.status, old.status)));
  return coalesce(new, old);
end; $$;

create trigger trg_audit_badge
  after insert or update or delete on badges
  for each row execute function app.audit_badge();

-- Trigger: set next_due_at otomatis bila tidak diisi (interval dari model).
create or replace function app.set_calibration_due() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare months int;
begin
  if new.next_due_at is null then
    select dm.calibration_interval_months into months
    from devices d join device_models dm on dm.id = d.model_id
    where d.id = new.device_id;
    new.next_due_at := new.performed_at + (months || ' months')::interval;
  end if;
  return new;
end; $$;

create trigger trg_set_calibration_due
  before insert on calibrations
  for each row execute function app.set_calibration_due();

-- Grants: authenticated boleh DML; RLS yang menentukan baris mana.
grant usage on schema public, app to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on all functions in schema app to authenticated, anon;
