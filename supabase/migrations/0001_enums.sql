-- 0001_enums.sql
-- Tipe enum inti. Dicocokkan 1:1 dengan packages/domain/src/types.ts.

DO $$ BEGIN
  create type user_role as enum ('customer','doctor','faskes_admin','vendor','lab','ava_admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type qc_result as enum ('lulus','perlu_tinjau','gagal');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type triage_level as enum ('normal','perhatian','segera');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type consent_status as enum ('granted','withdrawn');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type consultation_status as enum ('requested','confirmed','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;