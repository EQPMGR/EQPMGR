'use server';

/**
 * @fileOverview Simulates wear and tear on equipment based on workout data.
 *
 * - simulateWear - A function that simulates wear based on workout data.
 * - SimulateWearInput - The input type for the simulateWear function.
 * - SimulateWearOutput - The return type for the simulateWear function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimulateWearInputSchema = z.object({
  equipmentType: z.string().describe('The type of equipment being used (e.g., running shoes, bicycle).'),
  workoutType: z.string().describe('The type of workout performed (e.g., running, cycling).'),
  distance: z.number().describe('The distance covered during the workout in kilometers.'),
  duration: z.number().describe('The duration of the workout in minutes.'),
  intensity: z.string().describe('The intensity of the workout (e.g., low, medium, high).'),
  environmentalConditions: z
    .string()
    .describe('The environmental conditions during the workout (e.g., sunny, rainy, muddy).'),
});
export type SimulateWearInput = z.infer<typeof SimulateWearInputSchema>;

const SimulateWearOutputSchema = z.object({
  wearPercentage: z
    .number()
    .describe('The estimated percentage of wear and tear on the equipment after the workout.'),
  componentWear: z
    .record(z.string(), z.number())
    .describe('A breakdown of wear and tear on individual components of the equipment.'),
  recommendations: z.array(z.string()).describe('Recommendations for maintenance or replacement based on the wear.'),
});
export type SimulateWearOutput = z.infer<typeof SimulateWearOutputSchema>;

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
