
'use server';
/**
 * @fileOverview The second stage of the bike extraction process. This flow
 * takes an initial, rough extraction of bike components and refines each one
 * individually against the original text to ensure accuracy, especially for
 * brand, series, and model numbers.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  ExtractBikeDetailsOutput,
  ExtractBikeDetailsOutputSchema,
} from '@/lib/ai-types';

// Define the input schema for the refinement flow
const RefineBikeDetailsInputSchema = z.object({
  textContent: z.string().describe('The original, full text content from the webpage.'),
  initialExtraction: ExtractBikeDetailsOutputSchema.describe('The initial, rough extraction of the bike details.'),
});
type RefineBikeDetailsInput = z.infer<typeof RefineBikeDetailsInputSchema>;


// Define the schema for refining a single component
const RefinedComponentSchema = z.object({
  name: z.string(),
  brand: z.string().optional(),
  series: z.string().optional(),
  model: z.string().optional(),
  system: z.string(),
  size: z.string().optional(),
  sizeVariants: z.string().optional(),
  chainring1: z.string().optional(),
  chainring2: z.string().optional(),
});


// Define the prompt for refining a single component
const componentRefinerPrompt = ai.definePrompt({
    name: 'componentRefinerPrompt',
    input: { schema: z.object({
        textContent: z.string(),
        componentJson: z.string(),
    }) },
    output: { schema: RefinedComponentSchema },
    config: {
        temperature: 0.0,
    },
    prompt: `You are a precision data correction agent for bicycle components.
Your task is to analyze the provided text and correct the details for a SINGLE component.

**CRITICAL RULES:**
1.  Examine the original text to find the most accurate details for the component provided in \`componentJson\`.
2.  The \`model\` field is ONLY for the specific part number (e.g., U6020, SL-U6000-11R, RD-RX822).
3.  The \`series\` field is for the product family (e.g., CUES, GRX).
4.  DO NOT put part numbers or model numbers in the \`size\` or \`sizeVariants\` fields.
5.  For cranksets or chainrings, if you see a tooth count (e.g., 40t, 50/34t), you MUST extract the number(s) into the \`chainring1\` and \`chainring2\` fields. DO NOT place this in the 'size' field.
6.  Standardize brand names: "SRAM" (not "sram").
7.  Return ONLY the corrected JSON object for this single component.

Original Page Text:
---
{{{textContent}}}
---

Component to Refine:
{{{componentJson}}}
`
});


/**
 * A Genkit flow that takes an initial extraction and refines each component.
 */
export const refineExtractedBikeDetails = ai.defineFlow(
  {
    name: 'refineExtractedBikeDetails',
    inputSchema: RefineBikeDetailsInputSchema,
    outputSchema: ExtractBikeDetailsOutputSchema,
  },
  async ({ textContent, initialExtraction }) => {
    
    const refinedComponents: z.infer<typeof RefinedComponentSchema>[] = [];

    // Process each component sequentially to avoid rate limiting.
    for (const component of initialExtraction.components) {
        const result = await componentRefinerPrompt({
            textContent,
            componentJson: JSON.stringify(component)
        });
        
        if (result.output) {
            refinedComponents.push(result.output);
        }
    }

    // Return the final, refined structure.
    return {
      brand: initialExtraction.brand,
      model: initialExtraction.model,
      modelYear: initialExtraction.modelYear,
      components: refinedComponents,
    };
  }
);
