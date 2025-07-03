'use server';

/**
 * @fileOverview Generates a list of initial components for a new piece of equipment.
 * 
 * - generateInitialComponents - A function that returns a list of standard components.
 * - GenerateInitialComponentsInput - The input type for the function.
 * - GenerateInitialComponentsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateInitialComponentsInputSchema = z.object({
  equipmentType: z.string().describe('The type of equipment (e.g., Road Bike, Mountain Bike).'),
  modelYear: z.number().describe('The model year of the equipment.'),
});
export type GenerateInitialComponentsInput = z.infer<typeof GenerateInitialComponentsInputSchema>;

const GenerateInitialComponentsOutputSchema = z.object({
    components: z.array(z.string()).describe('A list of standard, high-level component names for the specified equipment type.'),
});
export type GenerateInitialComponentsOutput = z.infer<typeof GenerateInitialComponentsOutputSchema>;

export async function generateInitialComponents(input: GenerateInitialComponentsInput): Promise<GenerateInitialComponentsOutput> {
  return generateInitialComponentsFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateInitialComponentsPrompt',
    input: { schema: GenerateInitialComponentsInputSchema },
    output: { schema: GenerateInitialComponentsOutputSchema },
    prompt: `You are an expert bicycle mechanic and equipment specialist. Based on the equipment type and model year, generate a list of standard, high-level components.
    
    For a "Road Bike", typical components are: Drivetrain, Brakes, Wheelset, Frameset, Accessories.
    For a "Mountain Bike", typical components are: Drivetrain, Brakes, Wheelset, Suspension, Frameset, Accessories.
    For "Running Shoes", typical components are: Outsole, Midsole, Upper, Laces.

    Return a simple JSON object with a "components" array of these names.

    Equipment Type: {{{equipmentType}}}
    Model Year: {{{modelYear}}}
    `,
});

const generateInitialComponentsFlow = ai.defineFlow(
  {
    name: 'generateInitialComponentsFlow',
    inputSchema: GenerateInitialComponentsInputSchema,
    outputSchema: GenerateInitialComponentsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
