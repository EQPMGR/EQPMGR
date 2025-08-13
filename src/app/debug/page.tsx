
'use client';

import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import { db, auth } from '@/lib/firebase';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getComponentForDebug, testVertexAIConnection, getEnvironmentStatus } from './actions';

export default function DebugPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isLoadingTestWrite, setIsLoadingTestWrite] = useState(false);
  const [testWriteResult, setTestWriteResult] = useState<string | null>(null);

  const [isLoadingComponent, setIsLoadingComponent] = useState(false);
  const [componentId, setComponentId] = useState('');
  const [componentResult, setComponentResult] = useState<string | null>(null);
  
  const [isLoadingVertexTest, setIsLoadingVertexTest] = useState(false);
  const [vertexTestResult, setVertexTestResult] = useState<string | null>(null);

  const [isLoadingSessionTest, setIsLoadingSessionTest] = useState(false);
  const [sessionTestResult, setSessionTestResult] = useState<string | null>(null);
  
  const [isLoadingEnvTest, setIsLoadingEnvTest] = useState(false);
  const [envTestResult, setEnvTestResult] = useState<string | null>(null);

  const handleTestSessionCookie = async () => {
      if (!auth.currentUser) {
          toast({ variant: 'destructive', title: 'Not Logged In', description: 'Cannot run test without a user.' });
          return;
      }
      setIsLoadingSessionTest(true);
      setSessionTestResult(null);
      try {
          const idToken = await auth.currentUser.getIdToken(true);
          const response = await fetch('/api/auth/session', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
          });

          const result = await response.json();

          if (!response.ok) {
              throw new Error(result.error || `HTTP error! status: ${response.status}`);
          }
          
          const message = `Successfully created session cookie. Status: ${result.status}`;
          setSessionTestResult(message);
          toast({ title: 'Success!', description: message });

      } catch (error: any) {
          console.error("Session cookie test failed:", error);
          const errorMessage = error.message || "An unknown error occurred.";
          setSessionTestResult(`Session cookie test failed: ${errorMessage}`);
          toast({
              variant: 'destructive',
              title: 'Session Cookie Test Failed',
              description: errorMessage,
          });
      } finally {
          setIsLoadingSessionTest(false);
      }
  };
  
   const handleEnvCheck = async () => {
    setIsLoadingEnvTest(true);
    setEnvTestResult(null);
    try {
      const result = await getEnvironmentStatus();
      setEnvTestResult(JSON.stringify(result, null, 2));
    } catch (error: any) {
      setEnvTestResult(`Failed to check environment: ${error.message}`);
      toast({ variant: 'destructive', title: 'Check Failed', description: error.message });
    } finally {
      setIsLoadingEnvTest(false);
    }
  };

  const handleTestWrite = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Logged In', description: 'Cannot run test without a user.' });
      return;
    }
    setIsLoadingTestWrite(true);
    setTestWriteResult(null);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      await updateDoc(userDocRef, {
        lastTestWrite: serverTimestamp(),
      });
      
      const message = `Successfully wrote a test field to your user profile document in Firestore. Path: users/${user.uid}`;
      setTestWriteResult(message);
      toast({
        title: 'Success!',
        description: message,
      });
    } catch (error: any) {
      console.error("Test write failed:", error);
      const errorMessage = error.message || "An unknown error occurred.";
      setTestWriteResult(`Test write failed: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Test Write Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoadingTestWrite(false);
    }
  };

  const handleFetchComponent = async () => {
    if (!componentId) {
        toast({ variant: 'destructive', title: 'Component ID required' });
        return;
    }
    setIsLoadingComponent(true);
    setComponentResult(null);
    try {
        const result = await getComponentForDebug(componentId);
        setComponentResult(result);
    } catch (error: any) {
        setComponentResult(`Failed to fetch: ${error.message}`);
        toast({ variant: 'destructive', title: 'Fetch Failed', description: error.message });
    } finally {
        setIsLoadingComponent(false);
    }
  };

  const handleVertexTest = async () => {
    setIsLoadingVertexTest(true);
    setVertexTestResult(null);
    try {
      const result = await testVertexAIConnection();
      setVertexTestResult(result);
      if (result.startsWith('Success')) {
        toast({ title: 'Success!', description: result });
      } else {
        toast({ variant: 'destructive', title: 'Connection Failed', description: result, duration: 9000 });
      }
    } catch (error: any) {
      const msg = `An unexpected client-side error occurred: ${error.message}`;
      setVertexTestResult(msg);
      toast({ variant: 'destructive', title: 'Test Failed', description: msg });
    } finally {
      setIsLoadingVertexTest(false);
    }
  };

  return (
    <div className="space-y-6">
        <Card className="max-w-md mx-auto">
            <CardHeader>
                <CardTitle>1. Server Environment Test</CardTitle>
                <CardDescription>
                This tests if the server environment has loaded the necessary API keys and credentials from your .env file. This is the most likely cause of the authentication issues.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleEnvCheck} disabled={isLoadingEnvTest}>
                    {isLoadingEnvTest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Check Server Environment
                </Button>
            </CardContent>
            {envTestResult && (
            <CardFooter>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all w-full bg-muted p-2 rounded-md">
                    {envTestResult}
                </pre>
            </CardFooter>
            )}
       </Card>

       <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>2. Session Cookie Test</CardTitle>
          <CardDescription>
            This tests if the server can create a session cookie, which is required for all authenticated server actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestSessionCookie} disabled={isLoadingSessionTest || authLoading}>
            {isLoadingSessionTest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Session Test
          </Button>
        </CardContent>
        {sessionTestResult && (
          <CardFooter>
            <p className="text-sm text-muted-foreground break-all">{sessionTestResult}</p>
          </CardFooter>
        )}
      </Card>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>3. Vertex AI Connection Test</CardTitle>
          <CardDescription>
            This tests if the server can successfully authenticate with and call the Google AI (Vertex AI) API for embeddings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleVertexTest} disabled={isLoadingVertexTest}>
            {isLoadingVertexTest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run AI Connection Test
          </Button>
        </CardContent>
        {vertexTestResult && (
          <CardFooter>
            <p className="text-sm text-muted-foreground break-all">{vertexTestResult}</p>
          </CardFooter>
        )}
      </Card>
      
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Component Inspector</CardTitle>
          <CardDescription>
            Enter a `masterComponent` ID to inspect its raw data from Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="componentId">Component ID</Label>
            <Input 
                id="componentId"
                value={componentId}
                onChange={(e) => setComponentId(e.target.value)}
                placeholder="e.g., alexrims-front-rim-atd490-disc"
            />
          </div>
          <Button onClick={handleFetchComponent} disabled={isLoadingComponent || !componentId}>
            {isLoadingComponent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Fetch Component Data
          </Button>
        </CardContent>
        {componentResult && (
          <CardFooter>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all w-full bg-muted p-2 rounded-md">
                {componentResult}
            </pre>
          </CardFooter>
        )}
      </Card>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Firestore Write Test</CardTitle>
          <CardDescription>
            This page performs a simple write to your user profile to confirm database permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestWrite} disabled={isLoadingTestWrite || authLoading || !user}>
            {isLoadingTestWrite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Write Test
          </Button>
        </CardContent>
        {testWriteResult && (
          <CardFooter>
            <p className="text-sm text-muted-foreground break-all">{testWriteResult}</p>
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
