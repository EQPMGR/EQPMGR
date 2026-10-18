// Server-only: email a rider when parts on a bike cross 80% (due soon) or
// 100% (replace now). components.alert_level_sent makes each threshold email
// once per part; replacing the part resets it (migration 018).
import * as nodemailer from 'nodemailer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { accessSecret } from '@/lib/secrets';

const LEVELS = [100, 80] as const;

type Part = { id: string; name: string; wear_percentage: number; alert_level_sent: number; wear_baseline_key: string | null };

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function appUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || process.env.URL || 'https://eqpmgr.netlify.app';
}

async function sendMail(to: string, subject: string, text: string, html: string) {
  const [host, port, user, pass] = await Promise.all([
    accessSecret('EMAIL_HOST'), accessSecret('EMAIL_PORT'), accessSecret('EMAIL_USER'), accessSecret('EMAIL_PASS'),
  ]);
  const portNumber = Number(port) || 587;
  const transporter = nodemailer.createTransport({ host, port: portNumber, secure: portNumber === 465, auth: { user, pass } });
  await transporter.sendMail({ from: `"EQPMGR" <${user}>`, to, subject, text, html });
}

/** Check one bike and send at most one email covering every part that crossed a threshold. */
export async function sendWearAlertsForBike(supabase: SupabaseClient, equipmentId: string): Promise<{ sent: number }> {
  const { data: bike } = await supabase.from('equipment').select('id, name, user_id').eq('id', equipmentId).maybeSingle();
  if (!bike) return { sent: 0 };

  const { data: parts } = await supabase
    .from('components')
    .select('id, name, wear_percentage, alert_level_sent, wear_baseline_key')
    .eq('equipment_id', equipmentId)
    .not('wear_baseline_key', 'is', null)
    .gte('wear_percentage', 80);

  const crossed = ((parts ?? []) as Part[])
    .map((p) => ({ ...p, level: LEVELS.find((l) => p.wear_percentage >= l)! }))
    .filter((p) => p.level > (p.alert_level_sent ?? 0));
  if (crossed.length === 0) return { sent: 0 };

  const { data: rider } = await supabase.from('app_users').select('email, display_name, wear_alerts_enabled').eq('id', bike.user_id).maybeSingle();

  if (rider?.email && rider.wear_alerts_enabled !== false) {
    const { data: baselines } = await supabase.from('wear_baselines').select('component_key, basis');
    const byHours = new Set((baselines ?? []).filter((b: any) => b.basis === 'hours').map((b: any) => b.component_key));
    const status = (p: (typeof crossed)[number]) =>
      byHours.has(p.wear_baseline_key || '') ? (p.level >= 100 ? 'service now' : 'service due soon')
        : (p.level >= 100 ? 'replace now' : 'due soon');

    const lines = crossed
      .sort((a, b) => b.wear_percentage - a.wear_percentage)
      .map((p) => ({ name: p.name, pct: Math.round(p.wear_percentage), status: status(p) }));
    const link = `${appUrl()}/equipment/${bike.id}`;
    const subject = `${bike.name}: ${lines.length === 1 ? `${lines[0].name} ${lines[0].status}` : `${lines.length} parts need attention`}`;
    const text = [
      `Hi ${rider.display_name || 'there'},`,
      '',
      `Some parts on your ${bike.name} need attention:`,
      ...lines.map((l) => `- ${l.name}: ${l.pct}% (${l.status})`),
      '',
      `See the details: ${link}`,
      '',
      'Wear is estimated from your rides, weather, climbing and weight. A quick check (or a chain checker) confirms it.',
      'Turn these emails off in Settings → Apps.',
    ].join('\n');
    const html = `
      <p>Hi ${escapeHtml(rider.display_name || 'there')},</p>
      <p>Some parts on your <strong>${escapeHtml(bike.name)}</strong> need attention:</p>
      <ul>${lines.map((l) => `<li><strong>${escapeHtml(l.name)}</strong>: ${l.pct}% (${l.status})</li>`).join('')}</ul>
      <p><a href="${link}">See the details in EQPMGR</a></p>
      <p style="color:#666;font-size:12px">Wear is estimated from your rides, weather, climbing and weight. A quick check (or a chain checker) confirms it.<br>Turn these emails off in Settings → Apps.</p>`;

    await sendMail(rider.email, subject, text, html);
  }

  // Mark as alerted even when emails are off, so turning them on later doesn't send a backlog.
  for (const p of crossed) {
    await supabase.from('components').update({ alert_level_sent: p.level }).eq('id', p.id);
  }
  return { sent: rider?.wear_alerts_enabled !== false && rider?.email ? crossed.length : 0 };
}
