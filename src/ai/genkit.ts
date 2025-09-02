
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { geminiPro, textEmbedding004 } from '@genkit-ai/googleai';
import { accessSecret } from '@/lib/secrets';

// A function to initialize the Google AI plugin with the key from Secret Manager
const initializeGoogleAI = async () => {
  const geminiApiKey = await accessSecret('gemini-api-key');
  return googleAI({ apiKey: geminiApiKey });
};

// We now initialize genkit asynchronously to fetch the API key
export const ai = genkit({
  plugins: [await initializeGoogleAI()],
  embedder: textEmbedding004,
});
