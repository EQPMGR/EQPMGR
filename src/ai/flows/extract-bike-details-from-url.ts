
'use server';
/**
 * @fileOverview An AI agent that extracts structured bike data from raw text content,
 * typically from a manufacturer's product page.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    ExtractBikeDetailsInput,
    ExtractBikeDetailsInputSchema,
    ExtractBikeDetailsOutput,
    ExtractBikeDetailsOutputSchema
} from '@/lib/ai-types';


// Define a tool for the AI to get existing components from Firestore
const getExistingComponents = ai.defineTool(
    {
        name: 'getExistingComponents',
        description: 'Get a list of all master components for a specific brand from the database.',
        inputSchema: z.object({ brand: z.string().describe("The brand to search for.") }),
        outputSchema: z.array(z.object({
            name: z.string(),
            brand: z.string(),
            series: z.string().optional(),
            model: z.string().optional(),
        })),
    },
    async ({ brand }) => {
        try {
            const componentsRef = collection(db, 'masterComponents');
            const q = query(componentsRef, where("brand", "==", brand));
            const querySnapshot = await getDocs(q);
            const components: any[] = [];
            querySnapshot.forEach((doc) => {
                components.push(doc.data());
            });
            return components;
        } catch (e) {
            console.error("Firestore query failed", e);
            // Return an empty array on failure so the AI can proceed without crashing.
            return [];
        }
    }
);


export async function extractBikeDetailsFromUrlContent(input: ExtractBikeDetailsInput): Promise<ExtractBikeDetailsOutput> {
  return extractBikeDetailsFlow(input);
}

// Reverting to a simpler prompt that is more stable.
const bikeExtractorPrompt = ai.definePrompt({
  name: 'bikeExtractorPrompt',
  input: { schema: ExtractBikeDetailsInputSchema },
  output: { schema: ExtractBikeDetailsOutputSchema },
  tools: [getExistingComponents],
  config: {
    temperature: 0.1,
  },
  prompt: `You are an expert bike mechanic. Your task is to analyze the provided text, extract bike details, and standardize component names against a master database.

Follow these steps:
1.  Analyze the provided text to determine the bike's overall brand, model, and model year.
2.  Extract every individual component listed in the text. For each, identify its name, brand, series, and model.
3.  For each extracted component brand, use the 'getExistingComponents' tool to fetch the list of existing master components for that brand.
4.  **Crucially, compare each component you extracted from the text with the list from the database.** If an extracted component is a clear match for an existing component (e.g., text says "Crankarms" but database has "Crankset" for the same brand/series), you MUST use the exact 'name' from the database. This prevents duplicates.
5.  Assign every component to a 'system' from the following list: "Drivetrain", "Brakes", "Wheelset", "Frameset", "Cockpit", "Suspension", "E-Bike", "Accessories".
6.  If a value isn't available for a field (like model or series), omit that field. Do not invent or guess values.
7.  Standardize "Seat Post" to "Seatpost".
8.  For chainrings, if you see a tooth count (e.g., 40t), extract the number into the 'chainring1' field.

Return ONLY the structured JSON object. Do not include any other text or explanations.

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
