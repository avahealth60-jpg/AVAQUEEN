# AVA Health — Platform Kesehatan Mandiri (v1.0)

> **Trust layer / intermediary — KBLI 86910.** AVA bukan penyedia layanan klinis
> langsung. AVA menjembatani vendor alkes, lab kalibrasi, faskes/dokter, dan
> masyarakat. Tanggung jawab klinis tetap di faskes; QC alat di lab; distribusi
> di vendor. Kode ini menegakkan pemisahan itu **secara teknis**.

Versi ini adalah **Milestone 1 — Fondasi + Mesin QC** (wedge utama). Dibangun
nyata dan **teruji**, bukan mock. Lihat "Apa yang sudah jadi" dan "Apa yang
ditunda" di bawah.

---

## Ringkasan: apa yang sudah jadi (dan teruji)

| Bagian | Status | Bukti |
|---|---|---|
| **`packages/domain`** — logika inti deterministik (triage, QC, kalibrasi, badge) | ✅ 38/38 tes lulus, typecheck bersih | `npm run test:domain` |
| **`supabase/migrations`** — skema Postgres + RLS | ✅ Migrasi apply bersih ke Postgres asli | `npm run test:rls` |
| **RLS (firewall liabilitas)** — isolasi pasien, dokter, vendor, lab | ✅ 13/13 tes adversarial lulus | `npm run test:rls` |
| **`supabase/functions`** — edge functions (issue-badge, ai-analyze, schedule-reminders, ingest-wearable) | ✅ Tertulis + parity test vs domain | `npm run test:parity` |
| **`packages/domain/wearable`** — normalisasi data smartwatch (Fase A) | ✅ 21 tes; triase deterministik dipakai ulang, metrik gaya hidup tak ditriase | `npm run test:domain` |
| **`packages/domain/wellness`** — program & kebiasaan sehat (Fase B) | ✅ 19 tes; status wellness terpisah dari triase (mustahil 'segera') | `npm run test:domain` |
| **`packages/domain/caregiver`** — berbagi ke pendamping/keluarga (Fase C) | ✅ 14 tes; state machine tautan + pagar akses scope | `npm run test:domain` |
| **RLS pendamping** — akses baca pasien, scope-gated & dapat dicabut | ✅ 9 tes adversarial (default DENY, cabut memutus akses) | `npm run test:rls` |
| **`packages/domain/notify`** — nudge wellness + alert pendamping (Fase C) | ✅ 8 tes; nudge hangat non-klinis, alert edukatif dari triase tersimpan | `npm run test:domain` |
| **`packages/domain/billing`** — paket, harga & entitlement (Fase C) | ✅ 12 tes; diskon konsultasi Premium, komisi cermin trigger SQL | `npm run test:domain` |
| **RLS billing** — langganan anti-self-grant; aktivasi via konfirmasi bayar | ✅ 9 tes adversarial (klien tak bisa tulis subscription/paid) | `npm run test:rls` |
| **`packages/domain/consult` + app dokter** — state machine konsultasi + tolak | ✅ 6 tes; confirm→complete→komisi, transisi dijaga | `npm run test:domain` |
| **`packages/domain/marketplace`** — etalase alat ber-badge (order + verifikasi) | ✅ 9 tes + 10 RLS; "AVA Verified" diturunkan dari badge aktif | `npm run test:rls` |
| **`packages/domain/corporate`** — wellness korporat/B2B (k-anonimitas) | ✅ 8 tes + 9 RLS; pemberi kerja hanya lihat agregat, bukan data individu | `npm run test:rls` |
| **`apps/customer`** — UI: catat, perangkat, wellness, pendamping, notifikasi, langganan, toko, kerja | ✅ `next build` sukses (10 route) | `npm run build` |
| **`apps/admin`** — Dashboard Monitoring QC (UI wedge) | ✅ Scaffold Next.js berjalan | `npm run build` |
| **`apps/customer`, `apps/partner`** — scaffold | ✅ Home page + layout | — |
| **CI** — GitHub Actions (test + deploy) | ✅ Workflow siap | `.github/workflows/ci.yml` |

**Total: 303 tes lulus** (168 domain + 83 RLS + 52 parity). Semua dijalankan
nyata — RLS diuji terhadap Postgres asli via PGlite (WASM), bukan disimulasikan.

---

## Filosofi arsitektur (kenapa dibangun begini)

1. **RLS = firewall liabilitas.** Pemisahan tanggung jawab partnership AVA
   ditegakkan di lapisan database, bukan hanya di aplikasi. Dokter **secara
   teknis tidak bisa** membaca reading yang tidak di-share padanya. Vendor tidak
   bisa melihat armada vendor lain. Default semua tabel: **DENY**.

2. **AI dikunci edukatif di level skema.** Tabel `analysis_results` punya
   `is_educational boolean CHECK (is_educational = true)` dan `disclaimer text
   CHECK (length > 0)`. Tidak mungkin menyimpan output diagnostik — melindungi
   posisi non-SaMD secara struktural, bukan sekadar di UI.

3. **Triage itu deterministik; LLM hanya menerjemahkan.** Keputusan triage
   (`normal`/`perhatian`/`segera`) dihitung oleh aturan di `packages/domain`
   yang dapat diaudit dan diuji. LLM hanya mengubahnya menjadi penjelasan
   edukatif berbahasa awam — **tidak pernah** mengubah triage.

4. **Satu sumber kebenaran.** Semua logika keputusan hidup di `packages/domain`.
   Edge function (Deno) menduplikasi minimal logika ke `_shared/domain.ts`
   karena kendala deploy Deno — dijaga jujur lewat **parity test** otomatis.

---

## ⚠️ Wajib dibaca sebelum produksi

