
import 'dotenv/config';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { textEmbedding004 } from '@genkit-ai/googleai';

// Initialize genkit.
// When running on Google Cloud (like Cloud Run), the googleAI() plugin will
// automatically use the runtime's service account credentials.
// For local development, it uses the credentials from `gcloud auth application-default login`.
// By explicitly passing the apiKey, we ensure it works in both environments, especially
// if the service account permissions have been restricted.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  embedder: textEmbedding004,
});
