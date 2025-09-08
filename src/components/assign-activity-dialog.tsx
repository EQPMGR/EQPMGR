
'use client';

import { useState } from 'react';
import type { StravaActivity } from '@/app/(app)/settings/apps/actions';
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

interface AssignActivityDialogProps {
  activity: StravaActivity;
  bikes: Equipment[];
  children: React.ReactNode;
}

export function AssignActivityDialog({ activity, bikes, children }: AssignActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(
    bikes.length === 1 ? bikes[0].id : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAssign = async () => {
    if (!selectedBikeId) {
        toast({ variant: 'destructive', title: 'No bike selected', description: 'Please choose a bike to assign this activity to.' });
        return;
    }
    setIsSubmitting(true);
    // In the next step, we will call a server action here.
    // For now, we'll simulate an API call.
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
        title: "Activity Assigned (Simulated)",
        description: `Your ride "${activity.name}" has been assigned. Wear will be calculated shortly.`
    });

    setIsSubmitting(false);
    setOpen(false);
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
          {bikes.length > 1 ? (
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
          ) : bikes.length === 1 ? (
            <p>This ride will be assigned to your only bike: <strong>{bikes[0].name}</strong>.</p>
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
