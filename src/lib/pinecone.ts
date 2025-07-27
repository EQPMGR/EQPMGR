
'use server';

import { Pinecone } from '@pinecone-database/pinecone';

const getPineconeClient = () => {
  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

  if (!PINECONE_API_KEY) {
    throw new Error("Pinecone API key is not set. Please add it to your .env file. Vector search functionality will be disabled.");
  }

  return new Pinecone({
    apiKey: PINECONE_API_KEY,
  });
};

const pinecone = getPineconeClient();

// The name of the index in your Pinecone project.
// IMPORTANT: You must create an index with this name in the Pinecone console.
// The index should have a dimension of 768 for Google's text-embedding-004 model.
const indexName = 'eqpmgr-components';

export const pineconeIndex = pinecone.index(indexName);
