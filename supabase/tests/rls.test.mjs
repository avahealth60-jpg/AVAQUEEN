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
  create or replace function auth.jwt() returns jsonb language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  $$;
  create or replace function auth.role() returns text language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')::text;
  $$;
  grant usage on schema auth to authenticated, anon;
  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
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
  -- Badge TIDAK disisipkan manual: trigger trg_issue_badge_on_qc (migrasi 0006)
  -- menerbitkannya otomatis dari QC 'lulus' di atas (expires = next_due_at).
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
// PGlite mengembalikan kolom `date` sebagai objek Date (UTC tengah malam).
const ymd = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

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

console.log('\n— Badge "AVA Verified" terbit otomatis & dapat diverifikasi publik —');
{
  const a = await asUser(U.alice, 'select id, expires_at from badges');
  check('Badge terbit otomatis dari QC lulus (tepat 1)', a.rows.length === 1);
  check('Masa berlaku = next_due_at kalibrasi', ymd(a.rows[0]?.expires_at) === '2026-01-15');
}

console.log('\n— Alur lab: kalibrasi + QC lulus → badge baru (RLS + trigger) —');
{
  await asUser(U.lana,
    `insert into calibrations(id,device_id,lab_id,performed_at)
     values ('cabcabca-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000001','${ORG.l1}','2025-06-01')`);
  const due = await db.query(
    `select next_due_at from calibrations where id='cabcabca-0000-0000-0000-000000000002'`);
  check('Trigger mengisi next_due_at otomatis (+12 bln)', ymd(due.rows[0]?.next_due_at) === '2026-06-01');

  await asUser(U.lana,
    `insert into qc_results(calibration_id,result) values ('cabcabca-0000-0000-0000-000000000002','lulus')`);
  const badges = await db.query(
    `select status, expires_at from badges where device_id='cccccccc-0000-0000-0000-000000000001'`);
  check('Badge baru aktif terbit (expires 2026-06-01)',
    badges.rows.some((r) => r.status === 'active' && ymd(r.expires_at) === '2026-06-01'));
  check('Hanya 1 badge aktif per alat (yang lama dinonaktifkan)',
    badges.rows.filter((r) => r.status === 'active').length === 1);
}

console.log('\n— QC gagal TIDAK menerbitkan badge —');
{
  await asUser(U.lana,
    `insert into calibrations(id,device_id,lab_id,performed_at)
     values ('cabcabca-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000002','${ORG.l1}','2025-06-01')`);
  await asUser(U.lana,
    `insert into qc_results(calibration_id,result) values ('cabcabca-0000-0000-0000-000000000003','gagal')`);
  const b = await db.query(`select count(*)::int n from badges where device_id='cccccccc-0000-0000-0000-000000000002'`);
  check('Device V2 tetap tanpa badge setelah QC gagal', b.rows[0]?.n === 0);
}

console.log('\n— Non-anggota lab ditolak menulis kalibrasi atas nama lab itu —');
{
  let blocked = false;
  try {
    await asUser(U.vance,
      `insert into calibrations(device_id,lab_id,performed_at)
       values ('cccccccc-0000-0000-0000-000000000001','${ORG.l1}','2025-07-01')`);
  } catch { blocked = true; }
  check('Vendor ditolak menulis kalibrasi lab L1 (WITH CHECK)', blocked);
}

console.log('\n— Trigger: user Auth baru otomatis dapat baris profiles —');
{
  const newId = 'f0f0f0f0-0000-0000-0000-000000000001';
  await db.exec(
    `insert into auth.users(id, email, raw_user_meta_data)
     values ('${newId}', 'baru@contoh.id', '{"full_name":"User Baru"}'::jsonb);`,
  );
  const p = await db.query(`select role, full_name from profiles where id = '${newId}'`);
  check('Baris profiles terbuat otomatis', p.rows.length === 1);
  check('Role default = customer', p.rows[0]?.role === 'customer');
  check('full_name diambil dari metadata', p.rows[0]?.full_name === 'User Baru');
}

console.log('\n— Vendor membaca QC alatnya sendiri, bukan milik vendor lain —');
{
  const v1 = await asUser(U.vance,
    `select result from qc_results q
       join calibrations c on c.id=q.calibration_id
      where c.device_id='cccccccc-0000-0000-0000-000000000001'`);
  check('Vendor V1 membaca QC alat sendiri', v1.rows.length >= 1);

  const v2 = await asUser(U.victor,
    `select result from qc_results q
       join calibrations c on c.id=q.calibration_id
      where c.device_id='cccccccc-0000-0000-0000-000000000001'`);
  check('Vendor V2 TIDAK membaca QC alat V1', v2.rows.length === 0);
}

