-- 0001_enums.sql
-- Tipe enum inti. Dicocokkan 1:1 dengan packages/domain/src/types.ts.

create type user_role     as enum ('customer','doctor','faskes_admin','vendor','lab','ava_admin');
create type qc_result     as enum ('lulus','perlu_tinjau','gagal');
create type triage_level  as enum ('normal','perhatian','segera');
create type consent_status as enum ('granted','withdrawn');
create type consultation_status as enum ('requested','confirmed','completed','cancelled');
