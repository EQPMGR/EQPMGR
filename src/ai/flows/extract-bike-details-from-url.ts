
'use server';
/**
 * @fileOverview An AI agent that performs an initial, rough extraction of bike components from raw text.
 * This flow is designed to be fast and simple, focusing only on identifying component text blocks.
 * A secondary, more detailed flow will handle the fine-grained structuring.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const RoughComponentSchema = z.object({
  name: z.string().describe("The best-guess name of the component from the raw text (e.g., 'Rear Derailleur', 'Fork')."),
  description: z.string().describe("The full line or block of text associated with this component."),
});

export const ExtractBikeDetailsInputSchema = z.object({
  textContent: z.string().describe("The raw text content from a bike's product webpage."),
});
export type ExtractBikeDetailsInput = z.infer<typeof ExtractBikeDetailsInputSchema>;

export const ExtractBikeDetailsOutputSchema = z.object({
  brand: z.string().optional().describe('The brand of the bike (e.g., "Specialized").'),
  model: z.string().optional().describe('The model name of the bike (e.g., "Tarmac SL7").'),
  modelYear: z.coerce.number().optional().describe('The model year of the bike (e.g., 2023).'),
  components: z.array(RoughComponentSchema).describe('An array of all identified bike components with their raw descriptions.'),
});
export type ExtractBikeDetailsOutput = z.infer<typeof ExtractBikeDetailsOutputSchema>;


const roughExtractorPrompt = ai.definePrompt({
  name: 'roughBikeExtractorPrompt',
  input: { schema: ExtractBikeDetailsInputSchema },
  output: { schema: ExtractBikeDetailsOutputSchema },
  config: {
    temperature: 0.0,
  },
  prompt: `You are a simple data extraction tool. From the provided text, identify the bike's brand, model, and modelYear.
Then, extract every single component listed. For each component, provide a best-guess 'name' and the full 'description' text for that line item.
Do not try to structure the component details yet. Just extract the raw text for each part.

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
    const { output } = await roughExtractorPrompt(input);
    if (!output) {
      throw new Error('Could not perform the initial extraction of bike components from the provided text.');
    }
    return output;
  }
);


export async function extractBikeDetailsFromUrlContent(input: ExtractBikeDetailsInput): Promise<ExtractBikeDetailsOutput> {
  return extractBikeDetailsFlow(input);
}
