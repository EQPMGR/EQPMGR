'use client';

import { useState } from 'react';
import { Loader2, Ruler } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { recordChainStretchAction } from '@/app/(app)/equipment/[id]/actions';
import { ChainStretchFields, parseChainStretch, type ChainStretchValue } from '@/components/chain-stretch-fields';

/** Lets a rider record measured chain stretch; the measurement replaces the wear estimate. */
export function ChainStretchCard({
  equipmentId,
  componentId,
  onRecorded,
}: {
  equipmentId: string;
  componentId: string;
  onRecorded: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stretch, setStretch] = useState<ChainStretchValue>({ value: '', threshold: '0.5' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    let parsed;
    try {
      parsed = parseChainStretch(stretch);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Check the measurement', description: e.message });
      return;
    }
    if (!parsed) {
      toast({ variant: 'destructive', title: 'Enter the measured stretch first' });
      return;
    }
    setSaving(true);
    const result = await recordChainStretchAction({ idToken: await user.getIdToken(), equipmentId, componentId, ...parsed });
    setSaving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not save', description: result.message });
      return;
    }
    toast({ title: 'Measurement saved', description: result.message });
    setStretch({ ...stretch, value: '' });
    onRecorded();
  };

  return (
    <div className="mt-6 border-t pt-6 space-y-3">
      <h4 className="font-semibold flex items-center gap-2"><Ruler className="h-4 w-4" /> Chain stretch</h4>
      <p className="text-sm text-muted-foreground">
        Measured with a chain checker? Your measurement replaces the estimate for this chain and helps tune
        lifespans for everyone.
      </p>
      <ChainStretchFields stretch={stretch} onChange={setStretch} />
      <Button type="button" size="sm" onClick={save} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save measurement
      </Button>
    </div>
  );
}
