// Server-only: emails a lead from an insurance form to a partner inbox, with a
// per-rider limit. Not a 'use server' module: exports here must not become
// public endpoints. These are the only emails the app sends, and they go to
// EQPMGR's own inboxes, never to riders (decision 2026-10-31; see ROADMAP).
import * as nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { accessSecret } from '@/lib/secrets';

// 'acci7' rows from the removed accident form (2026-11) may still be in the log.
export type LeadKind = 'pedal_power';
const LEADS_PER_DAY = 3;

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

/** Escape anything a rider typed before it goes into the email's HTML. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** One label/value row for the email body. */
export function row(label: string, value: unknown): string {
  return `<p><strong>${esc(label)}:</strong> ${esc(value === undefined || value === null || value === '' ? 'N/A' : value)}</p>`;
}

/**
 * Logs the lead (enforcing LEADS_PER_DAY per rider per form) and emails it.
 * Throws a user-facing error when over the limit or when sending fails.
 */
export async function sendLead({ userId, kind, to, subject, html, replyTo }: {
  userId: string; kind: LeadKind; to: string; subject: string; html: string; replyTo?: string;
}) {
  const supabase = serviceClient();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count, error: countError } = await supabase.from('lead_submissions')
    .select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', kind).gte('created_at', since);
  if (countError) throw new Error('This form is unavailable right now. Please try again later.'); // fail closed
  if ((count ?? 0) >= LEADS_PER_DAY) throw new Error("You've already sent this form today. We'll be in touch soon.");

  const { data: logged, error: logError } = await supabase.from('lead_submissions')
    .insert({ user_id: userId, kind }).select('id').single();
  if (logError) throw new Error('This form is unavailable right now. Please try again later.');

  const [host, port, user, pass] = await Promise.all([
    accessSecret('EMAIL_HOST'), accessSecret('EMAIL_PORT'), accessSecret('EMAIL_USER'), accessSecret('EMAIL_PASS'),
  ]);
  const portNumber = Number(port) || 587;
  const transporter = nodemailer.createTransport({
    host, port: portNumber, secure: portNumber === 465, auth: { user, pass }, connectionTimeout: 15_000,
  });

  try {
    await transporter.sendMail({
      from: `"EQPMGR" <${user}>`,
      to,
      replyTo: replyTo && /^[^\s@<>]+@[^\s@<>]+$/.test(replyTo) ? replyTo : undefined,
      subject,
      html,
    });
  } catch (error: any) {
    console.error('[lead-email] send failed', kind, error?.code, error?.responseCode);
    throw new Error("We couldn't send your details just now. Please try again later.");
  }
  await supabase.from('lead_submissions').update({ email_sent: true }).eq('id', logged.id);
}
