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
    const obs88 = make(88);
    const obs108 = make(108);
    const obs126 = make(126);
    const code88 = obs88.interpretation[0]?.coding[0]?.code;
    const code108 = obs108.interpretation[0]?.coding[0]?.code;
    const code126 = obs126.interpretation[0]?.coding[0]?.code;
    expect(code88).toBe('N');
    expect(code108).toBe('A');
    expect(code126).toBe('AA');
  });

  it('referenceRange ikut dengan low/high dari pita normal', () => {
    const obs = make(88);
    const low = obs.referenceRange?.[0]?.low?.value;
    const high = obs.referenceRange?.[0]?.high?.value;
    expect(low).toBe(70);
    expect(high).toBe(99);
  });

  it('tanpa LOINC memakai sistem kode internal AVA (tidak mengarang LOINC)', () => {
    const obs = make(88);
    const coding = obs.code.coding[0];
    expect(coding?.system).toContain('ava.health');
    expect(coding?.code).toBe('glukosa_puasa');
  });

  it('dengan LOINC memakai sistem LOINC', () => {
    const withLoinc: Parameter = { ...param, loinc: '1558-6' };
    const obs = make(88, withLoinc);
    const coding = obs.code.coding[0];
    expect(coding?.system).toBe('http://loinc.org');
    expect(coding?.code).toBe('1558-6');
  });

  it('serialisasi JSON tanpa undefined yang bocor', () => {
    const json = JSON.stringify(make(126));
    expect(json).not.toContain('undefined');
  });
});