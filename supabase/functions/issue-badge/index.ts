// issue-badge — dipicu saat QC submit. Terbitkan badge HANYA jika QC lulus.
import { serviceClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { decideBadge } from '../_shared/domain.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { calibration_id } = await req.json();
    if (!calibration_id) return json({ error: 'calibration_id wajib' }, 400);

    const db = serviceClient();

    // Ambil QC + device + interval kalibrasi model.
    const { data: cal, error: e1 } = await db
      .from('calibrations')
      .select('id, device_id, performed_at, devices(model_id, device_models(calibration_interval_months))')
      .eq('id', calibration_id)
      .single();
    if (e1 || !cal) return json({ error: 'Kalibrasi tidak ditemukan' }, 404);

    const { data: qc, error: e2 } = await db
      .from('qc_results').select('result').eq('calibration_id', calibration_id)
      .order('created_at', { ascending: false }).limit(1).single();
    if (e2 || !qc) return json({ error: 'Hasil QC belum ada' }, 409);

    // deno-lint-ignore no-explicit-any
    const interval = (cal as any).devices?.device_models?.calibration_interval_months ?? 12;
    const decision = decideBadge(qc.result, new Date(cal.performed_at), interval);

    if (!decision.issued) return json({ issued: false, reason: decision.reason }, 200);

    const { data: badge, error: e3 } = await db.from('badges').insert({
      device_id: cal.device_id,
      calibration_id,
      status: 'active',
      expires_at: decision.expiresAt.toISOString().slice(0, 10),
    }).select().single();
    if (e3) return json({ error: e3.message }, 500);

    return json({ issued: true, badge }, 201);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
