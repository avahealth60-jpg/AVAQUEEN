/**
 * AVA Health — Katalog paket & logika harga (Fase C). Murni & deterministik.
 */

import type { Plan, PlanCode, Entitlement, SubscriptionStatus } from './types.js';
import { BillingError } from './types.js';

export const PLAN_CATALOG = {
  free: {
    code: 'free',
    title: 'Gratis',
    monthlyPrice: 0,
    currency: 'IDR',
    entitlements: ['basic_wellness'],
    highlights: [
      'Catat & analisis pemeriksaan',
      'Program wellness dasar',
      'Hubungkan smartwatch',
    ],
  },
  premium: {
    code: 'premium',
    title: 'Premium',
    monthlyPrice: 49000,
    currency: 'IDR',
    entitlements: [
      'basic_wellness',
      'advanced_wellness',
      'consultation_discount',
      'family_sharing_plus',
      'priority_support',
    ],
    highlights: [
      'Diskon 20% setiap konsultasi',
      'Program wellness lanjutan & laporan keluarga',
      'Berbagi ke lebih banyak pendamping',
      'Dukungan prioritas',
    ],
  },
} as const satisfies Record<PlanCode, Plan>;

export function listPlans(): Plan[] {
  return Object.values(PLAN_CATALOG);
}

export function getPlan(code: string): Plan | null {
  return (PLAN_CATALOG as Record<string, Plan>)[code] ?? null;
}

/** Diskon konsultasi bagi pemilik entitlement 'consultation_discount'. */
export const CONSULTATION_DISCOUNT_RATE = 0.2;
/** Porsi komisi AVA per konsultasi (cermin trigger app.record_commission). */
export const AVA_COMMISSION_RATE = 0.15;

export function planHasEntitlement(code: PlanCode, ent: Entitlement): boolean {
  const plan = getPlan(code);
  return plan ? plan.entitlements.includes(ent) : false;
}

export interface ConsultationPricing {
  baseFee: number;
  discount: number;
  payable: number;
}

/** Hitung tarif konsultasi yang harus dibayar sesuai paket. */
export function priceConsultation(planCode: PlanCode, baseFee: number): ConsultationPricing {
  if (!Number.isFinite(baseFee) || baseFee < 0) {
    throw new BillingError('baseFee harus angka >= 0.');
  }
  const rate = planHasEntitlement(planCode, 'consultation_discount') ? CONSULTATION_DISCOUNT_RATE : 0;
  const discount = Math.round(baseFee * rate);
  return { baseFee, discount, payable: baseFee - discount };
}

/** Komisi AVA dari tarif yang benar-benar dibayar (dibulatkan, sama dgn SQL). */
export function computeCommission(fee: number, rate = AVA_COMMISSION_RATE): number {
  if (!Number.isFinite(fee) || fee < 0) throw new BillingError('fee harus angka >= 0.');
  return Math.round(fee * rate);
}

/** Apakah langganan masih berlaku pada waktu `now` (ISO). */
export function isSubscriptionActive(
  status: SubscriptionStatus,
  expiresAt: string | null,
  now: string = new Date().toISOString(),
): boolean {
  if (status !== 'active') return false;
  if (!expiresAt) return true;
  return Date.parse(expiresAt) >= Date.parse(now);
}

/** Paket efektif berdasar status langganan (default 'free'). */
export function effectivePlan(
  status: SubscriptionStatus | null,
  plan: PlanCode | null,
  expiresAt: string | null,
  now: string = new Date().toISOString(),
): PlanCode {
  if (status && plan && plan !== 'free' && isSubscriptionActive(status, expiresAt, now)) {
    return plan;
  }
  return 'free';
}
