

'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { testOpenAIConnection, testSecret } from './actions';

type SecretTestState = {
    [key: string]: {
        isLoading: boolean;
        result: string | null;
    }
}

const secretsToTest = ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];

export default function DebugPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  // State for OpenAI test
  const [isLoadingOpenAITest, setIsLoadingOpenAITest] = useState(false);
  const [openaiTestResult, setOpenAITestResult] = useState<string | null>(null);
  
  // State for individual secret tests
  const initialSecretState: SecretTestState = secretsToTest.reduce((acc, secret) => {
    acc[secret] = { isLoading: false, result: null };
    return acc;
  }, {} as SecretTestState);
  const [secretTestStates, setSecretTestStates] = useState<SecretTestState>(initialSecretState);

  const handleOpenAITest = async () => {
    setIsLoadingOpenAITest(true);
    setOpenAITestResult(null);
    try {
      const result = await testOpenAIConnection();
      setOpenAITestResult(result);
      if (result.startsWith('Success')) {
        toast({ title: 'Success!', description: result });
      } else {
        toast({ variant: 'destructive', title: 'Connection Failed', description: result, duration: 9000 });
      }
    } catch (error: any) {
      const msg = `An unexpected client-side error occurred: ${error.message}`;
      setOpenAITestResult(msg);
      toast({ variant: 'destructive', title: 'Test Failed', description: msg });
    } finally {
      setIsLoadingOpenAITest(false);
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
          <CardTitle>OpenAI Connection Test</CardTitle>
          <CardDescription>
            This tests if the server can successfully authenticate with and call the OpenAI API for embeddings or chat. Ensure `OPENAI_API_KEY` is set in the environment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleOpenAITest} disabled={isLoadingOpenAITest}>
            {isLoadingOpenAITest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Embedding Test
          </Button>
        </CardContent>
        {openaiTestResult && (
          <CardFooter>
            <p className="text-sm text-muted-foreground break-all">{openaiTestResult}</p>
          </CardFooter>
        )}
      </Card>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Environment Variable Access Test</CardTitle>
          <CardDescription>
            Test if the backend can access environment variables properly.
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
    </div>
  );
}
