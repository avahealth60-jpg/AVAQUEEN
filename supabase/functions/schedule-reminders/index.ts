// schedule-reminders — cron harian. Ingatkan kalibrasi jatuh tempo,
// tandai badge kedaluwarsa. Dijadwalkan via pg_cron / Supabase schedule.
import { serviceClient } from '../_shared/supabase.ts';

Deno.serve(async () => {
  const db = serviceClient();
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  // 1) Badge kedaluwarsa → status expired.
  const { data: expired } = await db
    .from('badges').update({ status: 'expired' }).lt('expires_at', today)
    .eq('status', 'active').select('id');

  // 2) Kalibrasi jatuh tempo dalam 30 hari → notifikasi ke vendor pemilik.
  const { data: dueCals } = await db
    .from('calibrations').select('id, device_id, next_due_at, devices(vendor_id)')
    .lte('next_due_at', soon).gte('next_due_at', today);

  let reminders = 0;
  for (const c of dueCals ?? []) {
    // deno-lint-ignore no-explicit-any
    const vendorId = (c as any).devices?.vendor_id;
    if (!vendorId) continue;
    const { data: members } = await db
      .from('organization_members').select('profile_id').eq('organization_id', vendorId);
    for (const m of members ?? []) {
      await db.from('notifications').insert({
        recipient_id: m.profile_id,
        channel: 'push',
        title: 'Kalibrasi akan jatuh tempo',
        body: `Alat dengan kalibrasi jatuh tempo ${c.next_due_at}. Jadwalkan ulang.`,
      });
      reminders++;
    }
  }

  return new Response(
    JSON.stringify({ expired_badges: expired?.length ?? 0, reminders_sent: reminders }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
