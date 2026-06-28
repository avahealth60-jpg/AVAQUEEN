## CARA PASANG — AVA Health V1.1.1

**Fase 1.1.1 — Mesin pemeriksaan multi-parameter + panel + katalog parameter**

Patch ini menambah dua migrasi DB (idempoten & berversi) dan modul domain triase deterministik. **Tidak ada file V1.0 yang ditimpa.**

---

### Isi patch

```
supabase/migrations/
├─ 20260628093000_v111_pemeriksaan_katalog.sql   # tabel + RLS + trigger roll-up
└─ 20260628093001_v111_seed_katalog.sql          # seed panel/parameter/rentang (upsert)

packages/domain/src/pemeriksaan/
├─ types.ts        # TriageLevel, ReferenceRange, Parameter, CheckupValue
├─ evaluate.ts     # evaluateParameter / summarizeCheckup / resolveReferenceRange
├─ fhir.ts         # toFhirObservation (kesiapan SATUSEHAT / FHIR R4)
├─ index.ts
└─ __tests__/      # evaluate.test.ts (15) + fhir.test.ts (7)
```

---

### QC yang sudah dilakukan sebelum patch ini dikirim

- **Domain:** 22 tes hijau (15 evaluasi + 7 FHIR), typecheck strict bersih (exit 0).
- **Migrasi:** dijalankan pada **PostgreSQL sungguhan**, dua kali berturut-turut (migrasi + seed) → **lulus idempotensi** (run ke-2 tanpa error; penjaga `drop-if-exists`/`if-not-exists` bekerja).
- **Fungsional:** trigger roll-up diuji — sesi dengan nilai normal+perhatian+segera menghasilkan `summary_triage = segera`; setelah nilai `segera` dihapus, ringkasan turun ke `perhatian`. RLS aktif (`relrowsecurity = t`) di kelima tabel baru.

---

### Langkah pasang (Windows / PowerShell 5.1 — jalankan baris per baris)

#### 1. Ekstrak ke root repo

```powershell
Expand-Archive -Path .\ava-v1.1.1-patch.zip -DestinationPath . -Force
```

File migrasi masuk ke `supabase/migrations/`, modul domain ke `packages/domain/src/pemeriksaan/`.

#### 2. Sambungkan domain ke index `@ava/domain`

Tambahkan satu baris di `packages/domain/src/index.ts` existing:

```ts
export * from './pemeriksaan/index.js';
```

#### 3. Terapkan migrasi

Uji dulu di branch/preview (bukan produksi):

```powershell
supabase db reset
```

atau, untuk menerapkan ke project yang sudah jalan:

```powershell
supabase db push
```

> CI/CD yang sudah ada akan menerapkan migrasi ini otomatis saat merge ke `main` (lewat `supabase db push` di GitHub Actions). Jangan ubah DB produksi manual.

#### 4. Regenerasi tipe DB

```powershell
supabase gen types typescript --local > packages/db/src/database.types.ts
```

> Sesuaikan path dengan setup `packages/db`-mu. Ini menjaga frontend sinkron dengan skema baru.

#### 5. Verifikasi

```powershell
pnpm --filter @ava/domain test
```
```powershell
pnpm --filter @ava/domain typecheck
```

Tes domain bertambah **+22** dan tetap hijau.

---

### Cara pakai

#### Evaluasi triase deterministik (di app, sebelum insert)

```ts
import { evaluateParameter, resolveReferenceRange, summarizeCheckup } from '@ava/domain';

// 1. ambil baris reference_ranges parameter (dari Supabase) -> bentuk ReferenceRange[]
const range = resolveReferenceRange(rangesDariDb, 'umum');

// 2. hitung triase (deterministik, teruji)
const hasil = evaluateParameter(126, range); // { triage: 'segera', reason, hasRange }

// 3. simpan ke checkup_values: value, triage=hasil.triage, reference_range_id=range.id
//    Trigger DB akan otomatis roll-up summary_triage di checkups.
```

> Triase yang sama ini diberikan ke `calibrationScale({ ..., status: hasil.triage })` dari V1.1.0 — **satu sumber kebenaran**, tidak ada dua implementasi yang bisa menyimpang.

#### Pemetaan FHIR (kesiapan SATUSEHAT)

```ts
import { toFhirObservation } from '@ava/domain';
const obs = toFhirObservation({ value, evaluation, patientRef, effectiveDateTime });
// resource FHIR R4 Observation siap dipush ke SATUSEHAT saat integrasi (Fase 1.1.6).
```

---

### ⚠️ Wajib sebelum produksi — sign-off klinisi

Rentang rujukan di seed adalah **CONTOH pengembangan**. Kolom `signed_off_by` sengaja berisi `"BELUM DITANDATANGANI — placeholder"`. Sebelum produksi:

1. Klinisi berlisensi memvalidasi tiap rentang di tabel `reference_ranges`.
2. Ganti `source`, `signed_off_by`, `signed_off_at` dengan acuan & tanda tangan resmi.

Skema memaksa kolom ini NOT NULL agar langkah ini tidak terlewat. Katalog dikelola sebagai **data** (lewat konsol admin) — parameter/rentang baru ditambah tanpa rilis ulang kode.

---

### Posisi SaMD tidak berubah

Tabel ini menyimpan nilai & triase deterministik. **Tidak ada kolom "diagnosis".** Penjelasan edukatif tetap di `analysis_results` (`is_educational=true` + disclaimer) seperti V1.0. Menambah parameter = menambah aturan rentang teraudit, bukan menambah kemampuan diagnostik.

---

### Berikutnya

- **1.1.2** — Evaluasi komprehensif + basis pengetahuan terkurasi (`knowledge_entries`): "artinya / penyebab / saran / kapan ke dokter", ditambatkan per parameter & rentang, dirangkai LLM tanpa mengubah triase.
- UI Fase 1.1.1 (panel input multi-parameter di Customer App) memakai navigasi & token dari V1.1.0 + domain ini. Kabari kalau mau saya lanjut ke UI-nya atau langsung ke 1.1.2.