**Rentang rujukan klinis di `packages/domain/src/reference-range.ts` adalah
nilai edukatif placeholder dan WAJIB ditandatangani oleh klinisi berlisensi
sebelum dipakai produksi.** Nilai disimpan sebagai data (bukan hardcode di
logika) justru agar mudah diaudit dan diganti. Jangan tayangkan ke publik tanpa
sign-off medis.

---

## Cara menjalankan (lokal)

Prasyarat: Node ≥ 20.

```bash
# 1. Install
npm install

# 2. Build domain (paket lain bergantung padanya)
npm run build

# 3. Jalankan SEMUA tes (domain + RLS + parity)
npm run test:all

# Atau satu per satu:
npm run test:domain    # 168 tes logika inti (wearable…billing, consult, marketplace, corporate)
npm run test:rls       # 83 tes RLS terhadap Postgres asli (PGlite)
npm run test:parity    # 52 tes: edge function sinkron dgn domain

# 4. Jalankan dashboard admin (wedge QC)
npm run build && npm -w @ava/app-admin run dev
```

---

## Cara wiring ke modal kamu (Supabase + Vercel + GitHub)

### A. GitHub
1. `git init && git add . && git commit -m "AVA Health v1.0 — fondasi + mesin QC"`
2. Buat repo di GitHub, lalu `git remote add origin … && git push -u origin main`.

### B. Supabase
1. Buat project (untuk keputusan region, lihat "Keputusan terbuka" #2).
2. Push skema: `supabase link --project-ref <ref>` lalu `supabase db push`
   (migrasi di `supabase/migrations` jalan berurutan).
3. (Dev) muat `supabase/seed.sql` untuk data contoh.
4. Deploy edge functions: `supabase functions deploy issue-badge ai-analyze schedule-reminders ingest-wearable`.
5. Set secret: `SUPABASE_SERVICE_ROLE_KEY` & `LLM_API_KEY` hanya di sisi
   Edge Function — **jangan** ke app Next.js.

### C. Vercel
1. Import repo. Ini monorepo Turborepo — buat **3 project** Vercel, masing-masing
   root: `apps/admin`, `apps/customer`, `apps/partner`.
2. Set env per project: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (lihat `.env.example`). Hanya anon key yang masuk ke frontend.
3. Vercel auto-deploy tiap push ke `main` lewat integrasi Git.

### D. CI/CD
`.github/workflows/ci.yml` menjalankan domain build+typecheck+test, RLS test,
dan parity test di tiap PR. Job deploy (hanya `main`) menjalankan `supabase db
push` + deploy functions — butuh secret di GitHub: `SUPABASE_ACCESS_TOKEN`,
`SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`. Frontend di-deploy Vercel
otomatis (terpisah dari job ini).

---

## Disiplin yang harus dijaga

- **Parity test wajib hijau.** Jika kamu ubah logika keputusan di
  `packages/domain`, cerminkan di `supabase/functions/_shared/domain.ts`, lalu
  `npm run test:parity`. Ini mencegah edge function "menyimpang" dari sumber
  kebenaran.
- **Jangan pernah** longgarkan CHECK `is_educational = true`. Itu pengunci posisi
  non-SaMD.
- **Reference range butuh sign-off klinis** sebelum tiap perubahan tayang.

---

## Struktur repo

```
ava-health/
├─ packages/
│  ├─ domain/        ← LOGIKA INTI TERUJI (triage, qc, kalibrasi, badge)
│  ├─ db/            ← klien Supabase browser (anon-only)
│  ├─ ui/            ← komponen bersama (TriagePill, VerifiedBadge)
│  └─ config/        ← preset Tailwind (warna triage)
├─ apps/
│  ├─ admin/         ← Dashboard Monitoring QC  ← WEDGE
│  ├─ customer/      ← app masyarakat (scaffold)
│  └─ partner/       ← app vendor/lab/faskes (scaffold)
├─ supabase/
│  ├─ migrations/    ← skema + RLS (0001–0004)
│  ├─ functions/     ← edge functions (Deno)
│  ├─ tests/         ← harness RLS (PGlite) + parity
│  └─ seed.sql       ← data dev
└─ .github/workflows/ci.yml
```

---

## Keputusan yang masih TERBUKA (tidak memblokir milestone ini)

Lima keputusan dari blueprint masih perlu kamu putuskan. Tidak satu pun
menghalangi Fondasi + QC; semua bisa diisi belakangan:

1. **PWA vs native** untuk app customer.
2. **Supabase managed (Singapura) vs self-hosted di Indonesia** — residensi data
   (pertimbangan UU PDP). Mempengaruhi langkah B.1.
3. **Midtrans vs Xendit** — payment (baru relevan saat layer konsultasi/langganan).
4. **Provider LLM** untuk lapisan penjelasan AI (`ai-analyze`).
5. **Prioritas kanal notifikasi** — WhatsApp / email / push.

---

## Apa yang ditunda (fase berikutnya, sesuai roadmap)

- Build penuh app **customer** (input reading, riwayat, lihat penjelasan AI).
- Build penuh app **partner** (alur vendor/lab/faskes).
- Integrasi **LLM** sungguhan di `ai-analyze` (sekarang: triage deterministik
  jalan, slot penjelasan LLM siap diisi setelah provider dipilih).
- **Konsultasi** (komisi) & **langganan premium** — prioritas setelah mesin QC
  hidup, sesuai prinsip "QC dulu sebagai wedge & flywheel data".
- **Payment** (Midtrans/Xendit) — menyusul layer konsultasi.

Pembangunan sengaja **bertahap**, bukan satu monolitik sekaligus — konsisten
dengan prinsip "minim bug" dan "evolusi inkremental, bukan rewrite besar".
#   A V A Q U E E N  
 