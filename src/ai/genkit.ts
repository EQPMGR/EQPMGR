import {genkit} from 'genkit';
import {googleAI, textEmbedding004} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-pro',
  embedder: 'googleai/text-embedding-004',
});
