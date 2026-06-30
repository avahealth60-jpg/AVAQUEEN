## CARA PASANG — AVA V1.1.1 UI bagian A (navigasi + header)

Patch kecil & aman untuk **menyalakan** tampilan V1.1.0 di Customer App. Dua file ini **mengganti** file lama (keduanya sudah dilacak git, jadi gampang di-revert kalau perlu). **Tidak ada perubahan database, tidak ada dependency baru.**

### Isi

```
apps/customer/components/BottomNav.tsx   (ganti) — menu bawah penuh dari @ava/ui
apps/customer/app/page.tsx               (ganti) — header instrument-grade, tanpa emoji
```

### Yang berubah di layar

- Menu bawah: dari **2 jadi 5** (Beranda · Catat · Hasil · Konsultasi · Akun), dibaca dari konfigurasi navigasi `@ava/ui` (satu sumber kebenaran), dengan status aktif & warna trust.
- Header beranda: emoji 👋 hilang, ganti gaya "instrument-grade" (eyebrow mono + judul display).
- Logika auth & consent **tidak disentuh** — sama persis seperti file aslimu.

### QC sebelum dikirim

- Kedua file **lolos typecheck strict (exit 0)** terhadap tipe navigasi `@ava/ui` yang asli.
- Ikon memakai SVG inline (bukan lucide), jadi tidak ada risiko dependency hilang.

### Langkah (Windows / PowerShell — baris per baris)

```powershell
Expand-Archive -Path .\ava-v1.1.1-ui-a-patch.zip -DestinationPath . -Force
```
```powershell
git add .
```
```powershell
git commit -m "V1.1.1 UI-A: navigasi penuh + header instrument-grade"
```

Lalu jalankan dev / build seperti biasa:

```powershell
pnpm dev
```

> Ganti `pnpm` dengan package manager-mu (`npm run dev` / `yarn dev`).

### Verifikasi

Buka Customer App. Yang harus terlihat: **menu bawah 5 item** dan **header tanpa emoji**. Tidak perlu sentuh database.

### Kalau build mengeluh soal `@ava/ui`

Kalau muncul error seperti `Cannot resolve '@ava/ui/src/nav'`, pastikan `next.config.js` Customer App punya:

```js
transpilePackages: ['@ava/ui'],
```

(Biasanya sudah ada karena `tokens.css` dari `@ava/ui` sudah jalan. Kalau `tokens.css` jalan, ini pun jalan.)

---

### Berikutnya — form multi-parameter (bagian besar)

Inilah yang mengganti `ReadingForm` satu-parameter jadi panel multi-parameter + skala kalibrasi + simpan ke tabel `checkups`/`checkup_values` (V1.1.1), dengan triase deterministik `@ava/domain`.

Untuk merangkainya **tepat** ke lapisan datamu (bukan tebakan yang bisa merusak yang sudah jalan), saya butuh lihat 3 file ini — buka di editor, salin isinya ke chat:

1. `apps/customer/components/ReadingForm.tsx` — supaya saya tahu pola simpan yang sekarang.
2. `apps/customer/lib/data.ts` — fungsi baca/tulis data (mis. `hasActiveConsent`, simpan reading).
3. File klien Supabase-nya — biasanya `apps/customer/lib/supabase.ts` atau sejenis (yang membuat koneksi ke Supabase).

Begitu saya lihat ketiganya, saya kirim form multi-parameter yang benar-benar menyimpan dan langsung tampil di beranda.
