'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DatabaseZap, Info } from 'lucide-react';
import { fetchAllMasterComponents } from '@/services/components';
import { indexComponentFlow } from '@/ai/flows/index-components';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function VectorAdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const handleIndexComponents = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const components = await fetchAllMasterComponents();
      if (components.length === 0) {
        setResult("No master components found in the database to index.");
        setIsLoading(false);
        return;
      }

      let indexedCount = 0;
      // Process in parallel with a limit to avoid overwhelming services
      const batchSize = 10;
      for (let i = 0; i < components.length; i += batchSize) {
        const batch = components.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (component) => {
            await indexComponentFlow(component);
            indexedCount++;
          })
        );
         setResult(`Indexing in progress... ${indexedCount} of ${components.length} components indexed.`);
      }

      const finalMessage = `Successfully indexed ${indexedCount} components into the vector database.`;
      setResult(finalMessage);
      toast({
        title: 'Indexing Complete!',
        description: `Processed ${indexedCount} components.`,
      });

    } catch (error: any) {
        let description = error.message || 'An unexpected error occurred.';
        if (error.message && error.message.includes('PineconeClient: Error')) {
            description = "Could not connect to the vector database. Please ensure your Pinecone API key is correct in the .env file and the index is running.";
        }
      console.error("Indexing failed:", error);
      setResult(`Indexing failed: ${description}`);
      toast({
        variant: 'destructive',
        title: 'Indexing Failed',
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Vector Database Administration</CardTitle>
        <CardDescription>
          Tools to create and manage the vector index for component search.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>What is this?</AlertTitle>
          <AlertDescription>
            This tool converts your master component list into vector embeddings, enabling powerful semantic search for the AI. Run this once to initialize the database, or anytime you want to re-index all components.
          </AlertDescription>
        </Alert>
        <Button onClick={handleIndexComponents} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DatabaseZap className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Indexing...' : 'Start Indexing All Components'}
        </Button>
      </CardContent>
      {result && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">{result}</p>
        </CardFooter>
      )}
    </Card>
  );
}