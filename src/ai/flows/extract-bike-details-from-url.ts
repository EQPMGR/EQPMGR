
'use server';
/**
 * @fileOverview An AI agent that extracts structured bike data from raw text content.
 * This is the first pass in a two-stage process. It performs a rough extraction,
 * which is then refined by the refineExtractedBikeDetails flow.
 */

import { ai } from '@/ai/genkit';
import {
    ExtractBikeDetailsInput,
    ExtractBikeDetailsInputSchema,
    ExtractBikeDetailsOutput,
    ExtractBikeDetailsOutputSchema
} from '@/lib/ai-types';
import { refineExtractedBikeDetails } from './refine-bike-details';


export async function extractBikeDetailsFromUrlContent(input: ExtractBikeDetailsInput): Promise<ExtractBikeDetailsOutput> {
  // First, get the rough extraction.
  const initialExtraction = await initialExtractBikeDetailsFlow(input);

  if (!initialExtraction) {
    throw new Error('Initial extraction failed to produce a result.');
  }

  // Then, pass the rough extraction and original text to the refiner flow.
  const refinedExtraction = await refineExtractedBikeDetails({
    textContent: input.textContent,
    initialExtraction,
  });

  return refinedExtraction;
}


// This prompt is intentionally simple. Its goal is to get a list of components
// without being perfect. The refinement flow will handle the details.
const initialBikeExtractorPrompt = ai.definePrompt({
  name: 'initialBikeExtractorPrompt',
  input: { schema: ExtractBikeDetailsInputSchema },
  output: { schema: ExtractBikeDetailsOutputSchema },
  config: {
    temperature: 0.1,
  },
  prompt: `You are a bike component extractor. From the text provided, list all the bike components you can find.
For each component, provide its name, brand if available, and assign it to a system from this list:
"Drivetrain", "Brakes", "Wheelset", "Frameset", "Cockpit", "Suspension", "E-Bike", "Accessories".
Also extract the bike's overall brand, model, and modelYear.

Return ONLY the structured JSON object.

Page Content:
{{{textContent}}}
  `,
});

const initialExtractBikeDetailsFlow = ai.defineFlow(
  {
    name: 'initialExtractBikeDetailsFlow',
    inputSchema: ExtractBikeDetailsInputSchema,
    outputSchema: ExtractBikeDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await initialBikeExtractorPrompt(input);
    if (!output) {
      throw new Error('Could not extract bike details from the provided text.');
    }
    return output;
  }
);
