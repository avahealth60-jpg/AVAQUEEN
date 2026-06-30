import { describe, it, expect } from 'vitest';
import {
  resolveKnowledge,
  buildEducationalAnalysis,
  TemplateExplainer,
  enforceEducationalGuard,
  DISCLAIMER_EDUKATIF,
  type KnowledgeEntry,
} from '../knowledge.js';
import { evaluateParameter } from '../evaluate.js';
import type { Parameter, ReferenceRange } from '../types.js';

const param: Parameter = { code: 'glukosa_puasa', name: 'Gula darah puasa', unit: 'mg/dL', panelCode: 'glikemik' };
const range: ReferenceRange = {
  cohort: 'umum', normalMin: 70, normalMax: 99, scaleMin: 50, scaleMax: 250,
  urgentLow: 54, urgentHigh: 125, source: 'contoh', signedOffBy: 'klinisi', signedOffAt: '2026-06-01',
};

const entries: KnowledgeEntry[] = [
  {
    parameterCode: 'glukosa_puasa', triage: 'perhatian',
    artinya: 'Nilaimu di atas rentang puasa normal (≈70–99 mg/dL) dan masuk kisaran waspada.',
    penyebab: 'makan/minum manis sebelum tes, kurang tidur, stres, kurang gerak.',
    saran: 'ulangi puasa di hari lain; kurangi gula sederhana; tambah aktivitas fisik.',
    kapanKeDokter: 'bila berulang tinggi atau disertai gejala, konsultasikan.',
    source: 'contoh', signedOffBy: 'klinisi', signedOffAt: '2026-06-01',
  },
  {
    parameterCode: 'glukosa_puasa', triage: 'segera',
    artinya: 'Nilaimu cukup tinggi dan perlu ditindaklanjuti.',
    source: 'contoh', signedOffBy: 'klinisi', signedOffAt: '2026-06-01',
  },
  {
    parameterCode: 'glukosa_puasa', triage: 'normal', isActive: false,
    artinya: 'nonaktif', source: 'x', signedOffBy: 'x', signedOffAt: '2026-06-01',
  },
];

describe('resolveKnowledge', () => {
  it('mengambil entri yang cocok parameter + triase', () => {
    expect(resolveKnowledge(entries, 'glukosa_puasa', 'perhatian')?.saran).toContain('ulangi');
  });
  it('mengabaikan entri nonaktif', () => {
    expect(resolveKnowledge(entries, 'glukosa_puasa', 'normal')).toBeNull();
  });
  it('null bila tak ada entri', () => {
    expect(resolveKnowledge(entries, 'hba1c', 'perhatian')).toBeNull();
  });
});

describe('buildEducationalAnalysis', () => {
  it('memakai konten terkurasi & selalu mengunci disclaimer + isEducational', () => {
    const evalRes = evaluateParameter(108, range); // perhatian
    const k = resolveKnowledge(entries, 'glukosa_puasa', evalRes.triage);
    const a = buildEducationalAnalysis(param, 108, evalRes, k);
    expect(a.triage).toBe('perhatian');
    expect(a.hasCuratedContent).toBe(true);
    expect(a.headline).toBe('Gula darah puasa — 108 mg/dL');
    expect(a.isEducational).toBe(true);
    expect(a.disclaimer).toBe(DISCLAIMER_EDUKATIF);
  });

  it('fallback generik tetap edukatif + disclaimer saat tak ada entri', () => {
    const evalRes = evaluateParameter(126, range); // segera, tapi pakai param tanpa entri
    const a = buildEducationalAnalysis({ ...param, code: 'tak_ada' }, 126, evalRes, null);
    expect(a.hasCuratedContent).toBe(false);
    expect(a.isEducational).toBe(true);
    expect(a.disclaimer).toBe(DISCLAIMER_EDUKATIF);
    expect(a.artinya.length).toBeGreaterThan(0);
  });

  it('JAMINAN: triase masuk == triase keluar (perakit tak mengubah triase)', () => {
    for (const v of [80, 108, 126, 40]) {
      const evalRes = evaluateParameter(v, range);
      const k = resolveKnowledge(entries, 'glukosa_puasa', evalRes.triage);
      const a = buildEducationalAnalysis(param, v, evalRes, k);
      expect(a.triage).toBe(evalRes.triage);
    }
  });

  it('melempar bila entri pengetahuan beda triase dengan hasil mesin aturan', () => {
    const evalRes = evaluateParameter(80, range); // normal
    const salah = entries[0]; // entri 'perhatian'
    expect(() => buildEducationalAnalysis(param, 80, evalRes, salah)).toThrow(/tidak cocok/);
  });
});

describe('TemplateExplainer (penjelas baseline tanpa LLM)', () => {
  it('merangkai isi terkurasi dan menyertakan disclaimer', () => {
    const evalRes = evaluateParameter(108, range);
    const k = resolveKnowledge(entries, 'glukosa_puasa', evalRes.triage);
    const a = buildEducationalAnalysis(param, 108, evalRes, k);
    const prosa = new TemplateExplainer().explain(a);
    expect(prosa).toContain('Saran:');
    expect(prosa).toContain('Kapan ke dokter:');
    expect(prosa).toContain(DISCLAIMER_EDUKATIF);
  });
});

describe('enforceEducationalGuard (pagar output penjelas pihak ketiga)', () => {
  it('menambahkan disclaimer bila penjelas lupa menyertakannya', () => {
    const out = enforceEducationalGuard('Penjelasan tanpa disclaimer.');
    expect(out).toContain(DISCLAIMER_EDUKATIF);
  });
  it('tidak menggandakan disclaimer bila sudah ada', () => {
    const txt = `Penjelasan. ${DISCLAIMER_EDUKATIF}`;
    const out = enforceEducationalGuard(txt);
    expect(out.match(new RegExp(DISCLAIMER_EDUKATIF.slice(0, 20), 'g'))?.length).toBe(1);
  });
  it('MENOLAK klaim diagnostik terlarang dari output LLM', () => {
    expect(() => enforceEducationalGuard('Anda menderita diabetes.')).toThrow(/diagnostik terlarang/);
    expect(() => enforceEducationalGuard('Hasil ini positif diabetes.')).toThrow(/diagnostik terlarang/);
  });
});
