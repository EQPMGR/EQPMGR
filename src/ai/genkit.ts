import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Use the same API key as the main Firebase app for simplicity.
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export const ai = genkit({
  plugins: [googleAI({
    apiKey: GEMINI_API_KEY
  })],
  model: 'googleai/gemini-2.0-flash',
});
