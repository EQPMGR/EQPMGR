
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchAllMasterComponents, type MasterComponentWithOptions } from '@/services/components';
import { addUserComponentAction } from '@/app/(app)/equipment/[id]/actions';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


const formSchema = z.object({
  componentId: z.string().min(1, 'Please select a component to add.'),
});

type FormValues = z.infer<typeof formSchema>;

interface AddComponentDialogProps {
  userId: string;
  equipmentId: string;
  system: string;
  onSuccess: () => void;
  children: React.ReactNode;
}

export function AddComponentDialog({
  userId,
  equipmentId,
  system,
  onSuccess,
  children,
}: AddComponentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [componentOptions, setComponentOptions] = useState<MasterComponentWithOptions[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const loadComponents = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const options = await fetchAllMasterComponents();
      const filteredOptions = options.filter(
        c => c.system.toLowerCase() === system.toLowerCase()
      );
      setComponentOptions(filteredOptions);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Loading Components',
        description: error.message,
      });
    } finally {
      setIsLoadingOptions(false);
    }
  }, [system, toast]);

  useEffect(() => {
    if (open) {
      loadComponents();
    }
  }, [open, loadComponents]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      await addUserComponentAction({
        userId,
        equipmentId,
        masterComponentId: data.componentId,
        system,
      });
      toast({ title: 'Component Added!', description: 'The new component has been added to your equipment.' });
      onSuccess();
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Add Component',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Component to {system}</DialogTitle>
          <DialogDescription>
            Search for a component in the database to add to your equipment.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="componentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Component</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingOptions}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select a component'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {componentOptions.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.brand} {opt.series} {opt.model} ({opt.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || isLoadingOptions}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add to Equipment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

