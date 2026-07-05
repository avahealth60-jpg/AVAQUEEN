import { describe, it, expect } from 'vitest';
import {
  listPlans,
  getPlan,
  planHasEntitlement,
  priceConsultation,
  computeCommission,
  isSubscriptionActive,
  effectivePlan,
  CONSULTATION_DISCOUNT_RATE,
  AVA_COMMISSION_RATE,
  PLAN_CATALOG,
  BillingError,
} from '../index.js';

describe('katalog paket', () => {
  it('listPlans mengembalikan semua paket', () => {
    expect(listPlans().length).toBe(Object.keys(PLAN_CATALOG).length);
  });
  it('getPlan mengenali kode & menolak tak dikenal', () => {
    expect(getPlan('premium')?.monthlyPrice).toBe(49000);
    expect(getPlan('platinum')).toBeNull();
  });
  it('free tak punya diskon konsultasi; premium punya', () => {
    expect(planHasEntitlement('free', 'consultation_discount')).toBe(false);
    expect(planHasEntitlement('premium', 'consultation_discount')).toBe(true);
  });
});

describe('priceConsultation', () => {
  it('free membayar penuh', () => {
    expect(priceConsultation('free', 50000)).toEqual({ baseFee: 50000, discount: 0, payable: 50000 });
  });
  it('premium mendapat diskon 20%', () => {
    const p = priceConsultation('premium', 50000);
    expect(p.discount).toBe(Math.round(50000 * CONSULTATION_DISCOUNT_RATE));
    expect(p.payable).toBe(40000);
  });
  it('baseFee negatif ditolak', () => {
    expect(() => priceConsultation('free', -1)).toThrow(BillingError);
  });
});

describe('computeCommission — cermin trigger SQL', () => {
  it('15% dari tarif dibayar, dibulatkan', () => {
    expect(computeCommission(50000)).toBe(7500);
    expect(computeCommission(40000)).toBe(6000);
    expect(AVA_COMMISSION_RATE).toBe(0.15);
  });
  it('konsisten dgn diskon premium (komisi dari payable)', () => {
    const payable = priceConsultation('premium', 50000).payable; // 40000
    expect(computeCommission(payable)).toBe(6000);
  });
});

describe('isSubscriptionActive & effectivePlan', () => {
  const now = '2026-07-05T00:00:00Z';
  it('aktif bila status active & belum kedaluwarsa', () => {
    expect(isSubscriptionActive('active', '2026-08-01T00:00:00Z', now)).toBe(true);
  });
  it('tidak aktif bila kedaluwarsa', () => {
    expect(isSubscriptionActive('active', '2026-06-01T00:00:00Z', now)).toBe(false);
  });
  it('tidak aktif bila status bukan active', () => {
    expect(isSubscriptionActive('cancelled', null, now)).toBe(false);
  });
  it('effectivePlan = premium hanya bila langganan valid', () => {
    expect(effectivePlan('active', 'premium', '2026-08-01T00:00:00Z', now)).toBe('premium');
    expect(effectivePlan('active', 'premium', '2026-06-01T00:00:00Z', now)).toBe('free');
    expect(effectivePlan(null, null, null, now)).toBe('free');
  });
});
