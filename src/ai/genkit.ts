import {genkit} from 'genkit';
import {googleAI, textEmbedding004} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
        apiKey: "AIzaSyBmjQjRubeRl_hoAJLDxvhexEwGPvpxj4k"
    }),
  ],
  model: 'googleai/gemini-1.5-flash-latest',
  embedder: 'googleai/text-embedding-004',
});
