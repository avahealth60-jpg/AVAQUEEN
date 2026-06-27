// ai-analyze — dipicu hasil baru. Triase DETERMINISTIK (bukan LLM),
// LLM hanya memperhalus penjelasan. is_educational & disclaimer dikunci.
import { serviceClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { EDUCATIONAL_DISCLAIMER, type Triage } from '../_shared/domain.ts';

// Reference-range minimal (cermin dari packages/domain/reference-range).
type Band = { min: number; max: number; t: Triage };
const RANGES: Record<string, Band[]> = {
  spo2: [
    { min: -Infinity, max: 90, t: 'segera' },
    { min: 90, max: 95, t: 'perhatian' },
    { min: 95, max: Infinity, t: 'normal' },
  ],
  glucose_fasting: [
    { min: -Infinity, max: 54, t: 'segera' },
    { min: 54, max: 70, t: 'perhatian' },
    { min: 70, max: 100, t: 'normal' },
    { min: 100, max: 250, t: 'perhatian' },
    { min: 250, max: Infinity, t: 'segera' },
  ],
};

function triageOf(type: string, value: number): Triage {
  const bands = RANGES[type];
  if (!bands) return 'perhatian'; // tipe tak dikenal → minta perhatian manusia
  return bands.find((b) => value >= b.min && value < b.max)?.t ?? 'perhatian';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { reading_id, reading_type, value } = await req.json();
    if (!reading_id || !reading_type || typeof value !== 'number') {
      return json({ error: 'reading_id, reading_type, value(number) wajib' }, 400);
    }

    const db = serviceClient();
    const triage = triageOf(reading_type, value);

    // (Opsional) perhalus penjelasan via LLM. Triase TIDAK boleh berubah.
    const explanation = await explain(reading_type, value, triage);

    const { data, error } = await db.from('analysis_results').insert({
      reading_id,
      triage,
      explanation,
      is_educational: true,       // dikunci di sini DAN di constraint skema
      disclaimer: EDUCATIONAL_DISCLAIMER,
      model_meta: { engine: 'reference-range-v1', llm_used: Boolean(Deno.env.get('LLM_API_KEY')) },
    }).select().single();
    if (error) return json({ error: error.message }, 500);

    return json({ analysis: data, suggest_consultation: triage !== 'normal' }, 201);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

async function explain(type: string, value: number, triage: Triage): Promise<string> {
  const key = Deno.env.get('LLM_API_KEY');
  const base = `Hasil ${type} Anda (${value}) ditriase: ${triage}.`;
  if (!key) return base; // fallback deterministik tanpa LLM
  // Placeholder pemanggilan LLM — provider final adalah keputusan terbuka #4.
  // Prompt WAJIB menegaskan output edukatif, tidak boleh mendiagnosis.
  return base;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
