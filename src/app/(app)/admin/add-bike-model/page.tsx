
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { BIKE_TYPES, DROP_BAR_BIKE_TYPES, BASE_COMPONENTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ExtractBikeDetailsOutput } from '@/lib/ai-types';
import { getAvailableBrands, saveBikeModelAction } from './actions';

interface TrainingData {
    rawText: string;
    aiOutput: ExtractBikeDetailsOutput;
    userCorrectedOutput: AddBikeModelFormValues;
}

const componentSchema = z.object({
  id: z.string().optional(), // Used to track fields in the array
  name: z.string().min(1, 'Component name is required.'),
  brand: z.string().optional(),
  series: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  system: z.string().min(1, 'System is required.'),
  chainring1: z.string().optional(),
  chainring2: z.string().optional(),
  chainring3: z.string().optional(),
  links: z.string().optional(),
  tensioner: z.string().optional(),
  pads: z.string().optional(),
  power: z.string().optional(),
  capacity: z.string().optional(),
});

const addBikeModelSchema = z.object({
  type: z.string().min(1, 'Please select a bike type.'),
  brand: z.string().min(1, { message: 'Brand is required.' }),
  model: z.string().min(1, { message: 'Model is required.' }),
  modelYear: z.coerce.number().min(1980, 'Year must be after 1980.').max(new Date().getFullYear() + 1, 'Year cannot be in the future.'),
  isEbike: z.boolean().default(false),
  components: z.array(componentSchema),
  frontMech: z.enum(['1x', '2x', '3x']).optional(),
  rearMech: z.enum(['7', '8', '9', '10', '11', '12', '13']).optional(),
  shifterSetType: z.enum(['matched', 'unmatched']).default('matched'),
  brakeSetType: z.enum(['matched', 'unmatched']).default('matched'),
  rotorSetType: z.enum(['matched', 'unmatched']).default('matched'),
  rimSetType: z.enum(['matched', 'unmatched']).default('matched'),
  tireSetType: z.enum(['matched', 'unmatched']).default('matched'),
  wheelsetSetup: z.enum(['tubes', 'tubeless']).default('tubes'),
});

export type AddBikeModelFormValues = z.infer<typeof addBikeModelSchema>;

