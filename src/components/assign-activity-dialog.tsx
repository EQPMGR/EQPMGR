
'use client';

import { useState } from 'react';
import { assignStravaActivityToAction, type StravaActivity } from '@/app/(app)/settings/apps/actions';
import type { Equipment } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface AssignActivityDialogProps {
  activity: StravaActivity;
  bikes: Equipment[];
  children: React.ReactNode;
  onAssigned: (activityId: number) => void;
}

export function AssignActivityDialog({ activity, bikes, children, onAssigned }: AssignActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(
    activity.gear_id || (bikes.length === 1 ? bikes[0].id : null)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAssign = async () => {
    if (!selectedBikeId) {
        toast({ variant: 'destructive', title: 'No bike selected', description: 'Please choose a bike to assign this activity to.' });
        return;
    }
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You are not logged in.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const idToken = await user.getIdToken(true);
        const result = await assignStravaActivityToAction({
            idToken,
            activity,
            equipmentId: selectedBikeId,
        });

        if (result.success) {
            toast({
                title: "Activity Assigned!",
                description: result.message
            });
            onAssigned(activity.id);
            setOpen(false);
        } else {
            throw new Error(result.message);
        }

    } catch(error: any) {
        toast({
            variant: 'destructive',
            title: 'Assignment Failed',
            description: error.message || 'An unexpected error occurred.'
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign: {activity.name}</DialogTitle>
          <DialogDescription>
            Which bike did you use for this ride? Your component wear will be updated accordingly.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {bikes.length > 0 ? (
            <RadioGroup onValueChange={setSelectedBikeId} value={selectedBikeId || ''}>
              {bikes.map(bike => (
                <Label
                  key={bike.id}
                  htmlFor={bike.id}
                  className="flex items-center gap-4 p-4 border rounded-md has-[:checked]:bg-muted"
                >
                  <RadioGroupItem value={bike.id} id={bike.id} />
                  <div>
                    <p className="font-semibold">{bike.name}</p>
                    <p className="text-sm text-muted-foreground">{bike.brand} {bike.model}</p>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          ) : (
            <p>You don't have any bikes in your equipment locker. Please add a bike first.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedBikeId || isSubmitting}>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
