/**
 * AVA Health — Domain Konsultasi (state machine status). Murni & teruji.
 *
 * Menjaga transisi status konsultasi tetap sah, agar app/DB tak masuk keadaan
 * mustahil (mis. menyelesaikan permintaan yang belum dikonfirmasi, atau
 * mengubah konsultasi yang sudah final).
 */

export type ConsultStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled';

/** Transisi sah per status. Status final tidak punya transisi keluar. */
export const CONSULT_TRANSITIONS: Record<ConsultStatus, readonly ConsultStatus[]> = {
  requested: ['confirmed', 'cancelled'], // dokter konfirmasi / batal (kedua pihak)
  confirmed: ['completed', 'cancelled'], // selesai / batal
  completed: [],
  cancelled: [],
};

export class ConsultError extends Error {}

export function canTransitionConsult(from: ConsultStatus, to: ConsultStatus): boolean {
  return CONSULT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertConsultTransition(from: ConsultStatus, to: ConsultStatus): void {
  if (!canTransitionConsult(from, to)) {
    throw new ConsultError(`Transisi konsultasi tidak sah: ${from} → ${to}.`);
  }
}

export function isConsultFinal(status: ConsultStatus): boolean {
  return CONSULT_TRANSITIONS[status].length === 0;
}
