// packages/db/src/types.ts
// Tipe baris database — dipetakan PERSIS ke skema di supabase/migrations.
// (Bisa diganti hasil `supabase gen types` saat instance lokal hidup;
//  ditulis tangan agar build tidak bergantung pada instance yang berjalan.)

import type { QcResult, Triage } from '@ava/domain';

export type UserRole =
  | 'customer' | 'doctor' | 'faskes_admin' | 'vendor' | 'lab' | 'ava_admin';
export type OrgKind = 'faskes' | 'vendor' | 'lab';
export type ConsentStatus = 'granted' | 'withdrawn';
export type ConsultationStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  kind: OrgKind;
  created_at: string;
}

export interface DeviceModel {
  id: string;
  name: string;
  category: string | null;
  manufacturer: string | null;
  nie_no: string | null;
  calibration_interval_months: number;
}

export interface Device {
  id: string;
  model_id: string;
  serial: string;
  vendor_id: string;
  status: string;
  registered_at: string;
}

export interface Calibration {
  id: string;
  device_id: string;
  lab_id: string;
  performed_at: string;   // date (YYYY-MM-DD)
  next_due_at: string;    // date
  certificate_url: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface QcResultRow {
  id: string;
  calibration_id: string;
  result: QcResult;
  metrics: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  device_id: string;
  calibration_id: string;
  status: string;
  issued_at: string;
  expires_at: string;     // date
}

export interface Consent {
  id: string;
  customer_id: string;
  purpose: string;
  status: ConsentStatus;
  granted_at: string;
  withdrawn_at: string | null;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  reading_id: string;
  triage: Triage;
  explanation: string | null;
  is_educational: boolean;
  disclaimer: string;
  created_at: string;
}
