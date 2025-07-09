'use server';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Use the same API key as the main Firebase app for simplicity.
const GEMINI_API_KEY = "AIzaSyBmjQjRubeRl_hoAJLDxvhexEwGPvpxj4k";

export const ai = genkit({
  plugins: [googleAI({
    apiKey: GEMINI_API_KEY
  })],
  model: 'googleai/gemini-2.0-flash',
});
