/**
 * AVA Health — Pemetaan FHIR R4 (V1.1.1)
 *
 * Memetakan satu nilai pemeriksaan ke resource FHIR R4 `Observation`.
 * Tujuannya kesiapan interoperabilitas (SATUSEHAT/HL7 FHIR) — agar AVA tidak
 * jadi pulau data. Fungsi murni & deterministik; tidak melakukan jaringan.
 *
 * Catatan: kode LOINC hanya disertakan bila parameter sudah dipetakan klinisi
 * (parameter.loinc). Kita TIDAK mengarang kode LOINC. Tanpa LOINC, dipakai
 * sistem kode internal AVA sebagai penampung yang jujur sampai pemetaan resmi.
 */
import type { CheckupValue, EvalResult, TriageLevel } from './types.js';

const INTERP: Record<TriageLevel, { code: string; display: string }> = {
  // http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation
  normal: { code: 'N', display: 'Normal' },
  perhatian: { code: 'A', display: 'Abnormal' },
  segera: { code: 'AA', display: 'Critical abnormal' },
};

export interface FhirObservation {
  resourceType: 'Observation';
  status: 'final';
  code: { coding: { system: string; code: string; display: string }[] };
  subject: { reference: string };
  effectiveDateTime: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system: 'http://unitsofmeasure.org';
    code: string;
  };
  interpretation: {
    coding: { system: string; code: string; display: string }[];
  }[];
  referenceRange?: {
    low?: { value: number; unit: string };
    high?: { value: number; unit: string };
    text?: string;
  }[];
}

export interface ToFhirInput {
  value: CheckupValue;
  evaluation: EvalResult;
  /** Referensi pasien (mis. id profil / nomor rekam). */
  patientRef: string;
  /** Waktu pengambilan, ISO. */
  effectiveDateTime: string;
}

const AVA_PARAM_SYSTEM = 'https://ava.health/fhir/CodeSystem/parameter';
const HL7_INTERP_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation';

export function toFhirObservation(input: ToFhirInput): FhirObservation {
  const { value, evaluation, patientRef, effectiveDateTime } = input;
  const p = value.parameter;
  const unit = p.unit ?? '';

  const coding = p.loinc
    ? [{ system: 'http://loinc.org', code: p.loinc, display: p.name }]
    : [{ system: AVA_PARAM_SYSTEM, code: p.code, display: p.name }];

  const obs: FhirObservation = {
    resourceType: 'Observation',
    status: 'final',
    code: { coding },
    subject: { reference: `Patient/${patientRef}` },
    effectiveDateTime,
    valueQuantity: {
      value: value.value,
      unit,
      system: 'http://unitsofmeasure.org',
      code: unit,
    },
    interpretation: [
      {
        coding: [{ system: HL7_INTERP_SYSTEM, ...INTERP[evaluation.triage] }],
      },
    ],
  };

  const r = value.range;
  if (r && (r.normalMin != null || r.normalMax != null)) {
    obs.referenceRange = [
      {
        ...(r.normalMin != null ? { low: { value: r.normalMin, unit } } : {}),
        ...(r.normalMax != null ? { high: { value: r.normalMax, unit } } : {}),
        text: 'Rentang rujukan AVA — edukatif, bukan diagnosis.',
      },
    ];
  }

  return obs;
}
