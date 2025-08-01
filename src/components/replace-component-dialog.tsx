
'use client';

import { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Replace } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchMasterComponentsByType, type MasterComponentWithOptions } from '@/services/components';
import type { Component, MasterComponent } from '@/lib/types';
import { replaceUserComponentAction } from '@/app/(app)/equipment/[id]/actions';
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
import { RadioGroup, RadioGroupItem } from './ui/radio-group';


const formSchema = z.object({
  selectedComponentId: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  series: z.string().optional(),
  model: z.string().optional(),
  replacementReason: z.enum(['failure', 'modification', 'upgrade'], {
    required_error: "Please select a reason for replacement."
  }),
  manualBrand: z.string(),
  manualSeries: z.string(),
  manualModel: z.string(),
  manualSize: z.string(),
}).superRefine((data, ctx) => {
    if (!data.model && !data.manualBrand) {
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
  
  const { brand, size, series, model: selectedModel, manualBrand, replacementReason } = form.watch();

  useEffect(() => {
    if (open) {
      async function loadComponents() {
        setIsLoading(true);
        try {
          const options = await fetchMasterComponentsByType(componentToReplace.name);
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
  }, [open, toast, componentToReplace.name]);

  const brands = useMemo(() => [...new Set(componentOptions.map(c => c.brand).filter(Boolean))].sort(), [componentOptions]);
  const sizes = useMemo(() => [...new Set(componentOptions.map(c => c.size).filter(Boolean))].sort(), [componentOptions]);
  
  const filteredSeries = useMemo(() => {
      let filtered = componentOptions;
      if (brand) filtered = filtered.filter(c => c.brand === brand);
      if (size) filtered = filtered.filter(c => c.size === size);
      return [...new Set(filtered.map(c => c.series).filter(Boolean))].sort();
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

  const onSubmit = async (data: FormValues) => {
    if (!userId) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not found.' });
      return;
    }
    setIsSaving(true);
    
    let newComponent: { brand?: string; series?: string; model?: string; size?: string; } | null = null;
    
    if (data.model) {
        const selectedComp = componentOptions.find(c => c.id === data.model);
        if(selectedComp) {
            newComponent = {
                brand: selectedComp.brand,
                series: selectedComp.series,
                model: selectedComp.model,
                size: selectedComp.size,
            };
        }
    } else if (data.manualBrand) {
        newComponent = {
            brand: data.manualBrand,
            series: data.manualSeries,
            model: data.manualModel,
            size: data.manualSize,
        };
    }

    if (!newComponent) {
        toast({variant: 'destructive', title: 'Error', description: 'No component selected or entered.'});
        setIsSaving(false);
        return;
    }
    
    try {
        await replaceUserComponentAction({
            userId,
            equipmentId,
            userComponentIdToReplace: componentToReplace.userComponentId,
            newComponent,
            replacementReason: data.replacementReason,
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
            Select the new replacement part from the list or add it manually.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="brand" render={({ field }) => ( <FormItem><FormLabel>Brand</FormLabel><Select onValueChange={value => { field.onChange(value); form.setValue('series', ''); form.setValue('model', ''); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger></FormControl><SelectContent>{brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="size" render={({ field }) => ( <FormItem><FormLabel>Size / Speeds</FormLabel><Select onValueChange={value => { field.onChange(value); form.setValue('series', ''); form.setValue('model', ''); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Size" /></SelectTrigger></FormControl><SelectContent>{sizes.map((s) => <SelectItem key={s} value={s!}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="series" render={({ field }) => ( <FormItem><FormLabel>Series</FormLabel><Select onValueChange={value => { field.onChange(value); form.setValue('model', ''); }} value={field.value} disabled={!filteredSeries.length}><FormControl><SelectTrigger><SelectValue placeholder="Select Series" /></SelectTrigger></FormControl><SelectContent>{filteredSeries.map((s) => <SelectItem key={s} value={s!}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!filteredModels.length}><FormControl><SelectTrigger><SelectValue placeholder="Select Model" /></SelectTrigger></FormControl><SelectContent>{filteredModels.map(m => <SelectItem key={m.id} value={m.id}>{m.model}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                </div>

                <FormField
                  control={form.control}
                  name="replacementReason"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Reason for Replacement</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex items-center space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="failure" /></FormControl>
                            <FormLabel className="font-normal">Failure</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="modification" /></FormControl>
                            <FormLabel className="font-normal">Modification</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="upgrade" /></FormControl>
                            <FormLabel className="font-normal">Upgrade</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                 <DialogFooter>
                    <Button type="submit" disabled={isSaving || !selectedModel || !replacementReason} className="w-full">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Replace from Database
                    </Button>
                </DialogFooter>

                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="manual-add">
                        <AccordionTrigger>Can't find your part? Add it manually.</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                           <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="manualBrand" render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="manualSize" render={({ field }) => (<FormItem><FormLabel>Size / Speeds</FormLabel><FormControl><Input placeholder="e.g., 10" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="manualSeries" render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Tiagra" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="manualModel" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., CS-HG500-10" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                           </div>
                           <Button type="submit" disabled={isSaving || !manualBrand || !replacementReason} className="w-full">
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
