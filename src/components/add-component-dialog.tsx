
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
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

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

const ACCESSORY_CATEGORIES = ['Pedals', 'Racks', 'Hydration Systems', 'Computers', 'Sensors'];

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();

  const isAccessory = system.toLowerCase() === 'accessories';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const loadComponents = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const options = await fetchAllMasterComponents();
      const filteredOptions = options.filter(
        c => c.system.toLowerCase() === system.toLowerCase() && c.name !== 'Cycling Shoes'
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
      setSelectedCategory(null);
    }
  };
  
  const handleCategoryChange = (category: string) => {
      setSelectedCategory(category);
      form.setValue('componentId', ''); // Reset component selection when category changes
  }

  const filteredComponentOptions = useMemo(() => {
    if (!isAccessory) {
      return componentOptions;
    }
    if (!selectedCategory) {
      return [];
    }
    return componentOptions.filter(c => c.name === selectedCategory);
  }, [isAccessory, selectedCategory, componentOptions]);

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
            {isAccessory && (
                <div className="space-y-3">
                    <Label>Category</Label>
                    <RadioGroup onValueChange={handleCategoryChange} value={selectedCategory || ''} className="flex flex-wrap gap-2">
                        {ACCESSORY_CATEGORIES.map(cat => (
                           <FormItem key={cat} className="flex items-center">
                             <FormControl>
                                <RadioGroupItem value={cat} id={cat} className="sr-only peer" />
                             </FormControl>
                             <Label htmlFor={cat} className="rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                {cat}
                             </Label>
                           </FormItem>
                        ))}
                    </RadioGroup>
                </div>
            )}
            <FormField
              control={form.control}
              name="componentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Component</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingOptions || (isAccessory && !selectedCategory)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                            isLoadingOptions 
                            ? 'Loading...' 
                            : (isAccessory && !selectedCategory)
                            ? 'Select a category first'
                            : 'Select a component'
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredComponentOptions.map(opt => (
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
