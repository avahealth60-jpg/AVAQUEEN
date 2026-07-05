/**
 * AVA Health — Domain Marketplace (Fase lanjut: etalase alat ber-badge).
 *
 * Murni & teruji. Menutup flywheel QC → pembelian: hanya alat yang punya badge
 * "AVA Verified" aktif yang layak dipasarkan sebagai terverifikasi (status
 * verifikasi ditegakkan di DB via fungsi; di sini logika harga & status order).
 */

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export class MarketplaceError extends Error {}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new MarketplaceError(`Transisi order tidak sah: ${from} → ${to}.`);
  }
}

export function isOrderFinal(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

export interface OrderLine {
  unitPrice: number;
  qty: number;
}

/** Total order = Σ(unitPrice × qty). Menolak angka tak valid (fail-fast). */
export function computeOrderTotal(lines: readonly OrderLine[]): number {
  let total = 0;
  for (const l of lines) {
    if (!Number.isFinite(l.unitPrice) || l.unitPrice < 0) {
      throw new MarketplaceError('unitPrice harus angka >= 0.');
    }
    if (!Number.isInteger(l.qty) || l.qty <= 0) {
      throw new MarketplaceError('qty harus bilangan bulat > 0.');
    }
    total += l.unitPrice * l.qty;
  }
  return total;
}
