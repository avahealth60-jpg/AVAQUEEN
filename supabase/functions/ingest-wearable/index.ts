// ingest-wearable — pintu masuk data smartwatch/wearable (Fase A).
//
// Alur:
//   1. Verifikasi consent 'wearable_sync' aktif untuk customer (data biometrik sensitif).
//   2. Normalisasi tiap sampel via _shared/domain (cermin @ava/domain, dijaga parity).
//   3. Simpan ke health_readings (source = provider).
//   4. Metrik KLINIS bertriase → buat analysis_results (is_educational dikunci).
//      Metrik GAYA HIDUP → hanya disimpan, TIDAK ditriase (posisi non-SaMD).
//
// Triase SELALU deterministik. LLM tidak dilibatkan di jalur ini.
import { serviceClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  EDUCATIONAL_DISCLAIMER,
  normalizeWearableSample,
  type EdgeNormalizedReading,
} from '../_shared/domain.ts';

interface RawSample {
  metric: string;
  value: number;
  unit?: string | null;
  takenAt?: string | null;
  deviceModel?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const customer_id: string | undefined = body.customer_id;
    const provider: string | undefined = body.provider;
    const samples: RawSample[] = Array.isArray(body.samples) ? body.samples : [];

    if (!customer_id || !provider) {
      return json({ error: 'customer_id & provider wajib' }, 400);
    }
    if (samples.length === 0) {
      return json({ error: 'samples kosong' }, 400);
    }

    const db = serviceClient();

    // 1) Consent gate — WAJIB untuk data biometrik wearable (UU PDP).
    const { data: consent, error: consentErr } = await db
      .from('consents')
      .select('id')
      .eq('customer_id', customer_id)
      .eq('purpose', 'wearable_sync')
      .eq('status', 'granted')
      .limit(1)
      .maybeSingle();
    if (consentErr) return json({ error: consentErr.message }, 500);
    if (!consent) {
      return json({ error: 'consent wearable_sync belum diberikan', code: 'consent_required' }, 403);
    }

    const stored: unknown[] = [];
    const skipped: string[] = [];
    let flagged = 0; // metrik klinis non-normal (untuk saran konsultasi)

    for (const s of samples) {
      let n: EdgeNormalizedReading | null;
      try {
        n = normalizeWearableSample({ metric: s.metric, value: s.value, unit: s.unit });
      } catch (_e) {
        skipped.push(s.metric); // nilai/satuan tak valid — skip dgn jujur, jangan tebak
        continue;
      }
      if (!n) {
        skipped.push(s.metric); // metrik tak dikenal AVA
        continue;
      }

      const takenAt = s.takenAt ?? new Date().toISOString();
      const { data: reading, error: readErr } = await db
        .from('health_readings')
        .insert({
          customer_id,
          reading_type: n.readingType,
          value: { value: n.value, kind: n.kind, device_model: s.deviceModel ?? null },
          unit: n.unit,
          taken_at: takenAt,
          source: provider,
        })
        .select()
        .single();
      if (readErr) return json({ error: readErr.message }, 500);

      // Hanya metrik KLINIS bertriase yang dianalisis (invariant non-SaMD).
      if (n.kind === 'clinical' && n.triage) {
        if (n.triage !== 'normal') flagged++;
        const { error: anErr } = await db.from('analysis_results').insert({
          reading_id: reading.id,
          triage: n.triage,
          explanation: `Hasil ${n.readingType} dari perangkat (${n.value}${n.unit ?? ''}) ditriase: ${n.triage}.`,
          is_educational: true,
          disclaimer: EDUCATIONAL_DISCLAIMER,
          model_meta: { engine: 'wearable-reference-range-v1', source: provider },
        });
        if (anErr) return json({ error: anErr.message }, 500);
      }
      stored.push({ reading_id: reading.id, type: n.readingType, kind: n.kind, triage: n.triage });
    }

    // Perbarui stempel sinkronisasi (best-effort; tak menggagalkan ingest).
    await db
      .from('wearable_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('customer_id', customer_id)
      .eq('provider', provider);

    return json(
      { stored, skipped, count: stored.length, suggest_consultation: flagged > 0 },
      201,
    );
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
