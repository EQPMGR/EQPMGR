'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLinkedStravaBikesAction, unlinkStravaBikeAction } from '@/app/(app)/settings/apps/actions';

type Linked = Awaited<ReturnType<typeof getLinkedStravaBikesAction>>;

export function StravaSyncCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<Linked | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try { setState(await getLinkedStravaBikesAction(await user.getIdToken())); } catch { /* signed out */ }
  }, [user]);
  useEffect(() => { load(); }, [load]);

  if (!state) return null;

  const unlink = async (id: string) => {
    const r = await unlinkStravaBikeAction(await user!.getIdToken(), id);
    if (r.success) { toast({ title: 'Unlinked', description: 'Rides on that Strava bike will need to be assigned by hand again.' }); load(); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Automatic ride sync</CardTitle>
        <CardDescription>
          New Strava rides are assigned automatically when EQPMGR knows which bike they were on. Assign a ride by hand
          once and EQPMGR remembers that Strava bike from then on.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {state.bikes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Strava bikes linked yet. If you only have one bike, rides go to it automatically.
          </p>
        ) : (
          <ul className="space-y-2">
            {state.bikes.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                <span><span className="font-medium">{b.name}</span>{b.stravaGearName ? <> ← Strava bike “{b.stravaGearName}”</> : null}</span>
                <Button size="sm" variant="ghost" onClick={() => unlink(b.id)}>Unlink</Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
