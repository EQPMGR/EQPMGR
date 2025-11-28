
import { embed as openaiEmbed, chat as openaiChat } from '@/lib/llm';

// Minimal compatibility layer used by the app. It provides the small surface
// the codebase expects from `ai`:
// - `ai.embed(content)` -> returns embedding array
// - `ai.defineFlow(config, handler)` -> returns the handler (noop wrapper)
// - `ai.definePrompt(config)` -> returns an async function that calls OpenAI chat

export const ai = {
  async embed(opts: { content: string } | string) {
    const text = typeof opts === 'string' ? opts : opts.content;
    return await openaiEmbed(text);
  },
  defineFlow(_config: any, handler: any) {
    // Keep the same shape as before: return the handler as the flow
    return handler;
  },
  definePrompt(config: any) {
    // Return a function that fills the prompt template and calls OpenAI.
    const promptTemplate: string = config.prompt || '';
    return async (input: any) => {
      // Replace simple {{{key}}} placeholders with input[key]
      let filled = promptTemplate;
      if (input && typeof input === 'object') {
        for (const k of Object.keys(input)) {
          const re = new RegExp(`{{{\s*${k}\s*}}}`, 'g');
          filled = filled.replace(re, String(input[k]));
        }
      }

      // Call OpenAI chat with the filled prompt
      const text = await openaiChat(filled, config.model || undefined);

      // Expecting the model to return JSON; try to parse it.
      try {
        const parsed = JSON.parse(text);
        return { output: parsed };
      } catch (e) {
        // If parsing fails, return raw text under `output` to keep compatibility.
        return { output: text };
      }
    };
  },
};

export default ai;
