'use server';
/**
 * @fileOverview An AI agent that takes a raw, unstructured list of bike components
 * and cleans it into a structured format, one component at a time.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the schema for a single unstructured component
const UnstructuredComponentSchema = z.object({
  name: z.string().describe("The best-guess name of the component from the raw text."),
  description: z.string().describe("The full line or block of text associated with this component."),
});

// Define the schema for the input to this flow
const CleanComponentListInputSchema = z.object({
  components: z.array(UnstructuredComponentSchema),
});

// Define the schema for a single structured component (the output per item)
const StructuredComponentSchema = z.object({
  name: z.string().describe("The official name of the component (e.g., 'Rear Derailleur')."),
  brand: z.string().optional().describe("The brand of the component (e.g., 'SRAM')."),
  series: z.string().optional().describe("The product family name (e.g., 'GX Eagle')."),
  model: z.string().optional().describe("The specific part number (e.g., 'RD-M8100-SGS')."),
  system: z.string().describe("The system it belongs to: 'Drivetrain', 'Brakes', 'Wheelset', 'Frameset', 'Cockpit', 'Suspension', 'E-Bike', or 'Accessories'."),
  size: z.string().optional().describe("The primary size if available (e.g., '175mm')."),
  sizeVariants: z.string().optional().describe('A JSON string mapping frame sizes to component sizes. E.g., \'{"S": "40cm", "M": "42cm"}\'.'),
  chainring1: z.string().optional().describe("Tooth count for the first chainring (e.g., '42t')."),
  chainring2: z.string().optional().describe("Tooth count for the second chainring."),
});

// Define the schema for the final output of the entire flow
const CleanComponentListOutputSchema = z.object({
  components: z.array(StructuredComponentSchema),
});
export type CleanComponentListOutput = z.infer<typeof CleanComponentListOutputSchema>;

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
5.  **SYSTEM**: Assign the component to a system: "Drivetrain", "Brakes", "Wheelset", "Frameset", "Cockpit", "Suspension", "E-Bike", "Accessories".
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
