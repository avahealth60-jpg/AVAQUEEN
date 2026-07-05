/**
 * AVA Health — Domain Pendamping/Caregiver (Fase C: berbagi ke keluarga)
 *
 * Model berbagi terkendali: seorang pasien mengundang pendamping (mis. anak
 * merawat orang tua) untuk MELIHAT data tertentu miliknya. Akses ditegakkan di
 * lapisan database (RLS) — pendamping secara TEKNIS hanya bisa membaca data
 * dalam scope yang diberikan, selama tautan berstatus aktif.
 *
 * PRINSIP:
 *   - Default DENY. Tanpa tautan aktif, pendamping tak melihat apa pun.
 *   - Berbagi data kesehatan = butuh tindakan sadar pasien (UU PDP). Pasien bisa
 *     mencabut kapan saja; pencabutan langsung memutus akses.
 *   - Scope granular: pasien memilih APA yang dibagikan (hasil, wellness, dst.).
 */

/** Kategori data yang bisa dibagikan ke pendamping. */
export type CaregiverScope = 'readings' | 'wellness' | 'consultations';

export const CAREGIVER_SCOPES: readonly CaregiverScope[] = ['readings', 'wellness', 'consultations'];

/** Scope default yang ditawarkan saat mengundang pendamping. */
export const DEFAULT_CAREGIVER_SCOPES: readonly CaregiverScope[] = ['readings', 'wellness'];

/** Status siklus hidup tautan pendamping. */
export type CaregiverLinkStatus = 'pending' | 'active' | 'revoked';

/** Cerminan baris caregiver_links. */
export interface CaregiverLink {
  id: string;
  patientId: string;
  caregiverId: string | null; // null selama undangan belum diklaim
  status: CaregiverLinkStatus;
  scopes: CaregiverScope[];
  invitedAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export class CaregiverError extends Error {}
