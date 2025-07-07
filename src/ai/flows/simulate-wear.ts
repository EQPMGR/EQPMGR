'use server';

/**
 * @fileOverview Simulates wear and tear on equipment based on workout data.
 */

import {ai} from '@/ai/genkit';
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
  input: {schema: SimulateWearInputSchema},
  output: {schema: SimulateWearOutputSchema},
  prompt: `You are an expert in simulating wear and tear on sports equipment.

  Based on the following workout data, estimate the wear and tear on the equipment:

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
