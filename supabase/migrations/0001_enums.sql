-- 0001_enums.sql
-- Tipe enum inti. Dicocokkan 1:1 dengan packages/domain/src/types.ts.

do $$ begin
  create type user_role     as enum ('customer','doctor','faskes_admin','vendor','lab','ava_admin');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type qc_result     as enum ('lulus','perlu_tinjau','gagal');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type triage_level  as enum ('normal','perhatian','segera');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type consent_status as enum ('granted','withdrawn');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type consultation_status as enum ('requested','confirmed','completed','cancelled');
exception when duplicate_object then null;
end $$;
