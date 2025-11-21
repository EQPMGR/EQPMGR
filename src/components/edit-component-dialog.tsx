

'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDb } from '@/backend';
import type { Component } from '@/lib/types';
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
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

const chainringSchema = z.object({
  name: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
});

const formSchema = z.object({
  driveType: z.enum(['1x', '2x', '3x']).optional(),
  chainring1: chainringSchema.optional(),
  chainring2: chainringSchema.optional(),
  chainring3: chainringSchema.optional(),
}).superRefine((data, ctx) => {
    if (data.driveType === '1x' && !data.chainring1?.name) {
        ctx.addIssue({ code: 'custom', message: 'Teeth required for Ring 1.', path: ['chainring1.name'] });
    }
    if (data.driveType === '2x' && !data.chainring1?.name) {
        ctx.addIssue({ code: 'custom', message: 'Teeth required for Ring 1.', path: ['chainring1.name'] });
    }
    if (data.driveType === '2x' && !data.chainring2?.name) {
        ctx.addIssue({ code: 'custom', message: 'Teeth required for Ring 2.', path: ['chainring2.name'] });
    }
    if (data.driveType === '3x' && !data.chainring1?.name) {
        ctx.addIssue({ code: 'custom', message: 'Teeth required for Ring 1.', path: ['chainring1.name'] });
    }
     if (data.driveType === '3x' && !data.chainring2?.name) {
        ctx.addIssue({ code: 'custom', message: 'Teeth required for Ring 2.', path: ['chainring2.name'] });
    }
    if (data.driveType === '3x' && !data.chainring3?.name) {
        ctx.addIssue({ code: 'custom', message: 'Teeth required for Ring 3.', path: ['chainring3.name'] });
    }
});


type FormValues = z.infer<typeof formSchema>;

interface EditComponentDialogProps {
  userId: string;
  equipmentId: string;
  parentComponent: Component;
  existingSubComponents: Component[];
  onSuccess: () => void;
  children: React.ReactNode;
}

export function EditComponentDialog({
  userId,
  equipmentId,
  parentComponent,
  existingSubComponents,
  onSuccess,
  children,
}: EditComponentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const driveType = form.watch('driveType');

  useEffect(() => {
    if (open) {
      const ring1 = existingSubComponents.find(sc => sc.name.includes('Chainring 1'));
      const ring2 = existingSubComponents.find(sc => sc.name.includes('Chainring 2'));
      const ring3 = existingSubComponents.find(sc => sc.name.includes('Chainring 3'));
      
      let currentDriveType: '1x' | '2x' | '3x' | undefined = undefined;
      if (ring3) currentDriveType = '3x';
      else if (ring2) currentDriveType = '2x';
      else if (ring1) currentDriveType = '1x';

      form.reset({
        driveType: currentDriveType,
        chainring1: ring1 ? {
          name: ring1.size || '',
          brand: ring1.brand || '',
          model: ring1.model || '',
        } : undefined,
        chainring2: ring2 ? {
          name: ring2.size || '',
          brand: ring2.brand || '',
          model: ring2.model || '',
        } : undefined,
        chainring3: ring3 ? {
          name: ring3.size || '',
          brand: ring3.brand || '',
          model: ring3.model || '',
        } : undefined,
      });
    }
  }, [open, existingSubComponents, form]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
        const db = await getDb();
        const batch = db.batch();
        const componentsPath = `app_users/${userId}/equipment/${equipmentId}`;

        // Delete all existing chainring sub-components associated with this parent
        existingSubComponents
            .filter(sc => sc.name.toLowerCase().includes('chainring'))
            .forEach(sub => {
                batch.deleteInSubcollection(componentsPath, 'components', sub.userComponentId);
            });

        // Conditionally create new sub-components based on driveType
        const chainringsToAdd = [];
        if (data.driveType === '1x' || data.driveType === '2x' || data.driveType === '3x') {
            if (data.chainring1?.name) chainringsToAdd.push({ ...data.chainring1, name: 'Chainring 1' });
        }
        if (data.driveType === '2x' || data.driveType === '3x') {
            if (data.chainring2?.name) chainringsToAdd.push({ ...data.chainring2, name: 'Chainring 2' });
        }
        if (data.driveType === '3x') {
             if (data.chainring3?.name) chainringsToAdd.push({ ...data.chainring3, name: 'Chainring 3' });
        }

        for (const ringData of chainringsToAdd) {
            const newSubId = db.generateId();
            const masterId = `${ringData.brand}-${ringData.name}-${parentComponent.id}`.toLowerCase().replace(/\s+/g, '-');

            const newComponent = {
                masterComponentId: masterId, // This is a simplistic ID. A better approach might involve looking up a real master component.
                parentUserComponentId: parentComponent.userComponentId,
                purchaseDate: new Date(),
                wearPercentage: 0,
                lastServiceDate: null,
                name: ringData.name, // e.g., "Chainring 1"
                brand: ringData.brand,
                model: ringData.model,
                size: ringData.name, // The teeth count, e.g. "52t"
                system: 'Drivetrain'
            };
            batch.setInSubcollection(componentsPath, 'components', newSubId, newComponent);
        }

        await batch.commit();

        toast({ title: 'Component Updated!', description: 'Your changes have been saved.' });
        onSuccess();
        handleOpenChange(false);
    } catch (error: any) {
        console.error('Update failed:', error);
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  const renderChainringFields = (index: 1 | 2 | 3) => {
    return (
       <div className="space-y-4">
          <h4 className="font-semibold text-md">Chainring {index}</h4>
          <FormField control={form.control} name={`chainring${index}.name` as any} render={({ field }) => (<FormItem><FormLabel>Teeth</FormLabel><FormControl><Input placeholder="e.g., 52t" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name={`chainring${index}.brand` as any} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name={`chainring${index}.model` as any} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., X-Sync 2" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
          </div>
        </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sub-Components for: {parentComponent.name}</DialogTitle>
          <DialogDescription>
            Select your crankset configuration and specify the chainring details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
             <FormField
                control={form.control}
                name="driveType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Crankset Configuration</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex space-x-4"
                            >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="1x" /></FormControl>
                                    <FormLabel className="font-normal">1x</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="2x" /></FormControl>
                                    <FormLabel className="font-normal">2x</FormLabel>
                                </FormItem>
                                 <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="3x" /></FormControl>
                                    <FormLabel className="font-normal">3x</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                )}
              />
              <Separator />

            {(driveType === '1x' || driveType === '2x' || driveType === '3x') && renderChainringFields(1)}
            
            {(driveType === '2x' || driveType === '3x') && <Separator />}
            {(driveType === '2x' || driveType === '3x') && renderChainringFields(2)}

            {driveType === '3x' && <Separator />}
            {driveType === '3x' && renderChainringFields(3)}
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
