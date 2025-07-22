'use server';
/**
 * @fileOverview An AI agent that extracts structured data for a single bike component
 * from raw text content, typically from a product page.
 */

import { ai } from '@/ai/genkit';
import {
    ExtractComponentDetailsInput,
    ExtractComponentDetailsInputSchema,
    ExtractComponentDetailsOutput,
    ExtractComponentDetailsOutputSchema
} from '@/lib/ai-types';


export async function extractComponentDetails(input: ExtractComponentDetailsInput): Promise<ExtractComponentDetailsOutput> {
  return extractComponentDetailsFlow(input);
}

const componentExtractorPrompt = ai.definePrompt({
  name: 'componentExtractorPrompt',
  input: { schema: ExtractComponentDetailsInputSchema },
  output: { schema: ExtractComponentDetailsOutputSchema },
  config: {
    temperature: 0.1,
  },
  prompt: `You are an expert bike mechanic. Your task is to analyze the provided text about a single bike component and extract its details.

The user is replacing a component from the '{{originalSystem}}' system. Use this as a strong hint for the new component's system, but use your judgment if the text clearly indicates otherwise.

Follow these rules:
1.  Analyze the provided text to determine the component's name, brand, series, model, and size.
2.  If a value isn't available for a field (like model or series), omit that field. Do not invent or guess values.
3.  Standardize "Seat Post" to "Seatpost". If you see "Sram", "sram", or "SRAM", always standardize the brand to "SRAM".
4.  For chainrings, if you see a tooth count (e.g., 44t), extract it into the 'chainring1' field.
5.  Assign the component to a 'system' from the following list: "Drivetrain", "Brakes", "Wheelset", "Frameset", "Cockpit", "Suspension", "E-Bike", "Accessories".

Return ONLY the structured JSON object. Do not include any other text or explanations.

Page Content:
{{{textContent}}}
  `,
});

const extractComponentDetailsFlow = ai.defineFlow(
  {
    name: 'extractComponentDetailsFlow',
    inputSchema: ExtractComponentDetailsInputSchema,
    outputSchema: ExtractComponentDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await componentExtractorPrompt(input);
    if (!output) {
      throw new Error('Could not extract component details from the provided text.');
    }
    // Final check to ensure brand is capitalized correctly
    if (output.brand && output.brand.toLowerCase() === 'sram') {
      output.brand = 'SRAM';
    }
    return output;
  }
);
