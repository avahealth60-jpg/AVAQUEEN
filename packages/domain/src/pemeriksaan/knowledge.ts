/**
 * AVA Health — Basis Pengetahuan & Evaluasi Komprehensif (V1.1.2)
 *
 * Arsitektur tiga lapisan (Blueprint §04), yang membuatnya AMAN & dapat berevolusi:
 *   1. Mesin aturan   -> triase deterministik (evaluate.ts)               [sudah ada]
 *   2. Basis pengetahuan -> artinya/penyebab/saran/kapan, divalidasi klinisi [di sini]
 *   3. Penjelas (LLM) -> merangkai bahasa hangat dari isi terkurasi         [antarmuka di sini]
 *
 * JAMINAN KUNCI (ditegakkan tes):
 *   - Lapisan 3 TIDAK PERNAH mengubah triase atau fakta. Ia hanya menata ulang
 *     isi yang sudah divalidasi. Triase masuk == triase keluar.
 *   - Output selalu is_educational = true + disclaimer terkunci. Ini firewall
 *     posisi non-SaMD: penjelasan = edukasi, bukan diagnosis.
 */
import type { TriageLevel, Parameter, EvalResult } from './types.js';

/** Disclaimer WAJIB & terkunci. Tidak boleh kosong, tidak boleh diubah penjelas. */
export const DISCLAIMER_EDUKATIF =
  'Informasi ini bersifat edukatif, bukan diagnosis atau pengganti nasihat medis profesional.';

/** Satu entri pengetahuan untuk (parameter, triase). Cerminan baris knowledge_entries. */
export interface KnowledgeEntry {
  parameterCode: string;
  triage: TriageLevel;
  artinya: string;
  penyebab?: string | null;
  saran?: string | null;
  kapanKeDokter?: string | null;
  /** Auditabilitas — sumber & sign-off klinisi. */
  source: string;
  signedOffBy: string;
  signedOffAt: string;
  isActive?: boolean;
}

/** Output evaluasi komprehensif yang terstruktur & manusiawi (tetap edukatif). */
export interface EducationalAnalysis {
  triage: TriageLevel;
  /** Ringkasan nilai, mis. "Gula darah puasa — 126 mg/dL". */
  headline: string;
  artinya: string;
  penyebab?: string;
  saran?: string;
  kapanKeDokter?: string;
  /** Apakah konten bersumber dari basis pengetahuan terkurasi (vs. fallback generik). */
  hasCuratedContent: boolean;
  /** Terkunci. */
  isEducational: true;
  disclaimer: string;
}

/**
 * Pilih entri pengetahuan untuk parameter & triase. Hanya yang aktif.
 * Deterministik; null bila belum ada entri (UI akan pakai fallback generik).
 */
export function resolveKnowledge(
  entries: KnowledgeEntry[],
  parameterCode: string,
  triage: TriageLevel,
): KnowledgeEntry | null {
  return (
    entries.find(
      (e) => e.isActive !== false && e.parameterCode === parameterCode && e.triage === triage,
    ) ?? null
  );
}

function fmtValue(p: Parameter, value: number): string {
  const v = p.decimals && p.decimals > 0 ? value.toFixed(p.decimals) : String(value);
  return p.unit ? `${p.name} — ${v} ${p.unit}` : `${p.name} — ${v}`;
}

/** Fallback edukatif aman saat belum ada entri terkurasi (tetap berpagar). */
function genericArtinya(triage: TriageLevel): string {
  switch (triage) {
    case 'normal':
      return 'Nilai berada dalam rentang yang umum dianggap normal. Ini gambaran satu waktu, bukan vonis.';
    case 'perhatian':
      return 'Nilai sedikit di luar rentang yang umum dianggap normal. Ini gambaran satu waktu, bukan vonis.';
    case 'segera':
      return 'Nilai cukup jauh dari rentang yang umum dianggap normal. Ini gambaran satu waktu, bukan vonis.';
  }
}

/**
 * Rakit evaluasi komprehensif dari triase deterministik + entri pengetahuan.
 * SELALU mengembalikan is_educational=true + disclaimer. Tidak menyentuh triase.
 */
export function buildEducationalAnalysis(
  parameter: Parameter,
  value: number,
  evaluation: EvalResult,
  knowledge?: KnowledgeEntry | null,
): EducationalAnalysis {
  const headline = fmtValue(parameter, value);

  if (knowledge) {
    // Jaga konsistensi: entri harus untuk triase yang sama dengan hasil mesin aturan.
    if (knowledge.triage !== evaluation.triage) {
      throw new Error(
        `Entri pengetahuan (${knowledge.triage}) tidak cocok dengan triase (${evaluation.triage}) untuk ${parameter.code}`,
      );
    }
    return {
      triage: evaluation.triage,
      headline,
      artinya: knowledge.artinya,
      penyebab: knowledge.penyebab ?? undefined,
      saran: knowledge.saran ?? undefined,
      kapanKeDokter: knowledge.kapanKeDokter ?? undefined,
      hasCuratedContent: true,
      isEducational: true,
      disclaimer: DISCLAIMER_EDUKATIF,
    };
  }

  return {
    triage: evaluation.triage,
    headline,
    artinya: genericArtinya(evaluation.triage),
    hasCuratedContent: false,
    isEducational: true,
    disclaimer: DISCLAIMER_EDUKATIF,
  };
}

/**
 * Lapisan 3 — antarmuka penjelas. Provider LLM apa pun mengimplementasikan ini.
 * Kontrak: MENERIMA analisis terstruktur yang sudah jadi, MENGEMBALIKAN prosa.
 * DILARANG mengubah triase/fakta. Karena triase & disclaimer sudah terkunci di
 * input, implementasi apa pun yang patuh hanya bisa menata bahasa.
 */
export interface Explainer {
  explain(analysis: EducationalAnalysis): Promise<string> | string;
}

/**
 * Penjelas bawaan tanpa LLM: merangkai isi terkurasi jadi paragraf deterministik.
 * Dipakai sebagai fallback & sebagai baseline tes. Provider LLM bisa menggantikan
 * ini kapan saja tanpa mengubah skema atau posisi SaMD.
 */
export class TemplateExplainer implements Explainer {
  explain(a: EducationalAnalysis): string {
    const parts: string[] = [a.artinya.trim()];
    if (a.penyebab) parts.push(`Kemungkinan penyebab: ${a.penyebab.trim()}`);
    if (a.saran) parts.push(`Saran: ${a.saran.trim()}`);
    if (a.kapanKeDokter) parts.push(`Kapan ke dokter: ${a.kapanKeDokter.trim()}`);
    parts.push(a.disclaimer);
    return parts.join('\n\n');
  }
}

/**
 * Pagar tambahan untuk output penjelas LLM mana pun: pastikan disclaimer tetap ada
 * dan tak ada klaim diagnostik terlarang yang menyusup. Dipakai membungkus penjelas
 * pihak ketiga sebelum hasilnya ditampilkan.
 */
const KATA_DIAGNOSTIK_TERLARANG = [
  'anda menderita',
  'anda mengidap',
  'didiagnosis',
  'pasti diabetes',
  'positif diabetes',
];

export function enforceEducationalGuard(text: string, disclaimer = DISCLAIMER_EDUKATIF): string {
  const lower = text.toLowerCase();
  for (const frasa of KATA_DIAGNOSTIK_TERLARANG) {
    if (lower.includes(frasa)) {
      throw new Error(`Output penjelas memuat klaim diagnostik terlarang: "${frasa}"`);
    }
  }
  return text.includes(disclaimer) ? text : `${text}\n\n${disclaimer}`;
}
