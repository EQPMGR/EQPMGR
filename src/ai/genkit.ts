'use server';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Genkit will read the Gemini API key from the GOOGLE_API_KEY environment variable.
const GEMINI_API_KEY = 'AIzaSyBmjQjRubeRl_hoAJLDxvhexEwGPvpxj4k';

export const ai = genkit({
  plugins: [googleAI({
    apiKey: GEMINI_API_KEY
  })],
  model: 'googleai/gemini-2.0-flash',
});
