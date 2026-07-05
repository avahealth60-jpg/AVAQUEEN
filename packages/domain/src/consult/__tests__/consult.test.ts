import { describe, it, expect } from 'vitest';
import {
  canTransitionConsult,
  assertConsultTransition,
  isConsultFinal,
  ConsultError,
} from '../index.js';

describe('state machine konsultasi', () => {
  it('requested → confirmed / cancelled sah', () => {
    expect(canTransitionConsult('requested', 'confirmed')).toBe(true);
    expect(canTransitionConsult('requested', 'cancelled')).toBe(true);
  });
  it('confirmed → completed / cancelled sah', () => {
    expect(canTransitionConsult('confirmed', 'completed')).toBe(true);
    expect(canTransitionConsult('confirmed', 'cancelled')).toBe(true);
  });
  it('tidak boleh menyelesaikan permintaan yang belum dikonfirmasi', () => {
    expect(canTransitionConsult('requested', 'completed')).toBe(false);
  });
  it('status final tak bisa berubah', () => {
    expect(isConsultFinal('completed')).toBe(true);
    expect(isConsultFinal('cancelled')).toBe(true);
    expect(canTransitionConsult('completed', 'confirmed')).toBe(false);
    expect(canTransitionConsult('cancelled', 'requested')).toBe(false);
  });
  it('requested & confirmed bukan final', () => {
    expect(isConsultFinal('requested')).toBe(false);
    expect(isConsultFinal('confirmed')).toBe(false);
  });
  it('assert melempar untuk transisi tak sah', () => {
    expect(() => assertConsultTransition('completed', 'confirmed')).toThrow(ConsultError);
  });
});
