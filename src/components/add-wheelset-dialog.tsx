
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import type { Equipment } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { doc, writeBatch, collection, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const wheelsetFormSchema = z.object({
  nickname: z.string().min(2, { message: 'Nickname is required.' }),
  frontHub: z.string().min(2, { message: 'Required' }),
  rearHub: z.string().min(2, { message: 'Required' }),
  frontRim: z.string().min(2, { message: 'Required' }),
  rearRim: z.string().min(2, { message: 'Required' }),
  frontTire: z.string().min(2, { message: 'Required' }),
  rearTire: z.string().min(2, { message: 'Required' }),
  cassette: z.string().min(2, { message: 'Required' }),
});

type WheelsetFormValues = z.infer<typeof wheelsetFormSchema>;

interface AddWheelsetDialogProps {
  equipment: Equipment;
  onSuccess: () => void;
  children: React.ReactNode;
}

export function AddWheelsetDialog({
  equipment,
  onSuccess,
  children,
}: AddWheelsetDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<WheelsetFormValues>({
    resolver: zodResolver(wheelsetFormSchema),
    defaultValues: {
      nickname: '',
      frontHub: '',
      rearHub: '',
      frontRim: '',
      rearRim: '',
      frontTire: '',
      rearTire: '',
      cassette: '',
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  const createMasterAndUserComponent = (
    batch: ReturnType<typeof writeBatch>,
    name: string,
    model: string,
    wheelsetId: string
  ) => {
    const masterId = `${name}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const system = name === 'Cassette' ? 'Drivetrain' : 'Wheelset';
    
    // Create master component
    const masterRef = doc(db, 'masterComponents', masterId);
    batch.set(masterRef, { name, model, system, brand: 'Unknown' }, { merge: true });

    // Create user component
    const userCompRef = doc(collection(db, 'users', user!.uid, 'equipment', equipment.id, 'components'));
    batch.set(userCompRef, {
      masterComponentId: masterId,
      purchaseDate: new Date(),
      wearPercentage: 0,
      lastServiceDate: null,
      wheelsetId,
    });
  };

  const onSubmit = async (data: WheelsetFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated.' });
      return;
    }
    setIsSaving(true);
    const batch = writeBatch(db);
    const wheelsetId = `wheelset_${Date.now()}`;

    try {
      // Update equipment with the new wheelset's nickname
      const equipmentRef = doc(db, 'users', user.uid, 'equipment', equipment.id);
      batch.update(equipmentRef, {
        [`wheelsets.${wheelsetId}`]: data.nickname,
      });

      // Create components
      createMasterAndUserComponent(batch, 'Front Hub', data.frontHub, wheelsetId);
      createMasterAndUserComponent(batch, 'Rear Hub', data.rearHub, wheelsetId);
      createMasterAndUserComponent(batch, 'Front Rim', data.frontRim, wheelsetId);
      createMasterAndUserComponent(batch, 'Rear Rim', data.rearRim, wheelsetId);
      createMasterAndUserComponent(batch, 'Front Tire', data.frontTire, wheelsetId);
      createMasterAndUserComponent(batch, 'Rear Tire', data.rearTire, wheelsetId);
      createMasterAndUserComponent(batch, 'Cassette', data.cassette, wheelsetId);
      
      await batch.commit();

      toast({ title: 'Wheelset Added!', description: `${data.nickname} has been added to your ${equipment.name}.` });
      onSuccess();
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Add Wheelset',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderField = (name: keyof WheelsetFormValues, label: string) => (
      <FormField
          control={form.control}
          name={name}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Zipp 303 Firecrest" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Wheelset</DialogTitle>
          <DialogDescription>
            Define the components for your new wheelset. This will create a new set of trackable parts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wheelset Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Race Day Wheels" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator />
            <h4 className="font-semibold">Components</h4>
            <div className="grid grid-cols-2 gap-4">
                {renderField('frontHub', 'Front Hub Model')}
                {renderField('rearHub', 'Rear Hub Model')}
                {renderField('frontRim', 'Front Rim Model')}
                {renderField('rearRim', 'Rear Rim Model')}
                {renderField('frontTire', 'Front Tire Model')}
                {renderField('rearTire', 'Rear Tire Model')}
                {renderField('cassette', 'Cassette Model')}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Wheelset
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

