
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUserComponentAction } from '@/app/(app)/equipment/[id]/actions';
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

interface EditComponentDialogProps {
  userId: string;
  equipmentId: string;
  component: Component;
  onSuccess: () => void;
  children: React.ReactNode;
}

const formSchema = z.object({
  chainring1: z.string().optional(),
  chainring1_brand: z.string().optional(),
  chainring1_model: z.string().optional(),
  chainring2: z.string().optional(),
  chainring2_brand: z.string().optional(),
  chainring2_model: z.string().optional(),
  chainring3: z.string().optional(),
  chainring3_brand: z.string().optional(),
  chainring3_model: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditComponentDialog({
  userId,
  equipmentId,
  component,
  onSuccess,
  children,
}: EditComponentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        chainring1: component.chainring1 || '',
        chainring1_brand: component.chainring1_brand || '',
        chainring1_model: component.chainring1_model || '',
        chainring2: component.chainring2 || '',
        chainring2_brand: component.chainring2_brand || '',
        chainring2_model: component.chainring2_model || '',
        chainring3: component.chainring3 || '',
        chainring3_brand: component.chainring3_brand || '',
        chainring3_model: component.chainring3_model || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        chainring1: component.chainring1 || '',
        chainring1_brand: component.chainring1_brand || '',
        chainring1_model: component.chainring1_model || '',
        chainring2: component.chainring2 || '',
        chainring2_brand: component.chainring2_brand || '',
        chainring2_model: component.chainring2_model || '',
        chainring3: component.chainring3 || '',
        chainring3_brand: component.chainring3_brand || '',
        chainring3_model: component.chainring3_model || '',
      });
    }
  }, [open, component, form]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      await updateUserComponentAction({
        userId,
        equipmentId,
        userComponentId: component.userComponentId,
        updatedData: {
          chainring1: data.chainring1 || null,
          chainring1_brand: data.chainring1_brand || null,
          chainring1_model: data.chainring1_model || null,
          chainring2: data.chainring2 || null,
          chainring2_brand: data.chainring2_brand || null,
          chainring2_model: data.chainring2_model || null,
          chainring3: data.chainring3 || null,
          chainring3_brand: data.chainring3_brand || null,
          chainring3_model: data.chainring3_model || null,
        },
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit: {component.name}</DialogTitle>
          <DialogDescription>
            Modify the details of the chainrings. Leave fields blank to remove them.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-md">Chainring 1</h4>
              <FormField control={form.control} name="chainring1" render={({ field }) => (<FormItem><FormLabel>Teeth</FormLabel><FormControl><Input placeholder="e.g., 52t" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="chainring1_brand" render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="chainring1_model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., X-Sync 2" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold text-md">Chainring 2</h4>
              <FormField control={form.control} name="chainring2" render={({ field }) => (<FormItem><FormLabel>Teeth</FormLabel><FormControl><Input placeholder="e.g., 36t" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="chainring2_brand" render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="chainring2_model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Ultegra R8000" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
              <h4 className="font-semibold text-md">Chainring 3</h4>
              <FormField control={form.control} name="chainring3" render={({ field }) => (<FormItem><FormLabel>Teeth</FormLabel><FormControl><Input placeholder="e.g., 26t" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="chainring3_brand" render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="chainring3_model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </div>

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
