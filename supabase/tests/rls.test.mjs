/**
 * Uji RLS AVA Health di Postgres ASLI (PGlite/WASM).
 *
 * Strategi: terapkan migrasi produksi apa adanya, lalu "serang" skema sebagai
 * berbagai pengguna terautentikasi dan pastikan kebocoran data MUSTAHIL.
 * Stub auth (auth.uid, role authenticated) meniru lingkungan Supabase 1:1.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGR_DIR = join(__dirname, '..', 'migrations');

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
}

// UUID tetap agar deterministik.
const U = {
  alice:  '11111111-1111-1111-1111-111111111111',
  bob:    '22222222-2222-2222-2222-222222222222',
  carol:  '33333333-3333-3333-3333-333333333333', // dokter
  vance:  '44444444-4444-4444-4444-444444444444', // anggota vendor V1
  victor: '55555555-5555-5555-5555-555555555555', // anggota vendor V2
  lana:   '66666666-6666-6666-6666-666666666666', // anggota lab L1
};
const ORG = {
  v1: 'aaaaaaaa-0000-0000-0000-000000000001',
  v2: 'aaaaaaaa-0000-0000-0000-000000000002',
  l1: 'aaaaaaaa-0000-0000-0000-000000000003',
};

const db = new PGlite();

// 1) Bootstrap lingkungan Supabase (role + auth.uid).
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema if not exists auth;
  create or replace function auth.uid() returns uuid language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
  $$;
  grant usage on schema auth to authenticated, anon;
`);

// 2) Terapkan migrasi produksi secara berurutan.
for (const f of readdirSync(MIGR_DIR).filter((x) => x.endsWith('.sql')).sort()) {
  try {
    await db.exec(readFileSync(join(MIGR_DIR, f), 'utf8'));
  } catch (e) {
    console.error(`MIGRASI GAGAL di ${f}:`, e.message);
    process.exit(1);
  }
}
console.log('Migrasi diterapkan tanpa error.\n');

// 3) Seed data sebagai superuser (bypass RLS).
await db.exec(`
  insert into profiles(id, role, full_name) values
    ('${U.alice}','customer','Alice'),
    ('${U.bob}','customer','Bob'),
    ('${U.carol}','doctor','Dr. Carol'),
    ('${U.vance}','vendor','Vance'),
    ('${U.victor}','vendor','Victor'),
    ('${U.lana}','lab','Lana');

  insert into organizations(id,name,kind) values
    ('${ORG.v1}','Vendor Satu','vendor'),
    ('${ORG.v2}','Vendor Dua','vendor'),
    ('${ORG.l1}','Lab Kalibrasi','lab');

  insert into organization_members(organization_id, profile_id) values
    ('${ORG.v1}','${U.vance}'),
    ('${ORG.v2}','${U.victor}'),
    ('${ORG.l1}','${U.lana}');

  insert into device_models(id,name,calibration_interval_months) values
    ('bbbbbbbb-0000-0000-0000-000000000001','Tensimeter A',12);

  insert into devices(id,model_id,serial,vendor_id) values
    ('cccccccc-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','SN-V1-001','${ORG.v1}'),
    ('cccccccc-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000001','SN-V2-001','${ORG.v2}');

  -- Hasil kesehatan Alice (ra1 dibagikan, ra2 TIDAK), dan Bob (rb1).
  insert into health_readings(id,customer_id,reading_type,value,unit) values
    ('dddddddd-0000-0000-0000-0000000a1001','${U.alice}','spo2','{"v":97}','%'),
    ('dddddddd-0000-0000-0000-0000000a1002','${U.alice}','spo2','{"v":88}','%'),
    ('dddddddd-0000-0000-0000-0000000b1001','${U.bob}','spo2','{"v":99}','%');

  -- Konsultasi Alice↔Carol, hanya membagikan ra1.
  insert into consultations(id,customer_id,doctor_id,status,shared_reading_ids) values
    ('eeeeeeee-0000-0000-0000-000000000001','${U.alice}','${U.carol}','confirmed',
     array['dddddddd-0000-0000-0000-0000000a1001']::uuid[]);

  -- Kalibrasi + QC lulus untuk device V1 (alur wedge lengkap).
  insert into calibrations(id,device_id,lab_id,performed_at,next_due_at) values
    ('cabcabca-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001',
     '${ORG.l1}','2025-01-15','2026-01-15');
  insert into qc_results(calibration_id,result,metrics) values
    ('cabcabca-0000-0000-0000-000000000001','lulus','{"sistolik_dev":2}');

  insert into badges(id,device_id,calibration_id,expires_at)
    values ('ffffffff-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001',
            'cabcabca-0000-0000-0000-000000000001','2099-01-01');
`);
console.log('Seed selesai.\n');

// Helper: jalankan query SEBAGAI pengguna terautentikasi (RLS aktif).
async function asUser(sub, sql) {
  const claims = sub ? JSON.stringify({ sub }) : '';
  await db.exec(`select set_config('request.jwt.claims', '${claims}', false);`);
  await db.exec(`set role authenticated;`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`);
  }
}
async function asAnon(sql) {
  await db.exec(`select set_config('request.jwt.claims', '', false); set role anon;`);
  try { return await db.query(sql); }
  finally { await db.exec(`reset role;`); }
}

console.log('— Isolasi data kesehatan (pasien) —');
{
  const a = await asUser(U.alice, 'select id from health_readings');
  check('Alice melihat 2 hasil miliknya', a.rows.length === 2);
  check('Alice TIDAK melihat hasil Bob', !a.rows.some((r) => r.id.endsWith('b1001')));

  const b = await asUser(U.bob, 'select id from health_readings');
  check('Bob hanya melihat 1 hasil miliknya', b.rows.length === 1 && b.rows[0].id.endsWith('b1001'));
}

console.log('\n— Akses dokter dibatasi pada yang DIBAGIKAN —');
{
  const c = await asUser(U.carol, 'select id from health_readings order by id');
  check('Carol melihat tepat 1 hasil (ra1 yang dibagikan)', c.rows.length === 1 && c.rows[0].id.endsWith('a1001'));
  check('Carol TIDAK melihat ra2 (tak dibagikan)', !c.rows.some((r) => r.id.endsWith('a1002')));
  check('Carol TIDAK melihat hasil Bob', !c.rows.some((r) => r.id.endsWith('b1001')));
}

console.log('\n— Isolasi armada antar-vendor —');
{
  const v1 = await asUser(U.vance, 'select serial from devices');
  check('Vendor V1 melihat alat sendiri', v1.rows.some((r) => r.serial === 'SN-V1-001'));
  check('Vendor V1 TIDAK melihat alat V2', !v1.rows.some((r) => r.serial === 'SN-V2-001'));

  const v2 = await asUser(U.victor, 'select serial from devices');
  check('Vendor V2 melihat alat sendiri', v2.rows.some((r) => r.serial === 'SN-V2-001'));
  check('Vendor V2 TIDAK melihat alat V1', !v2.rows.some((r) => r.serial === 'SN-V1-001'));
}

console.log('\n— Penulisan curang ditolak —');
{
  let blocked = false;
  try {
    await asUser(U.alice,
      `insert into health_readings(customer_id,reading_type,value) values ('${U.bob}','spo2','{"v":1}')`);
  } catch { blocked = true; }
  check('Alice TIDAK bisa menyisipkan hasil atas nama Bob (WITH CHECK)', blocked);
}

console.log('\n— Anonim tidak melihat data sensitif —');
{
  const anon = await asAnon('select id from health_readings');
  check('Anon melihat 0 hasil kesehatan', anon.rows.length === 0);
}

console.log('\n— Badge "AVA Verified" dapat diverifikasi publik (terautentikasi) —');
{
  const a = await asUser(U.alice, 'select id from badges');
  check('Alice (pasien) bisa membaca badge alat', a.rows.length === 1);
}

console.log(`\n=== RLS: ${passed} lulus, ${failed} gagal ===`);
process.exit(failed === 0 ? 0 : 1);
