
'use server';
/**
 * @fileOverview An AI agent that takes a raw, unstructured list of bike components
 * and cleans it into a structured format, one component at a time.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
    CleanComponentListInputSchema,
    CleanComponentListOutput,
    CleanComponentListOutputSchema,
    StructuredComponentSchema,
    UnstructuredComponentSchema,
} from '@/lib/ai-types';


const componentCleanerPrompt = ai.definePrompt({
    name: 'componentCleanerPrompt',
    input: { schema: UnstructuredComponentSchema },
    output: { schema: StructuredComponentSchema },
    prompt: `You are a precision data extraction agent for a single bike component.
Analyze the provided text description for ONE component.

**CRITICAL RULES:**
1.  From the description, you MUST extract the component's official name, brand, series, and model.
2.  **MODEL**: The 'model' field is ONLY for the specific part number (e.g., RD-M8100-SGS).
3.  **SERIES**: The 'series' is the product family (e.g., 'Deore XT').
4.  **CHAINRING**: If the component is a crankset and you see a tooth count (e.g., 32T), extract it to the 'chainring1' field.
5.  **SYSTEM**: Assign the component to a system: "Drivetrain", "Brakes", "Wheelset", "Frameset", "Cockpit", "Suspension", "E-Bike", or "Accessories".
6.  **NO GUESSING**: If a value is not in the text, omit the field. Do not invent data.

Return ONLY the structured JSON object for this single component.

Component Description:
{{{description}}}
`,
});

export const cleanComponentListFlow = ai.defineFlow(
  {
    name: 'cleanComponentListFlow',
    inputSchema: CleanComponentListInputSchema,
    outputSchema: CleanComponentListOutputSchema,
  },
  async (input) => {
    const cleanedComponents: z.infer<typeof StructuredComponentSchema>[] = [];
    
    // Process each component sequentially to avoid rate limiting
    for (const component of input.components) {
      try {
        const { output } = await componentCleanerPrompt(component);
        if (output) {
          cleanedComponents.push(output);
        }
        // Add a small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.error(`Failed to process component: ${component.name}`, e);
        // Continue to the next component even if one fails
      }
    }

    return { components: cleanedComponents };
  }
);
