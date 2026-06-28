/**
 * AVA Health — Tipe Navigasi (V1.1.0)
 *
 * Arsitektur informasi tunggal, ter-gate per peran (selaras model peran &
 * RLS backend). Tiap peran punya navigasi PENUH — bukan satu halaman.
 *
 * Nama ikon mengacu ke lucide-react (sudah jadi dependency di stack).
 */

export type Role =
  | 'customer'
  | 'vendor'
  | 'lab'
  | 'doctor'
  | 'admin';

export interface NavItem {
  /** id stabil & unik dalam satu peran — dipakai untuk active-state & analytics. */
  id: string;
  /** Label tampilan. Kata kerja aktif; berkata persis apa yang terjadi. */
  label: string;
  /** Rute App Router, selalu diawali '/'. */
  href: string;
  /** Nama ikon lucide-react. */
  icon: string;
  /** Penjelasan singkat untuk empty-state / tooltip / a11y. */
  description: string;
  /** Penanda fitur baru di V1.1 (untuk badge "Baru" & rollout bertahap). */
  isNew?: boolean;
}

export interface RoleNav {
  role: Role;
  /** Label peran untuk header & role-switcher inspektur. */
  roleLabel: string;
  /** Sub-judul peran (jati diri layar). */
  tagline: string;
  items: NavItem[];
}
