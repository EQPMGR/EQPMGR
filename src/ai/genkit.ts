import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This is a placeholder key. You will need to replace it with a valid key
// from the Google Cloud Console that has the "Vertex AI API" enabled.
const GEMINI_API_KEY = "AIzaSyBmjQjRubeRl_hoAJLDxvhexEwGPvpxj4k";

export const ai = genkit({
  plugins: [googleAI({
    apiKey: GEMINI_API_KEY
  })],
  model: 'googleai/gemini-pro',
  embedder: 'googleai/text-embedding-004',
});
