
'use server';
/**
 * @fileOverview An AI agent that extracts structured bike data from raw text content.
 * This flow now handles the entire extraction process in a single, robust pass.
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
    temperature: 0.1,
  },
  prompt: `You are a precision data extraction agent for bicycles. From the text provided, extract the bike's overall brand, model, and modelYear. Then, identify every individual component.

**CRITICAL RULES FOR EACH COMPONENT:**
1.  **Extract Details**: For each component, you MUST extract its name, brand, series, and model.
2.  **Model is Part Number**: The \`model\` field is ONLY for the specific part number (e.g., U6020, SL-U6000-11R, RD-RX822).
3.  **Series is Family Name**: The \`series\` field is for the product family (e.g., CUES, GRX, 105).
4.  **Crankset/Chainring**: For cranksets or chainrings, if you see a tooth count (e.g., 40t, 50/34t), you MUST extract the number(s) into the \`chainring1\` and \`chainring2\` fields.
5.  **Size Variants**: For components with frame-size dependent sizes (like handlebars), create a JSON string in \`sizeVariants\`. Example: '{"S": "40cm", "M": "42cm"}'.
6.  **No Guesses**: If a value for a field (like model or series) is not present in the text, omit the field. Do not invent data.
7.  **Standardize**: Standardize "Seat Post" to "Seatpost" and "Sram" to "SRAM".
8.  **System Assignment**: Assign each component to a system from this list: "Drivetrain", "Brakes", "Wheelset", "Frameset", "Cockpit", "Suspension", "E-Bike", "Accessories".

Return ONLY the structured JSON object.

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
