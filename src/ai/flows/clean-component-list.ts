
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
  prompt: `You are an expert data cleaner specializing in bike components. Your task is to take the provided raw text and structure it into a CSV format.

Your output must start with the following header row:
\`Brand,Series,Model,Name,Descriptor1,Descriptor2\`

**EXAMPLE of how to process the data:**

**Input Text:**
\`\`\`
Shimano	105	CS-HG700  	Cassette	11 speed	11-34t
Shimano	SLX	CS-M7000 Cassette 11 speed
Shimano	BBR60 Bottom Bracket BSA English 68mm
Shimano	Di2 BT-DN110 Internal Battery
Shimano	GRX	ST-RX400 / BR-RX400
\`\`\`

**Correct Output CSV:**
\`\`\`csv
Brand,Series,Model,Name,Descriptor1,Descriptor2
Shimano,105,CS-HG700,Cassette,11 speed,11-34t
Shimano,SLX,CS-M7000,Cassette,11 speed,
Shimano,,BBR60,Bottom Bracket,BSA English,68mm
Shimano,Di2,BT-DN110,Internal Battery,,
Shimano,GRX,"ST-RX400 / BR-RX400",Shift/Brake Lever,,
\`\`\`

**Instructions:**
1.  **Analyze the examples above.** Notice how even incomplete or combined lines are parsed into the correct columns. Your goal is to preserve the information.
2.  **Apply this logic to the entire list below.**
3.  **Crucially, you must process EVERY single line from the input.** Do not skip or discard any entries. Your only job is to reformat, not to filter or curate.

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
