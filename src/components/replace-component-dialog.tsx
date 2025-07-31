
'use client';

import { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Replace } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { replaceUserComponentAction } from '@/app/(app)/equipment/[id]/actions';
import { fetchMasterComponentsByType, type MasterComponentWithOptions } from '@/services/components';
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
import { Input } from './ui/input';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';


const formSchema = z.object({
  // Fields for dropdown selection
  selectedComponentId: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  series: z.string().optional(),
  model: z.string().optional(),
  // Fields for manual entry
  manualBrand: z.string(),
  manualSeries: z.string(),
  manualModel: z.string(),
  manualSize: z.string(),
}).superRefine((data, ctx) => {
    if (!data.selectedComponentId && !data.manualBrand) {
        // This validation is a bit tricky since it's conditional.
        // We'll rely on button disabled state primarily.
    }
});

type FormValues = z.infer<typeof formSchema>;

interface ReplaceComponentDialogProps {
  userId?: string;
  equipmentId: string;
  componentToReplace: Component;
  onSuccess: () => void;
}

export function ReplaceComponentDialog({
  userId,
  equipmentId,
  componentToReplace,
  onSuccess,
}: ReplaceComponentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [componentOptions, setComponentOptions] = useState<MasterComponentWithOptions[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedComponentId: '',
      brand: '',
      size: '',
      series: '',
      model: '',
      manualBrand: '',
      manualSeries: '',
      manualModel: '',
      manualSize: '',
    }
  });
  
  const { brand, size, series, model: selectedModel, manualBrand } = form.watch();

  useEffect(() => {
    if (open) {
      async function loadComponents() {
        setIsLoading(true);
        try {
          const options = await fetchMasterComponentsByType('Cassette');
          setComponentOptions(options);
        } catch (error: any) {
            let description = 'Could not load components.';
            if (error.message.includes('firestore/failed-precondition') || error.message.includes('index')) {
                description = 'The database query failed. A Firestore index is likely required. Please check the Firestore console for an index creation link in the error logs.'
            }
            toast({ variant: 'destructive', title: 'Error', description });
        } finally {
          setIsLoading(false);
        }
      }
      loadComponents();
    }
  }, [open, toast]);

  // Memoized lists for dropdowns
  const brands = useMemo(() => componentOptions.map(c => c.brand).filter((v, i, a) => a.indexOf(v) === i).sort(), [componentOptions]);
  const speeds = useMemo(() => componentOptions.map(c => c.size).filter((v, i, a) => v && a.indexOf(v) === i).sort(), [componentOptions]);
  
  const filteredSeries = useMemo(() => {
      let filtered = componentOptions;
      if (brand) filtered = filtered.filter(c => c.brand === brand);
      if (size) filtered = filtered.filter(c => c.size === size);
      return filtered.map(c => c.series).filter((v, i, a) => v && a.indexOf(v) === i).sort();
  }, [componentOptions, brand, size]);

  const filteredModels = useMemo(() => {
      let filtered = componentOptions;
      if (brand) filtered = filtered.filter(c => c.brand === brand);
      if (size) filtered = filtered.filter(c => c.size === size);
      if (series) filtered = filtered.filter(c => c.series === series);
      return filtered.filter(c => c.model).sort((a,b) => a.model!.localeCompare(b.model!));
  }, [componentOptions, brand, size, series]);


  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
      setIsSaving(false);
      setIsLoading(true);
    }
  };

  const onSubmit = async (data: Partial<FormValues>) => {
    if (!userId) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not found.' });
      return;
    }
    setIsSaving(true);
    
    let newComponentData;
    let masterComponentId;

    if (data.model) {
        masterComponentId = data.model; // The model dropdown now holds the component ID
        newComponentData = null; // We are using an existing component
    } else if (data.manualBrand) {
        newComponentData = {
            name: 'Cassette', // Hardcoded for now
            brand: data.manualBrand,
            series: data.manualSeries,
            model: data.manualModel,
            size: data.manualSize,
            system: componentToReplace.system, // Keep original system
        };
        masterComponentId = null; // A new one will be created
    } else {
        toast({variant: 'destructive', title: 'Error', description: 'No component selected or entered.'});
        setIsSaving(false);
        return;
    }

    try {
      await replaceUserComponentAction({
          userId,
          equipmentId,
          userComponentIdToReplace: componentToReplace.userComponentId,
          masterComponentId,
          newComponentData
      });
      toast({ title: 'Component Replaced!', description: `Your ${componentToReplace.name} has been updated.` });
      onSuccess();
      handleOpenChange(false);
    } catch (error: any) {
       console.error('Replacement failed:', error);
       toast({ variant: 'destructive', title: 'Replacement Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Replace className="mr-2 h-4 w-4" />
          Replace Part
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Replace: {componentToReplace.name}</DialogTitle>
          <DialogDescription>
            Select the new Cassette from the list or add it manually.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="brand" render={({ field }) => ( <FormItem><FormLabel>Brand</FormLabel><Select onValueChange={value => { field.onChange(value); form.setValue('series', ''); form.setValue('model', ''); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger></FormControl><SelectContent>{brands.map((b, i) => <SelectItem key={`${b}-${i}`} value={b}>{b}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="size" render={({ field }) => ( <FormItem><FormLabel>Speeds</FormLabel><Select onValueChange={value => { field.onChange(value); form.setValue('series', ''); form.setValue('model', ''); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Speeds" /></SelectTrigger></FormControl><SelectContent>{speeds.map((s, i) => <SelectItem key={`${s}-${i}`} value={s!}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="series" render={({ field }) => ( <FormItem><FormLabel>Series</FormLabel><Select onValueChange={value => { field.onChange(value); form.setValue('model', ''); }} value={field.value} disabled={!filteredSeries.length}><FormControl><SelectTrigger><SelectValue placeholder="Select Series" /></SelectTrigger></FormControl><SelectContent>{filteredSeries.map((s, i) => <SelectItem key={`${s}-${i}`} value={s!}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!filteredModels.length}><FormControl><SelectTrigger><SelectValue placeholder="Select Model" /></SelectTrigger></FormControl><SelectContent>{filteredModels.map(m => <SelectItem key={m.id} value={m.id}>{m.model}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                </div>
                
                <Button type="submit" disabled={isSaving || !selectedModel} className="w-full">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Replace Component
                </Button>

                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="manual-add">
                        <AccordionTrigger>Can't find your part? Add it manually.</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                           <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="manualBrand" render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="manualSize" render={({ field }) => (<FormItem><FormLabel>Speeds</FormLabel><FormControl><Input placeholder="e.g., 10" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="manualSeries" render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Tiagra" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="manualModel" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., CS-HG500-10" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                           </div>
                           <Button type="submit" disabled={isSaving || !manualBrand} className="w-full">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Save and Replace Manually
                           </Button>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
