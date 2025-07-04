
'use client';

import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function DebugPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTestWrite = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const docRef = await addDoc(collection(db, "test"), {
        test: "success",
        timestamp: new Date(),
      });
      const message = `Successfully wrote to DB. Document ID: ${docRef.id}`;
      setResult(message);
      toast({
        title: 'Success!',
        description: message,
      });
    } catch (error: any) {
      console.error("Test write failed:", error);
      const errorMessage = error.message || "An unknown error occurred.";
      setResult(`Test write failed: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Test Write Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Firestore Write Test</CardTitle>
        <CardDescription>
          This page performs the simplest possible write operation to the database
          to confirm if the connection and permissions are configured correctly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleTestWrite} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Run Write Test
        </Button>
      </CardContent>
      {result && (
        <CardFooter>
          <p className="text-sm text-muted-foreground break-all">{result}</p>
        </CardFooter>
      )}
    </Card>
  );
}