console.log('\n— Customer menyimpan analisis untuk reading sendiri, bukan milik orang lain —');
{
  // Alice menulis analisis untuk reading-nya (ra1) → boleh.
  let okSelf = true;
  try {
    await asUser(U.alice,
      `insert into analysis_results(reading_id, triage, disclaimer)
       values ('dddddddd-0000-0000-0000-0000000a1001','normal','Edukatif, bukan diagnosis.')`);
  } catch { okSelf = false; }
  check('Alice menyimpan analisis untuk reading sendiri', okSelf);

  // Bob mencoba menulis analisis untuk reading Alice → ditolak.
  let blocked = false;
  try {
    await asUser(U.bob,
      `insert into analysis_results(reading_id, triage, disclaimer)
       values ('dddddddd-0000-0000-0000-0000000a1002','normal','Edukatif, bukan diagnosis.')`);
  } catch { blocked = true; }
  check('Bob ditolak menyimpan analisis untuk reading Alice', blocked);

  // Invariant SaMD: is_educational=false ditolak oleh CHECK tabel.
  let samd = false;
  try {
    await asUser(U.alice,
      `insert into analysis_results(reading_id, triage, disclaimer, is_educational)
       values ('dddddddd-0000-0000-0000-0000000a1001','normal','x', false)`);
  } catch { samd = true; }
  check('is_educational=false ditolak (invariant SaMD)', samd);
}

console.log('\n— Konsultasi: dokter menyelesaikan → komisi AVA tercatat —');
{
  // Carol (dokter) menandai konsultasinya 'completed'.
  await asUser(U.carol,
    `update consultations set status='completed' where id='eeeeeeee-0000-0000-0000-000000000001'`);
  const c = await db.query(
    `select gross_amount, rate, commission_amount from commissions where consultation_id='eeeeeeee-0000-0000-0000-000000000001'`);
  check('Komisi tercatat saat konsultasi selesai', c.rows.length === 1);
  check('Komisi = 15% dari tarif (default 50000 → 7500)',
    Number(c.rows[0]?.commission_amount) === 7500);

  // Carol membaca komisinya; Vance (bukan dokter ybs) tidak.
  const own = await asUser(U.carol, 'select id from commissions');
  check('Dokter membaca komisinya sendiri', own.rows.length >= 1);
  const other = await asUser(U.vance, 'select id from commissions');
  check('Non-dokter tidak membaca komisi', other.rows.length === 0);
}

console.log('\n— Direktori dokter: masyarakat boleh melihat profil dokter —');
{
  const docs = await asUser(U.alice, "select id, full_name from profiles where role='doctor'");
  check('Alice (pasien) melihat profil dokter', docs.rows.some((r) => r.id === U.carol));
  const others = await asUser(U.alice, "select id from profiles where role='customer' and id <> '" + U.alice + "'");
  check('Alice TIDAK melihat profil pasien lain', others.rows.length === 0);

  // Dokter membaca nama pasien yang berkonsultasi dengannya, bukan pasien lain.
  const mine = await asUser(U.carol, `select id from profiles where id='${U.alice}'`);
  check('Carol membaca profil pasiennya (Alice)', mine.rows.length === 1);
  const notmine = await asUser(U.carol, `select id from profiles where id='${U.bob}'`);
  check('Carol TIDAK membaca profil non-pasien (Bob)', notmine.rows.length === 0);
}

console.log('\n— Wearable: koneksi terisolasi per pemilik (data biometrik sensitif) —');
{
  // Alice menautkan Health Connect; Bob menautkan Fitbit.
  await asUser(U.alice,
    `insert into wearable_connections(customer_id, provider) values ('${U.alice}','health_connect')`);
  await asUser(U.bob,
    `insert into wearable_connections(customer_id, provider) values ('${U.bob}','fitbit')`);

  const mine = await asUser(U.alice, 'select provider from wearable_connections');
  check('Alice hanya melihat koneksi wearable-nya sendiri',
    mine.rows.length === 1 && mine.rows[0].provider === 'health_connect');

  // Alice tidak bisa mengintip koneksi Bob.
  const peek = await asUser(U.alice,
    `select id from wearable_connections where customer_id='${U.bob}'`);
  check('Alice TIDAK melihat koneksi wearable Bob', peek.rows.length === 0);

  // Alice tidak bisa menautkan koneksi ATAS NAMA Bob (WITH CHECK).
  let forged = false;
  try {
    await asUser(U.alice,
      `insert into wearable_connections(customer_id, provider) values ('${U.bob}','garmin')`);
  } catch { forged = true; }
  check('Alice TIDAK bisa membuat koneksi atas nama Bob (WITH CHECK)', forged);

  // Provider tak dikenal ditolak oleh CHECK constraint.
  let badProvider = false;
  try {
    await asUser(U.alice,
      `insert into wearable_connections(customer_id, provider) values ('${U.alice}','random_watch')`);
  } catch { badProvider = true; }
  check('Provider tak dikenal ditolak (CHECK constraint)', badProvider);

  // Anon tidak melihat koneksi wearable siapa pun (0 baris ATAU akses ditolak —
  // keduanya menjamin isolasi; anon memang tak diberi grant ke tabel ini).
  let anonBlocked = false;
  try {
    const anon = await asAnon('select id from wearable_connections');
    anonBlocked = anon.rows.length === 0;
  } catch { anonBlocked = true; }
  check('Anon TIDAK melihat koneksi wearable', anonBlocked);
}

