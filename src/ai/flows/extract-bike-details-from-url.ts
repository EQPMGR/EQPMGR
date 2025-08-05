
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
1.  Extract the bike's primary 'brand', 'model', and 'modelYear'. Only extract a modelYear if it is explicitly stated in the text.
2.  Identify all components. For each, extract its 'name', 'brand', 'series', and 'model'. Assign it to a 'system'.
3.  **CRITICAL SIZING RULE:**
    -   If a component has a single, non-varying size (e.g., 700x28mm, 145mm width), extract that single size.
    -   **FORBIDDEN:** Do not use a list of frame sizes (e.g., "S, M, L, XL") as the 'size' for any component. If a component's size is listed only as a frame size, leave the 'size' field blank.
    -   **FORBIDDEN:** Do not aggregate multiple size variants (e.g., "165mm, 170mm") into the 'size' field. Leave the 'size' field blank for these components.
4.  **COMPONENT Splitting:** If a component like "Brake Rotor" is listed twice with different sizes, create two entries: one "Front Brake Rotor" and one "Rear Brake Rotor".
5.  **SYSTEM CLASSIFICATION & NAMING:**
    -   Standardize "Seat Post" -> "Seatpost".
    -   Standardize "Seat Clamp" -> "Seatpost Clamp".
    -   Standardize "Crank" -> "Crankset".
    -   Standardize "Rear cogs" -> "Cassette".
    -   **Electronic Shifting:** Components named "Battery" or "Charger" related to "Di2," "AXS," or "eTap" belong to the "Drivetrain" system, NOT the "E-Bike" system.
    -   **Shifters:** Components named "Shift-/ Brake Lever" are "Shifters" and belong to the "Drivetrain" system.
    -   **Frameset Components:** "Fork" and "Rear Shock" belong to the "Frameset" system.
6. **MODEL NUMBER CLEANUP:** Do not include speed indicators like "12s", "11s", "10-speed" in the 'model' field. The model should only contain the part number (e.g., "RD-R7100", not "RD-R7100 12s").

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

    if (output.components) {
        // First pass: clean up invalid size fields on all components.
        output.components.forEach(component => {
            if (component.size) {
                // Regex to check for frame size letters (S, M, L, X) or multiple comma-separated values
                const isInvalidSize = /[SMLX,]/i.test(component.size) && component.size.length > 5;
                if (isInvalidSize) {
                    delete component.size;
                }
            }
        });
        
        // Second pass: merge duplicate components (which often result from size variants).
        const componentMap = new Map<string, any>();
        const componentsToRemove: any[] = [];
        
        output.components.forEach(component => {
            const key = `${component.name}-${component.brand}-${component.model}`;
            if (componentMap.has(key)) {
                // We've seen this component before, it's a size variant.
                // Mark the current one for removal and ensure the original has no size.
                const originalComponent = componentMap.get(key);
                delete originalComponent.size; // Ensure size is deleted on the merged component
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
