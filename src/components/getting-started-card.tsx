'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

// First-run checklist on the rider dashboard. Each step ticks itself from real
// data (no extra tables), and the card disappears once every step is done or
// the rider hides it (remembered on this device).

const HIDDEN_KEY = 'eqpmgr.gettingStarted.hidden';

type Step = { key: string; done: boolean; title: string; hint: string; href: string; action: string; optional?: boolean };

function readHidden() {
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

async function count(table: 'equipment' | 'rides' | 'work_orders', uid: string) {
  const { count: n, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', uid);
  if (error) throw error;
  return n ?? 0;
}

export function GettingStartedCard() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(readHidden());
  }, []);

  useEffect(() => {
    if (!user || readHidden()) return;
    let cancelled = false;
    (async () => {
      try {
        const [bikes, rides, workOrders, profile] = await Promise.all([
          count('equipment', user.uid),
          count('rides', user.uid),
          count('work_orders', user.uid),
          // Only the athlete id, so Strava tokens never come to the browser here.
          supabase.from('app_users').select('weight, strava_athlete:strava->>athleteId').eq('id', user.uid).maybeSingle(),
        ]);
        if (profile.error) throw profile.error;
        const row = profile.data as { weight: number | null; strava_athlete: string | null } | null;
        if (cancelled) return;
        setSteps([
          {
            key: 'bike',
            done: bikes > 0,
            title: 'Add your bike',
            hint: "Find it in the catalog, or paste its spec sheet and we'll build it part by part.",
            href: '/equipment',
            action: 'Add a bike',
          },
          {
            key: 'rides',
            done: !!row?.strava_athlete || rides > 0,
            title: 'Connect Strava or upload a ride',
            hint: 'Every ride adds wear to each part. No Strava? Upload .FIT or .GPX files on your bike\'s page.',
            href: '/settings/apps',
            action: 'Connect Strava',
          },
          {
            key: 'weight',
            done: typeof row?.weight === 'number' && row.weight > 0,
            title: 'Add your weight',
            hint: 'Brakes and drivetrains wear faster under more weight, so this sharpens your estimates. Only you see it.',
            href: '/settings/profile',
            action: 'Open profile',
          },
          {
            key: 'shop',
            done: workOrders > 0,
            title: 'Find a shop or bike fitter',
            hint: 'When your bike needs work, send it to an approved local shop or bike fitter. They see the whole bike.',
            href: '/service-providers',
            action: 'See who\'s near you',
            optional: true,
          },
        ]);
      } catch (error) {
        // A checklist is a nice-to-have: if it can't load, just don't show it.
        console.error('[GettingStartedCard]', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (hidden || !steps) return null;
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const essentialsDone = steps.filter((s) => !s.optional).every((s) => s.done);
  const next = steps.find((s) => !s.done);

  const hide = () => {
    try {
      window.localStorage.setItem(HIDDEN_KEY, '1');
    } catch {
      // ignore: it just shows again next time
    }
    setHidden(true);
  };

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{essentialsDone ? "You're set up" : 'Get set up'}</CardTitle>
          <CardDescription>
            {essentialsDone
              ? 'Your parts are being tracked. One more thing for when your bike needs work:'
              : `${doneCount} of ${steps.length} done. A few minutes now and EQPMGR can tell you what's wearing out.`}
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={hide} aria-label="Hide the getting started list" title="Hide this list">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={(doneCount / steps.length) * 100} className="h-2" aria-label={`${doneCount} of ${steps.length} steps done`} />
        <ol className="space-y-3">
          {steps.map((step) => {
            const isNext = step.key === next?.key;
            return (
              <li key={step.key} className="flex gap-3">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-label="Done" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-label="Not done yet" />
                )}
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className={step.done ? 'font-medium text-muted-foreground line-through' : 'font-medium'}>
                      {step.title}
                      {step.optional && !step.done && <span className="ml-2 text-xs font-normal text-muted-foreground">(when you need it)</span>}
                    </p>
                    {!step.done && <p className="text-sm text-muted-foreground">{step.hint}</p>}
                  </div>
                  {!step.done && (
                    <Button asChild size="sm" variant={isNext ? 'default' : 'outline'} className="shrink-0 self-start">
                      <Link href={step.href}>
                        {step.action}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