console.log('\n— Wellness: keikutsertaan & check-in terisolasi per pemilik —');
{
  // Alice & Bob ikut program.
  await asUser(U.alice,
    `insert into wellness_enrollments(customer_id, program_code) values ('${U.alice}','langkah_harian')`);
  await asUser(U.bob,
    `insert into wellness_enrollments(customer_id, program_code) values ('${U.bob}','tidur_cukup')`);

  const mine = await asUser(U.alice, 'select program_code from wellness_enrollments');
  check('Alice hanya melihat keikutsertaannya sendiri',
    mine.rows.length === 1 && mine.rows[0].program_code === 'langkah_harian');

  const peek = await asUser(U.alice,
    `select id from wellness_enrollments where customer_id='${U.bob}'`);
  check('Alice TIDAK melihat keikutsertaan Bob', peek.rows.length === 0);

  // Alice tidak bisa mendaftar atas nama Bob (WITH CHECK).
  let forged = false;
  try {
    await asUser(U.alice,
      `insert into wellness_enrollments(customer_id, program_code) values ('${U.bob}','gerak_aktif')`);
  } catch { forged = true; }
  check('Alice TIDAK bisa mendaftar program atas nama Bob (WITH CHECK)', forged);

  // Status di luar daftar ditolak oleh CHECK.
  let badStatus = false;
  try {
    await asUser(U.alice,
      `insert into wellness_enrollments(customer_id, program_code, status) values ('${U.alice}','hidrasi','juara')`);
  } catch { badStatus = true; }
  check('Status enrollment tak dikenal ditolak (CHECK)', badStatus);

  // Check-in: Alice mencatat hidrasi; Bob tak bisa melihatnya.
  await asUser(U.alice,
    `insert into wellness_checkins(customer_id, program_code, metric, value) values ('${U.alice}','hidrasi','hydration_ml',1800)`);
  const bobSees = await asUser(U.bob,
    `select id from wellness_checkins where customer_id='${U.alice}'`);
  check('Bob TIDAK melihat check-in Alice', bobSees.rows.length === 0);

  // Nilai negatif ditolak (CHECK value >= 0).
  let badVal = false;
  try {
    await asUser(U.alice,
      `insert into wellness_checkins(customer_id, program_code, metric, value, day) values ('${U.alice}','hidrasi','hydration_ml',-5,'2026-07-04')`);
  } catch { badVal = true; }
  check('Check-in nilai negatif ditolak (CHECK value >= 0)', badVal);
}

console.log('\n— Pendamping: akses baca terkendali scope + dapat dicabut —');
{
  // Alice mengundang pendamping dengan scope readings SAJA (bukan wellness).
  await asUser(U.alice,
    `insert into caregiver_links(patient_id, invite_token, scopes)
     values ('${U.alice}', 'tok-alice-1', array['readings']::text[])`);

  // Sebelum diklaim (pending): Bob TIDAK melihat reading Alice lewat jalur pendamping.
  const before = await asUser(U.bob,
    `select id from health_readings where customer_id='${U.alice}'`);
  check('Pendamping (pending) belum melihat reading pasien', before.rows.length === 0);

  // Bob tak bisa klaim token milik dirinya? (self-link dilarang) — di sini token
  // milik Alice, Bob berbeda, jadi klaim SAH.
  const claim = await asUser(U.bob, `select claim_caregiver_invite('tok-alice-1') as id`);
  check('Bob berhasil klaim undangan (jadi pendamping aktif)', claim.rows[0]?.id != null);

  // Kini Bob (pendamping aktif, scope readings) MEMBACA reading Alice.
  const seen = await asUser(U.bob,
    `select id from health_readings where customer_id='${U.alice}'`);
  check('Pendamping aktif membaca reading pasien (scope readings)', seen.rows.length >= 1);

  // Tapi scope wellness TIDAK diberikan → Bob tak melihat wellness Alice.
  const noWell = await asUser(U.bob,
    `select id from wellness_enrollments where customer_id='${U.alice}'`);
  check('Pendamping tanpa scope wellness TIDAK melihat wellness pasien', noWell.rows.length === 0);

  // Carol (bukan pendamping Alice) tetap tak melihat reading Alice lewat jalur ini.
  const carol = await asUser(U.victor, // vendor, jelas bukan pendamping
    `select id from health_readings where customer_id='${U.alice}'`);
  check('Non-pendamping tidak melihat reading pasien', carol.rows.length === 0);

  // Pendamping hanya BACA — tak bisa menulis reading atas nama pasien.
  let cgWrite = false;
  try {
    await asUser(U.bob,
      `insert into health_readings(customer_id, reading_type, value) values ('${U.alice}','spo2','{"v":95}')`);
  } catch { cgWrite = true; }
  check('Pendamping TIDAK bisa menulis reading atas nama pasien', cgWrite);

  // Token tak valid → klaim mengembalikan null (tidak melempar).
  const badClaim = await asUser(U.carol, `select claim_caregiver_invite('token-ngawur') as id`);
  check('Klaim token tak valid mengembalikan null', badClaim.rows[0]?.id == null);

  // Pasien mencabut → akses pendamping putus seketika.
  await asUser(U.alice,
    `update caregiver_links set status='revoked', revoked_at=now() where invite_token='tok-alice-1'`);
  const afterRevoke = await asUser(U.bob,
    `select id from health_readings where customer_id='${U.alice}'`);
  check('Setelah dicabut, pendamping TIDAK lagi melihat reading pasien', afterRevoke.rows.length === 0);

  // Anon tak melihat tautan pendamping.
  let anonCg = false;
  try {
    const a = await asAnon('select id from caregiver_links');
    anonCg = a.rows.length === 0;
  } catch { anonCg = true; }
  check('Anon TIDAK melihat tautan pendamping', anonCg);
}

