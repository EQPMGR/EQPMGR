// Server-only: turn pasted manufacturer spec-page text into a structured bike
// build using Claude (Haiku 5.5) with a strict output schema. Falls back to the
// rule-based parser (src/lib/bike-parser.ts) when no API key is configured or
// the AI call fails, so imports never hard-fail.
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { BASE_COMPONENTS, BIKE_TYPES } from '@/lib/constants';
import { parseBikeText } from '@/lib/bike-parser';

export const SPEC_MODEL = 'claude-haiku-5-5';

/** EQPMGR's part slots: the names the Add Bike Model form uses. */
const BASE_NAMES = [...new Set(BASE_COMPONENTS.map((c) => c.name))];
const EXTRA_SLOTS = ['Display', 'Chainring', 'Bar Tape', 'Chain Guide', 'Dropper Remote', 'Other'];
const SLOTS = [...new Set([...BASE_NAMES, ...EXTRA_SLOTS])] as [string, ...string[]];

const ComponentSchema = z.object({
  slot: z.enum(SLOTS),
  customName: z.string().nullable(),
  brand: z.string().nullable(),
  series: z.string().nullable(),
  model: z.string().nullable(),
  spec: z.string().nullable(),
  chainrings: z.array(z.number().int()),
  sizeNotes: z.string().nullable(),
  sourceText: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
});

const BikeSpecSchema = z.object({
  brand: z.string().nullable(),
  model: z.string().nullable(),
  modelYear: z.number().int().nullable(),
  bikeType: z.enum(BIKE_TYPES as unknown as [string, ...string[]]).nullable(),
  isEbike: z.boolean(),
  wheelSize: z.string().nullable(),
  components: z.array(ComponentSchema),
  warnings: z.array(z.string()),
});

export type ExtractedComponent = z.infer<typeof ComponentSchema>;
export type ExtractedBike = z.infer<typeof BikeSpecSchema>;

const SYSTEM_PROMPT = `You extract bicycle build specifications from text a rider copied from a manufacturer's product page, for EQPMGR, a bike maintenance app that tracks wear on each part.

The text is a raw copy of a web page. Besides the spec list it can contain cookie banners, menus, prices, marketing copy, geometry tables, size charts and lists of other bikes. Use only the bike's own specification list; ignore everything else. Never invent a part or a value that isn't in the text.

For each part in the spec list:
- slot: the matching EQPMGR slot. Split paired entries: a "Brakes" or "Tires" line that covers both wheels becomes a Front and a Rear entry; "Wheels" or "Rims" with no side becomes Front Rim and Rear Rim. "Shift/brake levers" on drop-bar bikes become the shifter slots. Use "Other" with customName only when no slot fits (kickstands, fenders, lights, chain guides you can't place, etc.).
- brand: the part's manufacturer as written (e.g. Shimano, SRAM, RockShox, Schwalbe, WTB, TranzX). House-brand parts take the bike brand (e.g. "Norco 6061 alloy stem" -> Norco).
- series: the product family (e.g. Deore XT, GX Eagle, Lyrik, Magic Mary). Null if none.
- model: the specific model name or code (e.g. CN-M8100, Select+, RT-64, Solano). Keep manufacturer part codes exactly. Null if none.
- spec: the sizes and key specs that identify the part, short (e.g. "10-51T, 12sp", "203mm, Center Lock", "29x2.5in, Trail casing", "140mm travel", "31.6mm").
- chainrings: tooth counts for cranksets/chainrings (e.g. [30] or [50, 34]); empty otherwise.
- sizeNotes: when the part varies by frame size, the variation as written (e.g. "165mm (S1,S2), 170mm (S3-S5)"); otherwise null.
- sourceText: the spec line you read, copied verbatim (trimmed).
- confidence: high when brand and model are clear; medium when something had to be inferred; low when the line is ambiguous.

Bike level: brand, model name without the year, modelYear if stated, bikeType from the allowed list (null if unclear), isEbike, wheelSize if stated. In warnings, list anything a human should double-check (e.g. "Rear tire size differs by frame size", "No chain listed").`;

type Hints = { brand?: string; model?: string; modelYear?: number };

export type SpecExtraction = {
  method: 'ai' | 'parser';
  bike: ExtractedBike;
  usage?: { inputTokens: number; outputTokens: number };
  fallbackReason?: string;
};

/** Convert the rule-based parser's output into the same shape. */
function fromParser(text: string, hints: Hints, reason: string): SpecExtraction {
  const parsed = parseBikeText(text, hints);
  return {
    method: 'parser',
    fallbackReason: reason,
    bike: {
      brand: parsed.brand ?? null,
      model: parsed.model ?? null,
      modelYear: parsed.modelYear ?? null,
      bikeType: null,
      isEbike: false,
      wheelSize: null,
      warnings: ['Read with the basic parser; check every part.'],
      components: parsed.components.map((c) => ({
        slot: SLOTS.includes(c.name) ? c.name : 'Other',
        customName: SLOTS.includes(c.name) ? null : c.name,
        brand: c.brand ?? null,
        series: c.series ?? null,
        model: c.model ?? null,
        spec: c.size ?? null,
        chainrings: [c.chainring1, c.chainring2, c.chainring3].filter(Boolean).map(Number),
        sizeNotes: null,
        sourceText: '',
        confidence: 'low' as const,
      })),
    },
  };
}

export async function extractBikeSpecs(text: string, hints: Hints = {}): Promise<SpecExtraction> {
  if (!process.env.ANTHROPIC_API_KEY) return fromParser(text, hints, 'AI extraction is not configured');

  const hintLines = [
    hints.brand && `Brand (from the rider): ${hints.brand}`,
    hints.model && `Model (from the rider): ${hints.model}`,
    hints.modelYear && `Year (from the rider): ${hints.modelYear}`,
  ].filter(Boolean).join('\n');

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: SPEC_MODEL,
      max_tokens: 16000,
      output_config: { format: zodOutputFormat(BikeSpecSchema), effort: 'medium' },
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `${hintLines ? `${hintLines}\n\n` : ''}<pasted_page>\n${text}\n</pasted_page>`,
      }],
    });

    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens' || !response.parsed_output) {
      return fromParser(text, hints, `AI extraction stopped (${response.stop_reason})`);
    }

    const bike = response.parsed_output;
    // Rider-supplied hints win over what was read from the page.
    if (hints.brand) bike.brand = hints.brand;
    if (hints.model) bike.model = hints.model;
    if (hints.modelYear) bike.modelYear = hints.modelYear;

    return {
      method: 'ai',
      bike,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('[spec-extract] invalid ANTHROPIC_API_KEY');
      return fromParser(text, hints, 'AI extraction is misconfigured');
    }
    if (error instanceof Anthropic.RateLimitError) return fromParser(text, hints, 'AI extraction is busy; try again shortly');
    if (error instanceof Anthropic.APIError) {
      console.error('[spec-extract] API error', error.status, error.message);
      return fromParser(text, hints, `AI extraction failed (${error.status})`);
    }
    console.error('[spec-extract] failed', error);
    return fromParser(text, hints, 'AI extraction failed');
  }
}

/** System (Drivetrain, Brakes...) for a slot, from the form's base components. */
export function slotSystem(slot: string): string {
  return BASE_COMPONENTS.find((c) => c.name === slot)?.system
    ?? ({ Display: 'E-Bike', Chainring: 'Drivetrain', 'Bar Tape': 'Cockpit', 'Chain Guide': 'Drivetrain', 'Dropper Remote': 'Cockpit' } as Record<string, string>)[slot]
    ?? 'Accessories';
}
