'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RadioTower } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type Subscription = { id: number; callback_url: string; created_at?: string };

/** Admin switch for automatic Strava sync (the app's one webhook subscription). */
export function StravaWebhookCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subs, setSubs] = useState<Subscription[] | null>(null);
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (method: 'GET' | 'POST' | 'DELETE', query = '') => {
    if (!user) return null;
    const res = await fetch(`/api/admin/strava-webhook${query}`, { method, headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
    return data;
  }, [user]);

  const refresh = useCallback(async () => {
    try { setSubs((await call('GET'))?.subscriptions ?? []); } catch (e: any) { toast({ variant: 'destructive', title: 'Strava', description: e.message }); setSubs([]); }
  }, [call, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await fn(); toast({ title: done }); await refresh(); }
    catch (e: any) { toast({ variant: 'destructive', title: 'Strava', description: e.message }); }
    finally { setBusy(false); }
  };

  const active = subs?.[0];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2"><RadioTower className="h-4 w-4" /> Automatic Strava sync</CardTitle>
        <CardDescription className="text-sm">
          Strava tells EQPMGR about new rides the moment they upload, so wear stays current without opening the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {subs === null ? <p className="text-muted-foreground">Checking…</p> : active ? (
          <p>On: Strava sends rides to <code className="text-xs">{active.callback_url}</code></p>
        ) : <p className="text-muted-foreground">Off.</p>}
        {active ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => call('DELETE', `?id=${active.id}`), 'Automatic sync turned off')}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Turn off
          </Button>
        ) : (
          <Button size="sm" disabled={busy || subs === null} onClick={() => run(() => call('POST'), 'Automatic sync turned on')}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Turn on
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
