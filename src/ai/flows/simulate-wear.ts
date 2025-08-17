
'use server';

/**
 * @fileOverview Simulates wear and tear on equipment based on workout data.
 */

import {ai} from '@/ai/genkit';
import { geminiPro } from '@genkit-ai/googleai';
import {
    SimulateWearInput,
    SimulateWearInputSchema,
    SimulateWearOutput,
    SimulateWearOutputSchema
} from '@/lib/ai-types';


export async function simulateWear(input: SimulateWearInput): Promise<SimulateWearOutput> {
  return simulateWearFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulateWearPrompt',
  model: geminiPro,
  input: {schema: SimulateWearInputSchema},
  output: {schema: SimulateWearOutputSchema},
  prompt: `You are an expert in simulating wear and tear on sports equipment.

  Based on the following workout data, estimate the wear and tear on the equipment. Use the provided component lifespan guide to inform your estimations.

  **Component Lifespan Guide:**
  *   **Chain:** 2,000 - 5,000 km
  *   **Cassette:** 5,000 - 15,000 km
  *   **Chainrings:** 10,000 - 30,000 km
  *   **Brake Pads (Rim):** 2,000 - 5,000 km
  *   **Brake Pads (Disc):** 1,500 - 8,000 km
  *   **Brake Rotors (Disc):** 10,000 - 30,000 km
  *   **Shift & Brake Cables:** Replace annually or every 5,000 km.
  *   **Tires (Road):** 3,000 - 10,000 km
  *   **Tires (MTB):** 1,500 - 5,000 km
  *   **Tubeless Sealant:** Replace every 2-6 months.
  *   **Wheel Bearings:** 15,000 - 30,000 km
  *   **Rims (Rim Brake):** 10,000 - 50,000 km (Disc brake rims last much longer)
  *   **Pedals:** 15,000 - 30,000 km
  *   **Saddle:** 15,000 - 30,000 km
  *   **Bottom Bracket:** 5,000 - 15,000 km
  *   **Headset Bearings:** 10,000 - 20,000 km
  *   **Suspension (Full Service):** 50-200 hours of riding, or annually.

  **Workout Data:**
  Equipment Type: {{{equipmentType}}}
  Workout Type: {{{workoutType}}}
  Distance: {{{distance}}} km
  Duration: {{{duration}}} minutes
  Intensity: {{{intensity}}}
  Environmental Conditions: {{{environmentalConditions}}}

  Provide the wearPercentage as a percentage between 0 and 100. Also provide a
  componentWear breakdown with specific wear percentages for individual components and
  recommendations for maintenance or replacement, if needed.
  Make sure the componentWear object keys are specific names of parts for the given
  equipment type. For example, if the equipment type is running shoes, a good key would be
  'soleWear'.
  `,
});

const simulateWearFlow = ai.defineFlow(
  {
    name: 'simulateWearFlow',
    inputSchema: SimulateWearInputSchema,
    outputSchema: SimulateWearOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
