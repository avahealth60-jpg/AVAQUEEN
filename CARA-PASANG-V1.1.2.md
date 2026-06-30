## CARA PASANG — AVA Health V1.1.2

**Fase 1.1.2 — Evaluasi komprehensif + basis pengetahuan terkurasi**

Menambah tabel `knowledge_entries` (konten edukatif per parameter & triase) dan modul domain yang merakit evaluasi komprehensif: *artinya / penyebab / saran / kapan ke dokter*. **Tidak ada file V1.0 yang ditimpa.**

### Isi patch

```
supabase/migrations/
├─ 20260628094000_v112_basis_pengetahuan.sql   # tabel knowledge_entries + RLS
└─ 20260628094001_v112_seed_pengetahuan.sql    # seed contoh (gula darah puasa, 3 triase)

packages/domain/src/pemeriksaan/
├─ knowledge.ts        # resolveKnowledge, buildEducationalAnalysis, Explainer, guard
├─ index.ts            # (ganti) menambah satu baris ekspor knowledge
└─ __tests__/knowledge.test.ts   # 11 tes
```

### Arsitektur tiga lapisan (kenapa ini aman & "bukan AI banget")

1. Mesin aturan → triase deterministik (sudah ada, V1.1.1).
2. Basis pengetahuan → konten divalidasi klinisi, ditambatkan per (parameter, triase).
3. Penjelas LLM → hanya merangkai isi terkurasi jadi bahasa hangat. **Tidak pernah mengubah triase atau mengarang fakta.**

Jaminan ini ditegakkan kode: `buildEducationalAnalysis` mengunci `is_educational=true` + disclaimer, dan melempar error bila entri pengetahuan tak cocok dengan triase. `enforceEducationalGuard` menolak output LLM yang menyelipkan klaim diagnostik ("Anda menderita…", "positif diabetes", dst).

### QC sebelum dikirim

- **Domain:** 33 tes hijau (11 knowledge + 22 lama), typecheck strict bersih.
- **Migrasi:** dijalankan di PostgreSQL sungguhan, **dua kali** (idempoten, run ke-2 nol error). 3 entri tersimpan, RLS aktif (`relrowsecurity=t`).

### Langkah pasang

#### 1. Ekstrak ke root repo

```powershell
Expand-Archive -Path "$HOME\Downloads\ava-v1.1.2-patch.zip" -DestinationPath . -Force
```

#### 2. Terapkan migrasi via Dashboard Supabase (urut!)

Seperti V1.1.1: SQL Editor → **Run** file `...094000` dulu, lalu `...094001`.

> Wajib urut: file kedua mengisi tabel yang dibuat file pertama. File ini juga bergantung pada V1.1.1 (tabel `parameters`) — pastikan migrasi V1.1.1 sudah diterapkan.

#### 3. Commit & push

```powershell
git add .
git commit -m "V1.1.2: basis pengetahuan terkurasi + evaluasi komprehensif"
git push
```

#### 4. Verifikasi (SQL Editor)

```sql
select count(*) as entri_pengetahuan from knowledge_entries;
```

Harus **3** (gula darah puasa: normal, perhatian, segera).

### Cara pakai (domain)

```ts
import { evaluateParameter, resolveKnowledge, buildEducationalAnalysis, TemplateExplainer } from '@ava/domain';

const evalRes = evaluateParameter(126, range);                       // segera (deterministik)
const entry = resolveKnowledge(entriesDariDb, 'glukosa_puasa', evalRes.triage);
const analisis = buildEducationalAnalysis(param, 126, evalRes, entry); // terstruktur + disclaimer terkunci
const prosa = new TemplateExplainer().explain(analisis);              // baseline tanpa LLM

// Saat provider LLM dipilih (keputusan terbuka), implementasikan Explainer:
//   class OpenAiExplainer implements Explainer { async explain(a){ /* panggil LLM, lalu */ return enforceEducationalGuard(hasil); } }
// Provider bisa diganti kapan saja tanpa mengubah skema atau posisi SaMD.
```

### ⚠️ Wajib sebelum produksi

Konten `knowledge_entries` di seed adalah **CONTOH** (`signed_off_by = "BELUM DITANDATANGANI"`). Klinisi berlisensi harus memvalidasi & menandatangani tiap entri (artinya/penyebab/saran/kapan ke dokter) sebelum tampil ke pengguna nyata. Kelola lewat konsol admin (katalog).

### Posisi SaMD tidak berubah

Penjelasan = **edukasi**, bukan diagnosis. Triase tetap deterministik; LLM hanya merangkai; output selalu `is_educational=true` + disclaimer.

---

### Catatan dua jalur

- **Jalur ini (1.1.2)** sudah selesai & teruji — siap dipakai begitu UI hasil dibangun.
- **Form multi-parameter (UI Customer App)** masih menunggu 3 file darimu: `components/ReadingForm.tsx`, `lib/data.ts`, dan file klien Supabase. Kirim itu kapan pun, saya rangkai form + tampilan hasil yang memakai basis pengetahuan ini.
