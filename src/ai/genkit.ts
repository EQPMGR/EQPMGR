
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { geminiPro, textEmbedding004 } from '@genkit-ai/googleai';

// This configuration explicitly uses the GEMINI_API_KEY from your .env file.
// This is required for Genkit to authenticate with the Google AI services.
export const ai = genkit({
  plugins: [googleAI({
    apiKey: process.env.GEMINI_API_KEY
  })],
  embedder: textEmbedding004,
});

