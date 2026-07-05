/**
 * AVA Health — Domain Billing/Langganan (Fase C: monetisasi).
 *
 * Logika harga & hak (entitlement) sebagai DATA + fungsi murni, agar konsisten
 * lintas app dan dapat diaudit. Provider pembayaran (Midtrans/Xendit — keputusan
 * terbuka #3) TIDAK ada di sini; ini hanya keputusan harga/hak yang deterministik.
 */

export type PlanCode = 'free' | 'premium';

/** Hak yang bisa dimiliki sebuah paket. */
export type Entitlement =
  | 'basic_wellness'
  | 'advanced_wellness'
  | 'consultation_discount'
  | 'family_sharing_plus'
  | 'priority_support';

export interface Plan {
  code: PlanCode;
  title: string;
  /** Harga per bulan dalam Rupiah (0 untuk gratis). */
  monthlyPrice: number;
  currency: 'IDR';
  entitlements: readonly Entitlement[];
  highlights: readonly string[];
}

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export type PaymentPurpose = 'subscription' | 'consultation';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export class BillingError extends Error {}
