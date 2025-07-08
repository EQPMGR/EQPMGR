
'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function DebugPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTestWrite = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const docRef = await addDoc(collection(db, "test"), {
        test: "success",
        timestamp: serverTimestamp(),
        uid: user?.uid || 'unknown'
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

  const isButtonDisabled = isLoading || authLoading || !user;

  return (
    <div className="space-y-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Firestore Write Test</CardTitle>
          <CardDescription>
            This page performs a simple write to the 'test' collection to confirm database permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestWrite} disabled={isButtonDisabled}>
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
      
      <Card className="max-w-md mx-auto">
        <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent>
            {authLoading ? (
                <p>Checking authentication status...</p>
            ) : user ? (
                <Alert variant="default">
                    <AlertTitle>Authenticated</AlertTitle>
                    <AlertDescription className="break-all">
                        <p>You are logged in.</p>
                        <p><strong>UID:</strong> {user.uid}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert variant="destructive">
                    <AlertTitle>Not Authenticated</AlertTitle>
                    <AlertDescription>
                        You are not logged in. The write test will be disabled.
                    </AlertDescription>
                </Alert>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
