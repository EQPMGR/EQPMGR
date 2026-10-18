'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Link2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLinkedStravaBikesAction, unlinkStravaBikeAction, setWearAlertsAction } from '@/app/(app)/settings/apps/actions';

type Linked = Awaited<ReturnType<typeof getLinkedStravaBikesAction>>;

export function SyncAndAlertsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<Linked | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try { setState(await getLinkedStravaBikesAction(await user.getIdToken())); } catch { /* signed out */ }
  }, [user]);
  useEffect(() => { load(); }, [load]);

  if (!state) return null;

  const toggleAlerts = async (enabled: boolean) => {
    setState({ ...state, alertsEnabled: enabled });
    const r = await setWearAlertsAction(await user!.getIdToken(), enabled);
    if (!r.success) { toast({ variant: 'destructive', title: 'Could not save' }); load(); }
  };

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
        <div className="flex items-start justify-between gap-4 border-t pt-4">
          <div>
            <p className="font-medium flex items-center gap-2"><Bell className="h-4 w-4" /> Wear alert emails</p>
            <p className="text-sm text-muted-foreground">Get an email when a part reaches 80% (due soon) and 100% (replace now).</p>
          </div>
          <Switch checked={state.alertsEnabled} onCheckedChange={toggleAlerts} aria-label="Wear alert emails" />
        </div>
      </CardContent>
    </Card>
  );
}
