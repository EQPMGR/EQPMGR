
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DatabaseZap, Info, Terminal } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { indexComponentFlow } from '@/ai/flows/index-components';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { MasterComponent } from '@/lib/types';


async function fetchAllMasterComponentsClient(): Promise<MasterComponent[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'masterComponents'));
    const components: MasterComponent[] = [];
    querySnapshot.forEach((doc) => {
      components.push({ id: doc.id, ...doc.data() } as MasterComponent);
    });
    return components;
  } catch (error) {
    console.error("Error fetching master components from client:", error);
    throw error;
  }
}

const isValidEmbedding = (embedding: any): embedding is number[] => {
    // This is a more robust check. Firestore can sometimes return proxy objects.
    // We check if it's an array, has a length, and contains numbers.
    return embedding && Array.isArray(embedding) && embedding.length > 0 && typeof embedding[0] === 'number';
}


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
      const allComponents = await fetchAllMasterComponentsClient();
      addLog(`Found ${allComponents.length} total components.`);

      const componentsToIndex = allComponents.filter(c => !isValidEmbedding(c.embedding));
      
      if (componentsToIndex.length === 0) {
        addLog("All components appear to be indexed. Nothing to do.");
        toast({ title: "Up to date!", description: "All components are already indexed." });
        setIsLoading(false);
        return;
      }
      
      addLog(`Found ${componentsToIndex.length} components that need indexing.`);

      let successCount = 0;
      for (let i = 0; i < componentsToIndex.length; i++) {
        const component = componentsToIndex[i];
        try {
          addLog(`[${i + 1}/${componentsToIndex.length}] Indexing: ${component.brand || ''} ${component.name}...`);
          await indexComponentFlow(component);
          successCount++;
        } catch (e: any) {
          const errorMsg = `Failed to index component ${component.id}: ${e.message}`;
          addLog(errorMsg);
          console.error(errorMsg, e);
        }
      }

      const finalMessage = `Indexing complete. Successfully indexed ${successCount} of ${componentsToIndex.length} components.`;
      addLog(finalMessage);
      toast({
        title: 'Indexing Complete!',
        description: finalMessage,
      });

    } catch (error: any) {
        let description = error.message || 'An unexpected error occurred.';
         if (error.code === 'failed-precondition' || (error.message && error.message.includes('vector index'))) {
            description = "Firestore vector index not found or not configured. Please create a vector index on the 'masterComponents' collection for the 'embedding' field via the gcloud or Firebase CLI.";
        } else if (error.code === 'permission-denied') {
            description = "Permission denied. Please check your Firestore security rules to ensure you have read access to the 'masterComponents' collection.";
        }

      console.error("Indexing failed:", error);
      addLog(`A critical error occurred: ${description}`);
      toast({
        variant: 'destructive',
        title: 'Indexing Failed',
        description: description,
        duration: 9000,
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
            This tool fetches all components and processes them one-by-one to generate embeddings for search. If a component fails, it will be skipped and the process will continue.
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
