
'use server';
/**
 * @fileOverview An AI agent that extracts structured bike data from raw text content,
 * typically from a manufacturer's product page.
 */

import { ai } from '@/ai/genkit';
import {
    ExtractBikeDetailsInput,
    ExtractBikeDetailsInputSchema,
    ExtractBikeDetailsOutput,
    ExtractBikeDetailsOutputSchema
} from '@/lib/ai-types';

export async function extractBikeDetailsFromUrlContent(input: ExtractBikeDetailsInput): Promise<ExtractBikeDetailsOutput> {
  return extractBikeDetailsFlow(input);
}

const bikeExtractorPrompt = ai.definePrompt({
  name: 'bikeExtractorPrompt',
  input: { schema: ExtractBikeDetailsInputSchema },
  output: { schema: ExtractBikeDetailsOutputSchema },
  prompt: `You are an expert bike mechanic who is an expert at reading specification sheets.
  Analyze the provided text and extract the bike's brand, model, and year.
  Then, identify all components listed. For each component, extract its name, brand, series, and model, and determine which system it belongs to.
  - The 'series' is the product family name (e.g., 'Dura-Ace', '105', 'GX Eagle').
  - The 'model' is the specific part number (e.g., 'RD-5701', 'CS-4600').
  - If a value isn't available, omit the field.
  - Standardize "Seat Post" to "Seatpost".
  - Determine the front drivetrain configuration ('1x', '2x', '3x') from the crankset specs.
  - Determine the rear speeds ('9', '10', '11', '12') from the cassette specs.
  - For cranksets, extract the teeth counts for each chainring.

  Return the data in the structured JSON format requested.

  Page Content:
  {{{textContent}}}
  `,
});

const extractBikeDetailsFlow = ai.defineFlow(
  {
    name: 'extractBikeDetailsFlow',
    inputSchema: ExtractBikeDetailsInputSchema,
    outputSchema: ExtractBikeDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await bikeExtractorPrompt(input);
    if (!output) {
      throw new Error('Could not extract bike details from the provided text.');
    }
    return output;
  }
);
