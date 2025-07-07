'use server';
/**
 * @fileOverview An AI agent that finds a bike in the database and prepares it to be added to a user's garage.
 *
 * - addBikeToGarage - A function that uses a tool to find bike details.
 * - AddBikeToGarageInput - The input type for the addBikeToGarage function.
 * - AddBikeToGarageOutput - The return type for the addBikeToGarage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { bikeDatabase, type BikeFromDB } from '@/lib/bike-database';

export const AddBikeToGarageInputSchema = z.object({
  modelQuery: z.string().describe('A query describing the bike model to find, including brand, model, and year. For example, "2023 Specialized S-Works Tarmac SL7".'),
});
export type AddBikeToGarageInput = z.infer<typeof AddBikeToGarageInputSchema>;

// The output will be the full bike data structure from our database.
export const AddBikeToGarageOutputSchema = z.custom<BikeFromDB>();
export type AddBikeToGarageOutput = z.infer<typeof AddBikeToGarageOutputSchema>;

// Define the tool that searches the database.
const searchBikeDatabaseTool = ai.defineTool(
  {
    name: 'searchBikeDatabase',
    description: 'Searches the bike database for a specific model year of a bike.',
    inputSchema: z.object({
        brand: z.string(),
        model: z.string(),
        modelYear: z.number(),
    }),
    outputSchema: z.custom<BikeFromDB | null>(),
  },
  async ({ brand, model, modelYear }) => {
    console.log(`Tool searching for: ${brand} ${model} (${modelYear})`);
    const bike = bikeDatabase.find(
      (b) =>
        b.brand.toLowerCase() === brand.toLowerCase() &&
        b.model.toLowerCase() === model.toLowerCase() &&
        b.modelYear === modelYear
    );
    return bike || null;
  }
);


export async function addBikeToGarage(input: AddBikeToGarageInput): Promise<AddBikeToGarageOutput> {
  return addBikeToGarageFlow(input);
}

const addBikeToGarageFlow = ai.defineFlow(
  {
    name: 'addBikeToGarageFlow',
    inputSchema: AddBikeToGarageInputSchema,
    outputSchema: AddBikeToGarageOutputSchema,
  },
  async (input) => {
    const prompt = ai.definePrompt({
        name: 'bikeFinderPrompt',
        tools: [searchBikeDatabaseTool],
        prompt: `You are an agent that helps users find bikes in the bike database.
        
        Analyze the user's query: "${input.modelQuery}"
        
        Identify the brand, model, and model year from the query.
        
        Then, use the searchBikeDatabase tool to find the bike.
        
        If the bike is found, your output should be the full, unmodified JSON object for that bike returned by the tool. Do not add any extra conversational text or formatting.
        
        If the bike is not found, throw an error.`,
    });
    
    const { output } = await prompt();
    
    if (!output) {
      throw new Error(`Could not find the bike for query: "${input.modelQuery}"`);
    }

    return output;
  }
);
