import { describe, it, expect } from 'vitest';
import {
  canTransitionOrder,
  assertOrderTransition,
  isOrderFinal,
  computeOrderTotal,
  MarketplaceError,
} from '../index.js';

describe('state machine order', () => {
  it('pending → paid / cancelled sah', () => {
    expect(canTransitionOrder('pending', 'paid')).toBe(true);
    expect(canTransitionOrder('pending', 'cancelled')).toBe(true);
  });
  it('paid → shipped → delivered', () => {
    expect(canTransitionOrder('paid', 'shipped')).toBe(true);
    expect(canTransitionOrder('shipped', 'delivered')).toBe(true);
  });
  it('tak boleh lompat pending → shipped', () => {
    expect(canTransitionOrder('pending', 'shipped')).toBe(false);
  });
  it('delivered & cancelled final', () => {
    expect(isOrderFinal('delivered')).toBe(true);
    expect(isOrderFinal('cancelled')).toBe(true);
  });
  it('assert melempar untuk transisi tak sah', () => {
    expect(() => assertOrderTransition('delivered', 'paid')).toThrow(MarketplaceError);
  });
});

describe('computeOrderTotal', () => {
  it('menjumlahkan unitPrice × qty', () => {
    expect(computeOrderTotal([{ unitPrice: 150000, qty: 2 }, { unitPrice: 50000, qty: 1 }])).toBe(350000);
  });
  it('menolak qty non-integer / <= 0', () => {
    expect(() => computeOrderTotal([{ unitPrice: 1000, qty: 0 }])).toThrow(MarketplaceError);
    expect(() => computeOrderTotal([{ unitPrice: 1000, qty: 1.5 }])).toThrow(MarketplaceError);
  });
  it('menolak harga negatif', () => {
    expect(() => computeOrderTotal([{ unitPrice: -1, qty: 1 }])).toThrow(MarketplaceError);
  });
  it('order kosong → 0', () => {
    expect(computeOrderTotal([])).toBe(0);
  });
});
