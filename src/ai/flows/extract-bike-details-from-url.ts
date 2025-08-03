
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

// A more robust, single-pass prompt to perform both extraction and structuring.
const bikeExtractorPrompt = ai.definePrompt({
  name: 'bikeExtractorPrompt',
  input: { schema: ExtractBikeDetailsInputSchema },
  output: { schema: ExtractBikeDetailsOutputSchema },
  config: {
    temperature: 0.1,
    safetySettings: [
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
        },
    ]
  },
  prompt: `You are an expert bike mechanic. Analyze the provided text. Extract the bike's brand, model, and modelYear.
Identify all components listed. For each component, extract its name, brand, series, and model. Assign it to a 'system'.

CRITICAL RULES:
1.  **Component Name:** Identify the official name (e.g., "Rear Derailleur", "Crankset", "Cassette"). Standardize "Seat Post" to "Seatpost".
2.  **Brand, Series, Model:** From the component's description, extract its brand (e.g., "SRAM"), series (e.g., "GX Eagle"), and model.
3.  **MODEL**: The 'model' field is ONLY for the specific part number (e.g., RD-M8100-SGS, XG-1275).
4.  **SERIES**: The 'series' is the product family (e.g., 'Deore XT', 'CUES', 'Force').
5.  **SYSTEM**: Assign the component to a system: "Drivetrain", "Brakes", "Wheelset", "Frameset", "Cockpit", "Suspension", "E-Bike", or "Accessories".
6.  **SIZE**: Extract the primary size if available (e.g., crank length "175mm", handlebar width "780mm", tire size "700x28c").
7.  **NO GUESSING**: If a value is not present in the text, omit the field. Do not invent data.

Return ONLY the structured JSON format.

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
    const { output } = await extractBikeDetailsPrompt(input);
    if (!output) {
      throw new Error('Could not extract bike details from the provided text.');
    }
    return output;
  }
);
