
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { textEmbedding004 } from '@genkit-ai/googleai';

// Initialize genkit.
// When running on Google Cloud (like Cloud Run), the googleAI() plugin will
// automatically use the runtime's service account credentials.
// For local development, it uses the credentials from `gcloud auth application-default login`.
// There is no need to manually fetch or manage API keys.
export const ai = genkit({
  plugins: [googleAI()],
  embedder: textEmbedding004,
});
