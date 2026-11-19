'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getAuth } from '@/backend';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { rememberReturnPath, safeReturnPath, takeReturnPath } from '@/lib/return-path';
import { PRIVACY_URL, TERMS_URL, TERMS_VERSION } from '@/lib/terms';

type Mode = 'login' | 'signup' | 'reset';

const TITLES: Record<Mode, string> = { login: 'Sign In', signup: 'Sign Up', reset: 'Reset your password' };

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmailPassword, signUpWithEmailPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'login') {
        await signInWithEmailPassword(email.trim(), password);
        router.push(takeReturnPath() ?? '/dashboard');
      } else if (mode === 'signup') {
        if (!acceptedTerms) {
          setError('Please accept the Terms of Service and Privacy Policy to create an account.');
          return;
        }
        await signUpWithEmailPassword(email.trim(), password, TERMS_VERSION);
        // New accounts confirm their email first, then sign in here. Remember
        // where they were headed so the email round trip doesn't lose it.
        rememberReturnPath(safeReturnPath(new URLSearchParams(window.location.search).get('next')));
        setMode('login');
      } else {
        const auth = await getAuth();
        await auth.sendPasswordResetEmail(email.trim());
        // Same message whether or not the email has an account, so the form
        // can't be used to find out who has one.
        setNotice('If an account exists for that email, a reset link is on its way. Check your inbox (and spam folder).');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <Logo width={120} height={120} className="mb-6" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{TITLES[mode]}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {notice && (
            <Alert className="mb-4">
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'reset' && (
              <p className="text-sm text-muted-foreground">
                Enter the email you signed up with and we&apos;ll send you a link to choose a new password.
              </p>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('reset')} className="text-sm underline underline-offset-2 hover:opacity-80">
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}
            {mode === 'signup' && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="accept-terms" className="text-sm font-normal leading-snug">
                  I agree to the{' '}
                  <a href={TERMS_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">Terms of Service</a>
                  {' '}and{' '}
                  <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">Privacy Policy</a>.
                </Label>
              </div>
            )}
            <Button type="submit" disabled={loading || (mode === 'signup' && !acceptedTerms)} className="w-full">
              {loading
                ? 'Please wait...'
                : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {mode === 'reset' ? (
            <Button variant="secondary" onClick={() => switchMode('login')}>Back to sign in</Button>
          ) : (
            <Button variant="secondary" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
