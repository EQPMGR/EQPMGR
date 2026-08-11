
'use server';

import { createClient } from '@supabase/supabase-js';
import type { InsuranceFormValues } from './schema';
import { accessSecret } from '@/lib/secrets';
import * as nodemailer from 'nodemailer';
import { format } from 'date-fns';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

async function sendEmail(formData: InsuranceFormValues) {
    const emailHost = await accessSecret('EMAIL_HOST');
    const emailPort = Number(await accessSecret('EMAIL_PORT')) || 587;
    const emailUser = await accessSecret('EMAIL_USER');
    const emailPass = await accessSecret('EMAIL_PASS');

    const transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465,
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });

    const yesNoToText = (value?: boolean) => value ? 'Yes' : 'No';

    const htmlBody = `
      <h1>New Pedal Power Insurance Application</h1>
      <h2>Personal Information</h2>
      <p><strong>Name:</strong> ${formData.owner1FirstName} ${formData.owner1LastName}</p>
      <p><strong>Email:</strong> ${formData.email}</p>
      <p><strong>Phone:</strong> ${formData.phone}</p>
      <p><strong>Address:</strong> ${formData.addressStreet}, ${formData.addressCity}, ${formData.addressProvince}, ${formData.addressPostalCode}</p>
      
      <h2>Unit Information</h2>
      <p><strong>Type:</strong> ${formData.unitType}</p>
      <p><strong>Year:</strong> ${formData.unitYear}</p>
      <p><strong>Make:</strong> ${formData.unitMake}</p>
      <p><strong>Model:</strong> ${formData.unitModel}</p>
      <p><strong>Serial Number:</strong> ${formData.unitSerialNumber || 'N/A'}</p>
      <p><strong>Purchase Price:</strong> $${formData.unit.purchasePrice}</p>
      <p><strong>Usage Area:</strong> ${formData.unitUsageArea}</p>
      <p><strong>Storage:</strong> ${formData.unitStorage}</p>

      <h2>Coverage Information</h2>
      <p><strong>Effective Date:</strong> ${format(formData.effectiveDate, 'PPP')}</p>
      <p><strong>Liability:</strong> ${formData.liability}</p>
      <p><strong>Accident Benefits:</strong> ${formData.accidentBenefits}</p>
      <p><strong>Physical Damage:</strong> ${formData.physicalDamage}</p>
      <p><strong>Broker Notification Request:</strong> ${formData.contactWhenBrokerAvailable ? 'Yes' : 'No'}</p>
      
      <h2>Eligibility</h2>
      <ul>
        <li>Competes: ${yesNoToText(formData.competes)}</li>
        <li>Illness: ${yesNoToText(formData.hasIllness)}</li>
        <li>Policy Refused: ${yesNoToText(formData.hasPolicyRefused)}</li>
        <li>Units in Canada: ${yesNoToText(formData.unitsInCanada)}</li>
        <li>Canadian Address: ${yesNoToText(formData.hasCanadianAddress)}</li>
        <li>Past Claims: ${yesNoToText(formData.hasPastClaims)}</li>
        <li>Business Use: ${yesNoToText(formData.isBusinessUse)}</li>
        <li>Gas Powered: ${yesNoToText(formData.isGasPowered)}</li>
        <li>Electric Assisted: ${yesNoToText(formData.isElectricAssisted)}</li>
        <li>Over 500w: ${yesNoToText(formData.isOver500w)}</li>
        <li>Travel Outside: ${yesNoToText(formData.isTravelOutside)}</li>
        <li>Travel USA Long: ${yesNoToText(formData.isTravelUsaLong)}</li>
        <li>Scooter: ${yesNoToText(formData.isScooter)}</li>
        <li>Age Out of Range: ${yesNoToText(formData.isAgeOutOfRange)}</li>
        <li>Near Threat: ${yesNoToText(formData.isNearThreat)}</li>
      </ul>

      ${formData.claims && formData.claims.length > 0 ? `
        <h2>Claim History</h2>
        <table border="1" cellpadding="5" cellspacing="0">
            <thead>
                <tr>
                    <th>Date of Loss</th>
                    <th>Type of Claim</th>
                    <th>Payout Amount</th>
                </tr>
            </thead>
            <tbody>
                ${formData.claims.map(claim => `
                    <tr>
                        <td>${claim.dateOfLoss ? format(claim.dateOfLoss, 'PPP') : 'N/A'}</td>
                        <td>${claim.typeOfClaim || 'N/A'}</td>
                        <td>$${claim.payoutAmount?.toFixed(2) || 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
      ` : ''}
    `;

    await transporter.sendMail({
        from: `"EQPMGR Insurance Bot" <${emailUser}>`,
        to: "sage@eqpmgr.com",
        subject: "New Insurance Application Received",
        html: htmlBody,
    });
}


export async function submitInsuranceApplication(
  values: InsuranceFormValues
): Promise<{ success: boolean; message: string }> {

  try {
    // Send the email with the form data
    await sendEmail(values);

    // Increment a counter for billing/tracking purposes
    const supabase = getSupabaseClient();
    
    // Get current counter value
    const { data: counterData, error: getError } = await supabase
      .from('counters')
      .select('count')
      .eq('id', 'insurance_applications')
      .single();

    if (getError && getError.code !== 'PGRST116') {
      throw getError;
    }

    // Increment or create the counter
    const newCount = (counterData?.count || 0) + 1;
    
    const { error: updateError } = await supabase
      .from('counters')
      .upsert(
        { id: 'insurance_applications', count: newCount },
        { onConflict: 'id' }
      );

    if (updateError) throw updateError;

    return {
      success: true,
      message: 'Application submitted successfully!',
    };
  } catch (error: any) {
    console.error('Failed to process insurance application:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred while processing the application.',
    };
  }
}
