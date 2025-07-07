'use server';
/**
 * @fileOverview An AI agent that provides detailed information about a bike model.
 */

import { ai } from '@/ai/genkit';
import { bikeDatabase } from '@/lib/bike-database';
import {
    BikeModelDetailsInput,
    BikeModelDetailsInputSchema,
    BikeModelDetailsOutput,
    BikeModelDetailsOutputSchema
} from '@/lib/ai-types';

export async function getBikeModelDetails(input: BikeModelDetailsInput): Promise<BikeModelDetailsOutput> {
  return getBikeModelDetailsFlow(input);
}

const getBikeModelDetailsFlow = ai.defineFlow(
  {
    name: 'getBikeModelDetailsFlow',
    inputSchema: BikeModelDetailsInputSchema,
    outputSchema: BikeModelDetailsOutputSchema,
  },
  async (input) => {
    // In a real app, this would query Firestore.
    // For this example, we'll find the bike in our static database.
    const bike = bikeDatabase.find(
      (b) =>
        b.brand === input.brand &&
        b.model === input.model &&
        b.modelYear === input.modelYear
    );

    if (!bike) {
      throw new Error('Bike model not found in the database.');
    }

    const bikeData = JSON.stringify(bike, null, 2);

    const prompt = ai.definePrompt({
        name: 'bikeDetailsPrompt',
        prompt: `You are an expert bike mechanic and a world-class technical writer. Based on the component data provided below in JSON format, generate a detailed, paragraph-style overview of the bike.

        Start with a summary of the bike's purpose (e.g., "The Specialized S-Works Tarmac SL7 is a top-tier road racing bike...").

        Then, describe each major system (Drivetrain, Brakes, Wheels, etc.) in its own paragraph, highlighting the specific brands and models of the components. Write in a clear, engaging, and professional tone. Do not just list the components.

        Bike Data:
        {{{bikeData}}}
        `,
    });
    
    const { output } = await prompt({ bikeData });
    return output!;
  }
);
