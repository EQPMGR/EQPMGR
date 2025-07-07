'use server';

/**
 * @fileOverview AI agent to generate maintenance schedules based on wear simulation and manufacturer guidelines.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateMaintenanceScheduleInput,
    GenerateMaintenanceScheduleInputSchema,
    GenerateMaintenanceScheduleOutput,
    GenerateMaintenanceScheduleOutputSchema
} from '@/lib/ai-types';

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
