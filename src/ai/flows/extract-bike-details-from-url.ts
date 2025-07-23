
'use server';
/**
 * @fileOverview An AI agent that extracts structured bike data from raw text content,
 * typically from a manufacturer's product page.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
    ExtractBikeDetailsInput,
    ExtractBikeDetailsInputSchema,
    ExtractBikeDetailsOutput,
    ExtractBikeDetailsOutputSchema
} from '@/lib/ai-types';


export async function extractBikeDetailsFromUrlContent(input: ExtractBikeDetailsInput): Promise<ExtractBikeDetailsOutput> {
  return extractBikeDetailsFlow(input);
}

// A more direct prompt to improve reliability and consistency.
const bikeExtractorPrompt = ai.definePrompt({
  name: 'bikeExtractorPrompt',
  input: { schema: ExtractBikeDetailsInputSchema },
  output: { schema: ExtractBikeDetailsOutputSchema },
  config: {
    temperature: 0.1,
  },
  prompt: `You are an expert bike mechanic. Your task is to analyze the provided text and extract bike details with extreme precision.

You have been given a reference list of known components in 'existingComponentsJson'. Use this list to improve the accuracy of your extraction. If you extract a component that is missing a 'series' or 'model', but you find a component with the same name and brand in the reference list, use the 'series' and 'model' from the reference list.

Follow these steps:
1.  Analyze the provided text to determine the bike's overall brand, model, and model year.
2.  Extract every individual component listed in the text. For each, identify its name, brand, series, and model.
3.  Use the 'existingComponentsJson' to fill in missing 'series' or 'model' data.
4.  Assign every component to a 'system' from the following list: "Drivetrain", "Brakes", "Wheelset", "Frameset", "Cockpit", "Suspension", "E-Bike", "Accessories".
5.  **SIZE EXTRACTION RULE**: If a component's size depends on the frame size (e.g., "Handlebar... XS:40cm, S:40cm, M:42cm" or "Crankset... S:170mm, M:172.5mm"), you MUST extract these into the 'sizeVariants' object. The frame size (e.g., "S") is the key, and the component size (e.g., "170mm") is the value.
6.  If a value isn't available for a field (like model or series), omit that field. Do not invent or guess values.
7.  **Critical Naming Rules**:
    - Standardize "Seat Post" to "Seatpost".
    - If you see "Sram", "sram", or "SRAM", ALWAYS standardize the brand to "SRAM".
8.  **Crankset/Chainring Rule**: If you see a tooth count for a crankset or chainrings (e.g., 40t, 50/34t), you MUST extract the number(s) into the 'chainring1' and 'chainring2' fields in the component object.

Return ONLY the structured JSON object. Do not include any other text or explanations.

Reference Components:
{{{existingComponentsJson}}}

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
    // Final programmatic check to ensure brand is capitalized correctly
    if (output.brand && output.brand.toLowerCase() === 'sram') {
      output.brand = 'SRAM';
    }
    output.components.forEach(c => {
        if (c.brand && c.brand.toLowerCase() === 'sram') {
            c.brand = 'SRAM';
        }
    })
    return output;
  }
);
