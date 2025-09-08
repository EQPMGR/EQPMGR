

'use client';

import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
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
import { getComponentForDebug, testVertexAIConnection, getEnvironmentStatus, testIdTokenVerification, testSecret } from './actions';
import { Separator } from '../ui/separator';

type SecretTestState = {
    [key: string]: {
        isLoading: boolean;
        result: string | null;
    }
}

const secretsToTest = ['GEMINI_API_KEY', 'FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID'];

export default function DebugPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // State for ID token test
  const [isLoadingIdTokenTest, setIsLoadingIdTokenTest] = useState(false);
  const [idTokenTestResult, setIdTokenTestResult] = useState<string | null>(null);
  const [testUserEmail, setTestUserEmail] = useState('');
  const [testUserPassword, setTestUserPassword] = useState('');

  // State for component inspector
  const [isLoadingComponent, setIsLoadingComponent] = useState(false);
  const [componentId, setComponentId] = useState('');
  const [componentResult, setComponentResult] = useState<string | null>(null);
  
  // State for Vertex AI test
  const [isLoadingVertexTest, setIsLoadingVertexTest] = useState(false);
  const [vertexTestResult, setVertexTestResult] = useState<string | null>(null);
  
  // State for individual secret tests
  const initialSecretState: SecretTestState = secretsToTest.reduce((acc, secret) => {
    acc[secret] = { isLoading: false, result: null };
    return acc;
  }, {} as SecretTestState);
  const [secretTestStates, setSecretTestStates] = useState<SecretTestState>(initialSecretState);

  const handleIdTokenTest = async () => {
    if (!testUserEmail || !testUserPassword) {
      toast({ variant: 'destructive', title: 'Email and password required for test.' });
      return;
    }
    setIsLoadingIdTokenTest(true);
    setIdTokenTestResult(null);
    try {
      // Step 1: Sign in on the client to get an ID token
      const userCredential = await signInWithEmailAndPassword(auth, testUserEmail, testUserPassword);
      const idToken = await userCredential.user.getIdToken(true);
      
      // Step 2: Send the token to the server action for verification
      const result = await testIdTokenVerification(idToken);
      setIdTokenTestResult(result);
       if (result.startsWith('Success')) {
        toast({ title: 'Success!', description: result });
      } else {
        toast({ variant: 'destructive', title: 'Verification Failed', description: result, duration: 9000 });
      }

    } catch (error: any) {
      console.error("ID Token test failed:", error);
      const errorMessage = `Client-side error: ${error.message} (Code: ${error.code})`;
      setIdTokenTestResult(errorMessage);
      toast({
        variant: 'destructive',
        title: 'ID Token Test Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoadingIdTokenTest(false);
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
  
  const handleSecretTest = async (secretName: string) => {
    setSecretTestStates(prev => ({ ...prev, [secretName]: { isLoading: true, result: null } }));
    try {
        const result = await testSecret(secretName);
        setSecretTestStates(prev => ({ ...prev, [secretName]: { isLoading: false, result: result } }));
        if (result.startsWith('Success')) {
            toast({ title: 'Success!', description: result });
        } else {
            toast({ variant: 'destructive', title: 'Test Failed', description: result, duration: 9000 });
        }
    } catch (error: any) {
        const msg = `An unexpected client-side error occurred: ${error.message}`;
        setSecretTestStates(prev => ({ ...prev, [secretName]: { isLoading: false, result: msg } }));
        toast({ variant: 'destructive', title: 'Test Failed', description: msg });
    }
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>1. Firebase Auth Token Verification Test</CardTitle>
          <CardDescription>
            This test signs in a user on the client, gets their ID token, and sends it to a server action to verify. This directly tests if the server can communicate with Firebase Auth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Test User Email</Label>
            <Input id="test-email" type="email" placeholder="user@example.com" value={testUserEmail} onChange={(e) => setTestUserEmail(e.target.value)} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="test-password">Test User Password</Label>
            <Input id="test-password" type="password" placeholder="••••••••" value={testUserPassword} onChange={(e) => setTestUserPassword(e.target.value)} />
          </div>
          <Button onClick={handleIdTokenTest} disabled={isLoadingIdTokenTest || authLoading}>
            {isLoadingIdTokenTest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Auth Test
          </Button>
        </CardContent>
        {idTokenTestResult && (
          <CardFooter>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all w-full bg-muted p-2 rounded-md">
                {idTokenTestResult}
            </pre>
          </CardFooter>
        )}
      </Card>
      
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>2. Embedding Model Connection Test</CardTitle>
          <CardDescription>
            This tests if the server can successfully authenticate with and call the Google AI API for embeddings. This confirms service account permissions for AI services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleVertexTest} disabled={isLoadingVertexTest}>
            {isLoadingVertexTest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Embedding Test
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
          <CardTitle>3. Cloud Secret Access Test</CardTitle>
          <CardDescription>
            Test if the backend has permission to access individual secrets from Secret Manager.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {secretsToTest.map(secretName => (
                <div key={secretName}>
                    <div className="flex items-center gap-4">
                        <Button onClick={() => handleSecretTest(secretName)} disabled={secretTestStates[secretName]?.isLoading} variant="outline" size="sm">
                             {secretTestStates[secretName]?.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Test {secretName}
                        </Button>
                        {secretTestStates[secretName]?.result && (
                            <p className="text-sm text-muted-foreground break-all">{secretTestStates[secretName].result}</p>
                        )}
                    </div>
                </div>
            ))}
        </CardContent>
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
      
    </div>
  );
}
