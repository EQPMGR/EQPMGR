

import { Pinecone } from '@pinecone-database/pinecone';

let pinecone: Pinecone | null = null;

const getPineconeClient = () => {
  if (!pinecone) {
      const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
    
      if (!PINECONE_API_KEY) {
        throw new Error("Pinecone API key is not set. Please add it to your .env file. Vector search functionality will be disabled.");
      }

      pinecone = new Pinecone({
          apiKey: PINECONE_API_KEY,
      });
  }
  return pinecone;
};


// The name of the index in your Pinecone project.
// IMPORTANT: You must create an index with this name in the Pinecone console.
// The index should have a dimension of 768 for Google's text-embedding-004 model.
const indexName = 'eqpmgr-components';

export const getPineconeIndex = () => {
    const client = getPineconeClient();
    return client.index(indexName);
}
