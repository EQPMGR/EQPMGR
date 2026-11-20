'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  addMissingCatalogPartsAction,
  getIncompleteBikeAction,
  type IncompleteBikeInfo,
} from '@/app/(app)/equipment/[id]/actions';

// "Your bike seems incomplete": shown on a bike's page when it's missing parts
// its catalog model has, or has very few parts. The rider reviews the missing
// catalog parts (all ticked), unticks any they don't have, and adds the rest.
// Hiding is remembered per bike on this device.

const hiddenKey = (equipmentId: string) => `eqpmgr.incompleteBike.hidden.${equipmentId}`;

function readHidden(equipmentId: string) {
  try {
    return window.localStorage.getItem(hiddenKey(equipmentId)) === '1';
  } catch {
    return false;
  }
}

export function IncompleteBikeNotice({ equipmentId, onPartsAdded }: { equipmentId: string; onPartsAdded: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [info, setInfo] = useState<IncompleteBikeInfo | null>(null);
  const [hidden, setHidden] = useState(true);
  const [open, setOpen] = useState(false);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setInfo(await getIncompleteBikeAction({ idToken: await user.getIdToken(), equipmentId }));
    } catch (error) {
      console.error('Could not check whether the bike is complete:', error);
      setInfo(null);
    }
  }, [user, equipmentId]);

  useEffect(() => {
    setHidden(readHidden(equipmentId));
    load();
  }, [equipmentId, load]);

  const grouped = useMemo(() => {
    const groups = new Map<string, IncompleteBikeInfo['missing']>();
    for (const part of info?.missing ?? []) {
      const key = part.system || 'Other';
      groups.set(key, [...(groups.get(key) ?? []), part]);
    }
    return [...groups.entries()];
  }, [info]);

  if (!info?.incomplete || hidden) return null;

  const hasMissing = info.missing.length > 0;
  const hide = () => {
    try {
      window.localStorage.setItem(hiddenKey(equipmentId), '1');
    } catch {
      /* private window: hide for this visit only */
    }
    setHidden(true);
  };

  const openReview = () => {
    setTicked(new Set(info.missing.map((m) => m.catalogPartId)));
    setOpen(true);
  };

  const toggle = (id: string, on: boolean) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const addParts = async () => {
    if (!user || ticked.size === 0) return;
    setSaving(true);
    try {
      const result = await addMissingCatalogPartsAction({
        idToken: await user.getIdToken(),
        equipmentId,
        catalogPartIds: [...ticked],
      });
      toast(result.success
        ? { title: 'Parts added', description: result.message }
        : { variant: 'destructive', title: 'Could not add parts', description: result.message });
      if (result.success) {
        setOpen(false);
        onPartsAdded();
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const describe = (p: IncompleteBikeInfo['missing'][number]) =>
    [p.brand, p.series, p.model].filter(Boolean).join(' ') + (p.size ? ` (${p.size})` : '');

  return (
    <>
      <Card className="border-amber-500/60">
        <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Your bike seems incomplete
            </CardTitle>
            <CardDescription>
              {hasMissing
                ? `It has ${info.partCount} part${info.partCount === 1 ? '' : 's'}; the catalog build of this model has ${info.catalogPartCount}. Parts that aren't on your bike don't get wear tracking or service reminders.`
                : `It has only ${info.partCount} part${info.partCount === 1 ? '' : 's'} so far. Add the rest from each system below (Add Component) to track wear on them.`}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={hide} title="Hide this notice">
            <X className="h-4 w-4" />
            <span className="sr-only">Hide this notice</span>
          </Button>
        </CardHeader>
        {hasMissing && (
          <CardContent>
            <Button onClick={openReview}>Review {info.missing.length} missing part{info.missing.length === 1 ? '' : 's'}</Button>
          </CardContent>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add missing parts</DialogTitle>
            <DialogDescription>
              These parts are in the catalog build of this model but not on your bike. Builds differ, so untick anything your bike doesn't have. Added parts start at 0% wear.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] pr-3">
            <div className="space-y-4">
              {grouped.map(([system, parts]) => (
                <div key={system}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{system}</p>
                  <ul className="space-y-2">
                    {parts.map((p) => (
                      <li key={p.catalogPartId}>
                        <label className="flex cursor-pointer items-start gap-3 text-sm">
                          <Checkbox
                            className="mt-0.5"
                            checked={ticked.has(p.catalogPartId)}
                            onCheckedChange={(v) => toggle(p.catalogPartId, v === true)}
                          />
                          <span>
                            <span className="font-medium">{p.slot}</span>
                            {describe(p) && <span className="block text-muted-foreground">{describe(p)}</span>}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addParts} disabled={saving || ticked.size === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {ticked.size} part{ticked.size === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
