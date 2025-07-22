
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

interface EditComponentDialogProps {
  userId: string;
  equipmentId: string;
  component: Component;
  onSuccess: () => void;
  children: React.ReactNode;
}

const formSchema = z.object({
  chainring1: z.string().optional(),
  chainring2: z.string().optional(),
  chainring3: z.string().optional(),
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
      chainring2: component.chainring2 || '',
      chainring3: component.chainring3 || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        chainring1: component.chainring1 || '',
        chainring2: component.chainring2 || '',
        chainring3: component.chainring3 || '',
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
          chainring1: data.chainring1 || null, // Send null to delete
          chainring2: data.chainring2 || null,
          chainring3: data.chainring3 || null,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit: {component.name}</DialogTitle>
          <DialogDescription>
            Modify the details of this component. Leave a field blank to remove it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="chainring1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chainring 1 (teeth)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 52t" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="chainring2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chainring 2 (teeth)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 36t" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="chainring3"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chainring 3 (teeth)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 26t" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
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