function AddBikeModelFormComponent() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [brandPopoverOpen, setBrandPopoverOpen] = useState(false);
    const [availableBrands, setAvailableBrands] = useState<string[]>([]);
    const [importedTrainingData, setImportedTrainingData] = useState<Omit<TrainingData, 'userCorrectedOutput'> | null>(null);

    const form = useForm<AddBikeModelFormValues>({
        resolver: zodResolver(addBikeModelSchema),
        defaultValues: {
            type: '',
            brand: '',
            model: '',
            modelYear: new Date().getFullYear(),
            isEbike: false,
            components: BASE_COMPONENTS,
            shifterSetType: 'matched',
            brakeSetType: 'matched',
            rotorSetType: 'matched',
            rimSetType: 'matched',
            tireSetType: 'matched',
            wheelsetSetup: 'tubes',
        },
    });
    
    useEffect(() => {
        try {
            const storedData = sessionStorage.getItem('importedBikeData');
            if (storedData) {
                const fullImportedData: { rawText: string; aiOutput: ExtractBikeDetailsOutput } = JSON.parse(storedData);
                const importedData = fullImportedData.aiOutput;
                
                setImportedTrainingData({ rawText: fullImportedData.rawText, aiOutput: importedData });
                
                if (importedData.brand) form.setValue('brand', importedData.brand);
                if (importedData.model) form.setValue('model', importedData.model);
                if (importedData.modelYear) form.setValue('modelYear', importedData.modelYear);

                const updatedComponents = [...BASE_COMPONENTS];
                importedData.components.forEach(importedComp => {
                    let targetName = importedComp.name;

                    // Handle generic components that apply to both front and rear
                    if (['Wheel', 'Tire', 'Rim', 'Brake Caliper', 'Brake Rotor'].includes(targetName)) {
                        const frontName = `Front ${targetName.replace(' Caliper', '')}`;
                        const rearName = `Rear ${targetName.replace(' Caliper', '')}`;
                        const frontIndex = updatedComponents.findIndex(c => c.name === frontName);
                        const rearIndex = updatedComponents.findIndex(c => c.name === rearName);
                        if (frontIndex > -1) {
                            updatedComponents[frontIndex] = { ...updatedComponents[frontIndex], ...importedComp, name: frontName };
                        }
                        if (rearIndex > -1) {
                           updatedComponents[rearIndex] = { ...updatedComponents[rearIndex], ...importedComp, name: rearName };
                        }
                        return;
                    }

                    const componentIndex = updatedComponents.findIndex(c => c.name === targetName);

                    if (componentIndex > -1) {
                        updatedComponents[componentIndex] = {
                            ...updatedComponents[componentIndex],
                            brand: importedComp.brand || '',
                            series: importedComp.series || '',
                            model: importedComp.model || '',
                            size: importedComp.size || '',
                            chainring1: importedComp.chainring1 || '',
                            chainring2: importedComp.chainring2 || '',
                            chainring3: importedComp.chainring3 || '',
                        };
                    } else {
                        updatedComponents.push({ ...importedComp, id: crypto.randomUUID() });
                    }
                });

                form.setValue('components', updatedComponents);
                
                toast({
                    title: "Data Imported!",
                    description: "The bike details have been populated from the import page."
                });
                sessionStorage.removeItem('importedBikeData');
            }
        } catch (error) {
            console.error("Failed to parse imported data:", error);
            toast({
                variant: 'destructive',
                title: "Import Error",
                description: "There was an issue loading the imported data into the form."
            });
        }
    }, [form, toast]);


    const { fields } = useFieldArray({
      control: form.control,
      name: "components"
    });

    const isEbike = form.watch('isEbike');
    const frontMechType = form.watch('frontMech');
    const shifterSetType = form.watch('shifterSetType');
    const brakeSetType = form.watch('brakeSetType');
    const rotorSetType = form.watch('rotorSetType');
    const rimSetType = form.watch('rimSetType');
    const tireSetType = form.watch('tireSetType');
    const wheelsetSetup = form.watch('wheelsetSetup');
    const bikeType = form.watch('type');

    useEffect(() => {
      async function fetchBrands() {
        try {
          const brands = await getAvailableBrands();
          setAvailableBrands(brands);
        } catch (error) {
          console.error("Error fetching brands: ", error);
          toast({ variant: 'destructive', title: "Error", description: "Could not fetch bike brands." });
        }
      }
      fetchBrands();
    }, [toast]);

    const getComponentIndex = (name: string) => fields.findIndex(f => f.name === name);

    async function onSubmit(values: AddBikeModelFormValues) {
        setIsSubmitting(true);
        try {
            const result = await saveBikeModelAction({ values, importedTrainingData });
            
            if (result.success) {
                toast({
                    title: 'Bike Model Saved!',
                    description: result.message,
                });
                form.reset();
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Save Failed',
                    description: result.message,
                });
            }

        } catch (error: any) {
            console.error("Failed to save bike model:", error);
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: error.message || 'An unexpected error occurred while saving the bike model.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const renderChainringInputs = (cranksetIndex: number) => {
        if (!frontMechType || cranksetIndex === -1) return null;
        
        const numRings = parseInt(frontMechType.charAt(0));
        
        return (
            <div className="contents">
                {Array.from({ length: numRings }, (_, i) => i + 1).map(ringNum => (
                    <FormField
                        key={`chainring${ringNum}`}
                        control={form.control}
                        name={`components.${cranksetIndex}.chainring${ringNum}` as any}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ring {ringNum} (Teeth)</FormLabel>
                                <FormControl><Input placeholder="e.g., 50" {...field} value={field.value ?? ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ))}
            </div>
        );
    };

    const renderComponentFields = (name: string, fieldsToRender: ('brand' | 'series' | 'model' | 'size' | 'pads' | 'links' | 'tensioner' | 'power' | 'capacity')[]) => {
        const index = getComponentIndex(name);
        if (index === -1) return null;

        return (
            <Card>
                <CardHeader><CardTitle className="text-lg">{name}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {fieldsToRender.map(fieldName => (
                        <FormField
                            key={`${name}-${fieldName}`}
                            control={form.control}
                            name={`components.${index}.${fieldName}` as any}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="capitalize">{fieldName.replace(/([A-Z])/g, ' $1')}</FormLabel>
                                    <FormControl><Input placeholder={`Enter ${fieldName}`} {...field} value={field.value || ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="max-w-6xl mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Add a New Bike Model</CardTitle>
                        <CardDescription>Fill out the form below to add a new bike to the central database. Use the accordions to navigate between component systems.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 border rounded-lg space-y-6">
                            <h3 className="text-lg font-semibold">Primary Bike Details</h3>
                             <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Bike Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a bike type" /></SelectTrigger></FormControl><SelectContent>{BIKE_TYPES.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="brand" render={({ field }) => ( <FormItem className="flex flex-col justify-end"><FormLabel>Brand</FormLabel><Popover open={brandPopoverOpen} onOpenChange={setBrandPopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className={cn("w-full justify-between",!field.value && "text-muted-foreground")}>{field.value || "Select or create brand"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent side="bottom" align="start" className="w-[--radix-popover-trigger-width] p-0" avoidCollisions={false}><Command shouldFilter={false}><CommandInput placeholder="Search or create brand..." onValueChange={(value) => form.setValue("brand", value)} value={field.value} /><CommandEmpty>No brand found. You can add a new one.</CommandEmpty><CommandList><CommandGroup>{availableBrands.map((brand) => (<CommandItem value={brand} key={brand} onSelect={() => {form.setValue("brand", brand); setBrandPopoverOpen(false);}}><Check className={cn("mr-2 h-4 w-4", brand === field.value ? "opacity-100" : "opacity-0")}/>{brand}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Tarmac SL7" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="modelYear" render={({ field }) => (<FormItem><FormLabel>Model Year</FormLabel><FormControl><Input type="number" placeholder="e.g., 2023" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             </div>
                             <FormField control={form.control} name="isEbike" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>E-Bike</FormLabel><FormDescription>Does this model have a motor and battery?</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>)}/>
                        </div>
                        
                        <Accordion type="multiple" className="w-full space-y-4">
                            <AccordionItem value="frameset" className="border rounded-lg px-4">
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Frameset</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderComponentFields('Frame', ['brand', 'series', 'model', 'size'])}
                                    {renderComponentFields('Fork', ['brand', 'series', 'model', 'size'])}
                                    {renderComponentFields('Rear Shock', ['brand', 'series', 'model', 'size'])}
                                    {renderComponentFields('Headset', ['brand', 'series', 'model', 'size'])}
                                </AccordionContent>
                            </AccordionItem>
                            
                            <AccordionItem value="drivetrain" className="border rounded-lg px-4">
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Drivetrain</AccordionTrigger>
                                <AccordionContent className="space-y-6 pt-4">
                                    <Card className="p-4 bg-muted/30"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="frontMech" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Front Mech</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="1x" /></FormControl><FormLabel className="font-normal">1x</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="2x" /></FormControl><FormLabel className="font-normal">2x</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="3x" /></FormControl><FormLabel className="font-normal">3x</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={form.control} name="rearMech" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Rear Mech</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-x-4 gap-y-2"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="7" /></FormControl><FormLabel className="font-normal">7</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="8" /></FormControl><FormLabel className="font-normal">8</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="9" /></FormControl><FormLabel className="font-normal">9</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="10" /></FormControl><FormLabel className="font-normal">10</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="11" /></FormControl><FormLabel className="font-normal">11</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="12" /></FormControl><FormLabel className="font-normal">12</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="13" /></FormControl><FormLabel className="font-normal">13</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                    </div></Card>
                                    <Card><CardHeader><CardTitle className="text-lg">Crankset</CardTitle></CardHeader><CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        <FormField name={`components.${getComponentIndex('Crankset')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Crankset')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED AXS" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Crankset')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Crankset')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 175mm" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        {renderChainringInputs(getComponentIndex('Crankset'))}
                                    </CardContent></Card>
                                    {renderComponentFields('Bottom Bracket', ['brand', 'series', 'model', 'size'])}
                                    {renderComponentFields('Front Derailleur', ['brand', 'series', 'model', 'size'])}
                                    {renderComponentFields('Rear Derailleur', ['brand', 'series', 'model', 'size'])}
                                    {renderComponentFields('Cassette', ['brand', 'series', 'model', 'size'])}
                                    <Card><CardHeader><CardTitle className="text-lg">Shifters</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="shifterSetType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        {shifterSetType === 'matched' && (<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Shifter')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Shifter')}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Shifter')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Shifter')}.series`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Shifter')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Shifter')}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)}/>
                                        </div>)}
                                        {shifterSetType === 'unmatched' && (<div className="space-y-4"><h4 className="font-semibold text-sm">Front Shifter</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${getComponentIndex('Front Shifter')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Front Shifter')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Front Shifter')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div><h4 className="font-semibold text-sm mt-4">Rear Shifter</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${getComponentIndex('Rear Shifter')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Rear Shifter')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Rear Shifter')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div></div>)}
                                    </CardContent></Card>
                                    {renderComponentFields('Chain', ['brand', 'series', 'model', 'links', 'tensioner'])}
                                    {renderComponentFields('Battery', ['brand', 'model'])}
                                    {renderComponentFields('Charger', ['brand', 'model'])}
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="brakes" className="border rounded-lg px-4">
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Brakes</AccordionTrigger>
                                <AccordionContent className="space-y-6 pt-4">
                                    {DROP_BAR_BIKE_TYPES.includes(bikeType as any) && fields[getComponentIndex('Front Shifter')] && (<Card><CardHeader><CardTitle className="text-lg">Brake Levers</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Brake levers are integrated with the shifters for this bike type.</p><p className="font-medium mt-1">{fields[getComponentIndex('Front Shifter')].brand} {fields[getComponentIndex('Front Shifter')].series}</p></CardContent></Card>)}
                                    <Card><CardHeader><CardTitle className="text-lg">Brake Calipers</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="brakeSetType" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        {brakeSetType === 'matched' && getComponentIndex('Front Brake') !== -1 && (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Brake')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Brake')}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Brake')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Dura-Ace R9270" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Brake')}.series`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Brake')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Brake')}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Brake')}.pads`} render={({ field }) => (<FormItem><FormLabel>Brake Pad Model</FormLabel><FormControl><Input placeholder="e.g., L05A-RF" {...field} value={field.value ?? ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Brake')}.pads`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>)}
                                        {brakeSetType === 'unmatched' && getComponentIndex('Front Brake') !== -1 && getComponentIndex('Rear Brake') !== -1 && (<div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Front Brake</h4><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                                <FormField name={`components.${getComponentIndex('Front Brake')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Front Brake')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Dura-Ace R9270" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Front Brake')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Front Brake')}.pads`} render={({ field }) => (<FormItem><FormLabel>Brake Pad Model</FormLabel><FormControl><Input placeholder="e.g., L05A-RF" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <h4 className="font-semibold text-sm mt-4">Rear Brake</h4><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                                <FormField name={`components.${getComponentIndex('Rear Brake')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Rear Brake')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Dura-Ace R9270" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Rear Brake')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Rear Brake')}.pads`} render={({ field }) => (<FormItem><FormLabel>Brake Pad Model</FormLabel><FormControl><Input placeholder="e.g., L05A-RF" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div></div>
                                        )}
                                    </CardContent></Card>
                                    <Card><CardHeader><CardTitle className="text-lg">Brake Rotors</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="rotorSetType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        {rotorSetType === 'matched' && getComponentIndex('Front Rotor') !== -1 && (<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Rotor')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Rotor')}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Rotor')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RT-CL900" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Rotor')}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Rotor')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 160mm" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Rotor')}.size`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>)}
                                        {rotorSetType === 'unmatched' && getComponentIndex('Front Rotor') !== -1 && getComponentIndex('Rear Rotor') !== -1 && (<div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Front Rotor</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${getComponentIndex('Front Rotor')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Front Rotor')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RT-CL900" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Front Rotor')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 160mm" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <h4 className="font-semibold text-sm mt-4">Rear Rotor</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${getComponentIndex('Rear Rotor')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Rear Rotor')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RT-CL800" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Rear Rotor')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 140mm" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div></div>
                                        )}
                                    </CardContent></Card>
                                </AccordionContent>
                            </AccordionItem>
                            
                            <AccordionItem value="wheelset" className="border rounded-lg px-4">
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Wheelset</AccordionTrigger>
                                <AccordionContent className="space-y-6 pt-4">
                                    <Card><CardHeader><CardTitle className="text-lg">Hubs</CardTitle></CardHeader><CardContent className="space-y-4"><h4 className="font-semibold text-sm">Front Hub</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${getComponentIndex('Front Hub')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., DT Swiss" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Front Hub')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 240" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Front Hub')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div><h4 className="font-semibold text-sm mt-4">Rear Hub</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${getComponentIndex('Rear Hub')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., DT Swiss" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Rear Hub')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 240" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Rear Hub')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div></CardContent></Card>
                                    <Card><CardHeader><CardTitle className="text-lg">Rims</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="rimSetType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        {rimSetType === 'matched' && (<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Rim')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Rim')}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Rim')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 404 Firecrest" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Rim')}.series`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Rim')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Rim')}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>)}
                                        {rimSetType === 'unmatched' && (<div className="space-y-4"><h4 className="font-semibold text-sm">Front Rim</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${getComponentIndex('Front Rim')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Front Rim')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 303 Firecrest" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Front Rim')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div><h4 className="font-semibold text-sm mt-4">Rear Rim</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${getComponentIndex('Rear Rim')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Rear Rim')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 404 Firecrest" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Rear Rim')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div></div>)}
                                    </CardContent></Card>
                                    <Card><CardHeader><CardTitle className="text-lg">Tires</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="tireSetType" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        {tireSetType === 'matched' && (<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Tire')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Continental" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Tire')}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Tire')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Grand Prix 5000" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Tire')}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Tire')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 700x28c" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Tire')}.size`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>)}
                                        {tireSetType === 'unmatched' && (<div className="space-y-4"><h4 className="font-semibold text-sm">Front Tire</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${getComponentIndex('Front Tire')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Continental" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Front Tire')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Grand Prix 5000" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Front Tire')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 700x28c" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div><h4 className="font-semibold text-sm mt-4">Rear Tire</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${getComponentIndex('Rear Tire')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Continental" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Rear Tire')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Grand Prix 5000 S" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Rear Tire')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 700x28c" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div></div>)}
                                    </CardContent></Card>
                                    <Card><CardHeader><CardTitle className="text-lg">Tire Setup</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="wheelsetSetup" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Setup</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="tubes" /></FormControl><FormLabel className="font-normal">Tubes</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="tubeless" /></FormControl><FormLabel className="font-normal">Tubeless</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        {wheelsetSetup === 'tubeless' && renderComponentFields('Valves', ['brand', 'series', 'model'])}
                                    </CardContent></Card>
                                    <Card><CardHeader><CardTitle className="text-lg">Skewers / Thru-Axles</CardTitle></CardHeader><CardContent className="space-y-4"><h4 className="font-semibold text-sm">Front Skewer/Axle</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${getComponentIndex('Front Skewer')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Maxle" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Front Skewer')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Stealth" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Front Skewer')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div><h4 className="font-semibold text-sm mt-4">Rear Skewer/Axle</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${getComponentIndex('Rear Skewer')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Maxle" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Rear Skewer')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Stealth" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Rear Skewer')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div></CardContent></Card>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="cockpit" className="border rounded-lg px-4">
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Cockpit</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderComponentFields('Handlebar', ['brand', 'series', 'model', 'size'])}
                                    {renderComponentFields('Stem', ['brand', 'series', 'model', 'size'])}
                                    {renderComponentFields('Seatpost', ['brand', 'model', 'size'])}
                                    {renderComponentFields('Saddle', ['brand', 'series', 'model', 'size'])}
                                    {renderComponentFields('Grips', ['brand', 'series', 'model', 'size'])}
                                    {renderComponentFields('Seatpost Clamp', ['brand', 'series', 'model', 'size'])}
                                </AccordionContent>
                            </AccordionItem>
                            
                            {isEbike && (
                                <AccordionItem value="ebike" className="border rounded-lg px-4">
                                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">E-Bike System</AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-4">
                                        {renderComponentFields('Motor', ['brand', 'model', 'power'])}
                                        {renderComponentFields('Battery', ['brand', 'model', 'capacity'])}
                                        {renderComponentFields('Display', ['brand', 'model'])}
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                        </Accordion>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button type="button" variant="outline" asChild>
                            <Link href="/admin">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Bike Model
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}

export default function AddBikeModelPage() {
    return (
        <AddBikeModelFormComponent />
    )
}
