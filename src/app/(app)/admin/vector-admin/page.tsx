
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
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const { toast } = useToast();
  
  const addLog = (message: string) => {
    setLogMessages(prev => [...prev, message]);
  }

  const handleIndexComponents = async () => {
    setIsLoading(true);
    setLogMessages([]);
    addLog("Starting indexing process...");

    try {
      addLog("Fetching all master components from the database...");
      const allComponents = await fetchAllMasterComponents();
      
      if (allComponents.length === 0) {
        addLog("No master components found in the database to index.");
        setIsLoading(false);
        return;
      }
      addLog(`Found ${allComponents.length} total components in the database.`);
      
      const componentsToIndex = allComponents.filter(c => !c.embedding || !Array.isArray(c.embedding) || c.embedding.length === 0);
      const alreadyIndexedCount = allComponents.length - componentsToIndex.length;

      addLog(`${alreadyIndexedCount} components are already indexed and will be skipped.`);
      
      if (componentsToIndex.length === 0) {
        addLog(`All ${allComponents.length} components are already indexed. Nothing to do.`);
        setIsLoading(false);
        toast({
          title: 'All Set!',
          description: 'No new components to index.',
        });
        return;
      }

      addLog(`Found ${componentsToIndex.length} components that need indexing. Starting process...`);

      const batchSize = 10;
      for (let i = 0; i < componentsToIndex.length; i += batchSize) {
        const batch = componentsToIndex.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (component) => {
             await indexComponentFlow(component);
          })
        );
         addLog(`Indexing in progress... ${i + batch.length} of ${componentsToIndex.length} components indexed.`);
      }

      const finalMessage = `Successfully indexed ${componentsToIndex.length} new components.`;
      addLog(finalMessage);
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
      addLog(`Indexing failed: ${description}`);
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
            This tool is for backfilling embeddings for any components added before automatic indexing was implemented. New components added via the "Add Bike Model" form are now indexed automatically.
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
      {logMessages.length > 0 && (
        <CardFooter>
            <div className="w-full bg-muted p-4 rounded-md text-xs font-mono max-h-64 overflow-y-auto">
                {logMessages.map((msg, i) => (
                    <p key={i} className="whitespace-pre-wrap">{`> ${msg}`}</p>
                ))}
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
