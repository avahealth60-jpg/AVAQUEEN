// send-push — kirim Web Push ke semua langganan seorang penerima (E1).
// Dipanggil dari konteks server (mis. schedule-reminders) atau langsung.
// Butuh secret: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...).
// Langganan yang kedaluwarsa (404/410) otomatis dihapus.
import webpush from 'https://esm.sh/web-push@3.6.7';
import { serviceClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';

const PUB = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const PRIV = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@ava.health';
if (PUB && PRIV) webpush.setVapidDetails(SUBJECT, PUB, PRIV);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!PUB || !PRIV) return json({ error: 'VAPID belum dikonfigurasi' }, 503);
    const { recipient_id, title, body, url } = await req.json();
    if (!recipient_id || !title) return json({ error: 'recipient_id & title wajib' }, 400);

    const db = serviceClient();
    const { data: subs, error } = await db
      .from('push_subscriptions').select('endpoint, p256dh, auth').eq('customer_id', recipient_id);
    if (error) return json({ error: error.message }, 500);

    const payload = JSON.stringify({ title, body: body ?? '', url: url ?? '/notifikasi' });
    let sent = 0, pruned = 0;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) { // langganan mati → bersihkan
          await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
          pruned++;
        }
      }
    }
    return json({ sent, pruned, total: subs?.length ?? 0 });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
