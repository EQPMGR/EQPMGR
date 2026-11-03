'use server';

import { verifyUserToken } from '@/lib/server-auth';
import { row, sendLead } from '@/lib/lead-email';
import { accidentLeadSchema } from './schema';

/** Emails an Acci7 accident insurance lead to acci7@eqpmgr.com (invoiced manually by Sage). */
export async function submitAccidentInsuranceLead(
  idToken: string,
  input: unknown
): Promise<{ success: boolean; message: string }> {
  try {
    const { uid, email: accountEmail } = await verifyUserToken(idToken);
    const parsed = accidentLeadSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || 'Please check the form.' };
    const v = parsed.data;

    await sendLead({
      userId: uid,
      kind: 'acci7',
      to: 'acci7@eqpmgr.com',
      subject: `New accident insurance lead: ${v.name}`.slice(0, 150),
      replyTo: v.email,
      html: `
        <h1>New Accident Insurance Lead (Acci7)</h1>
        ${row('Name', v.name)}
        ${row('Address', v.address)}
        ${row('Phone', v.phone)}
        ${row('Email', v.email)}
        ${row('EQPMGR account', accountEmail)}
        ${row('Submitted', new Date().toLocaleString('en-CA', { timeZone: 'America/Vancouver' }))}
        <p>The rider agreed to EQPMGR passing these details to its accident insurance partner.</p>
      `,
    });
    return { success: true, message: "Thanks! Your details were sent and our partner will be in touch." };
  } catch (error: any) {
    console.error('Failed to send accident insurance lead:', error?.message);
    return { success: false, message: error?.message || 'Something went wrong. Please try again later.' };
  }
}
