import {genkit} from 'genkit';
import {googleAI, textEmbedding004} from '@genkit-ai/googleai';

// Use the same API key as the main Firebase app for simplicity.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. AI features will be disabled.");
}

export const ai = genkit({
  plugins: [
    googleAI({
        apiKey: GEMINI_API_KEY
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
  embedder: 'googleai/text-embedding-004',
});
