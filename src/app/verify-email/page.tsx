
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { applyActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

function EmailVerificationHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const actionCode = searchParams.get('oobCode');

    if (actionCode) {
      applyActionCode(auth, actionCode)
        .then(() => {
          setStatus('success');
        })
        .catch((error) => {
          console.error("Email verification error:", error);
          setErrorMessage(error.message || 'An unknown error occurred. The link may be invalid or expired.');
          setStatus('error');
        });
    } else {
      setErrorMessage('No verification code found in the link. Please check the URL.');
      setStatus('error');
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            {status === 'verifying' && 'Please wait while we verify your email address...'}
            {status === 'success' && 'Your email has been successfully verified!'}
            {status === 'error' && 'There was a problem verifying your email.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-24">
          {status === 'verifying' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
          {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
          {status === 'error' && <XCircle className="h-12 w-12 text-destructive" />}
        </CardContent>
        {status !== 'verifying' && (
          <CardFooter className="flex flex-col gap-4">
             {status === 'error' && (
              <p className="text-sm text-destructive text-center">{errorMessage}</p>
            )}
            <Button asChild className="w-full">
              <Link href="/login">
                {status === 'success' ? 'Proceed to Login' : 'Back to Login'}
              </Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EmailVerificationHandler />
        </Suspense>
    );
}
