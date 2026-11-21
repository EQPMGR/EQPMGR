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
/** Measured with scripts/bike-import-eval: see CLAUDE.md. */
const SPEC_EFFORT = (process.env.SPEC_EFFORT as 'low' | 'medium' | 'high' | undefined) || 'medium';

/** EQPMGR's part slots: the names the Add Bike Model form uses. */
const BASE_NAMES = [...new Set(BASE_COMPONENTS.map((c) => c.name))];
const EXTRA_SLOTS = ['Display', 'Chainring', 'Bar Tape', 'Chain Guide', 'Dropper Remote', 'Other'];
const SLOTS = [...new Set([...BASE_NAMES, ...EXTRA_SLOTS])] as [string, ...string[]];

const ComponentSchema = z.object({
  // A plain string, not an enum: the SDK only passes an enum to the API as a
  // description, so the model can still return another name, and a strict enum
  // would then fail the whole import. normalizeSlots() maps unknown names to "Other".
  slot: z.string().describe(`One of: ${SLOTS.join(', ')}`),
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

Work out the drivetrain first. A bike is "1x" when it has one chainring and no front derailleur (most mountain, gravel 1x and many hybrid bikes); it has two or three chainrings otherwise ("2x8", "50/34", a front derailleur listed).

For each part in the spec list:
- slot: the matching EQPMGR slot, spelled exactly as in the list. Split paired entries: a "Brakes" or "Tires" line that covers both wheels becomes a Front and a Rear entry; "Wheels" or "Rims" with no side becomes Front Rim and Rear Rim. "Shift/brake levers" on drop-bar bikes become the shifter slots. Use "Other" with customName only when no slot fits (kickstands, fenders, lights, chain guides you can't place, etc.).
  - Shifters: a 1x bike has NO Front Shifter and NO Front Derailleur, even when the line is headed "Shifters" (plural); its shifter is the Rear Shifter. On a 2x or 3x bike, one "Shifters" line (e.g. "Shimano Altus, 2x8") becomes both a Front Shifter and a Rear Shifter.
  - Rotors: rotors are often listed inside the brake line (e.g. "Shimano MT200, 180/180mm RT30 rotors"). Still add a Front Rotor and a Rear Rotor, each with its own size, and the brake's brand unless the rotors name another.
  - Bar tape: drop-bar bikes have bar tape, not grips. Tape is the Bar Tape slot even when the page lists it under "Grips". When the heading is "Grips/Bar Tape", decide from the handlebar: a drop bar takes Bar Tape; a flat, riser or swept-back bar takes Grips.
  - Leave out things with no wear that aren't parts: frame protection film, tailgate pads, stickers, reflectors, manuals.
  - Frame: always name it, even when the page gives only a material. brand = the bike's brand; series = the frame family, i.e. the model name without the build level (e.g. "Stance 29 2" -> "Stance 29", "Trance X Advanced Pro 29 1" -> "Trance X Advanced", "Fuel EX 8 Gen 7" -> "Fuel EX Gen 7", "Aspero-5 GRX RX827 Di2" -> "Aspero-5", "Hightower Deore" -> "Hightower"); model = the frame material as the maker words it, kept short (e.g. "ALUXX", "ALUXX SL", "Advanced Composite", "Carbon C", "Alpha Silver Aluminum", "FORM Alloy", "4130 Chromoly"). If the page names no material, give one only when that frame family is only ever made in one material (e.g. Cervélo Aspero-5 -> Carbon); otherwise leave model null and add a warning. Travel, wheel size, axle and other details go in spec.
- brand: the part's manufacturer as written (e.g. Shimano, SRAM, RockShox, Schwalbe, WTB, TranzX). House-brand parts take the bike brand (e.g. "Norco 6061 alloy stem" -> Norco). Frame-maker parts listed with no brand at all (e.g. a handlebar "6061 Alloy Riser, 31.8mm", a "Carbon OSC" fork, an alloy stem, seatpost or rims) are the bike maker's own parts: use the bike's brand. Never put a series or model name in brand.
- series: the product family (e.g. Deore XT, GX Eagle, Lyrik, Magic Mary). Null if none.
- model: the specific model name or code (e.g. CN-M8100, Select+, RT-64, Solano). Keep manufacturer part codes exactly. Null if none.
- spec: the sizes and key specs that identify the part, short (e.g. "10-51T, 12sp", "203mm, Center Lock", "29x2.5in, Trail casing", "140mm travel", "31.6mm").
- chainrings: tooth counts for cranksets/chainrings, largest first (e.g. [30] or [50, 34]), wherever on the page they appear (the crankset line, a separate chainring line, or "46/30T"); empty otherwise.
- sizeNotes: when the part varies by frame size, the variation as written (e.g. "165mm (S1,S2), 170mm (S3-S5)"); otherwise null.
- sourceText: the spec line you read, copied verbatim (trimmed).
- confidence: high when brand and model are clear; medium when something had to be inferred; low when the line is ambiguous.

Bike level: brand; model name without the year (usually a short standalone heading near the top of the page, such as "Fluid A1" or "DEW-E", often just above the price); modelYear if stated, bikeType from the allowed list (null if unclear), isEbike, wheelSize if stated. In warnings, list anything a human should double-check (e.g. "Rear tire size differs by frame size", "No chain listed").`;

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

const SLOT_BY_KEY = new Map<string, string>([
  ...SLOTS.map((s) => [s.toLowerCase().replace(/[^a-z]/g, ''), s] as [string, string]),
  // Names the model has used for real slots.
  ['rearcogs', 'Cassette'], ['cogs', 'Cassette'], ['freewheel', 'Cassette'],
  ['seatclamp', 'Seatpost Clamp'], ['seatbinder', 'Seatpost Clamp'], ['seatpostcollar', 'Seatpost Clamp'],
  ['frontbrakerotor', 'Front Rotor'], ['rearbrakerotor', 'Rear Rotor'],
  ['handlebartape', 'Bar Tape'], ['tape', 'Bar Tape'],
]);

/**
 * Fix slot names after the model answers: near misses ("Rear Cogs", "Seat Clamp")
 * become the real slot, anything unknown becomes "Other", and a "Grips" line that
 * says tape becomes Bar Tape (the prompt asks for this, but the model
 * doesn't always follow it).
 */
function normalizeSlots(bike: ExtractedBike): ExtractedBike {
  for (const c of bike.components) {
    // "Other" with a name we know ("Seat Clamp") is a real slot too.
    const label = c.slot === 'Other' && c.customName ? c.customName : c.slot;
    if (!SLOTS.includes(c.slot) || c.slot === 'Other') {
      const match = SLOT_BY_KEY.get(label.toLowerCase().replace(/[^a-z]/g, ''));
      if (match && match !== 'Other') { c.slot = match; c.customName = null; }
      else if (c.slot !== 'Other') { c.customName = c.customName || c.slot; c.slot = 'Other'; }
    }
    // Only the part's own words, not its heading: makers use one "Grips/Bar Tape"
    // heading for flat-bar and drop-bar bikes alike (Surly Bridge Club vs Salsa Flyway).
    if (c.slot === 'Grips' && /\btape\b|\bwrap\b/i.test(`${c.series ?? ''} ${c.model ?? ''} ${c.spec ?? ''} ${c.customName ?? ''}`)) {
      c.slot = 'Bar Tape';
    }
  }
  // Every frame gets a name: if the model left the family out, fall back to the
  // bike's model name (a human can trim the build level off later).
  for (const c of bike.components) {
    if (c.slot !== 'Frame') continue;
    if (!c.brand && bike.brand) c.brand = bike.brand;
    if (!c.series && bike.model) {
      c.series = bike.model;
      bike.warnings.push(`Frame family not given; used the model name "${bike.model}"`);
    }
  }
  return bike;
}

/** Hard cap on what one call can generate (output tokens are the expensive part). */
const MAX_OUTPUT_TOKENS = 8000;

export async function extractBikeSpecs(
  text: string,
  hints: Hints = {},
  gate: { allowAi: boolean; blockedReason?: string } = { allowAi: true }
): Promise<SpecExtraction> {
  if (!gate.allowAi) return fromParser(text, hints, gate.blockedReason || 'AI extraction is unavailable');
  if (!process.env.ANTHROPIC_API_KEY) return fromParser(text, hints, 'AI extraction is not configured');

  const hintLines = [
    hints.brand && `Brand (from the rider): ${hints.brand}`,
    hints.model && `Model (from the rider): ${hints.model}`,
    hints.modelYear && `Year (from the rider): ${hints.modelYear}`,
  ].filter(Boolean).join('\n');

  try {
    // One retry at most, so a flaky moment can't multiply cost.
    const client = new Anthropic({ maxRetries: 1, timeout: 90_000 });
    const response = await client.messages.parse({
      model: SPEC_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      output_config: { format: zodOutputFormat(BikeSpecSchema), effort: SPEC_EFFORT },
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `${hintLines ? `${hintLines}\n\n` : ''}<pasted_page>\n${text}\n</pasted_page>`,
      }],
    });

    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens' || !response.parsed_output) {
      return fromParser(text, hints, `AI extraction stopped (${response.stop_reason})`);
    }

    const bike = normalizeSlots(response.parsed_output);
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

/** One extracted part in the shape the Add Bike Model form uses. */
export function toFormComponent(c: ExtractedComponent) {
  return {
    name: c.slot === 'Other' ? c.customName || 'Other' : c.slot,
    system: slotSystem(c.slot),
    brand: c.brand ?? undefined,
    series: c.series ?? undefined,
    model: c.model ?? undefined,
    size: [c.spec, c.sizeNotes].filter(Boolean).join('; ') || undefined,
    chainring1: c.chainrings[0] != null ? String(c.chainrings[0]) : undefined,
    chainring2: c.chainrings[1] != null ? String(c.chainrings[1]) : undefined,
    chainring3: c.chainrings[2] != null ? String(c.chainrings[2]) : undefined,
  };
}
