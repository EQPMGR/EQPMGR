
'use server';

import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

if (!PINECONE_API_KEY) {
    console.warn("Pinecone API key is not set. Vector search functionality will be disabled.");
}

const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY || '',
});

// The name of the index in your Pinecone project.
// IMPORTANT: You must create an index with this name in the Pinecone console.
// The index should have a dimension of 768 for Google's text-