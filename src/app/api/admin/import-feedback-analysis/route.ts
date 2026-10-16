'use strict';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { getImportFeedbackRecords, analyzeImportFeedback } from '@/lib/import-feedback-analytics';

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.ok) return authResult.response;

    const records = await getImportFeedbackRecords(1000);
    const summary = analyzeImportFeedback(records);
    return NextResponse.json({ summary, sampleCount: records.length });
  } catch (error: any) {
    console.error('Import feedback analysis error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
