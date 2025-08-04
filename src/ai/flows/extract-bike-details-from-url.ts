
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
  config: {
    safetySettings: [
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
        },
    ]
  },
  prompt: `You are an expert bike mechanic. Analyze the provided text to extract bike and component data.

Follow these rules precisely:
1.  Extract the bike's primary 'brand', 'model', and 'modelYear'.
2.  Identify all components. For each, extract its 'name', 'brand', 'series', and 'model'. Assign it to a 'system'.
3.  **Standardize Names:**
    - "Crank" -> "Crankset"
    - "Shock" -> "Rear Shock"
    - "Seat Post" -> "Seatpost"
4.  **Handle Duplicates:** If a component like "Brake Rotor" is listed twice with different sizes, create two entries: one "Front Brake Rotor" and one "Rear Brake Rotor".
5.  **Clean the 'size' field:** Extract only the core measurement (e.g., "29x2.50\"", "820mm", "165mm length"). Do not include descriptive words like "width" or "length" in the size field itself.
6.  **CRITICAL SIZING RULE:** Pay close attention to frame sizes (like "R1, R2, R3", or "S, M, L"). Do NOT assign these frame sizes to a component's 'size' field unless a component's dimension is explicitly tied to one of those frame sizes. Most components have one size for all frames. Only apply a frame size variant if the text provides a clear mapping, like "Handlebar: S/M 780mm, L/XL 800mm". If a component's size does not vary, do not include any frame size data for it.
7.  If a value isn't available for a field (like 'series' or 'model'), omit it. Do not invent values.
8.  Remember brand relationships: Bontrager is part of Trek. Specialized has Roval.

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
    const { output } = await bikeExtractorPrompt(input);
    if (!output) {
      throw new Error('Could not extract bike details from the provided text. The AI returned an empty response.');
    }
    return output;
  }
);

