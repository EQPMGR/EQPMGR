'use server';
/**
 * @fileOverview An AI agent that extracts structured bike data from raw text content,
 * typically from a manufacturer's product page.
 *
 * - extractBikeDetailsFromUrlContent - The primary function to process text and return bike data.
 * - ExtractBikeDetailsInput - The input type for the extraction function.
 * - ExtractBikeDetailsOutput - The return type for the extraction function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Based on the structure in bike-database.ts but simplified for extraction
const ExtractedComponentSchema = z.object({
  name: z.string().describe('The name of the component (e.g., "Rear Derailleur", "Fork").'),
  brand: z.string().describe('The brand of the component (e.g., "SRAM", "FOX").'),
  model: z.string().describe('The model of the component (e.g., "RED eTap AXS", "FLOAT 36 Factory").'),
  system: z.string().describe('The system the component belongs to (e.g., "Drivetrain", "Suspension", "Brakes", "Wheelset", "Frameset", "Cockpit", "Accessories").'),
});

export const ExtractBikeDetailsInputSchema = z.object({
  textContent: z.string().describe("The raw text content from a bike's product webpage."),
});
export type ExtractBikeDetailsInput = z.infer<typeof ExtractBikeDetailsInputSchema>;

export const ExtractBikeDetailsOutputSchema = z.object({
  brand: z.string().describe('The brand of the bike.'),
  model: z.string().describe('The model of the bike.'),
  modelYear: z.coerce.number().describe('The model year of the bike.'),
  type: z.string().describe('The type of bike (e.g., "Road", "Enduro", "Gravel").'),
  components: z.array(ExtractedComponentSchema).describe('A list of all extracted components.'),
});
export type ExtractBikeDetailsOutput = z.infer<typeof ExtractBikeDetailsOutputSchema>;


export async function extractBikeDetailsFromUrlContent(input: ExtractBikeDetailsInput): Promise<ExtractBikeDetailsOutput> {
  return extractBikeDetailsFlow(input);
}

const bikeExtractorPrompt = ai.definePrompt({
  name: 'bikeExtractorPrompt',
  input: { schema: ExtractBikeDetailsInputSchema },
  output: { schema: ExtractBikeDetailsOutputSchema },
  prompt: `You are an expert bike mechanic who is an expert at reading specification sheets. Analyze the following text content from a bicycle product page and extract the bike's brand, model, and model year.

  Then, identify every component listed. For each component, determine its brand, model, and the system it belongs to. The valid systems are: Drivetrain, Brakes, Suspension, Wheelset, Frameset, Cockpit, Accessories.

  Provide this information back in the requested JSON format. Be as precise as possible.

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