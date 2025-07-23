
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSubComponentsAction } from '@/app/(app)/equipment/[id]/actions';
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

const chainringSchema = z.object({
  name: z.string(), // This will be the teeth, e.g., "52t"
  brand: z.string().optional(),
  model: z.string().optional(),
});

const formSchema = z.object({
  chainring1: chainringSchema,
  chainring2: chainringSchema,
  chainring3: chainringSchema,
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

  useEffect(() => {
    if (open) {
      const ring1 = existingSubComponents.find(sc => sc.name.includes('Chainring 1'));
      const ring2 = existingSubComponents.find(sc => sc.name.includes('Chainring 2'));
      const ring3 = existingSubComponents.find(sc => sc.name.includes('Chainring 3'));

      form.reset({
        chainring1: {
          name: ring1?.name.split(' ')[0] || '',
          brand: ring1?.brand || '',
          model: ring1?.model || '',
        },
        chainring2: {
          name: ring2?.name.split(' ')[0] || '',
          brand: ring2?.brand || '',
          model: ring2?.model || '',
        },
        chainring3: {
          name: ring3?.name.split(' ')[0] || '',
          brand: ring3?.brand || '',
          model: ring3?.model || '',
        },
      });
    }
  }, [open, existingSubComponents, form]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      const subComponentsData = [
        { name: data.chainring1.name ? `${data.chainring1.name} Chainring 1` : '', brand: data.chainring1.brand, model: data.chainring1.model },
        { name: data.chainring2.name ? `${data.chainring2.name} Chainring 2` : '', brand: data.chainring2.brand, model: data.chainring2.model },
        { name: data.chainring3.name ? `${data.chainring3.name} Chainring 3` : '', brand: data.chainring3.brand, model: data.chainring3.model },
      ].filter(sc => sc.name);

      await updateSubComponentsAction({
        userId,
        equipmentId,
        parentUserComponentId: parentComponent.userComponentId,
        subComponentsData,
      });

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
          <FormField control={form.control} name={`chainring${index}.name`} render={({ field }) => (<FormItem><FormLabel>Teeth</FormLabel><FormControl><Input placeholder="e.g., 52t" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name={`chainring${index}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name={`chainring${index}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., X-Sync 2" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
            Modify the details of the attached chainrings. Leave fields blank to remove a chainring.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {renderChainringFields(1)}
            <Separator />
            {renderChainringFields(2)}
            <Separator />
            {renderChainringFields(3)}
            
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
