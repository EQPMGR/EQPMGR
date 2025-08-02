
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// When no API key is provided, the Google AI plugin will automatically
// use the service account credentials from the environment, which is the
// correct and secure way to authenticate on the server.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-pro',
  embedder: 'googleai/text-embedding-004',
});
