
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
3.  **CRITICAL SIZING RULE:**
    -   If a component has multiple sizes listed based on frame size (e.g., Handlebar: 40cm for S, 42cm for M), create a separate JSON object for each variant.
    -   For components like tires or saddles with a single, non-varying size (e.g., 700x28mm, 145mm width), extract that single size.
    -   **Do not** use a list of frame sizes (e.g., "S, M, L, XL") as the 'size' for any component.
4.  **COMPONENT Splitting:** If a component like "Brake Rotor" is listed twice with different sizes, create two entries: one "Front Brake Rotor" and one "Rear Brake Rotor".
5.  **SYSTEM CLASSIFICATION:**
    -   Standardize "Seat Post" -> "Seatpost".
    -   "Crank" -> "Crankset".
    -   **Electronic Shifting:** Components named "Battery" or "Charger" related to "Di2," "AXS," or "eTap" belong to the "Drivetrain" system, NOT the "E-Bike" system.

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

    // Post-processing to merge duplicate components and clean up sizing
    if (output.components) {
        const componentMap = new Map<string, any>();
        const componentsToRemove: any[] = [];
        
        output.components.forEach(component => {
            const key = `${component.name}-${component.brand}-${component.model}`;
            if (componentMap.has(key)) {
                // We've seen this component before, it's a size variant.
                // Mark the current one for removal and ensure the original has no size.
                const originalComponent = componentMap.get(key);
                delete originalComponent.size;
                componentsToRemove.push(component);
            } else {
                // First time seeing this component.
                componentMap.set(key, component);
            }
        });
        
        // Filter out the components marked for removal
        output.components = output.components.filter(c => !componentsToRemove.includes(c));
    }


    return output;
  }
);

