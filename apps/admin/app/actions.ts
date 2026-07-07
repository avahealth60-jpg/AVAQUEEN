// apps/admin/app/actions.ts — Server Actions admin. Verifikasi identitas admin
// (klien sesi, RLS) SEBELUM menulis via service-role.
'use server';

import { revalidatePath } from 'next/cache';
import { adminServerClient } from '@ava/db';
import { getAuth } from '../lib/auth';

export interface AdminActionResult { ok: boolean; message: string; }

/** Admin memverifikasi / menolak dokter (STR/SIP). */
export async function verifyDoctor(doctorId: string, status: string): Promise<AdminActionResult> {
  const auth = await getAuth();
  if (auth.role !== 'ava_admin') return { ok: false, message: 'Hanya admin.' };
  if (!['verified', 'rejected', 'pending'].includes(status)) return { ok: false, message: 'Status tidak valid.' };

  const db = adminServerClient(); // service-role → melewati guard trigger
  if (!db) return { ok: false, message: 'Backend belum dikonfigurasi.' };
  const { error } = await db.from('profiles')
    .update({ doctor_status: status }).eq('id', doctorId).eq('role', 'doctor');
  if (error) return { ok: false, message: error.message };
  revalidatePath('/verifikasi');
  return {
    ok: true,
    message: status === 'verified' ? 'Dokter diverifikasi.' : status === 'rejected' ? 'Dokter ditolak.' : 'Direset ke menunggu.',
  };
}