console.log('\n— Billing: langganan tak bisa di-self-grant; aktivasi via konfirmasi bayar —');
{
  // Alice tak bisa langsung menulis langganan premium (tak ada write policy).
  let selfGrant = false;
  try {
    await asUser(U.alice,
      `insert into subscriptions(customer_id, plan, status) values ('${U.alice}','premium','active')`);
  } catch { selfGrant = true; }
  check('Pelanggan TIDAK bisa self-grant langganan premium', selfGrant);

  // Alice membuat pembayaran (pending) untuk dirinya — boleh.
  const pay = await asUser(U.alice,
    `insert into payments(customer_id, purpose, amount) values ('${U.alice}','subscription',49000) returning id`);
  check('Pelanggan bisa membuat pembayaran sendiri (pending)', pay.rows.length === 1);
  const payId = pay.rows[0].id;

  // Alice tak bisa membuat pembayaran atas nama Bob (WITH CHECK).
  let forgedPay = false;
  try {
    await asUser(U.alice,
      `insert into payments(customer_id, purpose, amount) values ('${U.bob}','subscription',49000)`);
  } catch { forgedPay = true; }
  check('Pelanggan TIDAK bisa membuat pembayaran atas nama orang lain', forgedPay);

  // Alice tak bisa membuat pembayaran langsung 'paid' (WITH CHECK status='pending').
  let paidInsert = false;
  try {
    await asUser(U.alice,
      `insert into payments(customer_id, purpose, amount, status) values ('${U.alice}','subscription',1,'paid')`);
  } catch { paidInsert = true; }
  check('Pelanggan TIDAK bisa menyisipkan pembayaran langsung paid', paidInsert);

  // Bob tak bisa mengonfirmasi pembayaran Alice (fungsi terikat pemilik).
  const bobConfirm = await asUser(U.bob, `select public.mock_confirm_payment('${payId}') as ok`);
  check('Pembayaran orang lain tidak bisa dikonfirmasi', bobConfirm.rows[0]?.ok === false);

  // Alice mengonfirmasi pembayarannya → langganan premium aktif.
  const okConfirm = await asUser(U.alice, `select public.mock_confirm_payment('${payId}') as ok`);
  check('Konfirmasi pembayaran sendiri berhasil', okConfirm.rows[0]?.ok === true);
  const sub = await asUser(U.alice, `select plan, status from subscriptions where customer_id='${U.alice}'`);
  check('Langganan premium aktif setelah pembayaran', sub.rows[0]?.plan === 'premium' && sub.rows[0]?.status === 'active');

  // Bob tak melihat langganan/pembayaran Alice.
  const bobSubs = await asUser(U.bob, `select id from subscriptions where customer_id='${U.alice}'`);
  check('Pelanggan lain tidak melihat langganan Alice', bobSubs.rows.length === 0);
  const bobPays = await asUser(U.bob, `select id from payments where customer_id='${U.alice}'`);
  check('Pelanggan lain tidak melihat pembayaran Alice', bobPays.rows.length === 0);
}

console.log(`\n=== RLS: ${passed} lulus, ${failed} gagal ===`);
process.exit(failed === 0 ? 0 : 1);
