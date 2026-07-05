// schedule-reminders — cron harian. Ingatkan kalibrasi jatuh tempo,
// tandai badge kedaluwarsa, dan kirim alert pendamping utk hasil pasien flagged.
// Dijadwalkan via pg_cron / Supabase schedule.
import { serviceClient } from '../_shared/supabase.ts';
import { caregiverAlertFor } from '../_shared/domain.ts';

// Label ringkas per jenis reading klinis (untuk teks alert pendamping).
const READING_LABEL: Record<string, string> = {
  spo2: 'Saturasi oksigen (SpO₂)',
  heart_rate: 'Detak jantung',
  temperature: 'Suhu tubuh',
  bp_systolic: 'Tekanan darah sistolik',
  bp_diastolic: 'Tekanan darah diastolik',
  glucose_fasting: 'Gula darah puasa',
  blood_pressure: 'Tekanan darah',
};

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

  // 3) Alert pendamping: hasil pasien flagged (triase != normal) dalam 2 hari
  //    → beri tahu pendamping AKTIF berscope 'readings'. Deduplikasi per (recipient,title).
  const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const { data: flagged } = await db
    .from('analysis_results')
    .select('triage, created_at, health_readings(customer_id, reading_type, value, unit)')
    .neq('triage', 'normal')
    .gte('created_at', since);

  let alerts = 0;
  for (const a of flagged ?? []) {
    // deno-lint-ignore no-explicit-any
    const r = (a as any).health_readings;
    if (!r) continue;

    // Pendamping aktif dengan scope 'readings' untuk pasien ini.
    const { data: links } = await db
      .from('caregiver_links')
      .select('caregiver_id, scopes, status')
      .eq('patient_id', r.customer_id).eq('status', 'active');
    const caregivers = (links ?? []).filter((l) => (l.scopes ?? []).includes('readings') && l.caregiver_id);
    if (caregivers.length === 0) continue;

    // Nama pasien (service role boleh baca profil).
    const { data: prof } = await db
      .from('profiles').select('full_name').eq('id', r.customer_id).maybeSingle();
    const patientName = prof?.full_name ?? 'Pasien';

    const display = r.reading_type === 'blood_pressure'
      ? `${r.value?.systolic ?? '?'}/${r.value?.diastolic ?? '?'}`
      : String(r.value?.value ?? r.value?.v ?? '?');
    const alert = caregiverAlertFor({
      patientName,
      label: READING_LABEL[r.reading_type] ?? r.reading_type,
      display,
      unit: r.unit ?? '',
      // deno-lint-ignore no-explicit-any
      triage: (a as any).triage,
    });
    if (!alert) continue;

    for (const cg of caregivers) {
      // Dedup: lewati bila sudah ada notifikasi judul sama utk penerima ini baru-baru ini.
      const { data: dup } = await db
        .from('notifications')
        .select('id').eq('recipient_id', cg.caregiver_id).eq('title', alert.title)
        .gte('created_at', since).limit(1);
      if (dup && dup.length > 0) continue;

      await db.from('notifications').insert({
        recipient_id: cg.caregiver_id,
        channel: 'push',
        title: alert.title,
        body: alert.body,
      });
      alerts++;
    }
  }

  return new Response(
    JSON.stringify({ expired_badges: expired?.length ?? 0, reminders_sent: reminders, caregiver_alerts: alerts }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
