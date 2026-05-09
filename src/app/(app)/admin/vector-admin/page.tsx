
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DatabaseZap, Info, Terminal } from 'lucide-react';
import { getDb } from '@/backend';
import { fetchAllDocsPaginated } from '@/backend/dbPagination';
import { indexComponentFlow } from '@/ai/flows/index-components';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MasterComponent } from '@/lib/types';


async function fetchAllMasterComponentsClient(): Promise<MasterComponent[]> {
  try {
    const database = await getDb();
    const docs = await fetchAllDocsPaginated<MasterComponent>(database, 'masterComponents', 500, 'id');
    return docs.map((doc) => ({ id: doc.id, ...doc.data } as MasterComponent));
  } catch (error) {
    console.error("Error fetching master components from client:", error);
    throw error;
  }
}

const isValidEmbedding = (embedding: any): embedding is number[] => {
    // This is a more robust check. Firestore can sometimes return proxy objects.
    // We check if it has a length property and that the first element is a number.
    return embedding && typeof embedding.length === 'number' && embedding.length > 0 && typeof embedding[0] === 'number';
}


export default function VectorAdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [masterComponents, setMasterComponents] = useState<MasterComponent[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [syncUpdates, setSyncUpdates] = useState({ brand: '', series: '', model: '', size: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  
  const addLog = (message: string) => {
    setLogMessages(prev => [...prev, message]);
  }

  useEffect(() => {
    (async () => {
      try {
        const components = await fetchAllMasterComponentsClient();
        setMasterComponents(components);
      } catch (error) {
        console.error('Failed to fetch master components:', error);
      }
    })();
  }, []);

  const handleSyncMasterComponent = async () => {
    if (!selectedComponentId) {
      toast({ variant: 'destructive', title: 'Please select a master component' });
      return;
    }

    const updates: any = {}; 
    ['brand','series','model','size'].forEach(k => {
      const v = (syncUpdates as any)[k];
      if (v && v.trim()) updates[k] = v.trim();
    });

    if (Object.keys(updates).length === 0) {
      toast({ variant: 'destructive', title: 'Add at least one field to sync' });
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/master-component-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterComponentId: selectedComponentId, updates }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Sync failed');
      }

      const payload = await res.json();
      toast({ title: 'Sync Complete', description: payload.message || 'Master component synced.' });
      setLogMessages(prev => [...prev, `Master component synced: ${selectedComponentId}`]);
    } catch (error: any) {
      console.error('Sync failed', error);
      toast({ variant: 'destructive', title: 'Sync Failed', description: error.message || String(error) });
    } finally {
      setIsSyncing(false);
    }
  };

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
          addLog(`[${i + 1}/${componentsToIndex.length}] Calling AI for: ${component.brand || ''} ${component.name}...`);
          // 1. Call the server flow to ONLY get the embedding
          const { embedding } = await indexComponentFlow(component);
          
          if (!embedding || embedding.length === 0) {
              throw new Error("AI returned an empty embedding.");
          }
          addLog(`[${i + 1}/${componentsToIndex.length}] Embedding received. Saving to Firestore...`);

          // 2. Write the embedding to Firestore from the CLIENT
          const database = await getDb();
          await database.updateDoc('masterComponents', component.id, { embedding });

          addLog(`[${i + 1}/${componentsToIndex.length}] Successfully saved embedding for ${component.id}.`);
          successCount++;
        } catch (e: any) {
          const errorMsg = `Failed to process component ${component.id}: ${e.message}`;
          addLog(errorMsg);
          console.error(errorMsg, e);
        }
      }

      const finalMessage = `Indexing complete. Successfully processed ${successCount} of ${componentsToIndex.length} components.`;
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
      </CardHeader>      <CardContent className="space-y-4 border-t pt-4">
        <h3 className="font-semibold">Admin Master Sync</h3>
        <div className="grid grid-cols-1 gap-2">
          <Select value={selectedComponentId} onValueChange={(value) => setSelectedComponentId(value)}>
            <SelectTrigger><SelectValue placeholder="Select master component" /></SelectTrigger>
            <SelectContent>
              {masterComponents.map((mc) => (
                <SelectItem key={mc.id} value={mc.id}>{`${mc.brand || ''} ${mc.series || ''} ${mc.name || ''}`.trim() || mc.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="sync-brand">Brand</Label>
              <Input id="sync-brand" value={syncUpdates.brand} onChange={(e) => setSyncUpdates(prev => ({ ...prev, brand: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="sync-series">Series</Label>
              <Input id="sync-series" value={syncUpdates.series} onChange={(e) => setSyncUpdates(prev => ({ ...prev, series: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="sync-model">Model</Label>
              <Input id="sync-model" value={syncUpdates.model} onChange={(e) => setSyncUpdates(prev => ({ ...prev, model: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="sync-size">Size</Label>
              <Input id="sync-size" value={syncUpdates.size} onChange={(e) => setSyncUpdates(prev => ({ ...prev, size: e.target.value }))} />
            </div>
          </div>
          <Button onClick={handleSyncMasterComponent} disabled={isSyncing || !selectedComponentId}>
            {isSyncing ? 'Syncing…' : 'Sync Master Component To Users'}
          </Button>
        </div>
      </CardContent>      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How This Works</AlertTitle>
          <AlertDescription>
            This tool fetches all components and processes them one-by-one. It calls a server flow to generate an embedding via AI, then saves that embedding back to the database from your browser.
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
