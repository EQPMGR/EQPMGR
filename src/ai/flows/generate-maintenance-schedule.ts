'use server';

/**
 * @fileOverview AI agent to generate maintenance schedules based on wear simulation and manufacturer guidelines.
 *
 * - generateMaintenanceSchedule - A function that handles the maintenance schedule generation process.
 * - GenerateMaintenanceScheduleInput - The input type for the generateMaintenanceSchedule function.
 * - GenerateMaintenanceScheduleOutput - The return type for the generateMaintenanceSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMaintenanceScheduleInputSchema = z.object({
  equipmentType: z.string().describe('The type of equipment (e.g., road bike, mountain bike).'),
  wearAndTearData: z.string().describe('JSON string of wear and tear data for each component.'),
  manufacturerGuidelines: z.string().describe('JSON string of manufacturer guidelines for maintenance.'),
});
export type GenerateMaintenanceScheduleInput = z.infer<typeof GenerateMaintenanceScheduleInputSchema>;

const GenerateMaintenanceScheduleOutputSchema = z.object({
  maintenanceSchedule: z.string().describe('JSON string of the generated maintenance schedule.'),
});
export type GenerateMaintenanceScheduleOutput = z.infer<typeof GenerateMaintenanceScheduleOutputSchema>;

export async function generateMaintenanceSchedule(input: GenerateMaintenanceScheduleInput): Promise<GenerateMaintenanceScheduleOutput> {
  return generateMaintenanceScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMaintenanceSchedulePrompt',
  input: {schema: GenerateMaintenanceScheduleInputSchema},
  output: {schema: GenerateMaintenanceScheduleOutputSchema},
  prompt: `You are an expert maintenance schedule generator for sports equipment.

You will receive wear and tear data and manufacturer guidelines, then generate a maintenance schedule.

Ensure the maintenance schedule is in JSON format.

Equipment Type: {{{equipmentType}}}
Wear and Tear Data: {{{wearAndTearData}}}
Manufacturer Guidelines: {{{manufacturerGuidelines}}}`,
});

const generateMaintenanceScheduleFlow = ai.defineFlow(
  {
    name: 'generateMaintenanceScheduleFlow',
    inputSchema: GenerateMaintenanceScheduleInputSchema,
    outputSchema: GenerateMaintenanceScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
