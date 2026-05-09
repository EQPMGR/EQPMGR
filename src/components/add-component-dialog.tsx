
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from './ui/input';

const formSchema = z.object({
  componentId: z.string().optional(),
  replacementReason: z.enum(['failure', 'modification', 'upgrade']).optional(),
  manualBrand: z.string(),
  manualSeries: z.string(),
  manualModel: z.string(),
  manualSize: z.string(),
  brand: z.string().optional(),
  model: z.string().optional(),
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
  const [allComponentOptions, setAllComponentOptions] = useState<MasterComponentWithOptions[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();

  const isAccessory = system.toLowerCase() === 'accessories';
  
  // Singularize the category name for matching with component names in the DB
  const singularCategory = selectedCategory ? selectedCategory.slice(0, -1) : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
     defaultValues: {
      brand: '',
      model: '',
      componentId: '',
      manualBrand: '',
      manualSeries: '',
      manualModel: '',
      manualSize: '',
    }
  });

   const { brand, componentId, manualBrand } = form.watch();

  const loadComponents = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const options = await fetchAllMasterComponents();
      const filteredOptions = options.filter(c => c.name !== 'Cycling Shoes');
      setAllComponentOptions(filteredOptions);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Loading Components',
        description: error.message,
      });
    } finally {
      setIsLoadingOptions(false);
    }
  }, [toast]);

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
      form.reset();
  }
  
  const componentOptions = useMemo(() => {
    let options = allComponentOptions;
    if (isAccessory && singularCategory) {
        options = options.filter(c => c.name === singularCategory);
    } else if (!isAccessory) {
        options = options.filter(c => c.system.toLowerCase() === system.toLowerCase());
    }
    return options;
  }, [allComponentOptions, system, isAccessory, singularCategory]);

  const brands = useMemo(() => [...new Set(componentOptions.map(c => c.brand).filter(Boolean))].sort(), [componentOptions]);
  
  const filteredModels = useMemo(() => {
      let filtered = componentOptions;
      if (brand) filtered = filtered.filter(c => c.brand === brand);
      return filtered.filter(c => c.model).sort((a,b) => a.model!.localeCompare(b.model!));
  }, [componentOptions, brand]);


  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      await addUserComponentAction({
        userId,
        equipmentId,
        system,
        masterComponentId: data.componentId || null,
        manualNewComponentData: data.manualBrand ? {
            name: isAccessory ? singularCategory! : system, // Use singular category or system name
            brand: data.manualBrand,
            series: data.manualSeries,
            model: data.manualModel,
            size: data.manualSize,
        } : null,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Component to {system}</DialogTitle>
          <DialogDescription>
            Search for a component in the database or add it manually.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
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
             <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Add from Database</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="brand" render={({ field }) => ( <FormItem><FormLabel>Brand</FormLabel><Select onValueChange={value => { field.onChange(value); form.setValue('componentId', ''); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger></FormControl><SelectContent>{brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="componentId" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!filteredModels.length}><FormControl><SelectTrigger><SelectValue placeholder="Select Model" /></SelectTrigger></FormControl><SelectContent>{filteredModels.map(m => <SelectItem key={m.id} value={m.id}>{m.model}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>Can't find it? Add it manually.</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="manualBrand" render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="manualModel" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Ultegra PD-R8000" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="manualSeries" render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="manualSize" render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || isLoadingOptions || (!componentId && !manualBrand) || (isAccessory && !selectedCategory)}>
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
