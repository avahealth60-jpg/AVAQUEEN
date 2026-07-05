import { describe, it, expect } from 'vitest';
import {
  canTransition,
  assertTransition,
  scopeAllows,
  sanitizeScopes,
  canCaregiverRead,
  CAREGIVER_SCOPES,
  DEFAULT_CAREGIVER_SCOPES,
  CaregiverError,
} from '../index.js';

describe('canTransition — state machine tautan', () => {
  it('pending → active / revoked sah', () => {
    expect(canTransition('pending', 'active')).toBe(true);
    expect(canTransition('pending', 'revoked')).toBe(true);
  });
  it('active → revoked sah', () => {
    expect(canTransition('active', 'revoked')).toBe(true);
  });
  it('revoked bersifat final', () => {
    expect(canTransition('revoked', 'active')).toBe(false);
    expect(canTransition('revoked', 'pending')).toBe(false);
  });
  it('tidak boleh mundur active → pending', () => {
    expect(canTransition('active', 'pending')).toBe(false);
  });
  it('assertTransition melempar untuk transisi tak sah', () => {
    expect(() => assertTransition('revoked', 'active')).toThrow(CaregiverError);
  });
});

describe('scope', () => {
  it('scopeAllows memeriksa keanggotaan', () => {
    expect(scopeAllows(['readings'], 'readings')).toBe(true);
    expect(scopeAllows(['wellness'], 'readings')).toBe(false);
  });
  it('sanitizeScopes membuang tak dikenal & duplikat', () => {
    expect(sanitizeScopes(['readings', 'readings', 'xxx', 'wellness'])).toEqual(['readings', 'wellness']);
  });
  it('sanitizeScopes menolak kosong', () => {
    expect(() => sanitizeScopes(['tidakvalid'])).toThrow(CaregiverError);
  });
  it('default scope adalah subset dari yang dikenal', () => {
    for (const s of DEFAULT_CAREGIVER_SCOPES) expect(CAREGIVER_SCOPES).toContain(s);
  });
});

describe('canCaregiverRead — pagar akses (cermin RLS)', () => {
  const base = { caregiverId: 'cg-1', status: 'active' as const, scopes: ['readings'] as const };
  it('izinkan bila aktif + pemilik tautan + scope cocok', () => {
    expect(canCaregiverRead(base, 'cg-1', 'readings')).toBe(true);
  });
  it('tolak bila scope tak diberikan', () => {
    expect(canCaregiverRead(base, 'cg-1', 'wellness')).toBe(false);
  });
  it('tolak bila viewer bukan pendamping di tautan', () => {
    expect(canCaregiverRead(base, 'orang-lain', 'readings')).toBe(false);
  });
  it('tolak bila tautan belum aktif / sudah dicabut', () => {
    expect(canCaregiverRead({ ...base, status: 'pending' }, 'cg-1', 'readings')).toBe(false);
    expect(canCaregiverRead({ ...base, status: 'revoked' }, 'cg-1', 'readings')).toBe(false);
  });
  it('tolak bila tautan belum diklaim (caregiverId null)', () => {
    expect(canCaregiverRead({ ...base, caregiverId: null }, 'cg-1', 'readings')).toBe(false);
  });
});
