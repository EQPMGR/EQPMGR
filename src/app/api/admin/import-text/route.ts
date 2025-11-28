'use server';

import { NextResponse } from 'next/server';
import { chat as openaiChat } from '@/lib/llm';
import { getServerAuth } from '@/backend';

type ImportRequest = {
  text?: string;
};

/**
 * POST /api/admin/import-text
 * Body: { text: string }
 * Returns JSON: { parsed: { brand?, model?, components: [...] }, debug?: string }
 *
 * Behavior:
 * - If `OPENAI_API_KEY` is set, calls OpenAI with a JSON-output prompt and returns parsed JSON.
 * - If no API key or the AI call fails, returns a lightweight fallback parse so UI can be tested without a paid key.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });

    const auth = await getServerAuth();
    const decoded = await auth.verifyIdToken(token, true);
    if (!decoded?.uid) return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });

    const body: ImportRequest = await req.json().catch(() => ({} as ImportRequest));
    const text = (body.text || '').trim();

    if (!text) return NextResponse.json({ error: 'Missing text in request body.' }, { status: 400 });

    // Build a concise prompt asking for JSON only
    const prompt = `Extract bike information from the following text and return ONLY valid JSON matching this shape:\n{\n  "brand": "...",\n  "model": "...",\n  "modelYear": 2023,\n  "components": [ { "name": "", "brand": "", "series": "", "model": "", "system": "" } ]\n}\n\nText:\n${text}`;

    // Try OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      try {
        const resultText = await openaiChat(prompt);
        // Try to parse JSON out of the model text
        const firstBrace = resultText.indexOf('{');
        const jsonText = firstBrace >= 0 ? resultText.slice(firstBrace) : resultText;
        const parsed = JSON.parse(jsonText);
        return NextResponse.json({ parsed });
      } catch (err: any) {
        console.error('OpenAI parse failed, falling back:', err);
        // fallthrough to fallback parser below
      }
    }

    // Lightweight fallback parser (heuristic) so UI can be tested without OpenAI.
    const lines = text.split(/\n|\.|;|\|/).map(s => s.trim()).filter(Boolean);
    const fallback: any = { brand: undefined, model: undefined, modelYear: undefined, components: [] };
    // Try to find a line with 'Brand:' or 'Manufacturer:'
    for (const l of lines) {
      const mBrand = l.match(/(?:Brand|Manufacturer)[:\-]\s*(.+)/i);
      if (mBrand) fallback.brand = mBrand[1].trim();
      const mModel = l.match(/(?:Model|Model Name)[:\-]\s*(.+)/i);
      if (mModel) fallback.model = mModel[1].trim();
      const mYear = l.match(/(20\d{2}|19\d{2})/);
      if (mYear && !fallback.modelYear) fallback.modelYear = Number(mYear[1]);
    }

    // Simple component extraction: look for lines with common component keywords
    const componentKeywords = ['wheel', 'tire', 'cassette', 'crank', 'derailleur', 'brake', 'fork', 'seat', 'chain', 'rim', 'hub', 'shifter'];
    for (const l of lines) {
      const lower = l.toLowerCase();
      for (const kw of componentKeywords) {
        if (lower.includes(kw)) {
          fallback.components.push({ name: l, brand: undefined, series: undefined, model: undefined, system: undefined });
          break;
        }
      }
    }

    // If nothing found, return the original text for debugging
    if (!fallback.brand && !fallback.model && fallback.components.length === 0) {
      return NextResponse.json({ parsed: { components: [], note: 'fallback: no structured info found', originalText: text } });
    }

    return NextResponse.json({ parsed: fallback });

  } catch (error: any) {
    console.error('Import-text handler error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
