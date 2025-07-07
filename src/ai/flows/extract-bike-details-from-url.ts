
'use server';
/**
 * @fileOverview An AI agent that extracts structured bike data from raw text content,
 * typically from a manufacturer's product page.
 */

import { ai } from '@/ai/genkit';
import {
    ExtractBikeDetailsInput,
    ExtractBikeDetailsInputSchema,
    ExtractBikeDetailsOutput,
    ExtractBikeDetailsOutputSchema
} from '@/lib/ai-types';

export async function extractBikeDetailsFromUrlContent(input: ExtractBikeDetailsInput): Promise<ExtractBikeDetailsOutput> {
  return extractBikeDetailsFlow(input);
}

const bikeExtractorPrompt = ai.definePrompt({
  name: 'bikeExtractorPrompt',
  input: { schema: ExtractBikeDetailsInputSchema },
  output: { schema: ExtractBikeDetailsOutputSchema },
  prompt: `You are an expert bike mechanic who is an expert at reading specification sheets. Analyze the following text and extract the bike's brand, model, and year.

Then, identify every component listed. For each component, extract its name, brand, series, and model.
- The 'series' is the product family name (e.g., 'Dura-Ace', 'Ultegra', '105', 'XT', 'Apex', 'GX Eagle').
- The 'model' is the specific part number or model identifier (e.g., 'FD-5700L', 'RD-M8100', 'CS-4600'). If no model/part number is obvious, omit it.

Determine the front drivetrain configuration ('1x', '2x', or '3x') and the number of rear speeds ('9', '10', '11', or '12').
- For example, a crankset described as '46/36' is '2x'. A cassette described as '12-28T 10 speed' is '10' speed.
- Set the 'frontMech' and 'rearMech' fields accordingly.

For Cranksets, if you see a specification like '46/36' or '50/34T', extract the number of teeth for each chainring.
- 'chainring1' should always be the largest number.
- For a '46/36' crankset, 'chainring1' would be '46' and 'chainring2' would be '36'.

Valid systems are: Drivetrain, Brakes, Suspension, Wheelset, Frameset, Cockpit, Accessories.
- The Drivetrain system includes the Crankset, Bottom Bracket, Derailleurs, Shifters, Cassette, and Chain.
- The Brakes system includes brake levers, calipers, and rotors.
- The Wheelset system includes hubs, rims, tires, and skewers/axles.
- The Cockpit includes the Handlebar, Stem, Seatpost, Headset, Saddle, Grips or Bar Tape, and Seatpost Clamp. Standardize "Seat Post" to "Seatpost".

If you cannot determine a value for a field, omit it.

Provide this information back in a structured JSON format.

Page Content:
{{{textContent}}}
  `,
  config: {
    safetySettings: [
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
        },
        {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
        },
        {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
        },
        {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
        },
    ]
  }
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
