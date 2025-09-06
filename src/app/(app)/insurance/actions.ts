
'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { InsuranceFormValues } from './schema';

export async function submitInsuranceApplication(
  values: InsuranceFormValues
): Promise<{ success: boolean; message: string }> {

  // For now, we will log the form data to the console and increment a counter.
  // In a real application, this would trigger an email or an API call to a third party.
  console.log('Received Insurance Application:', JSON.stringify(values, null, 2));

  try {
    const adminDb = await getAdminDb();

    // Increment a counter for billing/tracking purposes
    const counterRef = adminDb.collection('counters').doc('insuranceApplications');
    await counterRef.set({
      count: FieldValue.increment(1)
    }, { merge: true });

    // Here you would add logic to generate a PDF and email it.
    // For example, using a library like `pdf-lib` and an email service like SendGrid.
    // This part is a placeholder for now.

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
