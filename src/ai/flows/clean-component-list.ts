
'use server';
/**
 * @fileOverview An AI agent that takes a raw, semi-structured list of bike components
 * and cleans it into a structured CSV format.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CleanComponentListInputSchema = z.string();

const CleanComponentListOutputSchema = z.object({
  structuredData: z.string().describe("The structured component data in CSV format, with a header row: Brand,Series,Model,Name,Descriptor1,Descriptor2"),
});

export async function cleanComponentList(input: string): Promise<z.infer<typeof CleanComponentListOutputSchema>> {
  return cleanComponentListFlow(input);
}

const componentCleanerPrompt = ai.definePrompt({
  name: 'componentCleanerPrompt',
  input: { schema: CleanComponentListInputSchema },
  output: { schema: CleanComponentListOutputSchema },
  config: {
    temperature: 0.1,
  },
  prompt: `You are an expert data cleaner specializing in bike components. Your task is to take the provided raw text and structure it into a CSV format with a header row.

Follow these rules with extreme precision:

1.  **Header Row:** The first line of your output MUST be the following header: \`Brand,Series,Model,Name,Descriptor1,Descriptor2\`
2.  **Brand:** The brand of the component (e.g., "Shimano").
3.  **Series:** The product family (e.g., "105", "Dura-Ace", "GRX"). If a component doesn't belong to a clear series, leave this blank.
4.  **Model:** The specific model or part number (e.g., "CS-R7000", "RD-M6100").
5.  **Name:** The generic name or function of the component (e.g., "Cassette", "Brake Caliper", "Chain").
6.  **Descriptors:** Use the descriptor columns for additional attributes like speed, size, or other features (e.g., "11 speed", "11-34t", "GS").

**EXAMPLE of how to process the data:**

**Input Text:**
\`\`\`
Shimano	105	CS 5700  	Cassette	10 speed	
Shimano	105	BR-R7000	Brake Caliper	DUAL-PIVOT BRAKE CALIPER	
Shimano	105	CS-HG700  	Cassette	11 speed	11-34t
Shimano	SLX	CS-M7000 Cassette 11 speed
\`\`\`

**Correct Output CSV:**
\`\`\`csv
Brand,Series,Model,Name,Descriptor1,Descriptor2
Shimano,105,CS 5700,Cassette,10 speed,
Shimano,105,BR-R7000,Brake Caliper,DUAL-PIVOT BRAKE CALIPER,
Shimano,105,CS-HG700,Cassette,11 speed,11-34t
Shimano,SLX,CS-M7000,Cassette,11 speed,
\`\`\`

Now, process the following complete list. Do not include the example in your final output. Return ONLY the CSV data.

RAW DATA TO PROCESS:
{{{input}}}
  `,
});


const cleanComponentListFlow = ai.defineFlow(
  {
    name: 'cleanComponentListFlow',
    inputSchema: CleanComponentListInputSchema,
    outputSchema: CleanComponentListOutputSchema,
  },
  async (input) => {
    const { output } = await componentCleanerPrompt(input);
    if (!output) {
      throw new Error('Could not process the component list.');
    }
    return output;
  }
);
