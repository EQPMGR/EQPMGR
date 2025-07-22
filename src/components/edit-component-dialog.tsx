
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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

export type FormValues = z.infer<typeof formSchema>;

interface EditComponentDialogProps {
  component: Component;
  onSave: (data: FormValues) => Promise<void>;
  children: React.ReactNode;
}

export function EditComponentDialog({
  component,
  onSave,
  children,
}: EditComponentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        chainring1: component.chainring1 || '',
        chainring1_brand: (component as any).chainring1_brand || '',
        chainring1_model: (component as any).chainring1_model || '',
        chainring2: component.chainring2 || '',
        chainring2_brand: (component as any).chainring2_brand || '',
        chainring2_model: (component as any).chainring2_model || '',
        chainring3: component.chainring3 || '',
        chainring3_brand: (component as any).chainring3_brand || '',
        chainring3_model: (component as any).chainring3_model || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        chainring1: component.chainring1 || '',
        chainring1_brand: (component as any).chainring1_brand || '',
        chainring1_model: (component as any).chainring1_model || '',
        chainring2: component.chainring2 || '',
        chainring2_brand: (component as any).chainring2_brand || '',
        chainring2_model: (component as any).chainring2_model || '',
        chainring3: component.chainring3 || '',
        chainring3_brand: (component as any).chainring3_brand || '',
        chainring3_model: (component as any).chainring3_model || '',
      });
    }
  }, [open, component, form]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    await onSave(data);
    setIsSaving(false);
    handleOpenChange(false); // Close the dialog on success
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
