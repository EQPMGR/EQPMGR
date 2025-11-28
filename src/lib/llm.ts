'use server';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  // Do not throw at import time in some environments; functions will throw when called.
}

export async function chat(prompt: string, model = process.env.OPENAI_CHAT_MODEL || 'gpt-3.5-turbo') {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI chat request failed: ${res.status} ${txt}`);
  }

  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

export async function embed(text: string, model = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small') {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model, input: text }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI embeddings request failed: ${res.status} ${txt}`);
  }

  const j = await res.json();
  return j.data?.[0]?.embedding ?? null;
}

export default { chat, embed };
