import { describe, it, expect } from 'vitest';
import { toFhirObservation } from '../fhir.js';
import { evaluateParameter } from '../evaluate.js';
import type { Parameter, ReferenceRange } from '../types.js';

const gula: ReferenceRange = {
  cohort: 'umum', normalMin: 70, normalMax: 99, scaleMin: 50, scaleMax: 250,
  urgentLow: 54, urgentHigh: 125, source: 'contoh', signedOffBy: 'klinisi', signedOffAt: '2026-06-01',
};
const param: Parameter = { code: 'glukosa_puasa', name: 'Gula darah puasa', unit: 'mg/dL', panelCode: 'glikemik' };

describe('toFhirObservation', () => {
  const make = (value: number, p: Parameter = param) =>
    toFhirObservation({
      value: { parameter: p, value, range: gula },
      evaluation: evaluateParameter(value, gula),
      patientRef: 'abc-123',
      effectiveDateTime: '2026-06-28T09:00:00Z',
    });

  it('membentuk resource Observation final yang valid', () => {
    const obs = make(126);
    expect(obs.resourceType).toBe('Observation');
    expect(obs.status).toBe('final');
    expect(obs.subject.reference).toBe('Patient/abc-123');
    expect(obs.effectiveDateTime).toBe('2026-06-28T09:00:00Z');
  });

  it('valueQuantity memakai UCUM unit', () => {
    const obs = make(126);
    expect(obs.valueQuantity?.value).toBe(126);
    expect(obs.valueQuantity?.unit).toBe('mg/dL');
    expect(obs.valueQuantity?.system).toBe('http://unitsofmeasure.org');
  });

  it('interpretation memetakan triase ke kode HL7', () => {
    expect(make(88).interpretation[0].coding[0].code).toBe('N');
    expect(make(108).interpretation[0].coding[0].code).toBe('A');
    expect(make(126).interpretation[0].coding[0].code).toBe('AA');
  });

  it('referenceRange ikut dengan low/high dari pita normal', () => {
    const obs = make(88);
    expect(obs.referenceRange?.[0].low?.value).toBe(70);
    expect(obs.referenceRange?.[0].high?.value).toBe(99);
  });

  it('tanpa LOINC memakai sistem kode internal AVA (tidak mengarang LOINC)', () => {
    const obs = make(88);
    expect(obs.code.coding[0].system).toContain('ava.health');
    expect(obs.code.coding[0].code).toBe('glukosa_puasa');
  });

  it('dengan LOINC memakai sistem LOINC', () => {
    const withLoinc: Parameter = { ...param, loinc: '1558-6' };
    const obs = make(88, withLoinc);
    expect(obs.code.coding[0].system).toBe('http://loinc.org');
    expect(obs.code.coding[0].code).toBe('1558-6');
  });

  it('serialisasi JSON tanpa undefined yang bocor', () => {
    const json = JSON.stringify(make(126));
    expect(json).not.toContain('undefined');
  });
});
