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
  prompt: `You are an expert bike mechanic who is an expert at reading specification sheets. Analyze the following text content from a bicycle product page and extract the's brand, model, and model year.

  Then, identify every component listed. For each component, determine its brand, model, and the system it belongs to. The valid systems are: Drivetrain, Brakes, Suspension, Wheelset, Frameset, Cockpit, Accessories.

  Provide this information back in the requested JSON format. Be as precise as possible.

  Page Content:
  {{{textContent}}}
  `,
  config: {
    safetySettings: [
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
        },
        {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
        },
        {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
        },
        {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
        },
    ]
  }
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
