// apps/customer/lib/payment/provider.ts
//
// Abstraksi provider pembayaran (sisi server). Memisahkan CARA menagih
// (bergantung provider) dari APA yang dicatat (payments/subscriptions).
//
// Provider final adalah keputusan terbuka #3 (Midtrans vs Xendit). Karena itu:
//   • mockProvider — auto-konfirmasi, agar alur langganan bisa diuji sekarang.
//   • Seam nyata: midtrans/xendit mengembalikan `redirectUrl` (halaman bayar) dan
//     `autoConfirm=false`; konfirmasi datang dari WEBHOOK (Edge Function
//     ber-service_role) yang menandai payment 'paid' & mengaktifkan langganan —
//     BUKAN dari klien. Fungsi DB `mock_confirm_payment` adalah stand-in webhook.

export interface ChargeRequest {
  purpose: 'subscription' | 'consultation';
  amount: number;
  currency: string;
  description: string;
}

export interface ChargeResult {
  externalId: string;
  /** URL halaman bayar provider (null untuk mock). */
  redirectUrl: string | null;
  /** Bila true, alur boleh langsung dikonfirmasi (hanya untuk mock/dev). */
  autoConfirm: boolean;
}

export interface PaymentProvider {
  id: string;
  createCharge(req: ChargeRequest): Promise<ChargeResult>;
}

export const mockProvider: PaymentProvider = {
  id: 'mock',
  async createCharge(_req: ChargeRequest): Promise<ChargeResult> {
    const externalId = `mock_${(globalThis.crypto?.randomUUID?.() ?? Date.now().toString())}`;
    return { externalId, redirectUrl: null, autoConfirm: true };
  },
};

/**
 * Provider aktif. Nanti dipilih via env (mis. PAYMENT_PROVIDER=midtrans|xendit).
 * Selama belum dikonfigurasi, memakai mock agar alur tetap jalan.
 */
export function activeProvider(): PaymentProvider {
  // const p = process.env.PAYMENT_PROVIDER;
  // if (p === 'midtrans') return midtransProvider;
  // if (p === 'xendit') return xenditProvider;
  return mockProvider;
}
