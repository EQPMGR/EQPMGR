
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DatabaseZap, Info, Terminal } from 'lucide-react';
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
      const allComponents = await fetchAllMasterComponents();
      if (allComponents.length === 0) {
        setResult("No master components found in the database to index.");
        setIsLoading(false);
        return;
      }
      
      // Correctly filter for components that are missing an embedding
      const componentsToIndex = allComponents.filter(c => !c.embedding);

      if (componentsToIndex.length === 0) {
        setResult("All existing components are already indexed.");
        setIsLoading(false);
        toast({
          title: 'All Set!',
          description: 'No new components to index.',
        });
        return;
      }

      setResult(`Found ${componentsToIndex.length} new components to index. Starting process...`);

      // Process in parallel with a limit to avoid overwhelming services
      const batchSize = 10;
      for (let i = 0; i < componentsToIndex.length; i += batchSize) {
        const batch = componentsToIndex.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (component) => {
             await indexComponentFlow(component);
          })
        );
         setResult(`Indexing in progress... ${i + batch.length} of ${componentsToIndex.length} components indexed.`);
      }

      const finalMessage = `Successfully indexed ${componentsToIndex.length} new components.`;
      setResult(finalMessage);
      toast({
        title: 'Indexing Complete!',
        description: finalMessage,
      });

    } catch (error: any) {
        let description = error.message || 'An unexpected error occurred.';
         if (error.code === 'failed-precondition' || (error.message && error.message.includes('vector index'))) {
            description = "Firestore vector index not found or not configured. Please create a vector index on the 'masterComponents' collection for the 'embedding' field via the gcloud or Firebase CLI.";
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
        <CardTitle>Firestore Vector Indexing</CardTitle>
        <CardDescription>
          Tools to create vector embeddings for component search.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How This Works</AlertTitle>
          <AlertDescription>
            This tool generates vector embeddings for each component in your `masterComponents` collection and saves them back to the component document. This enables powerful semantic search for the AI. Run this after adding new components to the database.
          </AlertDescription>
        </Alert>
         <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Important: Index Setup</AlertTitle>
          <AlertDescription>
           For this feature to work, you must first create a vector index in your Firestore database using the Firebase or gCloud CLI. The AI will not be able to find similar components without it.
          </AlertDescription>
        </Alert>
        <Button onClick={handleIndexComponents} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DatabaseZap className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Indexing...' : 'Generate Embeddings for New Components'}
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
